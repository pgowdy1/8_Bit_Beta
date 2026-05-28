import {
  GROUND_HEIGHT,
  LOGICAL_WIDTH,
  PITCH_HEIGHT,
  SUMMIT_HEIGHT,
  WALL_LEFT,
  WALL_RIGHT,
  anchorX,
  computeLogicalHeight,
  computeSegments,
} from './layout';
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

describe('layout', () => {
  it('logical width matches NES screen width', () => {
    expect(LOGICAL_WIDTH).toBe(256);
  });

  it('wall sits between left and right bounds', () => {
    expect(WALL_LEFT).toBeLessThan(WALL_RIGHT);
    expect(WALL_LEFT).toBeGreaterThan(0);
    expect(WALL_RIGHT).toBeLessThan(LOGICAL_WIDTH);
  });

  it('logical height grows with pitch count', () => {
    const small = computeLogicalHeight(1);
    const big = computeLogicalHeight(10);
    expect(big).toBeGreaterThan(small);
    expect(big - small).toBe(9 * PITCH_HEIGHT);
  });

  it('includes ground, wall, summit, and sky room', () => {
    const h = computeLogicalHeight(3);
    expect(h).toBe(GROUND_HEIGHT + 3 * PITCH_HEIGHT + SUMMIT_HEIGHT + 40);
  });

  it('computeSegments produces one segment per pitch', () => {
    const segs = computeSegments(makeRoute(5));
    expect(segs.length).toBe(5);
  });

  it('segments stack bottom-to-top', () => {
    const segs = computeSegments(makeRoute(4));
    for (let i = 0; i < segs.length - 1; i++) {
      expect(segs[i].top.y).toBeLessThan(segs[i].bottom.y);
      // The top of pitch N == bottom of pitch N+1
      expect(segs[i].top.y).toBe(segs[i + 1].bottom.y);
    }
  });

  it('anchorX phase produces a smooth zig-zag, period 4', () => {
    expect(anchorX(0, 10)).toBe(anchorX(4, 10));
    expect(anchorX(1, 10)).toBe(anchorX(5, 10));
  });

  it('anchorX stays within wall horizontal bounds', () => {
    for (let i = 0; i < 20; i++) {
      const x = anchorX(i, 20);
      expect(x).toBeGreaterThanOrEqual(WALL_LEFT);
      expect(x).toBeLessThanOrEqual(WALL_RIGHT);
    }
  });

  it('zero-pitch route still has positive height (sky + ground + summit + 1 pitch row)', () => {
    expect(computeLogicalHeight(0)).toBeGreaterThan(0);
  });
});
