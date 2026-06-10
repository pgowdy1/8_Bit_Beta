import { Route, RockType } from '../models/route.model';
import { NES, ROCK_PALETTES, RockPalette } from './nes-palette';
import {
  GROUND_HEIGHT,
  LOGICAL_WIDTH,
  RenderProgress,
  SUMMIT_HEIGHT,
  WALL_LEFT,
  WALL_RIGHT,
  computeLogicalHeight,
  computeSegments,
  wallHeight,
} from './layout';

export { FULLY_RENDERED } from './layout';
export type { RenderProgress } from './layout';

// TEMPORARY shim until Task 9 rewrites this file.
const SCENE_PALETTES = {
  sky: ['#F8A85A', '#A4E4FC', '#FCFCFC', '#3CBCFC'],
  ground: ['#2A2030', '#3A2A40', '#201828', '#7C7C7C'],
  route: ['#000000', '#A81000', '#F83800', '#FFF0A0'],
} as const;

// Render the entire scene to a logical-pixel canvas. Caller is responsible for
// sizing the backing store to LOGICAL_WIDTH x computeLogicalHeight(pitchCount)
// and disabling image smoothing on any upscaling context.
export function renderScene(
  ctx: CanvasRenderingContext2D,
  route: Route,
  progress: RenderProgress
): void {
  const height = computeLogicalHeight(route);

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
  const wallTopY = wallTopYFor(route, height);
  const wallBottomY = height - GROUND_HEIGHT;
  const palette = ROCK_PALETTES[route.rockType] ?? ROCK_PALETTES.granite;

  // Base wall fill
  ctx.fillStyle = palette.base;
  ctx.fillRect(WALL_LEFT, wallTopY, WALL_RIGHT - WALL_LEFT, wallBottomY - wallTopY);

  // Edge irregularity: notches on left and right (carved back to sky)
  ctx.fillStyle = SCENE_PALETTES.sky[0];
  for (let y = wallTopY + 6; y < wallBottomY; y += 14) {
    const leftBite = ((y / 14) | 0) % 2 === 0 ? 2 : 4;
    const rightBite = ((y / 14) | 0) % 2 === 0 ? 4 : 2;
    ctx.fillRect(WALL_LEFT, y, leftBite, 4);
    ctx.fillRect(WALL_RIGHT - rightBite, y + 6, rightBite, 4);
  }

  paintRockTexture(ctx, route.rockType, palette, wallTopY, wallBottomY);

  // Summit cap: highlight band along the top
  ctx.fillStyle = palette.midtone;
  ctx.fillRect(WALL_LEFT + 4, wallTopY, WALL_RIGHT - WALL_LEFT - 8, 2);
  ctx.fillStyle = palette.highlight;
  ctx.fillRect(WALL_LEFT + 16, wallTopY + 2, WALL_RIGHT - WALL_LEFT - 32, 1);
}

function wallTopYFor(route: Route, height: number): number {
  return height - GROUND_HEIGHT - wallHeight(route) - SUMMIT_HEIGHT;
}

function paintRockTexture(
  ctx: CanvasRenderingContext2D,
  rockType: RockType,
  palette: RockPalette,
  wallTopY: number,
  wallBottomY: number
): void {
  switch (rockType) {
    case 'limestone': return paintLimestone(ctx, palette, wallTopY, wallBottomY);
    case 'basalt':    return paintBasalt(ctx, palette, wallTopY, wallBottomY);
    case 'sandstone': return paintSandstone(ctx, palette, wallTopY, wallBottomY);
    case 'granite':
    default:          return paintGranite(ctx, palette, wallTopY, wallBottomY);
  }
}

// Granite: speckled crystals + occasional bright crystal clusters + thin diagonal cracks.
function paintGranite(
  ctx: CanvasRenderingContext2D,
  palette: RockPalette,
  wallTopY: number,
  wallBottomY: number
): void {
  const xMin = WALL_LEFT + 4;
  const xMax = WALL_RIGHT - 4;

  // Dense pepper of shadow + highlight pixels
  for (let y = wallTopY; y < wallBottomY; y += 2) {
    for (let x = xMin; x < xMax; x += 2) {
      const seed = (x * 17 + y * 31) % 23;
      if (seed < 4) {
        ctx.fillStyle = palette.shadow;
        ctx.fillRect(x, y, 1, 1);
      } else if (seed < 7) {
        ctx.fillStyle = palette.highlight;
        ctx.fillRect(x, y, 1, 1);
      } else if (seed < 10) {
        ctx.fillStyle = palette.midtone;
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }

  // Crystal clusters: 3x3 highlight squares with shadow corners
  ctx.fillStyle = palette.highlight;
  for (let y = wallTopY + 8; y < wallBottomY - 4; y += 28) {
    for (let x = xMin + 6; x < xMax - 6; x += 32) {
      const offset = ((y / 28) | 0) % 2 === 0 ? 0 : 12;
      const cx = x + offset;
      ctx.fillRect(cx, y, 3, 3);
      ctx.fillStyle = palette.shadow;
      ctx.fillRect(cx, y + 2, 1, 1);
      ctx.fillRect(cx + 2, y, 1, 1);
      ctx.fillStyle = palette.highlight;
    }
  }

  // Thin diagonal cracks (one every ~50px)
  ctx.fillStyle = palette.shadow;
  for (let y = wallTopY + 18; y < wallBottomY - 8; y += 52) {
    const startX = xMin + ((y / 52) | 0) % 4 * 6;
    for (let i = 0; i < 26; i++) {
      ctx.fillRect(startX + i, y + (i >> 1), 1, 1);
    }
  }
}

// Limestone: horizontal sediment bands + pockets (carved circular shadows) + drips.
function paintLimestone(
  ctx: CanvasRenderingContext2D,
  palette: RockPalette,
  wallTopY: number,
  wallBottomY: number
): void {
  const xMin = WALL_LEFT + 4;
  const xMax = WALL_RIGHT - 4;
  const width = xMax - xMin;

  // Faint horizontal banding
  ctx.fillStyle = palette.shadow;
  for (let y = wallTopY + 3; y < wallBottomY; y += 7) {
    ctx.fillRect(xMin, y, width, 1);
  }

  // Midtone wash speckle between bands
  ctx.fillStyle = palette.midtone;
  for (let y = wallTopY + 1; y < wallBottomY; y += 7) {
    for (let x = xMin; x < xMax; x += 5) {
      if (((x + y) * 13) % 17 < 6) ctx.fillRect(x, y, 1, 1);
    }
  }

  // Pockets: 3x3 carved holes with shadow rim
  for (let y = wallTopY + 8; y < wallBottomY - 4; y += 22) {
    for (let x = xMin + 4; x < xMax - 4; x += 28) {
      const off = ((y / 22) | 0) % 2 === 0 ? 0 : 14;
      const cx = x + off;
      ctx.fillStyle = palette.shadow;
      ctx.fillRect(cx, y, 3, 3);
      ctx.fillRect(cx + 1, y - 1, 1, 1);
      ctx.fillRect(cx + 1, y + 3, 1, 1);
      // tiny highlight on the lip
      ctx.fillStyle = palette.highlight;
      ctx.fillRect(cx, y - 1, 1, 1);
    }
  }

  // Tufa drips: 1px vertical streaks of midtone
  ctx.fillStyle = palette.midtone;
  for (let i = 0; i < 6; i++) {
    const x = xMin + 12 + i * 22 + (i % 2) * 4;
    const top = wallTopY + 6 + (i * 9) % 18;
    const len = 9 + (i * 5) % 8;
    if (x < xMax && top + len < wallBottomY) {
      ctx.fillRect(x, top, 1, len);
    }
  }
}

// Basalt: vertical columnar joints + horizontal strata bands + glints at column tops.
function paintBasalt(
  ctx: CanvasRenderingContext2D,
  palette: RockPalette,
  wallTopY: number,
  wallBottomY: number
): void {
  const xMin = WALL_LEFT;
  const xMax = WALL_RIGHT;
  const colWidth = 10;

  // Horizontal strata: 2px midtone bands every 14 rows
  ctx.fillStyle = palette.midtone;
  for (let y = wallTopY + 4; y < wallBottomY; y += 14) {
    ctx.fillRect(xMin + 2, y, xMax - xMin - 4, 1);
    // dotted second row for break-up
    for (let x = xMin + 2; x < xMax - 2; x += 3) {
      ctx.fillRect(x, y + 1, 1, 1);
    }
  }

  // Vertical column edges (1px shadow lines)
  ctx.fillStyle = palette.shadow;
  for (let x = xMin + colWidth; x < xMax; x += colWidth) {
    ctx.fillRect(x, wallTopY, 1, wallBottomY - wallTopY);
  }
  // Doubled edge on alternating columns for depth
  for (let x = xMin + colWidth * 2; x < xMax; x += colWidth * 2) {
    ctx.fillRect(x + 1, wallTopY + 2, 1, wallBottomY - wallTopY - 4);
  }

  // Column tops: short horizontal cap with a violet glint
  for (let x = xMin + colWidth; x < xMax; x += colWidth) {
    ctx.fillStyle = palette.shadow;
    ctx.fillRect(x - 2, wallTopY, 4, 1);
    // glint every other column, every ~36 rows
    for (let y = wallTopY + 6; y < wallBottomY; y += 36) {
      if ((((x / colWidth) | 0) + ((y / 36) | 0)) % 2 === 0) {
        ctx.fillStyle = palette.highlight;
        ctx.fillRect(x - 3, y, 1, 1);
      }
    }
  }
}

// Sandstone: dense horizontal sedimentary lamination + bowl-shaped scoops + grain speckle.
function paintSandstone(
  ctx: CanvasRenderingContext2D,
  palette: RockPalette,
  wallTopY: number,
  wallBottomY: number
): void {
  const xMin = WALL_LEFT + 2;
  const xMax = WALL_RIGHT - 2;
  const width = xMax - xMin;

  // Alternating shadow lines + midtone bands every 8 rows
  for (let y = wallTopY; y < wallBottomY; y += 8) {
    ctx.fillStyle = palette.shadow;
    ctx.fillRect(xMin, y, width, 1);
    ctx.fillStyle = palette.midtone;
    ctx.fillRect(xMin, y + 2, width, 2);
  }

  // Bowl scoops: arc of shadow pixels forming a shallow concave curve
  ctx.fillStyle = palette.shadow;
  for (let y = wallTopY + 12; y < wallBottomY - 6; y += 26) {
    const phase = ((y / 26) | 0) % 3;
    const cx = xMin + 12 + phase * 30;
    if (cx + 12 >= xMax) continue;
    const arc = [0, -1, -2, -2, -2, -1, 0, 1, 1, 1, 1, 0];
    for (let i = 0; i < arc.length; i++) {
      ctx.fillRect(cx + i, y + arc[i] + 2, 1, 1);
    }
  }

  // Highlight grain sparkles
  ctx.fillStyle = palette.highlight;
  for (let y = wallTopY + 1; y < wallBottomY; y += 6) {
    for (let x = xMin; x < xMax; x += 6) {
      if (((x * 7 + y * 11) % 13) < 3) {
        ctx.fillRect(x + 1, y, 1, 1);
      }
    }
  }
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
