import { Route } from '../models/route.model';
import { FULLY_RENDERED, computeSegments, ropePath } from './layout';
import { drawRouteLayer, quickdrawIndices } from './rope';

class MockCtx {
  fillStyle = '';
  calls = 0;
  fillRect(): void { this.calls++; }
  save(): void {}
  restore(): void {}
  scale(): void {}
}

function makeRoute(lengths: number[]): Route {
  return {
    name: 'r',
    featureName: 'f',
    rockType: 'granite',
    pitches: lengths.map((lengthFt) => ({ grade: '5.10', lengthFt, description: '' })),
  };
}

describe('quickdrawIndices', () => {
  it('returns no draws for pitches shorter than 16px', () => {
    const pts = Array.from({ length: 30 }, (_, i) => ({ x: 0, y: 30 - i }));
    expect(quickdrawIndices(pts, 15)).toEqual([]);
  });

  it('returns at least one draw for pitches of 16px or more', () => {
    const pts = Array.from({ length: 40 }, (_, i) => ({ x: 0, y: 40 - i }));
    expect(quickdrawIndices(pts, 16).length).toBe(1);
  });

  it('scales roughly one draw per 40px of pitch height', () => {
    const pts = Array.from({ length: 240 }, (_, i) => ({ x: 0, y: 240 - i }));
    expect(quickdrawIndices(pts, 120).length).toBe(3);
  });

  it('spaces draws strictly inside the pitch, never on the anchors', () => {
    const pts = Array.from({ length: 100 }, (_, i) => ({ x: 0, y: 100 - i }));
    const idxs = quickdrawIndices(pts, 80);
    for (const i of idxs) {
      expect(i).toBeGreaterThan(0);
      expect(i).toBeLessThan(pts.length - 1);
    }
  });
});

describe('drawRouteLayer', () => {
  it('draws nothing for an empty route', () => {
    const ctx = new MockCtx();
    drawRouteLayer(ctx as unknown as CanvasRenderingContext2D, makeRoute([]), FULLY_RENDERED);
    expect(ctx.calls).toBe(0);
  });

  it('draws more as the animation fraction advances', () => {
    const route = makeRoute([100, 100]);
    const early = new MockCtx();
    const late = new MockCtx();
    drawRouteLayer(early as unknown as CanvasRenderingContext2D, route, { pitchIndex: 0, fraction: 0.2 });
    drawRouteLayer(late as unknown as CanvasRenderingContext2D, route, { pitchIndex: 1, fraction: 0.8 });
    expect(late.calls).toBeGreaterThan(early.calls);
  });

  it('fully rendered draws every pitch rope point at least once', () => {
    const route = makeRoute([100, 100, 100]);
    const totalPts = computeSegments(route).reduce((n, s) => n + ropePath(s).length, 0);
    const ctx = new MockCtx();
    drawRouteLayer(ctx as unknown as CanvasRenderingContext2D, route, FULLY_RENDERED);
    expect(ctx.calls).toBeGreaterThan(totalPts);
  });
});
