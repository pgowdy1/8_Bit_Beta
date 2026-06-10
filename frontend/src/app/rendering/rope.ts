import { Route } from '../models/route.model';
import { LABEL_COLORS, ROPE_COLORS, SPRITE_PALETTES } from './nes-palette';
import {
  AnchorPoint, PitchSegment, RenderProgress, computeSegments, ropePath,
} from './layout';
import { ANCHOR_STATION, QUICKDRAW, drawSprite } from './sprites';

// Draws everything attached to the route line: sagging rope, quickdraws,
// belay anchor stations, the loose rope tail, and pitch-number labels.
// Progressive reveal mirrors the rope: an element appears once the rope
// has reached it.
export function drawRouteLayer(
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

    const pts = ropePath(seg);
    drawRope(ctx, pts, f);
    drawQuickdraws(ctx, seg, pts, f);

    if (f >= 1) {
      drawSprite(ctx, ANCHOR_STATION, SPRITE_PALETTES.anchor, seg.top.x - 3, seg.top.y - 2);
    }
    if (seg.pitchIndex === 0) {
      drawSprite(ctx, ANCHOR_STATION, SPRITE_PALETTES.anchor, seg.bottom.x - 3, seg.bottom.y - 2);
      drawRopeTail(ctx, seg.bottom);
    }
  }

  drawPitchLabels(ctx, segments, progress);
}

function drawRope(ctx: CanvasRenderingContext2D, pts: AnchorPoint[], f: number): void {
  const count = Math.floor(pts.length * f);
  for (let i = 0; i < count; i++) {
    const p = pts[i];
    ctx.fillStyle = ROPE_COLORS.main;
    ctx.fillRect(p.x, p.y, 2, 1);
    // Twisted-strand shading every few pixels
    if (i % 4 === 0) {
      ctx.fillStyle = ROPE_COLORS.shade;
      ctx.fillRect(p.x, p.y, 1, 1);
    }
  }
}

// ~1 draw per 40px of pitch height; none under 16px. Evenly spaced along
// the sampled rope, never on an anchor.
export function quickdrawIndices(pts: AnchorPoint[], pitchHeightPx: number): number[] {
  if (pitchHeightPx < 16) return [];
  const count = Math.max(1, Math.floor(pitchHeightPx / 40));
  return Array.from({ length: count }, (_, i) =>
    Math.round(((i + 1) / (count + 1)) * (pts.length - 1))
  );
}

function drawQuickdraws(
  ctx: CanvasRenderingContext2D,
  seg: PitchSegment,
  pts: AnchorPoint[],
  f: number
): void {
  const drawn = Math.floor(pts.length * f);
  const verticalDelta = seg.bottom.y - seg.top.y;
  for (const idx of quickdrawIndices(pts, verticalDelta)) {
    if (idx >= drawn) continue;
    const p = pts[idx];
    // Carabiner center (row 7 of the sprite) sits on the rope point.
    drawSprite(ctx, QUICKDRAW, SPRITE_PALETTES.quickdraw, p.x - 2, p.y - 7);
  }
}

function drawRopeTail(ctx: CanvasRenderingContext2D, bottom: AnchorPoint): void {
  ctx.fillStyle = ROPE_COLORS.main;
  ctx.fillRect(bottom.x - 6, bottom.y + 2, 6, 1);
  ctx.fillRect(bottom.x - 7, bottom.y + 3, 1, 2);
  ctx.fillRect(bottom.x - 6, bottom.y + 4, 4, 1);
}

function drawPitchLabels(
  ctx: CanvasRenderingContext2D,
  segments: PitchSegment[],
  progress: RenderProgress
): void {
  for (const seg of segments) {
    if (seg.pitchIndex > progress.pitchIndex) continue;
    const label = String(seg.pitchIndex + 1);
    const x = seg.bottom.x + 6;
    const y = seg.bottom.y - 6;
    // 1px outline for legibility on sky and lit rock
    ctx.fillStyle = LABEL_COLORS.outline;
    for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as const) {
      drawTinyNumber(ctx, label, x + ox, y + oy);
    }
    ctx.fillStyle = LABEL_COLORS.fill;
    drawTinyNumber(ctx, label, x, y);
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
