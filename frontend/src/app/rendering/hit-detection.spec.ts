import { hitTest } from './hit-detection';
import { computeLogicalHeight, computeSegments, LOGICAL_WIDTH, ropePath } from './layout';
import { Route } from '../models/route.model';

function makeRoute(lengths: number[]): Route {
  return {
    name: 'r',
    featureName: 'f',
    rockType: 'granite',
    pitches: lengths.map((lengthFt) => ({
      grade: '5.10',
      lengthFt,
      description: '',
    })),
  };
}

function uniformRoute(pitchCount: number): Route {
  return makeRoute(Array.from({ length: pitchCount }, () => 100));
}

describe('hitTest', () => {
  it('returns null for an empty route', () => {
    expect(hitTest(makeRoute([]), 100, 100, 50, 50)).toBeNull();
  });

  it('hits an anchor when clicked directly on it', () => {
    const route = uniformRoute(3);
    const segs = computeSegments(route);
    const logicalHeight = computeLogicalHeight(route);
    const canvasW = LOGICAL_WIDTH * 4;
    const canvasH = logicalHeight * 4;

    const target = segs[0]; // first pitch
    const px = (target.bottom.x / LOGICAL_WIDTH) * canvasW;
    const py = (target.bottom.y / logicalHeight) * canvasH;

    expect(hitTest(route, canvasW, canvasH, px, py)).toBe(0);
  });

  it('returns null when click is far from any pitch', () => {
    const route = uniformRoute(3);
    expect(hitTest(route, 1000, 1000, 5, 5)).toBeNull();
  });

  it('disambiguates between adjacent pitches by proximity', () => {
    const route = uniformRoute(5);
    const segs = computeSegments(route);
    const logicalHeight = computeLogicalHeight(route);
    const canvasW = LOGICAL_WIDTH * 4;
    const canvasH = logicalHeight * 4;

    const mid = {
      x: (segs[2].bottom.x + segs[2].top.x) / 2,
      y: (segs[2].bottom.y + segs[2].top.y) / 2,
    };
    const px = (mid.x / LOGICAL_WIDTH) * canvasW;
    const py = (mid.y / logicalHeight) * canvasH;

    expect(hitTest(route, canvasW, canvasH, px, py)).toBe(2);
  });

  it('handles variable-length pitches correctly', () => {
    const route = makeRoute([50, 400, 100]);
    const segs = computeSegments(route);
    const logicalHeight = computeLogicalHeight(route);
    const canvasW = LOGICAL_WIDTH * 4;
    const canvasH = logicalHeight * 4;

    // Click mid-segment of the long middle pitch
    const mid = {
      x: (segs[1].bottom.x + segs[1].top.x) / 2,
      y: (segs[1].bottom.y + segs[1].top.y) / 2,
    };
    const px = (mid.x / LOGICAL_WIDTH) * canvasW;
    const py = (mid.y / logicalHeight) * canvasH;

    expect(hitTest(route, canvasW, canvasH, px, py)).toBe(1);
  });

  it('hits a pitch when clicking the sagging rope, off the straight chord', () => {
    const route = uniformRoute(3);
    const segs = computeSegments(route);
    const logicalHeight = computeLogicalHeight(route);
    const canvasW = LOGICAL_WIDTH * 4;
    const canvasH = logicalHeight * 4;

    const pts = ropePath(segs[1]);
    const mid = pts[Math.floor(pts.length / 2)];
    const px = (mid.x / LOGICAL_WIDTH) * canvasW;
    const py = (mid.y / logicalHeight) * canvasH;

    const chordMidX = (segs[1].bottom.x + segs[1].top.x) / 2;
    const chordMidY = (segs[1].bottom.y + segs[1].top.y) / 2;
    expect(Math.hypot(mid.x - chordMidX, mid.y - chordMidY)).toBeGreaterThan(0);

    expect(hitTest(route, canvasW, canvasH, px, py)).toBe(1);
  });

  it('returns fresh results for a modified route object', () => {
    const routeA = uniformRoute(2);
    const routeB = uniformRoute(5);
    const hA = computeLogicalHeight(routeA);
    const hB = computeLogicalHeight(routeB);
    const segsB = computeSegments(routeB);
    const top = segsB[4];
    const mid = {
      x: (top.bottom.x + top.top.x) / 2,
      y: (top.bottom.y + top.top.y) / 2,
    };
    expect(hitTest(routeA, 256, hA, 5, 5)).toBeNull();
    expect(
      hitTest(routeB, 256, hB, mid.x, mid.y)
    ).toBe(4);
  });
});
