// Logical-pixel layout math shared by the renderer and hit detection.
// All coordinates are in NES-style logical pixels (pre-scale).

import { Route } from '../models/route.model';

export const LOGICAL_WIDTH = 256;
export const GROUND_HEIGHT = 24;
export const SKY_HEIGHT = 40;
export const SUMMIT_HEIGHT = 16;
export const WALL_LEFT = 64;
export const WALL_RIGHT = 192;
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

// Deterministic horizontal wander for anchors so the route line looks hand-drawn.
// Pitch 0 starts at the wall center; subsequent anchors offset by a smooth zig-zag.
export function anchorX(anchorIndex: number): number {
  const span = (WALL_RIGHT - WALL_LEFT) / 2 - 12;
  const phase = anchorIndex % 4;
  const offsets = [0, span * 0.5, 0, -span * 0.5];
  return Math.round(WALL_CENTER + offsets[phase]);
}
