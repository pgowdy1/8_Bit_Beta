# Golden Hour Visual Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the topo canvas from a flat gray rectangle into a dramatic golden-hour pixel-art scene — banded alpenglow sky, jagged sunlit wall, sagging rope with quickdraws, climber sprite riding the draw animation — and restyle the UI chrome to match.

**Architecture:** The monolithic `wall-renderer.ts` becomes a thin orchestrator over four new focused modules (`sprites`, `sky`, `terrain`, `rope`). Shared geometry (rope curve sampling, wall silhouette, climber position) lives in `layout.ts` so the renderer and hit detection consume identical math. All drawing stays `fillRect`-based and deterministic (no `Math.random`), so the existing `MockCtx` test pattern keeps working.

**Tech Stack:** Angular 21 (zoneless, signals), TypeScript, Canvas 2D, SCSS, Vitest + jsdom.

**Spec:** `docs/superpowers/specs/2026-06-10-golden-hour-visual-overhaul-design.md`

---

## Ground rules for the implementing engineer

- **Run all frontend commands from `frontend/`.** Tests: `npm test` — Vitest runs once and exits. Do NOT pass `--watch=false` or `--browsers=...` (Karma flags; they break).
- jsdom has no real canvas. Renderer tests use a hand-rolled `MockCtx` (see `src/app/rendering/wall-renderer.spec.ts`). Do NOT install the `canvas` npm package.
- Every `Route` literal in a spec must include `rockType`.
- All paths below are relative to repo root. Source lives under `frontend/src/app/`.
- All drawing uses `ctx.fillRect` only — never `stroke()`/`beginPath()` — so `MockCtx` stays minimal.

## File structure

| File | Status | Responsibility |
|---|---|---|
| `frontend/src/app/rendering/nes-palette.ts` | Modify | + dusk scene constants (`SKY_BANDS`, `RIDGE_COLORS`, `GROUND_COLORS`, `ROPE_COLORS`, `SUN_COLORS`, `STAR_COLOR`, `LABEL_COLORS`, `SPRITE_PALETTES`); recolored `ROCK_PALETTES`; remove `SCENE_PALETTES` |
| `frontend/src/app/rendering/sprites.ts` | Create | Sprite matrices (climber, quickdraw, anchor, cloud, pine, bird) + `drawSprite` |
| `frontend/src/app/rendering/layout.ts` | Modify | + `RenderProgress`/`FULLY_RENDERED` (moved here), `ropePath`, `wallSilhouette`, `climberPoint` |
| `frontend/src/app/rendering/sky.ts` | Create | Sky bands, stars, sun, clouds, birds |
| `frontend/src/app/rendering/terrain.ts` | Create | Ridges, jagged wall + rock textures (moved from wall-renderer), ground, pines |
| `frontend/src/app/rendering/rope.ts` | Create | Rope, quickdraws, anchor stations, pitch labels, rope tail |
| `frontend/src/app/rendering/wall-renderer.ts` | Rewrite | `renderScene` orchestrator + climber placement; re-exports `RenderProgress`/`FULLY_RENDERED` |
| `frontend/src/app/rendering/hit-detection.ts` | Modify | Distance test against `ropePath` samples |
| `frontend/src/styles.scss` | Modify | Dusk theme token values |
| `frontend/src/app/components/route-form/route-form.scss` | Modify | Hardcoded `#881400` → dusk shade |
| `frontend/src/app/components/nes-dialog/nes-dialog.scss` | Modify | Hardcoded `#881400` → dusk shade |

Specs: `nes-palette.spec.ts`, `layout.spec.ts`, `hit-detection.spec.ts` (modify); `sprites.spec.ts`, `sky.spec.ts`, `terrain.spec.ts`, `rope.spec.ts` (create); `wall-renderer.spec.ts` (must keep passing unchanged).

Unchanged: `topo-canvas.ts` (its imports keep resolving via re-exports), `route.model.ts`, backend.

---

### Task 1: Dusk palette constants

**Files:**
- Modify: `frontend/src/app/rendering/nes-palette.ts`
- Test: `frontend/src/app/rendering/nes-palette.spec.ts`

- [ ] **Step 1: Update the palette spec — remove the `SCENE_PALETTES` test, add tests for the new constants**

In `nes-palette.spec.ts`, change the import line to:

```ts
import {
  LABEL_COLORS, NES, NES_PALETTE, RIDGE_COLORS, GROUND_COLORS, ROCK_PALETTES,
  ROPE_COLORS, SKY_BANDS, SPRITE_PALETTES, STAR_COLOR, SUN_COLORS, isValidHex,
} from './nes-palette';
```

Delete the test `'exposes 4 colors per scene palette'` and add these tests in its place:

```ts
  it('exposes six sky bands, all valid hex', () => {
    expect(SKY_BANDS.length).toBe(6);
    for (const c of SKY_BANDS) expect(isValidHex(c)).toBe(true);
  });

  it('scene constants are valid hex', () => {
    const all = [
      RIDGE_COLORS.far, RIDGE_COLORS.near,
      GROUND_COLORS.base, GROUND_COLORS.highlight,
      ROPE_COLORS.main, ROPE_COLORS.shade,
      SUN_COLORS.core, SUN_COLORS.halo,
      STAR_COLOR, LABEL_COLORS.fill, LABEL_COLORS.outline,
      ...Object.values(SPRITE_PALETTES).flat(),
    ];
    for (const c of all) expect(isValidHex(c)).toBe(true);
  });

  it('sky bands are all distinct', () => {
    expect(new Set(SKY_BANDS).size).toBe(6);
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run (from `frontend/`): `npm test`
Expected: FAIL — `nes-palette.spec.ts` cannot resolve `SKY_BANDS` etc. Other spec files still pass.

- [ ] **Step 3: Implement the palette changes**

In `nes-palette.ts`: delete the `SCENE_PALETTES` export entirely. Replace the `ROCK_PALETTES` values with the dusk-lit versions:

```ts
export const ROCK_PALETTES: Record<'granite' | 'limestone' | 'basalt' | 'sandstone', RockPalette> = {
  granite:   { shadow: '#5A4A5A', base: '#8E7E80', midtone: '#B89A8A', highlight: '#E8C8A8' },
  limestone: { shadow: '#7A5A4A', base: '#C8A878', midtone: '#E0C090', highlight: '#F8E8B8' },
  basalt:    { shadow: '#241A28', base: '#4A3A44', midtone: '#6A5258', highlight: '#A87858' },
  sandstone: { shadow: '#6A3A2A', base: '#B86A40', midtone: '#D88A50', highlight: '#F8B878' },
};
```

Add below the `RockPalette` block (keep `NES` and `NES_PALETTE` untouched):

```ts
// ============================================================
// Golden-hour scene constants. Hand-tunable named colors;
// top of sky -> horizon.
// ============================================================
export const SKY_BANDS: readonly string[] = Object.freeze([
  '#2A2A6A', // deep indigo (top)
  '#4A3A8A', // violet
  '#8A4A8A', // magenta
  '#C85A70', // rose
  '#E8804A', // orange
  '#F8A85A', // amber (horizon)
]);

export const RIDGE_COLORS = { far: '#5A3A7A', near: '#3A2A5A' } as const;
export const GROUND_COLORS = { base: '#2A2030', highlight: '#3A2A40', speckle: '#201828' } as const;
export const ROPE_COLORS = { main: '#FFF0A0', shade: '#D8B860' } as const;
export const SUN_COLORS = { core: '#FFE0A0', halo: '#F8A85A' } as const;
export const STAR_COLOR = '#FCFCFC';
export const LABEL_COLORS = { fill: '#FCFCFC', outline: '#2A1A20' } as const;

// Color lists for pixel-matrix sprites (index 1 in a matrix = first entry).
export const SPRITE_PALETTES = {
  climber:   ['#E04028', '#F8D878', '#3CBCFC', '#2A2A4A'], // helmet, skin, shirt, pants
  quickdraw: ['#BCBCBC', '#4A4A4A', '#3CBCFC', '#E8E8E8'], // hanger, bolt, sling, carabiner
  anchor:    ['#BCBCBC', '#2A1A20', '#FFD080'],            // bolts, chain, master point
  cloud:     ['#F8B888', '#C85A70', '#FFE0C0'],            // body, underside, highlight
  pine:      ['#201828'],
  bird:      ['#2A1A20'],
} as const;
```

`wall-renderer.ts` still imports `SCENE_PALETTES` — leave it broken-red in the editor for now; it compiles again in Task 9. To keep the suite green meanwhile, add a temporary const at the top of `wall-renderer.ts` (deleted in Task 9):

```ts
// TEMPORARY shim until Task 9 rewrites this file.
const SCENE_PALETTES = {
  sky: ['#F8A85A', '#A4E4FC', '#FCFCFC', '#3CBCFC'],
  ground: ['#2A2030', '#3A2A40', '#201828', '#7C7C7C'],
  route: ['#000000', '#A81000', '#F83800', '#FFF0A0'],
} as const;
```

and remove `SCENE_PALETTES` from its import statement.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS (all spec files).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/rendering/nes-palette.ts frontend/src/app/rendering/nes-palette.spec.ts frontend/src/app/rendering/wall-renderer.ts
git commit -m "feat: golden-hour dusk palette constants + recolored rock palettes"
```

---

### Task 2: Sprite module

**Files:**
- Create: `frontend/src/app/rendering/sprites.ts`
- Test: `frontend/src/app/rendering/sprites.spec.ts`

- [ ] **Step 1: Write the failing tests**

Create `sprites.spec.ts`:

```ts
import { SPRITE_PALETTES } from './nes-palette';
import {
  ANCHOR_STATION, BIRD, CLIMBER, CLOUD, PINE, QUICKDRAW, SpriteMatrix, drawSprite,
} from './sprites';

class MockCtx {
  fillStyle = '';
  rects: Array<{ x: number; y: number }> = [];
  fillRect(x: number, y: number): void { this.rects.push({ x, y }); }
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
      { x: 11, y: 20 },
      { x: 10, y: 21 },
    ]);
  });

  it('drawSprite skips zero pixels entirely', () => {
    const ctx = new MockCtx();
    drawSprite(ctx as unknown as CanvasRenderingContext2D, [[0, 0, 0]], ['#111111'], 0, 0);
    expect(ctx.rects.length).toBe(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — cannot resolve `./sprites`.

- [ ] **Step 3: Implement sprites.ts**

```ts
// Pixel-matrix sprites. 0 = transparent; 1..n index into a color list
// (see SPRITE_PALETTES in nes-palette.ts). Edit pixels by editing rows.

export type SpriteMatrix = readonly (readonly number[])[];

export function drawSprite(
  ctx: CanvasRenderingContext2D,
  matrix: SpriteMatrix,
  colors: readonly string[],
  x: number,
  y: number
): void {
  for (let row = 0; row < matrix.length; row++) {
    for (let col = 0; col < matrix[row].length; col++) {
      const idx = matrix[row][col];
      if (idx === 0) continue;
      ctx.fillStyle = colors[idx - 1];
      ctx.fillRect(x + col, y + row, 1, 1);
    }
  }
}

// 8x8 climber facing the wall, right arm reaching up.
// 1=helmet 2=skin 3=shirt 4=pants
export const CLIMBER: SpriteMatrix = [
  [0, 0, 0, 1, 1, 0, 0, 2],
  [0, 0, 1, 1, 1, 1, 0, 2],
  [0, 0, 2, 2, 2, 2, 0, 3],
  [0, 3, 3, 3, 3, 3, 3, 3],
  [0, 3, 3, 3, 3, 3, 0, 0],
  [0, 0, 4, 4, 4, 4, 0, 0],
  [0, 4, 4, 0, 0, 4, 4, 0],
  [0, 4, 0, 0, 0, 0, 4, 0],
];

// 5x9 quickdraw: hanger bolted to rock, sling, carabiner (rope passes
// through the hollow center of rows 7-8).
// 1=hanger 2=bolt 3=sling 4=carabiner
export const QUICKDRAW: SpriteMatrix = [
  [0, 1, 1, 1, 0],
  [0, 1, 2, 1, 0],
  [0, 0, 1, 0, 0],
  [0, 0, 3, 0, 0],
  [0, 0, 3, 0, 0],
  [0, 0, 3, 0, 0],
  [0, 4, 4, 4, 0],
  [0, 4, 0, 4, 0],
  [0, 4, 4, 4, 0],
];

// 7x5 belay station: two bolts, chain V, master-point knot.
// 1=bolt 2=chain 3=knot
export const ANCHOR_STATION: SpriteMatrix = [
  [1, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 1],
  [0, 2, 0, 0, 0, 2, 0],
  [0, 0, 2, 0, 2, 0, 0],
  [0, 0, 0, 3, 0, 0, 0],
];

// 20x7 underlit cloud. 1=body 2=underside 3=top highlight
export const CLOUD: SpriteMatrix = [
  [0, 0, 0, 0, 3, 3, 3, 0, 0, 0, 3, 3, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 3, 1, 1, 1, 3, 0, 3, 1, 1, 3, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 3, 1, 1, 1, 1, 1, 3, 1, 1, 1, 1, 3, 0, 0, 3, 3, 0, 0],
  [0, 3, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 3, 3, 1, 1, 3, 0],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [0, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 0],
];

// 7x10 pine silhouette. 1=foliage/trunk
export const PINE: SpriteMatrix = [
  [0, 0, 0, 1, 0, 0, 0],
  [0, 0, 1, 1, 1, 0, 0],
  [0, 0, 1, 1, 1, 0, 0],
  [0, 1, 1, 1, 1, 1, 0],
  [0, 0, 1, 1, 1, 0, 0],
  [0, 1, 1, 1, 1, 1, 0],
  [1, 1, 1, 1, 1, 1, 1],
  [0, 0, 0, 1, 0, 0, 0],
  [0, 0, 0, 1, 0, 0, 0],
  [0, 0, 1, 1, 1, 0, 0],
];

// 5x2 gliding bird silhouette.
export const BIRD: SpriteMatrix = [
  [1, 0, 0, 0, 1],
  [0, 1, 1, 1, 0],
];
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/rendering/sprites.ts frontend/src/app/rendering/sprites.spec.ts
git commit -m "feat: pixel-matrix sprite module (climber, quickdraw, anchor, cloud, pine, bird)"
```

---

### Task 3: Rope curve geometry in layout

**Files:**
- Modify: `frontend/src/app/rendering/layout.ts`
- Modify: `frontend/src/app/rendering/wall-renderer.ts` (move two declarations out)
- Test: `frontend/src/app/rendering/layout.spec.ts`

- [ ] **Step 1: Write the failing tests**

Append to the `describe('layout', ...)` block in `layout.spec.ts` (extend the existing import from `./layout` with `ropePath`, `FULLY_RENDERED`):

```ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `ropePath` / `FULLY_RENDERED` not exported from `./layout`.

- [ ] **Step 3: Implement in layout.ts**

Move `RenderProgress` and `FULLY_RENDERED` from `wall-renderer.ts` into `layout.ts` verbatim:

```ts
export interface RenderProgress {
  // The pitch currently being drawn; lower-index pitches are fully drawn,
  // higher-index pitches are not drawn at all.
  pitchIndex: number;
  // 0..1 fraction of the current pitch that is drawn.
  fraction: number;
}

export const FULLY_RENDERED: RenderProgress = { pitchIndex: Number.MAX_SAFE_INTEGER, fraction: 1 };
```

In `wall-renderer.ts`, delete those two declarations and replace with re-exports (keeps `topo-canvas.ts` imports working). Add `RenderProgress` to the existing `./layout` import (the old function signatures still use it; do NOT import `FULLY_RENDERED` — it is only re-exported, and an unused import would lint-fail):

```ts
import { /* existing names, plus: */ RenderProgress } from './layout';
export { FULLY_RENDERED } from './layout';
export type { RenderProgress } from './layout';
```

Add to `layout.ts`:

```ts
// Rope sag: each pitch's rope bows slightly off the straight chord like a
// weighted lead line. Quadratic bezier, sampled densely and rounded to
// logical pixels. Bow side alternates per pitch.
export const ROPE_SAG_MAX = 4;

export function ropePath(seg: PitchSegment): AnchorPoint[] {
  const { bottom, top } = seg;
  const dx = top.x - bottom.x;
  const dy = top.y - bottom.y;
  const len = Math.hypot(dx, dy);
  if (len === 0) return [{ x: bottom.x, y: bottom.y }];

  const perpX = -dy / len;
  const perpY = dx / len;
  const dir = seg.pitchIndex % 2 === 0 ? 1 : -1;
  const sag = Math.min(ROPE_SAG_MAX, len / 12) * dir;
  const cx = bottom.x + dx / 2 + perpX * sag;
  const cy = bottom.y + dy / 2 + perpY * sag;

  const steps = Math.ceil(len) * 2;
  const points: AnchorPoint[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const mt = 1 - t;
    const x = Math.round(mt * mt * bottom.x + 2 * mt * t * cx + t * t * top.x);
    const y = Math.round(mt * mt * bottom.y + 2 * mt * t * cy + t * t * top.y);
    const prev = points[points.length - 1];
    if (!prev || prev.x !== x || prev.y !== y) points.push({ x, y });
  }
  return points;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS (including the untouched `wall-renderer.spec.ts`).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/rendering/layout.ts frontend/src/app/rendering/layout.spec.ts frontend/src/app/rendering/wall-renderer.ts
git commit -m "feat: sagging rope path geometry shared via layout"
```

---

### Task 4: Wall silhouette + climber position in layout

**Files:**
- Modify: `frontend/src/app/rendering/layout.ts`
- Test: `frontend/src/app/rendering/layout.spec.ts`

- [ ] **Step 1: Write the failing tests**

Append to `layout.spec.ts` (extend the import with `wallSilhouette`, `climberPoint`, `WallBand`, `ropePath` already imported):

```ts
  it('wallSilhouette bands tile the wall region exactly, top to bottom', () => {
    const route = makeRoute([100, 100, 100]);
    const bands = wallSilhouette(route);
    const height = computeLogicalHeight(route);
    expect(bands[0].y0).toBe(height - GROUND_HEIGHT - 3 * pitchPx(100) - SUMMIT_HEIGHT);
    expect(bands[bands.length - 1].y1).toBe(height - GROUND_HEIGHT);
    for (let i = 1; i < bands.length; i++) {
      expect(bands[i].y0).toBe(bands[i - 1].y1);
    }
  });

  it('wallSilhouette keeps every anchor at least 8px inside the rock', () => {
    const route = makeRoute([100, 100, 100, 100, 100, 100]);
    const bands = wallSilhouette(route);
    for (const b of bands) {
      // anchorX range is [102, 154]
      expect(b.left).toBeLessThanOrEqual(102 - 8);
      expect(b.right).toBeGreaterThanOrEqual(154 + 8);
    }
  });

  it('wallSilhouette flares wider at the base than the summit', () => {
    const bands = wallSilhouette(makeRoute([200, 200, 200]));
    const summit = bands[0];
    const base = bands[bands.length - 1];
    expect(base.right - base.left).toBeGreaterThan(summit.right - summit.left);
  });

  it('climberPoint returns null for an empty route', () => {
    expect(climberPoint(makeRoute([]), FULLY_RENDERED)).toBeNull();
  });

  it('climberPoint sits on the rope mid-pitch during animation', () => {
    const route = makeRoute([100, 100]);
    const seg = computeSegments(route)[0];
    const pts = ropePath(seg);
    const pt = climberPoint(route, { pitchIndex: 0, fraction: 0.5 });
    expect(pts).toContainEqual(pt);
    expect(pt!.y).toBeLessThan(seg.bottom.y);
    expect(pt!.y).toBeGreaterThan(seg.top.y);
  });

  it('climberPoint rests at the top anchor when fully rendered', () => {
    const route = makeRoute([100, 100, 100]);
    const segs = computeSegments(route);
    const top = segs[segs.length - 1].top;
    expect(climberPoint(route, FULLY_RENDERED)).toEqual({ x: top.x, y: top.y });
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `wallSilhouette` / `climberPoint` not exported.

- [ ] **Step 3: Implement in layout.ts**

```ts
// Jagged wall silhouette: horizontal bands with deterministic edge notches.
// Summit narrows to a peak; the bottom two bands flare wider like a talus
// apron. Notch depth never exceeds 10px, keeping >= 8px of rock around the
// anchor zone (anchorX range [102, 154]; nominal edges 64/192).
export interface WallBand {
  y0: number;
  y1: number;
  left: number;
  right: number;
}

const BAND_HEIGHT = 12;
const EDGE_BITES = [0, 4, 8, 2, 6, 10, 3, 7];
export const BASE_FLARE = 8;

export function wallSilhouette(route: Route): WallBand[] {
  const height = computeLogicalHeight(route);
  const wallBottom = height - GROUND_HEIGHT;
  const wallTop = wallBottom - wallHeight(route) - SUMMIT_HEIGHT;
  const bands: WallBand[] = [];

  let i = 0;
  for (let y = wallTop; y < wallBottom; y += BAND_HEIGHT, i++) {
    const y1 = Math.min(y + BAND_HEIGHT, wallBottom);
    let left = WALL_LEFT + EDGE_BITES[i % EDGE_BITES.length];
    let right = WALL_RIGHT - EDGE_BITES[(i + 3) % EDGE_BITES.length];
    if (i === 0) {
      left += 10;
      right -= 14;
    }
    if (y1 > wallBottom - BAND_HEIGHT * 2) {
      left = WALL_LEFT - BASE_FLARE;
      right = WALL_RIGHT + BASE_FLARE;
    }
    bands.push({ y0: y, y1, left, right });
  }
  return bands;
}

// Where the climber hangs: the leading tip of the rope mid-animation, or
// the final top anchor at rest. Null when the route has no pitches.
export function climberPoint(route: Route, progress: RenderProgress): AnchorPoint | null {
  const segments = computeSegments(route);
  if (segments.length === 0) return null;

  if (progress.pitchIndex >= segments.length) {
    const top = segments[segments.length - 1].top;
    return { x: top.x, y: top.y };
  }

  const seg = segments[Math.max(0, progress.pitchIndex)];
  const pts = ropePath(seg);
  const f = Math.min(1, Math.max(0, progress.fraction));
  return pts[Math.min(pts.length - 1, Math.floor(f * (pts.length - 1)))];
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/rendering/layout.ts frontend/src/app/rendering/layout.spec.ts
git commit -m "feat: jagged wall silhouette bands + climber position math"
```

---

### Task 5: Hit detection follows the sagging rope

**Files:**
- Modify: `frontend/src/app/rendering/hit-detection.ts`
- Test: `frontend/src/app/rendering/hit-detection.spec.ts`

- [ ] **Step 1: Write the failing test**

Append inside `describe('hitTest', ...)` in `hit-detection.spec.ts` (add `ropePath` to the `./layout` import):

```ts
  it('hits a pitch when clicking the sagging rope, off the straight chord', () => {
    const route = uniformRoute(3);
    const segs = computeSegments(route);
    const logicalHeight = computeLogicalHeight(route);
    const canvasW = LOGICAL_WIDTH * 4;
    const canvasH = logicalHeight * 4;

    const pts = ropePath(segs[1]);
    const mid = pts[Math.floor(pts.length / 2)];
    const px = (mid.x / LOGICAL_WIDTH) * canvasW;
    const py = (mid.y / logicalHeight) * canvasH;

    expect(hitTest(route, canvasW, canvasH, px, py)).toBe(1);
  });
```

- [ ] **Step 2: Run tests to verify the suite still passes (this test may already pass via padding)**

Run: `npm test`
Expected: PASS — sag (≤4px) is inside `HIT_PADDING` (6px), so the old straight-segment math may already satisfy it. That's fine; the implementation change is still required so padding measures from the *visible* rope. Proceed.

- [ ] **Step 3: Reimplement distance test against rope samples**

Replace the entire contents of `hit-detection.ts` with:

```ts
import { Route } from '../models/route.model';
import { LOGICAL_WIDTH, computeLogicalHeight, computeSegments, ropePath } from './layout';

const HIT_PADDING = 6; // logical pixels around the rope for forgiving clicks

export function hitTest(
  route: Route,
  canvasWidthDevicePx: number,
  canvasHeightDevicePx: number,
  devicePxX: number,
  devicePxY: number
): number | null {
  if (route.pitches.length === 0) return null;

  const logicalHeight = computeLogicalHeight(route);
  const logicalX = (devicePxX / canvasWidthDevicePx) * LOGICAL_WIDTH;
  const logicalY = (devicePxY / canvasHeightDevicePx) * logicalHeight;

  let bestIdx: number | null = null;
  let bestDist = HIT_PADDING + 0.5;

  for (const seg of computeSegments(route)) {
    // Rope samples are <= 1px apart, so nearest-point distance is exact
    // enough; no segment projection needed.
    for (const p of ropePath(seg)) {
      const dist = Math.hypot(logicalX - p.x, logicalY - p.y);
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = seg.pitchIndex;
      }
    }
  }

  return bestIdx;
}
```

(The `distanceToSegment` and `clamp01` helpers are deleted.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS — all 5 existing hit-detection tests plus the new one.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/rendering/hit-detection.ts frontend/src/app/rendering/hit-detection.spec.ts
git commit -m "feat: hit detection follows the sagging rope path"
```

---

### Task 6: Sky module

**Files:**
- Create: `frontend/src/app/rendering/sky.ts`
- Test: `frontend/src/app/rendering/sky.spec.ts`

- [ ] **Step 1: Write the failing tests**

Create `sky.spec.ts`:

```ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — cannot resolve `./sky`.

- [ ] **Step 3: Implement sky.ts**

```ts
import { LOGICAL_WIDTH } from './layout';
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
  ctx.fillStyle = SUN_COLORS.halo;
  ctx.fillRect(196, horizonY - 28, 16, 16);
  ctx.fillStyle = SUN_COLORS.core;
  ctx.fillRect(198, horizonY - 26, 12, 12);
}

export function drawClouds(ctx: CanvasRenderingContext2D, horizonY: number): void {
  // One cloud roughly every 64px of sky, alternating across three columns.
  const xs = [16, 150, 90];
  let i = 0;
  for (let y = 14; y < horizonY - 50; y += 64, i++) {
    drawSprite(ctx, CLOUD, SPRITE_PALETTES.cloud, xs[i % xs.length], y);
  }
}

export function drawBirds(ctx: CanvasRenderingContext2D, summitY: number): void {
  drawSprite(ctx, BIRD, SPRITE_PALETTES.bird, 34, summitY - 12);
  drawSprite(ctx, BIRD, SPRITE_PALETTES.bird, 210, summitY - 20);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/rendering/sky.ts frontend/src/app/rendering/sky.spec.ts
git commit -m "feat: alpenglow sky module (banded gradient, stars, sun, clouds, birds)"
```

---

### Task 7: Terrain module (ridges, jagged wall, ground)

**Files:**
- Create: `frontend/src/app/rendering/terrain.ts`
- Test: `frontend/src/app/rendering/terrain.spec.ts`

- [ ] **Step 1: Write the failing tests**

Create `terrain.spec.ts`:

```ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — cannot resolve `./terrain`.

- [ ] **Step 3: Implement terrain.ts**

The four rock textures move here from `wall-renderer.ts`, adapted to paint per silhouette band (seed formulas use absolute coordinates, so patterns stay continuous across bands). Delete them from `wall-renderer.ts` in Task 9.

```ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/rendering/terrain.ts frontend/src/app/rendering/terrain.spec.ts
git commit -m "feat: terrain module - hazy ridges, jagged sunlit wall, dusk ground with pines"
```

---

### Task 8: Rope module (rope, quickdraws, anchors, labels)

**Files:**
- Create: `frontend/src/app/rendering/rope.ts`
- Test: `frontend/src/app/rendering/rope.spec.ts`

- [ ] **Step 1: Write the failing tests**

Create `rope.spec.ts`:

```ts
import { Route } from '../models/route.model';
import { FULLY_RENDERED, computeSegments, ropePath } from './layout';
import { drawRouteLayer, quickdrawIndices } from './rope';

class MockCtx {
  fillStyle = '';
  calls = 0;
  fillRect(): void { this.calls++; }
  save(): void {}
  restore(): void {}
  scale(): void {}
}

function makeRoute(lengths: number[]): Route {
  return {
    name: 'r',
    featureName: 'f',
    rockType: 'granite',
    pitches: lengths.map((lengthFt) => ({ grade: '5.10', lengthFt, description: '' })),
  };
}

describe('quickdrawIndices', () => {
  it('returns no draws for pitches shorter than 16px', () => {
    const pts = Array.from({ length: 30 }, (_, i) => ({ x: 0, y: 30 - i }));
    expect(quickdrawIndices(pts, 15)).toEqual([]);
  });

  it('returns at least one draw for pitches of 16px or more', () => {
    const pts = Array.from({ length: 40 }, (_, i) => ({ x: 0, y: 40 - i }));
    expect(quickdrawIndices(pts, 16).length).toBe(1);
  });

  it('scales roughly one draw per 40px of pitch height', () => {
    const pts = Array.from({ length: 240 }, (_, i) => ({ x: 0, y: 240 - i }));
    expect(quickdrawIndices(pts, 120).length).toBe(3);
  });

  it('spaces draws strictly inside the pitch, never on the anchors', () => {
    const pts = Array.from({ length: 100 }, (_, i) => ({ x: 0, y: 100 - i }));
    const idxs = quickdrawIndices(pts, 80);
    for (const i of idxs) {
      expect(i).toBeGreaterThan(0);
      expect(i).toBeLessThan(pts.length - 1);
    }
  });
});

describe('drawRouteLayer', () => {
  it('draws nothing for an empty route', () => {
    const ctx = new MockCtx();
    drawRouteLayer(ctx as unknown as CanvasRenderingContext2D, makeRoute([]), FULLY_RENDERED);
    expect(ctx.calls).toBe(0);
  });

  it('draws more as the animation fraction advances', () => {
    const route = makeRoute([100, 100]);
    const early = new MockCtx();
    const late = new MockCtx();
    drawRouteLayer(early as unknown as CanvasRenderingContext2D, route, { pitchIndex: 0, fraction: 0.2 });
    drawRouteLayer(late as unknown as CanvasRenderingContext2D, route, { pitchIndex: 1, fraction: 0.8 });
    expect(late.calls).toBeGreaterThan(early.calls);
  });

  it('fully rendered draws every pitch rope point at least once', () => {
    const route = makeRoute([100, 100, 100]);
    const totalPts = computeSegments(route).reduce((n, s) => n + ropePath(s).length, 0);
    const ctx = new MockCtx();
    drawRouteLayer(ctx as unknown as CanvasRenderingContext2D, route, FULLY_RENDERED);
    expect(ctx.calls).toBeGreaterThan(totalPts);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — cannot resolve `./rope`.

- [ ] **Step 3: Implement rope.ts**

The tiny-digit glyphs move here from `wall-renderer.ts` (delete there in Task 9), gaining an outline pass.

```ts
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

    drawRope(ctx, seg, f);
    drawQuickdraws(ctx, seg, f);

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

function drawRope(ctx: CanvasRenderingContext2D, seg: PitchSegment, f: number): void {
  const pts = ropePath(seg);
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

function drawQuickdraws(ctx: CanvasRenderingContext2D, seg: PitchSegment, f: number): void {
  const pts = ropePath(seg);
  const drawn = Math.floor(pts.length * f);
  const h = seg.bottom.y - seg.top.y;
  for (const idx of quickdrawIndices(pts, h)) {
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/rendering/rope.ts frontend/src/app/rendering/rope.spec.ts
git commit -m "feat: rope module - sagging rope, quickdraws, anchor stations, outlined labels"
```

---

### Task 9: Rewrite wall-renderer as orchestrator + climber

**Files:**
- Rewrite: `frontend/src/app/rendering/wall-renderer.ts`
- Test: `frontend/src/app/rendering/wall-renderer.spec.ts` (existing tests must pass UNCHANGED; add two)

- [ ] **Step 1: Add the new climber tests (failing only after rewrite — write them first anyway)**

Append inside `describe('renderScene', ...)` in `wall-renderer.spec.ts` — do not modify the existing tests or `MockCtx`:

```ts
  it('renders the same scene deterministically', () => {
    const a = new MockCtx();
    const b = new MockCtx();
    renderScene(a as unknown as CanvasRenderingContext2D, makeRoute(3), FULLY_RENDERED);
    renderScene(b as unknown as CanvasRenderingContext2D, makeRoute(3), FULLY_RENDERED);
    expect(a.calls).toBe(b.calls);
  });

  it('mid-animation renders at least the climber even at fraction 0', () => {
    const ctx = new MockCtx();
    renderScene(ctx as unknown as CanvasRenderingContext2D, makeRoute(2), { pitchIndex: 0, fraction: 0 });
    expect(ctx.calls).toBeGreaterThan(0);
  });
```

- [ ] **Step 2: Rewrite wall-renderer.ts entirely**

Replace the full file contents with:

```ts
import { Route } from '../models/route.model';
import { SPRITE_PALETTES } from './nes-palette';
import {
  GROUND_HEIGHT, RenderProgress, SUMMIT_HEIGHT,
  climberPoint, computeLogicalHeight, wallHeight,
} from './layout';
import { drawBirds, drawClouds, drawSky, drawSun } from './sky';
import { drawGround, drawRidges, drawWall } from './terrain';
import { drawRouteLayer } from './rope';
import { CLIMBER, drawSprite } from './sprites';

export { FULLY_RENDERED } from './layout';
export type { RenderProgress } from './layout';

// Render the entire golden-hour scene to a logical-pixel canvas, back to
// front. Caller sizes the backing store to LOGICAL_WIDTH x
// computeLogicalHeight(route) and disables image smoothing when upscaling.
export function renderScene(
  ctx: CanvasRenderingContext2D,
  route: Route,
  progress: RenderProgress
): void {
  const height = computeLogicalHeight(route);
  const horizonY = height - GROUND_HEIGHT;
  const summitY = horizonY - wallHeight(route) - SUMMIT_HEIGHT;

  drawSky(ctx, horizonY);
  drawSun(ctx, horizonY);
  drawClouds(ctx, horizonY);
  drawRidges(ctx, horizonY);
  drawWall(ctx, route);
  drawGround(ctx, height);
  drawBirds(ctx, summitY);
  drawRouteLayer(ctx, route, progress);
  drawClimber(ctx, route, progress);
}

function drawClimber(
  ctx: CanvasRenderingContext2D,
  route: Route,
  progress: RenderProgress
): void {
  const pt = climberPoint(route, progress);
  if (!pt) return;
  const atSummit = progress.pitchIndex >= route.pitches.length;
  // Hanging on the rope mid-climb; standing on the summit at rest.
  const y = atSummit ? pt.y - 8 : pt.y - 7;
  drawSprite(ctx, CLIMBER, SPRITE_PALETTES.climber, pt.x - 4, y);
}
```

This deletes: the Task 1 `SCENE_PALETTES` shim, `drawSky`/`drawGround`/`drawWall`/`drawClouds`/`drawCloud`/`drawRoute`/`drawRouteSegment`/`drawAnchor`/`drawPitchLabels`/`drawTinyNumber`/`TINY_DIGITS`/`clamp01`/`wallTopYFor` and all four `paint*` texture functions (now living in `terrain.ts` and `rope.ts`).

- [ ] **Step 3: Run tests to verify everything passes**

Run: `npm test`
Expected: PASS — all pre-existing `wall-renderer.spec.ts` tests (untouched), the two new ones, and every other spec.

- [ ] **Step 4: Verify the app builds**

Run (from `frontend/`): `npm run build`
Expected: clean production build, no TS errors (confirms `topo-canvas.ts` imports still resolve via re-exports).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/rendering/wall-renderer.ts frontend/src/app/rendering/wall-renderer.spec.ts
git commit -m "feat: orchestrated golden-hour scene render with climber riding the draw"
```

---

### Task 10: Dusk UI chrome

**Files:**
- Modify: `frontend/src/styles.scss`
- Modify: `frontend/src/app/components/route-form/route-form.scss`
- Modify: `frontend/src/app/components/nes-dialog/nes-dialog.scss`

No unit tests — SCSS token swap, verified by build + eyeball in Task 11.

- [ ] **Step 1: Swap the token values in `styles.scss`**

Replace the token block (lines 1–22) with — variable NAMES stay the same so every `var(--nes-*)` reference keeps working:

```scss
// 8-Bit Beta - golden-hour dusk chrome.
// Token names keep their NES heritage; values are tuned to match the
// canvas scene (see rendering/nes-palette.ts SKY_BANDS).

@use 'sass:color';

$nes-black:        #100C20;   // page background: near-black indigo
$nes-white:        #F8E8C8;   // cream text + borders
$nes-light-gray:   #C8B49A;   // muted parchment
$nes-mid-gray:     #7A6A7A;
$nes-dark-gray:    #2A2244;
$nes-blue:         #2A2A6A;   // dialog frame (sky top band)
$nes-dark-blue:    #1A1A3E;   // panels and headers
$nes-light-blue:   #8AB8E8;
$nes-red:          #E8804A;   // primary buttons: sunset orange
$nes-dark-red:     #B85A30;   // button bevel shading
$nes-yellow:       #FFD080;   // warm gold accents
$nes-green:        #58D854;
$nes-sky:          #1A1A3E;   // canvas viewport surround (dark; scene pops)
```

- [ ] **Step 2: Replace the hardcoded bevel color in component SCSS**

In `route-form.scss`, both `.pitch__remove` and `.move__remove` contain `box-shadow: inset -3px -3px 0 0 #881400;` — change both to:

```scss
  box-shadow: inset -3px -3px 0 0 #8A4020;
```

In `nes-dialog.scss`, `.nes-dialog__close` has the same `#881400` inset — change to `#8A4020`.

- [ ] **Step 3: Build and verify**

Run: `npm run build`
Expected: clean build. (SCSS-only change; tests unaffected.)

- [ ] **Step 4: Commit**

```bash
git add frontend/src/styles.scss frontend/src/app/components/route-form/route-form.scss frontend/src/app/components/nes-dialog/nes-dialog.scss
git commit -m "feat: dusk UI chrome matching the golden-hour scene"
```

---

### Task 11: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Run the complete test suite**

Run (from `frontend/`): `npm test`
Expected: ALL specs pass — layout, nes-palette, sprites, sky, terrain, rope, wall-renderer, hit-detection, route-store, app.

- [ ] **Step 2: Production build**

Run: `npm run build`
Expected: clean build, no errors or new warnings.

- [ ] **Step 3: Manual visual verification**

Run: `npm start`, open http://localhost:4200, and verify against this checklist:

- Sky shows six dusk bands, darkest at top; stars visible in the top bands only
- Sun visible low on the right horizon, partially behind purple ridges
- Two ridge layers visible behind the wall; pines flank the wall base
- Wall silhouette is jagged (notched edges, narrow summit, flared base); rock texture visible; right edge lit, left edge shadowed
- Rope is pale gold, 2px, visibly bowing per pitch with alternating sides; loose tail at the base
- Quickdraws visible along pitches (~1 per 100ft pitch at default lengths); belay anchor sprites at every pitch top
- Pitch numbers readable (outlined) next to each belay
- On load/Replay: rope draws upward pitch-by-pitch with the climber riding the tip, then climber stands on the summit
- Switching rock type (granite/limestone/basalt/sandstone) recolors the wall; all four look dusk-lit and distinct
- Clicking a pitch (on the curved rope) opens the pitch dialog; cursor changes to pointer near the rope
- Adding a long pitch makes the canvas taller and the upper sky darker with more stars/clouds
- Export PNG downloads the full scene
- UI chrome: indigo panels, cream text, orange buttons — no leftover bright NES blue/red

- [ ] **Step 4: Fix anything that fails, re-run `npm test`, then final commit if fixes were needed**

```bash
git add -A frontend/src
git commit -m "fix: visual verification touch-ups for golden-hour scene"
```

---

## Self-review notes (already applied)

- Spec coverage: every spec section maps to a task (sky/stars/sun/clouds → T6, ridges/wall/ground/pines → T7, rope/draws/anchors/labels → T8, climber + composition → T9, palettes → T1, sprites → T2, geometry → T3/T4, hit detection → T5, UI chrome → T10, testing → throughout + T11).
- `RenderProgress` moves to `layout.ts` to avoid a circular import (`rope.ts` needs it; `wall-renderer.ts` needs `rope.ts`); `wall-renderer.ts` re-exports it so `topo-canvas.ts` is untouched.
- `SCENE_PALETTES` is deleted (only old renderer code used it); `NES` and `NES_PALETTE` stay (tested heritage exports).
- Type names consistent across tasks: `SpriteMatrix`, `WallBand`, `AnchorPoint`, `RenderProgress`, `RockPalette`.
- All drawing is `fillRect`-only, so the existing `MockCtx` works in every new spec.
