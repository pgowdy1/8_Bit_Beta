import { Route } from '../models/route.model';
import { AnchorPoint, LOGICAL_WIDTH, computeLogicalHeight, computeSegments, ropePath } from './layout';

const HIT_PADDING = 6; // logical pixels around the rope for forgiving clicks

// hitTest runs on every mousemove; cache the flattened rope samples per
// route object (the store replaces the route on every edit).
const ropeCache = new WeakMap<Route, { pts: AnchorPoint[]; pitchIdx: number[] }>();

function ropeSamples(route: Route): { pts: AnchorPoint[]; pitchIdx: number[] } {
  const cached = ropeCache.get(route);
  if (cached) return cached;
  const pts: AnchorPoint[] = [];
  const pitchIdx: number[] = [];
  for (const seg of computeSegments(route)) {
    for (const p of ropePath(seg)) {
      pts.push(p);
      pitchIdx.push(seg.pitchIndex);
    }
  }
  const entry = { pts, pitchIdx };
  ropeCache.set(route, entry);
  return entry;
}

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

  const { pts, pitchIdx } = ropeSamples(route);
  let bestIdx: number | null = null;
  let bestDist = HIT_PADDING + 0.5;

  // Rope samples are <= 1px apart, so nearest-point distance is exact
  // enough; no segment projection needed.
  for (let i = 0; i < pts.length; i++) {
    const dist = Math.hypot(logicalX - pts[i].x, logicalY - pts[i].y);
    if (dist < bestDist) {
      bestDist = dist;
      bestIdx = pitchIdx[i];
    }
  }

  return bestIdx;
}
