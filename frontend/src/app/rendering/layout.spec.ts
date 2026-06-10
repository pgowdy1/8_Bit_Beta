import {
  FULLY_RENDERED,
  GROUND_HEIGHT,
  LOGICAL_WIDTH,
  MIN_PITCH_PX,
  PIXELS_PER_FOOT,
  SKY_HEIGHT,
  SUMMIT_HEIGHT,
  WALL_LEFT,
  WALL_RIGHT,
  anchorX,
  computeLogicalHeight,
  computeSegments,
  pitchPx,
  ropePath,
} from './layout';
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

describe('layout', () => {
  it('logical width matches NES screen width', () => {
    expect(LOGICAL_WIDTH).toBe(256);
  });

  it('wall sits between left and right bounds', () => {
    expect(WALL_LEFT).toBeLessThan(WALL_RIGHT);
    expect(WALL_LEFT).toBeGreaterThan(0);
    expect(WALL_RIGHT).toBeLessThan(LOGICAL_WIDTH);
  });

  it('pitchPx scales linearly with length', () => {
    expect(pitchPx(100)).toBe(Math.round(100 * PIXELS_PER_FOOT));
    expect(pitchPx(200)).toBe(Math.round(200 * PIXELS_PER_FOOT));
    expect(pitchPx(200)).toBe(pitchPx(100) * 2);
  });

  it('pitchPx clamps to MIN_PITCH_PX for zero/short pitches', () => {
    expect(pitchPx(0)).toBe(MIN_PITCH_PX);
    expect(pitchPx(-50)).toBe(MIN_PITCH_PX);
    expect(pitchPx(1)).toBe(MIN_PITCH_PX);
  });

  it('logical height grows with longer pitches', () => {
    const shortRoute = makeRoute([100, 100, 100]);
    const tallRoute = makeRoute([200, 200, 200]);
    expect(computeLogicalHeight(tallRoute)).toBeGreaterThan(computeLogicalHeight(shortRoute));
  });

  it('includes ground, wall, summit, and sky room', () => {
    const route = makeRoute([100, 100, 100]);
    const wallPx = 3 * Math.round(100 * PIXELS_PER_FOOT);
    expect(computeLogicalHeight(route)).toBe(GROUND_HEIGHT + wallPx + SUMMIT_HEIGHT + SKY_HEIGHT);
  });

  it('computeSegments produces one segment per pitch', () => {
    const segs = computeSegments(makeRoute([100, 100, 100, 100, 100]));
    expect(segs.length).toBe(5);
  });

  it('segments stack bottom-to-top with cumulative heights', () => {
    const segs = computeSegments(makeRoute([100, 100, 100, 100]));
    for (let i = 0; i < segs.length - 1; i++) {
      expect(segs[i].top.y).toBeLessThan(segs[i].bottom.y);
      expect(segs[i].top.y).toBe(segs[i + 1].bottom.y);
    }
  });

  it('segment heights mirror pitch lengths', () => {
    const segs = computeSegments(makeRoute([100, 200, 50]));
    const h0 = segs[0].bottom.y - segs[0].top.y;
    const h1 = segs[1].bottom.y - segs[1].top.y;
    const h2 = segs[2].bottom.y - segs[2].top.y;
    expect(h0).toBe(pitchPx(100));
    expect(h1).toBe(pitchPx(200));
    expect(h2).toBe(pitchPx(50));
  });

  it('anchorX produces a smooth zig-zag, period 4', () => {
    expect(anchorX(0)).toBe(anchorX(4));
    expect(anchorX(1)).toBe(anchorX(5));
  });

  it('anchorX stays within wall horizontal bounds', () => {
    for (let i = 0; i < 20; i++) {
      const x = anchorX(i);
      expect(x).toBeGreaterThanOrEqual(WALL_LEFT);
      expect(x).toBeLessThanOrEqual(WALL_RIGHT);
    }
  });

  it('zero-pitch route still has positive height', () => {
    expect(computeLogicalHeight(makeRoute([]))).toBeGreaterThan(0);
  });

  it('ropePath starts exactly at the bottom anchor and ends exactly at the top anchor', () => {
    const segs = computeSegments(makeRoute([100, 150]));
    for (const seg of segs) {
      const pts = ropePath(seg);
      expect(pts[0]).toEqual({ x: seg.bottom.x, y: seg.bottom.y });
      expect(pts[pts.length - 1]).toEqual({ x: seg.top.x, y: seg.top.y });
    }
  });

  it('ropePath is deterministic', () => {
    const seg = computeSegments(makeRoute([120]))[0];
    expect(ropePath(seg)).toEqual(ropePath(seg));
  });

  it('ropePath bows away from the straight chord but never more than 5px', () => {
    const seg = computeSegments(makeRoute([200]))[0];
    const pts = ropePath(seg);
    let maxDev = 0;
    for (const p of pts) {
      // Chord is vertical-ish; measure horizontal deviation from the
      // linear interpolation between endpoints at the same y-progress.
      const t = (seg.bottom.y - p.y) / (seg.bottom.y - seg.top.y);
      const chordX = seg.bottom.x + (seg.top.x - seg.bottom.x) * t;
      maxDev = Math.max(maxDev, Math.abs(p.x - chordX));
    }
    expect(maxDev).toBeGreaterThan(0);
    expect(maxDev).toBeLessThanOrEqual(5);
  });

  it('ropePath has no duplicate consecutive points and is dense (>= chord length points)', () => {
    const seg = computeSegments(makeRoute([100]))[0];
    const pts = ropePath(seg);
    for (let i = 1; i < pts.length; i++) {
      expect(pts[i].x !== pts[i - 1].x || pts[i].y !== pts[i - 1].y).toBe(true);
    }
    expect(pts.length).toBeGreaterThanOrEqual(seg.bottom.y - seg.top.y);
  });

  it('FULLY_RENDERED marks every pitch as drawn', () => {
    expect(FULLY_RENDERED.pitchIndex).toBeGreaterThan(1000);
    expect(FULLY_RENDERED.fraction).toBe(1);
  });
});
