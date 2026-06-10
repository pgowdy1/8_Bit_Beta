import { ROCK_TYPES, RockType, Route } from '../models/route.model';
import { drawGround, drawRidges, drawWall } from './terrain';

class MockCtx {
  fillStyle = '';
  rects: Array<{ x: number; y: number; w: number; h: number; color: string }> = [];
  fillRect(x: number, y: number, w: number, h: number): void {
    this.rects.push({ x, y, w, h, color: this.fillStyle });
  }
  save(): void {}
  restore(): void {}
  scale(): void {}
}

function makeRoute(pitchCount: number, rockType: RockType = 'granite'): Route {
  return {
    name: 'r',
    featureName: 'f',
    rockType,
    pitches: Array.from({ length: pitchCount }, () => ({
      grade: '5.10',
      lengthFt: 100,
      description: '',
    })),
  };
}

describe('terrain', () => {
  it('drawRidges paints two layers spanning the full width above the horizon', () => {
    const c = new MockCtx();
    drawRidges(c as unknown as CanvasRenderingContext2D, 200);
    expect(c.rects.length).toBeGreaterThan(10);
    const colors = new Set(c.rects.map((r) => r.color));
    expect(colors.size).toBe(2);
    for (const r of c.rects) {
      expect(r.y + r.h).toBe(200);
      expect(r.y).toBeGreaterThanOrEqual(200 - 30);
    }
  });

  it('drawWall renders without throwing for every rock type', () => {
    for (const rt of ROCK_TYPES) {
      const c = new MockCtx();
      expect(() =>
        drawWall(c as unknown as CanvasRenderingContext2D, makeRoute(3, rt)),
      ).not.toThrow();
      expect(c.rects.length).toBeGreaterThan(0);
    }
  });

  it('drawWall stays inside the silhouette horizontal limits', () => {
    const c = new MockCtx();
    drawWall(c as unknown as CanvasRenderingContext2D, makeRoute(4));
    for (const r of c.rects) {
      expect(r.x).toBeGreaterThanOrEqual(64 - 8);
      expect(r.x + r.w).toBeLessThanOrEqual(192 + 8);
    }
  });

  it('drawGround fills the ground strip and plants pines', () => {
    const c = new MockCtx();
    drawGround(c as unknown as CanvasRenderingContext2D, 300);
    const base = c.rects.find((r) => r.w === 256 && r.h === 24);
    expect(base).toBeTruthy();
    expect(base!.y).toBe(300 - 24);
    // pine sprite pixels are 1x1 and sit above the ground top
    const pinePixels = c.rects.filter((r) => r.w === 1 && r.h === 1 && r.y < 300 - 24);
    expect(pinePixels.length).toBeGreaterThan(20);
  });
});
