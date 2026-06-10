import { SPRITE_PALETTES } from './nes-palette';
import {
  ANCHOR_STATION, BIRD, CLIMBER, CLOUD, PINE, QUICKDRAW, SpriteMatrix, drawSprite,
} from './sprites';

class MockCtx {
  fillStyle = '';
  rects: Array<{ x: number; y: number; color: string }> = [];
  fillRect(x: number, y: number): void { this.rects.push({ x, y, color: this.fillStyle }); }
  save(): void {}
  restore(): void {}
  scale(): void {}
}

function maxIndex(m: SpriteMatrix): number {
  return Math.max(...m.flatMap((row) => [...row]));
}

describe('sprites', () => {
  const cases: Array<[string, SpriteMatrix, readonly string[]]> = [
    ['CLIMBER', CLIMBER, SPRITE_PALETTES.climber],
    ['QUICKDRAW', QUICKDRAW, SPRITE_PALETTES.quickdraw],
    ['ANCHOR_STATION', ANCHOR_STATION, SPRITE_PALETTES.anchor],
    ['CLOUD', CLOUD, SPRITE_PALETTES.cloud],
    ['PINE', PINE, SPRITE_PALETTES.pine],
    ['BIRD', BIRD, SPRITE_PALETTES.bird],
  ];

  it.each(cases)('%s is rectangular and indices fit its palette', (_name, matrix, colors) => {
    const width = matrix[0].length;
    for (const row of matrix) expect(row.length).toBe(width);
    expect(maxIndex(matrix)).toBeLessThanOrEqual(colors.length);
    expect(maxIndex(matrix)).toBeGreaterThan(0);
  });

  it('CLIMBER is 8x8 and QUICKDRAW is 5x9', () => {
    expect(CLIMBER.length).toBe(8);
    expect(CLIMBER[0].length).toBe(8);
    expect(QUICKDRAW.length).toBe(9);
    expect(QUICKDRAW[0].length).toBe(5);
  });

  it('drawSprite paints one rect per non-zero pixel at the right offset', () => {
    const ctx = new MockCtx();
    const m: SpriteMatrix = [
      [0, 1],
      [2, 0],
    ];
    drawSprite(ctx as unknown as CanvasRenderingContext2D, m, ['#111111', '#222222'], 10, 20);
    expect(ctx.rects).toEqual([
      { x: 11, y: 20, color: '#111111' },
      { x: 10, y: 21, color: '#222222' },
    ]);
  });

  it('drawSprite skips zero pixels entirely', () => {
    const ctx = new MockCtx();
    drawSprite(ctx as unknown as CanvasRenderingContext2D, [[0, 0, 0]], ['#111111'], 0, 0);
    expect(ctx.rects.length).toBe(0);
  });
});
