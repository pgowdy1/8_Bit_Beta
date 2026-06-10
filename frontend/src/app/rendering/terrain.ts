import { RockType, Route } from '../models/route.model';
import { GROUND_COLORS, RIDGE_COLORS, ROCK_PALETTES, RockPalette, SPRITE_PALETTES } from './nes-palette';
import { GROUND_HEIGHT, LOGICAL_WIDTH, WALL_LEFT, WallBand, wallSilhouette } from './layout';
import { PINE, drawSprite } from './sprites';

// Two hazy ridge layers above the horizon, jagged via deterministic step
// heights, drawn far-then-near.
const FAR_STEPS = [22, 16, 26, 12, 20, 24, 14];
const NEAR_STEPS = [12, 8, 14, 6, 10];

export function drawRidges(ctx: CanvasRenderingContext2D, horizonY: number): void {
  drawRidge(ctx, horizonY, RIDGE_COLORS.far, FAR_STEPS, 20);
  drawRidge(ctx, horizonY, RIDGE_COLORS.near, NEAR_STEPS, 16);
}

function drawRidge(
  ctx: CanvasRenderingContext2D,
  horizonY: number,
  color: string,
  steps: readonly number[],
  stepW: number
): void {
  ctx.fillStyle = color;
  let i = 0;
  for (let x = 0; x < LOGICAL_WIDTH; x += stepW, i++) {
    const h = steps[i % steps.length];
    ctx.fillRect(x, horizonY - h, Math.min(stepW, LOGICAL_WIDTH - x), h);
  }
}

export function drawWall(ctx: CanvasRenderingContext2D, route: Route): void {
  const bands = wallSilhouette(route);
  const palette = ROCK_PALETTES[route.rockType] ?? ROCK_PALETTES.granite;

  // Base fill per band
  ctx.fillStyle = palette.base;
  for (const b of bands) {
    ctx.fillRect(b.left, b.y0, b.right - b.left, b.y1 - b.y0);
  }

  paintRockTexture(ctx, route.rockType, palette, bands);

  // Shadow on the left (away from the sun), sunlit edge on the right.
  for (const b of bands) {
    ctx.fillStyle = palette.shadow;
    ctx.fillRect(b.left, b.y0, 4, b.y1 - b.y0);
    ctx.fillStyle = palette.highlight;
    ctx.fillRect(b.right - 3, b.y0, 3, b.y1 - b.y0);
    ctx.fillStyle = palette.midtone;
    ctx.fillRect(b.right - 4, b.y0, 1, b.y1 - b.y0);
  }

  // Summit cap highlight
  const top = bands[0];
  ctx.fillStyle = palette.midtone;
  ctx.fillRect(top.left + 2, top.y0, top.right - top.left - 4, 2);
  ctx.fillStyle = palette.highlight;
  ctx.fillRect(top.left + 6, top.y0 + 2, top.right - top.left - 12, 1);
}

function paintRockTexture(
  ctx: CanvasRenderingContext2D,
  rockType: RockType,
  palette: RockPalette,
  bands: WallBand[]
): void {
  switch (rockType) {
    case 'limestone': return paintLimestone(ctx, palette, bands);
    case 'basalt':    return paintBasalt(ctx, palette, bands);
    case 'sandstone': return paintSandstone(ctx, palette, bands);
    case 'granite':
    default:          return paintGranite(ctx, palette, bands);
  }
}

// Granite: speckled crystals + bright crystal clusters + thin diagonal cracks.
function paintGranite(
  ctx: CanvasRenderingContext2D,
  palette: RockPalette,
  bands: WallBand[]
): void {
  for (const b of bands) {
    for (let y = b.y0; y < b.y1; y += 2) {
      for (let x = b.left + 4; x < b.right - 4; x += 2) {
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
    for (let y = b.y0 + 8; y < b.y1 - 4; y += 28) {
      for (let x = b.left + 6; x < b.right - 10; x += 32) {
        const cx = x + (((y / 28) | 0) % 2 === 0 ? 0 : 12);
        if (cx + 3 >= b.right - 4) continue;
        ctx.fillStyle = palette.highlight;
        ctx.fillRect(cx, y, 3, 3);
        ctx.fillStyle = palette.shadow;
        ctx.fillRect(cx, y + 2, 1, 1);
        ctx.fillRect(cx + 2, y, 1, 1);
      }
    }
    // Thin diagonal cracks
    ctx.fillStyle = palette.shadow;
    for (let y = b.y0 + 10; y < b.y1 - 8; y += 52) {
      const startX = b.left + 8 + (((y / 52) | 0) % 4) * 6;
      for (let i = 0; i < 26; i++) {
        const x = startX + i;
        if (x >= b.right - 4) break;
        ctx.fillRect(x, y + (i >> 1), 1, 1);
      }
    }
  }
}

// Limestone: horizontal sediment bands + carved pockets + tufa drips.
function paintLimestone(
  ctx: CanvasRenderingContext2D,
  palette: RockPalette,
  bands: WallBand[]
): void {
  for (const b of bands) {
    const xMin = b.left + 4;
    const xMax = b.right - 4;
    ctx.fillStyle = palette.shadow;
    for (let y = b.y0 + 3; y < b.y1; y += 7) {
      ctx.fillRect(xMin, y, xMax - xMin, 1);
    }
    ctx.fillStyle = palette.midtone;
    for (let y = b.y0 + 1; y < b.y1; y += 7) {
      for (let x = xMin; x < xMax; x += 5) {
        if (((x + y) * 13) % 17 < 6) ctx.fillRect(x, y, 1, 1);
      }
    }
    for (let y = b.y0 + 8; y < b.y1 - 4; y += 22) {
      for (let x = xMin + 4; x < xMax - 8; x += 28) {
        const cx = x + (((y / 22) | 0) % 2 === 0 ? 0 : 14);
        if (cx + 3 >= xMax) continue;
        ctx.fillStyle = palette.shadow;
        ctx.fillRect(cx, y, 3, 3);
        ctx.fillRect(cx + 1, y - 1, 1, 1);
        ctx.fillRect(cx + 1, y + 3, 1, 1);
        ctx.fillStyle = palette.highlight;
        ctx.fillRect(cx, y - 1, 1, 1);
      }
    }
    // Tufa drips
    ctx.fillStyle = palette.midtone;
    for (let i = 0; i < 6; i++) {
      const x = xMin + 12 + i * 22 + (i % 2) * 4;
      const top = b.y0 + 6 + (i * 9) % 12;
      const len = 9 + (i * 5) % 8;
      if (x < xMax && top + len < b.y1) {
        ctx.fillRect(x, top, 1, len);
      }
    }
  }
}

// Basalt: vertical columnar joints + horizontal strata + violet glints.
function paintBasalt(
  ctx: CanvasRenderingContext2D,
  palette: RockPalette,
  bands: WallBand[]
): void {
  const colWidth = 10;
  for (const b of bands) {
    ctx.fillStyle = palette.midtone;
    for (let y = b.y0 + 4; y < b.y1; y += 14) {
      ctx.fillRect(b.left + 2, y, b.right - b.left - 4, 1);
      for (let x = b.left + 2; x < b.right - 2; x += 3) {
        ctx.fillRect(x, y + 1, 1, 1);
      }
    }
    // Column edges aligned to a global grid so joints line up across bands
    ctx.fillStyle = palette.shadow;
    for (let x = WALL_LEFT - colWidth; x < b.right; x += colWidth) {
      if (x <= b.left + 1) continue;
      ctx.fillRect(x, b.y0, 1, b.y1 - b.y0);
      for (let y = b.y0 + 6; y < b.y1; y += 36) {
        if ((((x / colWidth) | 0) + ((y / 36) | 0)) % 2 === 0) {
          ctx.fillStyle = palette.highlight;
          ctx.fillRect(x - 3, y, 1, 1);
          ctx.fillStyle = palette.shadow;
        }
      }
    }
  }
}

// Sandstone: dense lamination + bowl scoops + grain sparkles.
function paintSandstone(
  ctx: CanvasRenderingContext2D,
  palette: RockPalette,
  bands: WallBand[]
): void {
  for (const b of bands) {
    const xMin = b.left + 2;
    const xMax = b.right - 2;
    for (let y = b.y0; y < b.y1; y += 8) {
      ctx.fillStyle = palette.shadow;
      ctx.fillRect(xMin, y, xMax - xMin, 1);
      ctx.fillStyle = palette.midtone;
      ctx.fillRect(xMin, y + 2, xMax - xMin, Math.min(2, b.y1 - y - 2));
    }
    ctx.fillStyle = palette.shadow;
    for (let y = b.y0 + 12; y < b.y1 - 6; y += 26) {
      const cx = xMin + 12 + (((y / 26) | 0) % 3) * 30;
      if (cx + 12 >= xMax) continue;
      const arc = [0, -1, -2, -2, -2, -1, 0, 1, 1, 1, 1, 0];
      for (let i = 0; i < arc.length; i++) {
        ctx.fillRect(cx + i, y + arc[i] + 2, 1, 1);
      }
    }
    ctx.fillStyle = palette.highlight;
    for (let y = b.y0 + 1; y < b.y1; y += 6) {
      for (let x = xMin; x < xMax; x += 6) {
        if ((x * 7 + y * 11) % 13 < 3) {
          ctx.fillRect(x + 1, y, 1, 1);
        }
      }
    }
  }
}

export function drawGround(ctx: CanvasRenderingContext2D, height: number): void {
  const y0 = height - GROUND_HEIGHT;
  ctx.fillStyle = GROUND_COLORS.base;
  ctx.fillRect(0, y0, LOGICAL_WIDTH, GROUND_HEIGHT);
  ctx.fillStyle = GROUND_COLORS.highlight;
  ctx.fillRect(0, y0, LOGICAL_WIDTH, 2);

  // Sparse dark speckle
  ctx.fillStyle = GROUND_COLORS.speckle;
  for (let y = y0 + 4; y < height; y += 4) {
    for (let x = 0; x < LOGICAL_WIDTH; x += 4) {
      if ((x * 13 + y * 7) % 19 < 3) ctx.fillRect(x, y, 2, 1);
    }
  }

  // Pine silhouettes flanking the wall (wall base spans x=56..200).
  // Sprites are 10 tall; feet sink 2px into the ground.
  for (const x of [4, 22, 40, 206, 224, 242]) {
    drawSprite(ctx, PINE, SPRITE_PALETTES.pine, x, y0 - 8);
  }
}
