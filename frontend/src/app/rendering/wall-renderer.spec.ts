import { FULLY_RENDERED, renderScene } from './wall-renderer';
import { ROCK_TYPES, RockType, Route } from '../models/route.model';

// jsdom does not implement a real canvas, so we stub a minimal recording
// CanvasRenderingContext2D. The goal is to confirm the renderer runs without
// throwing across the full code path and exercises the painting primitives.
class MockCtx {
  fillStyle = '';
  calls = 0;
  fillRect(): void { this.calls++; }
  save(): void {}
  restore(): void {}
  scale(): void {}
}

function makeRoute(pitchCount: number, rockType: RockType = 'granite'): Route {
  return {
    name: 'r',
    featureName: 'f',
    rockType,
    pitches: Array.from({ length: pitchCount }, (_, i) => ({
      grade: '5.10',
      lengthFt: 100 + i * 10,
      description: 'desc ' + i,
    })),
  };
}

describe('renderScene', () => {
  it('runs without throwing on a fully-rendered route', () => {
    const ctx = new MockCtx();
    expect(() => renderScene(ctx as unknown as CanvasRenderingContext2D, makeRoute(3), FULLY_RENDERED)).not.toThrow();
    expect(ctx.calls).toBeGreaterThan(0);
  });

  it('runs without throwing on a zero-pitch route', () => {
    const ctx = new MockCtx();
    expect(() => renderScene(ctx as unknown as CanvasRenderingContext2D, makeRoute(0), FULLY_RENDERED)).not.toThrow();
  });

  it('renders less for a partially animated route than a fully rendered one', () => {
    const fullCtx = new MockCtx();
    renderScene(fullCtx as unknown as CanvasRenderingContext2D, makeRoute(4), FULLY_RENDERED);

    const partialCtx = new MockCtx();
    renderScene(partialCtx as unknown as CanvasRenderingContext2D, makeRoute(4), { pitchIndex: 0, fraction: 0.1 });

    expect(partialCtx.calls).toBeLessThan(fullCtx.calls);
  });

  it('runs without throwing for every rock type', () => {
    for (const rt of ROCK_TYPES) {
      const ctx = new MockCtx();
      expect(() =>
        renderScene(ctx as unknown as CanvasRenderingContext2D, makeRoute(3, rt), FULLY_RENDERED),
      ).not.toThrow();
      expect(ctx.calls).toBeGreaterThan(0);
    }
  });

  it('renders a taller wall for routes with longer pitches', () => {
    const ctxA = new MockCtx();
    const ctxB = new MockCtx();
    const shortRoute: Route = { ...makeRoute(3), pitches: [
      { grade: '5.10', lengthFt: 50, description: '' },
      { grade: '5.10', lengthFt: 50, description: '' },
      { grade: '5.10', lengthFt: 50, description: '' },
    ]};
    const tallRoute: Route = { ...makeRoute(3), pitches: [
      { grade: '5.10', lengthFt: 400, description: '' },
      { grade: '5.10', lengthFt: 400, description: '' },
      { grade: '5.10', lengthFt: 400, description: '' },
    ]};
    renderScene(ctxA as unknown as CanvasRenderingContext2D, shortRoute, FULLY_RENDERED);
    renderScene(ctxB as unknown as CanvasRenderingContext2D, tallRoute, FULLY_RENDERED);
    expect(ctxB.calls).toBeGreaterThan(ctxA.calls);
  });

  it('renders the same scene deterministically', () => {
    const a = new MockCtx();
    const b = new MockCtx();
    renderScene(a as unknown as CanvasRenderingContext2D, makeRoute(3), FULLY_RENDERED);
    renderScene(b as unknown as CanvasRenderingContext2D, makeRoute(3), FULLY_RENDERED);
    expect(a.calls).toBe(b.calls);
  });

  it('mid-animation renders at least the climber even at fraction 0', () => {
    const ctx = new MockCtx();
    renderScene(ctx as unknown as CanvasRenderingContext2D, makeRoute(2), { pitchIndex: 0, fraction: 0 });
    expect(ctx.calls).toBeGreaterThan(0);
  });
});
