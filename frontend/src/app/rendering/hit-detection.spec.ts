import { hitTest } from './hit-detection';
import { computeLogicalHeight, computeSegments, LOGICAL_WIDTH } from './layout';
import { Route } from '../models/route.model';

function makeRoute(pitchCount: number): Route {
  return {
    name: 'r',
    featureName: 'f',
    pitches: Array.from({ length: pitchCount }, () => ({
      grade: '5.10',
      lengthFt: 100,
      description: '',
    })),
  };
}

describe('hitTest', () => {
  it('returns null for an empty route', () => {
    expect(hitTest(makeRoute(0), 100, 100, 50, 50)).toBeNull();
  });

  it('hits an anchor when clicked directly on it', () => {
    const route = makeRoute(3);
    const segs = computeSegments(route);
    const logicalHeight = computeLogicalHeight(3);
    const canvasW = LOGICAL_WIDTH * 4;
    const canvasH = logicalHeight * 4;

    const target = segs[0]; // first pitch
    const px = (target.bottom.x / LOGICAL_WIDTH) * canvasW;
    const py = (target.bottom.y / logicalHeight) * canvasH;

    expect(hitTest(route, canvasW, canvasH, px, py)).toBe(0);
  });

  it('returns null when click is far from any pitch', () => {
    const route = makeRoute(3);
    expect(hitTest(route, 1000, 1000, 5, 5)).toBeNull();
  });

  it('disambiguates between adjacent pitches by proximity', () => {
    const route = makeRoute(5);
    const segs = computeSegments(route);
    const logicalHeight = computeLogicalHeight(5);
    const canvasW = LOGICAL_WIDTH * 4;
    const canvasH = logicalHeight * 4;

    // Click on midpoint of pitch 2's segment
    const mid = {
      x: (segs[2].bottom.x + segs[2].top.x) / 2,
      y: (segs[2].bottom.y + segs[2].top.y) / 2,
    };
    const px = (mid.x / LOGICAL_WIDTH) * canvasW;
    const py = (mid.y / logicalHeight) * canvasH;

    expect(hitTest(route, canvasW, canvasH, px, py)).toBe(2);
  });
});
