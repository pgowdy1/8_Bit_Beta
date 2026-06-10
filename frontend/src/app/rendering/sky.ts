import { LOGICAL_WIDTH, WALL_LEFT, WALL_RIGHT } from './layout';
import { SKY_BANDS, SPRITE_PALETTES, STAR_COLOR, SUN_COLORS } from './nes-palette';
import { BIRD, CLOUD, drawSprite } from './sprites';

// Bottom three (warm) bands hug the horizon at fixed heights; the top three
// (cool) bands split whatever sky remains, so taller routes climb into
// darker sky.
const WARM_BAND_HEIGHT = 18;

export function drawSky(ctx: CanvasRenderingContext2D, horizonY: number): void {
  const warmTop = Math.max(0, horizonY - 3 * WARM_BAND_HEIGHT);
  const coolBandH = Math.ceil(warmTop / 3);

  for (let i = 0; i < 3; i++) {
    const y0 = i * coolBandH;
    const h = Math.min(coolBandH, warmTop - y0);
    if (h <= 0) continue;
    ctx.fillStyle = SKY_BANDS[i];
    ctx.fillRect(0, y0, LOGICAL_WIDTH, h);
  }
  for (let i = 0; i < 3; i++) {
    const y0 = warmTop + i * WARM_BAND_HEIGHT;
    const h = Math.min(WARM_BAND_HEIGHT, horizonY - y0);
    if (h <= 0) continue;
    ctx.fillStyle = SKY_BANDS[3 + i];
    ctx.fillRect(0, y0, LOGICAL_WIDTH, h);
  }

  // Stars: sparse deterministic pepper in the cool bands only.
  ctx.fillStyle = STAR_COLOR;
  for (let y = 2; y < warmTop; y += 8) {
    for (let x = 2; x < LOGICAL_WIDTH; x += 8) {
      if ((x * 31 + y * 17) % 97 < 3) {
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }
}

export function drawSun(ctx: CanvasRenderingContext2D, horizonY: number): void {
  // Low on the horizon, right of the wall; ridges drawn later partially
  // occlude its lower edge.
  const x = LOGICAL_WIDTH - 60;
  ctx.fillStyle = SUN_COLORS.halo;
  ctx.fillRect(x, horizonY - 28, 16, 16);
  ctx.fillStyle = SUN_COLORS.core;
  ctx.fillRect(x + 2, horizonY - 26, 12, 12);
}

export function drawClouds(ctx: CanvasRenderingContext2D, horizonY: number): void {
  // One cloud roughly every 64px of sky, alternating across four columns.
  const xs = [16, 240, 120, 300];
  let i = 0;
  // Skies shorter than ~64px get no clouds — intentional for tiny routes.
  for (let y = 14; y < horizonY - 50; y += 64, i++) {
    drawSprite(ctx, CLOUD, SPRITE_PALETTES.cloud, xs[i % xs.length], y);
  }
}

// NOTE: takes summitY (top of the wall), NOT horizonY like the other draw fns.
export function drawBirds(ctx: CanvasRenderingContext2D, summitY: number): void {
  drawSprite(ctx, BIRD, SPRITE_PALETTES.bird, WALL_LEFT - 30, summitY - 12);
  drawSprite(ctx, BIRD, SPRITE_PALETTES.bird, WALL_RIGHT + 18, summitY - 20);
}
