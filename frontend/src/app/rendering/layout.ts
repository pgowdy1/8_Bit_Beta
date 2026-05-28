// Logical-pixel layout math shared by the renderer and hit detection.
// All coordinates are in NES-style logical pixels (pre-scale).

import { Route } from '../models/route.model';

export const LOGICAL_WIDTH = 256;
export const GROUND_HEIGHT = 24;
export const SKY_HEIGHT = 40;
export const PITCH_HEIGHT = 40;
export const SUMMIT_HEIGHT = 16;
export const WALL_LEFT = 64;
export const WALL_RIGHT = 192;
export const WALL_CENTER = (WALL_LEFT + WALL_RIGHT) / 2;

export interface AnchorPoint {
  x: number;
  y: number;
}

export interface PitchSegment {
  pitchIndex: number;
  bottom: AnchorPoint;
  top: AnchorPoint;
}

export function computeLogicalHeight(pitchCount: number): number {
  const wallHeight = Math.max(1, pitchCount) * PITCH_HEIGHT + SUMMIT_HEIGHT;
  return GROUND_HEIGHT + wallHeight + SKY_HEIGHT;
}

// Pitches are stacked bottom-up. The first pitch sits just above the ground;
// each subsequent pitch stacks on top. Anchors are placed at the join between
// consecutive pitches; we wander horizontally slightly so the line zig-zags.
export function computeSegments(route: Route): PitchSegment[] {
  const total = computeLogicalHeight(route.pitches.length);
  const segments: PitchSegment[] = [];

  for (let i = 0; i < route.pitches.length; i++) {
    const bottomY = total - GROUND_HEIGHT - i * PITCH_HEIGHT;
    const topY = bottomY - PITCH_HEIGHT;
    segments.push({
      pitchIndex: i,
      bottom: { x: anchorX(i, route.pitches.length), y: bottomY },
      top: { x: anchorX(i + 1, route.pitches.length), y: topY },
    });
  }

  return segments;
}

// Deterministic horizontal wander for anchors so the route line looks hand-drawn.
// Pitch 0 starts at the wall center; subsequent anchors offset by a smooth zig-zag.
export function anchorX(anchorIndex: number, _pitchCount: number): number {
  const span = (WALL_RIGHT - WALL_LEFT) / 2 - 12;
  // Triangle wave with period 4 to look intentional, not random.
  const phase = anchorIndex % 4;
  const offsets = [0, span * 0.5, 0, -span * 0.5];
  return Math.round(WALL_CENTER + offsets[phase]);
}
