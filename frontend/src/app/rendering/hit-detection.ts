import { Route } from '../models/route.model';
import { LOGICAL_WIDTH, PitchSegment, computeLogicalHeight, computeSegments } from './layout';

const HIT_PADDING = 6; // logical pixels around the line for forgiving clicks

export function hitTest(
  route: Route,
  canvasWidthDevicePx: number,
  canvasHeightDevicePx: number,
  devicePxX: number,
  devicePxY: number
): number | null {
  if (route.pitches.length === 0) return null;

  const logicalHeight = computeLogicalHeight(route.pitches.length);
  const logicalX = (devicePxX / canvasWidthDevicePx) * LOGICAL_WIDTH;
  const logicalY = (devicePxY / canvasHeightDevicePx) * logicalHeight;

  const segments = computeSegments(route);
  let bestIdx: number | null = null;
  let bestDist = HIT_PADDING + 0.5;

  for (const seg of segments) {
    const dist = distanceToSegment(logicalX, logicalY, seg);
    if (dist < bestDist) {
      bestDist = dist;
      bestIdx = seg.pitchIndex;
    }
  }

  return bestIdx;
}

function distanceToSegment(px: number, py: number, seg: PitchSegment): number {
  const { bottom: a, top: b } = seg;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) {
    return Math.hypot(px - a.x, py - a.y);
  }
  const t = clamp01(((px - a.x) * dx + (py - a.y) * dy) / lenSq);
  const projX = a.x + t * dx;
  const projY = a.y + t * dy;
  return Math.hypot(px - projX, py - projY);
}

function clamp01(v: number): number {
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
}
