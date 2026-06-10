import { Route } from '../models/route.model';
import { LOGICAL_WIDTH, computeLogicalHeight, computeSegments, ropePath } from './layout';

const HIT_PADDING = 6; // logical pixels around the rope for forgiving clicks

export function hitTest(
  route: Route,
  canvasWidthDevicePx: number,
  canvasHeightDevicePx: number,
  devicePxX: number,
  devicePxY: number
): number | null {
  if (route.pitches.length === 0) return null;

  const logicalHeight = computeLogicalHeight(route);
  const logicalX = (devicePxX / canvasWidthDevicePx) * LOGICAL_WIDTH;
  const logicalY = (devicePxY / canvasHeightDevicePx) * logicalHeight;

  let bestIdx: number | null = null;
  let bestDist = HIT_PADDING + 0.5;

  for (const seg of computeSegments(route)) {
    // Rope samples are <= 1px apart, so nearest-point distance is exact
    // enough; no segment projection needed.
    for (const p of ropePath(seg)) {
      const dist = Math.hypot(logicalX - p.x, logicalY - p.y);
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = seg.pitchIndex;
      }
    }
  }

  return bestIdx;
}
