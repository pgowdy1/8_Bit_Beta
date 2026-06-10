import { drawBirds, drawClouds, drawSky, drawSun } from './sky';

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

function ctx(): MockCtx {
  return new MockCtx();
}

describe('sky', () => {
  it('drawSky covers the full sky area from y=0 to the horizon', () => {
    const c = ctx();
    drawSky(c as unknown as CanvasRenderingContext2D, 200);
    const bands = c.rects.filter((r) => r.w === 256 && r.h > 0);
    const minY = Math.min(...bands.map((r) => r.y));
    const maxY = Math.max(...bands.map((r) => r.y + r.h));
    expect(minY).toBe(0);
    expect(maxY).toBe(200);
  });

  it('drawSky stars only appear above the warm horizon bands', () => {
    const c = ctx();
    drawSky(c as unknown as CanvasRenderingContext2D, 200);
    const stars = c.rects.filter((r) => r.w === 1 && r.h === 1);
    expect(stars.length).toBeGreaterThan(0);
    for (const s of stars) expect(s.y).toBeLessThan(200 - 3 * 18);
  });

  it('drawSky handles a tiny sky without throwing', () => {
    expect(() => drawSky(ctx() as unknown as CanvasRenderingContext2D, 40)).not.toThrow();
  });

  it('drawSun paints near the horizon', () => {
    const c = ctx();
    drawSun(c as unknown as CanvasRenderingContext2D, 200);
    expect(c.rects.length).toBeGreaterThan(0);
    for (const r of c.rects) {
      expect(r.y).toBeGreaterThan(200 - 40);
      expect(r.y).toBeLessThan(200);
    }
  });

  it('drawClouds paints more clouds for taller skies', () => {
    const short = ctx();
    const tall = ctx();
    drawClouds(short as unknown as CanvasRenderingContext2D, 150);
    drawClouds(tall as unknown as CanvasRenderingContext2D, 600);
    expect(tall.rects.length).toBeGreaterThan(short.rects.length);
  });

  it('drawBirds paints near the given summit height', () => {
    const c = ctx();
    drawBirds(c as unknown as CanvasRenderingContext2D, 100);
    expect(c.rects.length).toBeGreaterThan(0);
    for (const r of c.rects) {
      expect(Math.abs(r.y - 100)).toBeLessThanOrEqual(24);
    }
  });
});
