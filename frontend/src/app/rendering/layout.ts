// Logical-pixel layout math shared by the renderer and hit detection.
// All coordinates are in NES-style logical pixels (pre-scale).

import { Route } from '../models/route.model';

export const LOGICAL_WIDTH = 384;
export const GROUND_HEIGHT = 24;
export const SKY_HEIGHT = 40;
export const SUMMIT_HEIGHT = 16;
export const WALL_LEFT = 96;
export const WALL_RIGHT = 288;
export const WALL_CENTER = (WALL_LEFT + WALL_RIGHT) / 2;

// Pitch height scales with rope length. 0.4 px/ft keeps a 100ft pitch at the
// previously-hardcoded 40px slot, so existing seed routes look the same.
export const PIXELS_PER_FOOT = 0.4;
export const MIN_PITCH_PX = 8;

export interface AnchorPoint {
  x: number;
  y: number;
}

export interface PitchSegment {
  pitchIndex: number;
  bottom: AnchorPoint;
  top: AnchorPoint;
}

export function pitchPx(lengthFt: number): number {
  const px = Math.round(Math.max(0, lengthFt) * PIXELS_PER_FOOT);
  return Math.max(MIN_PITCH_PX, px);
}

export function wallHeight(route: Route): number {
  if (route.pitches.length === 0) return MIN_PITCH_PX;
  return route.pitches.reduce((sum, p) => sum + pitchPx(p.lengthFt), 0);
}

export function computeLogicalHeight(route: Route): number {
  return GROUND_HEIGHT + wallHeight(route) + SUMMIT_HEIGHT + SKY_HEIGHT;
}

// Pitches stack bottom-up. Each pitch's bottom anchor sits where the previous
// pitch's top ended; pitch 0's bottom sits just above the ground.
export function computeSegments(route: Route): PitchSegment[] {
  const total = computeLogicalHeight(route);
  const segments: PitchSegment[] = [];
  let bottomY = total - GROUND_HEIGHT;

  for (let i = 0; i < route.pitches.length; i++) {
    const h = pitchPx(route.pitches[i].lengthFt);
    const topY = bottomY - h;
    segments.push({
      pitchIndex: i,
      bottom: { x: anchorX(i), y: bottomY },
      top: { x: anchorX(i + 1), y: topY },
    });
    bottomY = topY;
  }

  return segments;
}

export interface RenderProgress {
  // The pitch currently being drawn; lower-index pitches are fully drawn,
  // higher-index pitches are not drawn at all.
  pitchIndex: number;
  // 0..1 fraction of the current pitch that is drawn.
  fraction: number;
}

export const FULLY_RENDERED: RenderProgress = { pitchIndex: Number.MAX_SAFE_INTEGER, fraction: 1 };

// Rope sag: each pitch's rope bows slightly off the straight chord like a
// weighted lead line. Quadratic bezier, sampled densely and rounded to
// logical pixels. Bow side alternates per pitch.
export const ROPE_SAG_MAX = 4;

export function ropePath(seg: PitchSegment): AnchorPoint[] {
  const { bottom, top } = seg;
  const dx = top.x - bottom.x;
  const dy = top.y - bottom.y;
  const len = Math.hypot(dx, dy);
  if (len === 0) return [{ x: bottom.x, y: bottom.y }];

  const perpX = -dy / len;
  const perpY = dx / len;
  const dir = seg.pitchIndex % 2 === 0 ? 1 : -1;
  const sag = Math.min(ROPE_SAG_MAX, len / 12) * dir;
  const cx = bottom.x + dx / 2 + perpX * sag;
  const cy = bottom.y + dy / 2 + perpY * sag;

  const steps = Math.max(1, Math.ceil(len) * 2);
  const points: AnchorPoint[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const mt = 1 - t;
    const x = Math.round(mt * mt * bottom.x + 2 * mt * t * cx + t * t * top.x);
    const y = Math.round(mt * mt * bottom.y + 2 * mt * t * cy + t * t * top.y);
    const prev = points[points.length - 1];
    if (!prev || prev.x !== x || prev.y !== y) points.push({ x, y });
  }
  return points;
}

// Deterministic horizontal wander for anchors so the route line looks hand-drawn.
// Pitch 0 starts at the wall center; subsequent anchors offset by a smooth zig-zag.
export function anchorX(anchorIndex: number): number {
  const span = (WALL_RIGHT - WALL_LEFT) / 2 - 12;
  const phase = anchorIndex % 4;
  const offsets = [0, span * 0.5, 0, -span * 0.5];
  return Math.round(WALL_CENTER + offsets[phase]);
}

// Jagged wall silhouette: horizontal bands with deterministic edge notches.
// Summit narrows to a peak; the bottom two or three bands flare wider like a
// talus apron (a partial terminal band always flares). Notch depth never
// exceeds 10px, keeping >= 8px of rock around the anchor zone (anchorX range
// [150, 234]; nominal edges 96/288).
export interface WallBand {
  y0: number;
  y1: number;
  left: number;
  right: number;
}

const BAND_HEIGHT = 12;
const EDGE_BITES = [0, 4, 8, 2, 6, 10, 3, 7];
export const BASE_FLARE = 8;

export function wallSilhouette(route: Route): WallBand[] {
  const height = computeLogicalHeight(route);
  const wallBottom = height - GROUND_HEIGHT;
  const wallTop = wallBottom - wallHeight(route) - SUMMIT_HEIGHT;
  const bands: WallBand[] = [];

  let i = 0;
  for (let y = wallTop; y < wallBottom; y += BAND_HEIGHT, i++) {
    const y1 = Math.min(y + BAND_HEIGHT, wallBottom);
    let left = WALL_LEFT + EDGE_BITES[i % EDGE_BITES.length];
    let right = WALL_RIGHT - EDGE_BITES[(i + 3) % EDGE_BITES.length];
    if (i === 0) {
      left += 10;
      right -= 14;
    }
    // Flare unconditionally wins over summit narrowing — keep this block last.
    if (y1 > wallBottom - BAND_HEIGHT * 2) {
      left = WALL_LEFT - BASE_FLARE;
      right = WALL_RIGHT + BASE_FLARE;
    }
    bands.push({ y0: y, y1, left, right });
  }
  return bands;
}

// Where the climber hangs: the leading tip of the rope mid-animation, or
// the final top anchor at rest. Null when the route has no pitches.
export function climberPoint(route: Route, progress: RenderProgress): AnchorPoint | null {
  const segments = computeSegments(route);
  if (segments.length === 0) return null;

  if (progress.pitchIndex >= segments.length) {
    const top = segments[segments.length - 1].top;
    return { x: top.x, y: top.y };
  }

  const seg = segments[Math.max(0, progress.pitchIndex)];
  const pts = ropePath(seg);
  const f = Math.min(1, Math.max(0, progress.fraction));
  return pts[Math.min(pts.length - 1, Math.floor(f * (pts.length - 1)))];
}
