import { Route } from '../models/route.model';
import { NES, SCENE_PALETTES } from './nes-palette';
import {
  GROUND_HEIGHT,
  LOGICAL_WIDTH,
  PITCH_HEIGHT,
  SUMMIT_HEIGHT,
  WALL_LEFT,
  WALL_RIGHT,
  computeLogicalHeight,
  computeSegments,
} from './layout';

export interface RenderProgress {
  // The pitch currently being drawn; lower-index pitches are fully drawn,
  // higher-index pitches are not drawn at all.
  pitchIndex: number;
  // 0..1 fraction of the current pitch that is drawn.
  fraction: number;
}

export const FULLY_RENDERED: RenderProgress = { pitchIndex: Number.MAX_SAFE_INTEGER, fraction: 1 };

// Render the entire scene to a logical-pixel canvas. Caller is responsible for
// sizing the backing store to LOGICAL_WIDTH x computeLogicalHeight(pitchCount)
// and disabling image smoothing on any upscaling context.
export function renderScene(
  ctx: CanvasRenderingContext2D,
  route: Route,
  progress: RenderProgress
): void {
  const height = computeLogicalHeight(route.pitches.length);

  drawSky(ctx, height);
  drawGround(ctx, height);
  drawWall(ctx, route, height);
  drawClouds(ctx);
  drawRoute(ctx, route, progress);
  drawPitchLabels(ctx, route, progress);
}

function drawSky(ctx: CanvasRenderingContext2D, height: number): void {
  ctx.fillStyle = SCENE_PALETTES.sky[0];
  ctx.fillRect(0, 0, LOGICAL_WIDTH, height);
}

function drawGround(ctx: CanvasRenderingContext2D, height: number): void {
  const y0 = height - GROUND_HEIGHT;
  ctx.fillStyle = SCENE_PALETTES.ground[1];
  ctx.fillRect(0, y0, LOGICAL_WIDTH, GROUND_HEIGHT);

  // Dithered talus speckles
  ctx.fillStyle = SCENE_PALETTES.ground[0];
  for (let y = y0; y < height; y += 4) {
    for (let x = (y / 4) % 2 === 0 ? 0 : 2; x < LOGICAL_WIDTH; x += 4) {
      ctx.fillRect(x, y, 2, 2);
    }
  }

  ctx.fillStyle = SCENE_PALETTES.ground[2];
  for (let x = 0; x < LOGICAL_WIDTH; x += 12) {
    ctx.fillRect(x + 2, y0 + 4, 4, 2);
    ctx.fillRect(x + 6, y0 + 10, 2, 2);
  }
}

function drawWall(ctx: CanvasRenderingContext2D, route: Route, height: number): void {
  const wallTopY = wallTopYFor(route);
  const wallBottomY = height - GROUND_HEIGHT;

  // Base wall fill
  ctx.fillStyle = SCENE_PALETTES.wall[1];
  ctx.fillRect(WALL_LEFT, wallTopY, WALL_RIGHT - WALL_LEFT, wallBottomY - wallTopY);

  // Edge irregularity: notches on left and right every 8 rows
  ctx.fillStyle = SCENE_PALETTES.sky[0];
  for (let y = wallTopY + 6; y < wallBottomY; y += 14) {
    const leftBite = ((y / 14) | 0) % 2 === 0 ? 2 : 4;
    const rightBite = ((y / 14) | 0) % 2 === 0 ? 4 : 2;
    ctx.fillRect(WALL_LEFT, y, leftBite, 4);
    ctx.fillRect(WALL_RIGHT - rightBite, y + 6, rightBite, 4);
  }

  // Rock face dither: alternating dark/light pixels for texture
  for (let y = wallTopY; y < wallBottomY; y += 2) {
    for (let x = WALL_LEFT + 6; x < WALL_RIGHT - 6; x += 6) {
      const seed = (x * 13 + y * 7) % 11;
      if (seed < 3) {
        ctx.fillStyle = SCENE_PALETTES.wall[0];
        ctx.fillRect(x, y, 2, 2);
      } else if (seed < 5) {
        ctx.fillStyle = SCENE_PALETTES.wall[2];
        ctx.fillRect(x + 2, y, 2, 2);
      }
    }
  }

  // Horizontal crack lines (a few per pitch's worth of wall)
  ctx.fillStyle = SCENE_PALETTES.wall[0];
  for (let y = wallTopY + 20; y < wallBottomY; y += 32) {
    const crackLen = 18 + ((y / 32) % 3) * 8;
    const startX = WALL_LEFT + 10 + ((y / 32) % 5) * 4;
    ctx.fillRect(startX, y, crackLen, 1);
  }

  // Summit cap: highlight band along the top
  ctx.fillStyle = SCENE_PALETTES.wall[2];
  ctx.fillRect(WALL_LEFT + 4, wallTopY, WALL_RIGHT - WALL_LEFT - 8, 2);
  ctx.fillStyle = SCENE_PALETTES.wall[3];
  ctx.fillRect(WALL_LEFT + 16, wallTopY + 2, WALL_RIGHT - WALL_LEFT - 32, 1);
}

function wallTopYFor(route: Route): number {
  const height = computeLogicalHeight(route.pitches.length);
  const wallHeight = Math.max(1, route.pitches.length) * PITCH_HEIGHT + SUMMIT_HEIGHT;
  return height - GROUND_HEIGHT - wallHeight;
}

function drawClouds(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = SCENE_PALETTES.sky[2];
  drawCloud(ctx, 24, 16);
  drawCloud(ctx, 200, 28);
}

function drawCloud(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  // Chunky 3-bump cloud, 24x8 logical pixels.
  ctx.fillRect(x + 2, y + 2, 20, 4);
  ctx.fillRect(x + 4, y, 4, 2);
  ctx.fillRect(x + 10, y, 6, 2);
  ctx.fillRect(x + 16, y, 4, 2);
  ctx.fillRect(x, y + 4, 24, 2);
}

function drawRoute(
  ctx: CanvasRenderingContext2D,
  route: Route,
  progress: RenderProgress
): void {
  const segments = computeSegments(route);

  for (const seg of segments) {
    const fullyDrawn = seg.pitchIndex < progress.pitchIndex;
    const partial = seg.pitchIndex === progress.pitchIndex;

    let f = 0;
    if (fullyDrawn) f = 1;
    else if (partial) f = clamp01(progress.fraction);
    else continue;

    drawRouteSegment(ctx, seg.bottom.x, seg.bottom.y, seg.top.x, seg.top.y, f);

    if (fullyDrawn || (partial && f >= 1)) {
      drawAnchor(ctx, seg.top.x, seg.top.y);
    }
    if (seg.pitchIndex === 0) {
      drawAnchor(ctx, seg.bottom.x, seg.bottom.y);
    }
  }
}

function drawRouteSegment(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  fraction: number
): void {
  // Bresenham-style stepping in logical pixels. We render up to `fraction` of
  // the total step count to support animation.
  const dx = x1 - x0;
  const dy = y1 - y0;
  const steps = Math.max(Math.abs(dx), Math.abs(dy));
  const renderSteps = Math.floor(steps * fraction);

  ctx.fillStyle = SCENE_PALETTES.route[3]; // yellow
  for (let i = 0; i <= renderSteps; i++) {
    const t = i / Math.max(1, steps);
    const x = Math.round(x0 + dx * t);
    const y = Math.round(y0 + dy * t);
    ctx.fillRect(x, y, 1, 1);

    // Shadow pixel for legibility on the rock
    if (i % 3 === 0) {
      ctx.fillStyle = SCENE_PALETTES.route[1];
      ctx.fillRect(x + 1, y + 1, 1, 1);
      ctx.fillStyle = SCENE_PALETTES.route[3];
    }
  }
}

function drawAnchor(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  // 4x4 anchor sprite: red core with black outline.
  ctx.fillStyle = SCENE_PALETTES.route[0]; // black
  ctx.fillRect(x - 2, y - 2, 4, 4);
  ctx.fillStyle = SCENE_PALETTES.route[2]; // red
  ctx.fillRect(x - 1, y - 1, 2, 2);
}

function drawPitchLabels(
  ctx: CanvasRenderingContext2D,
  route: Route,
  progress: RenderProgress
): void {
  // Tiny 3x5 pixel numerals next to each anchor (bottom of each pitch).
  // Skip labels for pitches that haven't started rendering yet.
  const segments = computeSegments(route);
  ctx.fillStyle = NES.white;

  for (const seg of segments) {
    if (seg.pitchIndex > progress.pitchIndex) continue;
    const label = String(seg.pitchIndex + 1);
    const labelX = seg.bottom.x + 4;
    const labelY = seg.bottom.y - 4;
    drawTinyNumber(ctx, label, labelX, labelY);
  }
}

const TINY_DIGITS: Record<string, number[][]> = {
  '0': [[1,1,1],[1,0,1],[1,0,1],[1,0,1],[1,1,1]],
  '1': [[0,1,0],[1,1,0],[0,1,0],[0,1,0],[1,1,1]],
  '2': [[1,1,1],[0,0,1],[1,1,1],[1,0,0],[1,1,1]],
  '3': [[1,1,1],[0,0,1],[0,1,1],[0,0,1],[1,1,1]],
  '4': [[1,0,1],[1,0,1],[1,1,1],[0,0,1],[0,0,1]],
  '5': [[1,1,1],[1,0,0],[1,1,1],[0,0,1],[1,1,1]],
  '6': [[1,1,1],[1,0,0],[1,1,1],[1,0,1],[1,1,1]],
  '7': [[1,1,1],[0,0,1],[0,1,0],[0,1,0],[0,1,0]],
  '8': [[1,1,1],[1,0,1],[1,1,1],[1,0,1],[1,1,1]],
  '9': [[1,1,1],[1,0,1],[1,1,1],[0,0,1],[1,1,1]],
};

function drawTinyNumber(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number
): void {
  let cursor = x;
  for (const ch of text) {
    const glyph = TINY_DIGITS[ch];
    if (!glyph) continue;
    for (let row = 0; row < glyph.length; row++) {
      for (let col = 0; col < glyph[row].length; col++) {
        if (glyph[row][col]) {
          ctx.fillRect(cursor + col, y + row, 1, 1);
        }
      }
    }
    cursor += glyph[0].length + 1;
  }
}

function clamp01(v: number): number {
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
}
