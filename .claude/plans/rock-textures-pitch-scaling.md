# Rock Textures + Pitch Length Scaling

**Branch:** `feature/rock-textures-pitch-scaling`
**Scope:** Medium (frontend rendering refactor + small data model + form addition)
**Layers:** Frontend only (no backend)
**Complexity assessment:** Solo build — single layer, but touches rendering engine, layout math, model, store, form, and canvas component. Use incremental build-verify loop.

---

## Description

Two dramatic visual upgrades:

1. **Real rock textures.** Replace the current low-variety dithered gray wall with one of four distinct rock types — **granite, limestone, basalt, sandstone** — each with its own NES sub-palette and texture algorithm (crystals, sediment bands, columnar joints, swiss-cheese pockets, etc.). User picks via a dropdown at the top of the Route Builder.

2. **Length-proportional pitches.** Today every pitch occupies the same 40-px slot regardless of `lengthFt`. Switch to linear scaling so a 200ft pitch is twice as tall as a 100ft, with a small minimum so zero-length pitches still render as a point. Canvas grows vertically and scrolls (already scrolls today).

---

## Requirements

### Functional
- New `Route.rockType: RockType` field. Values: `'granite' | 'limestone' | 'basalt' | 'sandstone'`. Default `'granite'`.
- New dropdown in route-form (above pitches list). Changes update `routeStore` immediately; canvas re-renders.
- Wall renderer reads `route.rockType` and chooses palette + texture function accordingly.
- Layout math switches from fixed `PITCH_HEIGHT` to per-pitch `lengthToPx(lengthFt)`:
  - `PIXELS_PER_FOOT = 0.4` → 100ft pitch = 40px (preserves current default), 200ft = 80px, 600ft = 240px.
  - `MIN_PITCH_PX = 8` so zero/tiny pitches render as a visible nub.
- Hit detection and animation continue to work with variable pitch heights.
- PNG export still works.

### Non-functional / Style
- Strict NES PPU palette — every new color must be one of the 54 entries in `nes-palette.ts`.
- 4-color sub-palette per rock type, with `[shadow, base, midtone, highlight]` slot semantics so the renderer can reference them uniformly.
- Pixel-perfect — no anti-aliasing or alpha gradients. Continue using `imageSmoothingEnabled = false`.
- Texture algorithms must be deterministic functions of `(x, y, pitchIndex?)` — no random calls — so re-renders are stable.

### Out of scope
- Per-pitch rock types (one rock per route in V1).
- Background/sky/ground recoloring per rock — sky stays sky-blue.
- New colors beyond the existing 54-color NES palette.

---

## Affected files

### Modified
- `frontend/src/app/models/route.model.ts` — add `RockType` type + `Route.rockType`; update `seedRoute()` and `emptyPitch()` defaults.
- `frontend/src/app/rendering/nes-palette.ts` — add `ROCK_PALETTES` map keyed by `RockType`. Keep `SCENE_PALETTES.wall` as the legacy granite-ish default for fallback.
- `frontend/src/app/rendering/layout.ts` — replace fixed `PITCH_HEIGHT` with `pitchPx(lengthFt)`; `computeLogicalHeight(route)` now takes a `Route` instead of count; `computeSegments(route)` walks per-pitch heights.
- `frontend/src/app/rendering/wall-renderer.ts` — replace single `drawWall` with `drawWall(ctx, route, height)` that dispatches to `drawGranite`, `drawLimestone`, `drawBasalt`, `drawSandstone`. Each builds its own dither + feature pattern.
- `frontend/src/app/rendering/hit-detection.ts` — pull pitch heights via `computeSegments(route)` (already does — just adapt to new layout API).
- `frontend/src/app/state/route-store.ts` — add `setRockType(rt: RockType)` method.
- `frontend/src/app/components/route-form/route-form.ts` + `.html` + `.scss` — add `<select>` for rock type at the top of the form.
- `frontend/src/app/components/topo-canvas/topo-canvas.ts` — `resizeCanvasFor` now takes the full route (height depends on pitch lengths, not just count).

### Test files (modified to match new APIs)
- `frontend/src/app/rendering/layout.spec.ts` — update for variable pitch heights.
- `frontend/src/app/rendering/wall-renderer.spec.ts` — add cases per rock type rendering without throwing.
- `frontend/src/app/rendering/nes-palette.spec.ts` — assert each ROCK_PALETTES entry has 4 valid hex strings drawn from NES_PALETTE.
- `frontend/src/app/state/route-store.spec.ts` — assert `setRockType` updates the route.
- `frontend/src/app/rendering/hit-detection.spec.ts` — sanity check with variable-length pitches.

### New
- (none — all expansions to existing files)

---

## Data model changes

```ts
// models/route.model.ts
export type RockType = 'granite' | 'limestone' | 'basalt' | 'sandstone';

export interface Route {
  name: string;
  featureName: string;
  rockType: RockType;        // NEW
  pitches: Pitch[];
}
```

`seedRoute()` returns `rockType: 'granite'`.

---

## Rendering plan

### Palettes (`nes-palette.ts`)
Slot semantics per rock: `[shadow, base, midtone, highlight]`.

| Rock      | shadow      | base        | midtone     | highlight   | NES indices used |
|-----------|-------------|-------------|-------------|-------------|-----------------|
| granite   | `#3C3C3C` darkGray | `#7C7C7C` midGray | `#BCBCBC` lightGray | `#FCFCFC` white | cool grays |
| limestone | `#787878` (NES `#787878`) | `#BCBCBC` lightGray | `#A4E4FC` paleBlue | `#FCFCFC` white | cool pale, slight blue tint |
| basalt    | `#000000` black | `#3C3C3C` darkGray | `#7C7C7C` midGray | `#5844FC`-ish blue accent (`#6844FC`) | very dark with violet hint |
| sandstone | `#881400` darkBrownRed (NES `#881400`) | `#AC7C00` paleBrown | `#FCA044` orange (`#FCA044`) | `#FCE0A8` palePeach | warm desert |

All choices are pre-existing entries in `NES_PALETTE` (verified).

### Texture algorithms (one per rock)
Each takes `(ctx, palette, wallTopY, wallBottomY)` and paints over the base-fill rectangle. All use deterministic `seed = (x * a + y * b) % m` patterns — no `Math.random`.

- **Granite** — crystalline speckle. Base fill = `palette.base`. Sprinkle 2×2 shadow pixels and 1×1 highlight pixels at fine grid (every 4px) with seeded variation. Occasional 3×3 highlight "crystals" every ~24px. Few thin diagonal cracks every ~40 rows.
- **Limestone** — layered bands with pockets. Base fill = `palette.base`. Horizontal `palette.shadow` bands every 6 rows, 1px tall. Random-looking pockets (3×3 carved holes filled with `palette.shadow`) seeded every ~16×20 grid. A few tufa-drip vertical streaks (1px wide, 8–14px tall, `palette.midtone`).
- **Basalt** — vertical columnar joints. Base fill = `palette.base`. Vertical 1px lines at `x = WALL_LEFT + k*10` filled with `palette.shadow` — these are the column edges. Inside columns alternate horizontal 2px strata of `palette.midtone` every 16 rows. Tiny `palette.highlight` glint pixels at column tops every ~32 rows.
- **Sandstone** — sedimentary layers + bowls. Base fill = `palette.base`. Long horizontal layer bands: alternate `palette.shadow` 1px line then `palette.midtone` 2px band, repeating every 8 rows. Curved "bowl" features (semi-circular `palette.shadow` arcs ~12px wide) every ~30 rows offset. Sparse `palette.highlight` grain speckles every 6px.

Cracks/anchor/route-line layer still uses the existing `route` sub-palette (yellow line, red anchors) so the route stays legible against any rock.

### Layout (`layout.ts`)

```ts
export const PIXELS_PER_FOOT = 0.4;
export const MIN_PITCH_PX = 8;
export const SUMMIT_HEIGHT = 16;
export const GROUND_HEIGHT = 24;
export const SKY_HEIGHT = 40;

export function pitchPx(lengthFt: number): number {
  const px = Math.round(Math.max(0, lengthFt) * PIXELS_PER_FOOT);
  return Math.max(MIN_PITCH_PX, px);
}

export function computeLogicalHeight(route: Route): number {
  const wall = route.pitches.reduce((s, p) => s + pitchPx(p.lengthFt), 0) || MIN_PITCH_PX;
  return GROUND_HEIGHT + wall + SUMMIT_HEIGHT + SKY_HEIGHT;
}

export function computeSegments(route: Route): PitchSegment[] {
  // walk bottom-up, accumulating heights
}
```

Old call sites that passed `pitchCount: number` get the `Route` now. Callers updated:
- `topo-canvas.ts` `resizeCanvasFor(canvas, route)` instead of `(canvas, pitchCount)`.
- `wall-renderer.ts` `computeLogicalHeight(route)` everywhere.
- `hit-detection.ts` already uses `computeSegments(route)` — just keep that.

`anchorX` keeps its current period-4 zig-zag.

---

## Implementation steps (ordered)

### Step 1 — Palette + rock types
1. Edit `models/route.model.ts`: add `RockType`, add `rockType` to `Route`, update `seedRoute()` and any object literals.
2. Edit `nes-palette.ts`: add `ROCK_PALETTES: Record<RockType, RockPalette>` (4-tuple per entry).
3. Update `route-store.ts`: `setRockType(rt)`.

**Verify:** `npx ng build` succeeds.

### Step 2 — Layout switch to variable pitch heights
4. Edit `layout.ts`: add `PIXELS_PER_FOOT`, `MIN_PITCH_PX`, `pitchPx()`. Rewrite `computeLogicalHeight(route)` and `computeSegments(route)`.
5. Delete or keep `PITCH_HEIGHT` (kept for legacy seg.top sanity); remove from public exports if unused.
6. Update callers: `wall-renderer.ts`, `topo-canvas.ts`, `hit-detection.ts` (latter already takes `route`).

**Verify:** `npx ng build`.

### Step 3 — Rock-specific wall textures
7. In `wall-renderer.ts`: extract `drawWall` to read `route.rockType` and pick `ROCK_PALETTES[rockType]`. Base fill uses `palette.base`. Edge irregularity (notches) still uses sky color.
8. Implement `drawGraniteTexture`, `drawLimestoneTexture`, `drawBasaltTexture`, `drawSandstoneTexture`. Each takes `(ctx, palette, wallTopY, wallBottomY)`. Call the right one after the base fill.
9. Keep cracks/summit highlight; they read from the same `palette`.

**Verify:** `npx ng build`. Open in browser → cycle through rocks → distinct textures.

### Step 4 — Form dropdown
10. Edit `route-form.html`: add a `<select>` between the feature-name field and the PITCHES header. Bind `[value]` and `(change)`.
11. Edit `route-form.ts`: add `onRockTypeChange(value: string)` calling `store.setRockType(value as RockType)`.
12. Edit `route-form.scss`: style the select with NES chrome (matches existing input borders).

**Verify:** `npx ng build`. Dropdown changes rock type; render updates immediately.

### Step 5 — Tests
13. Update specs for the new APIs:
   - `layout.spec.ts`: variable pitch heights → `computeLogicalHeight` grows with `lengthFt`; segments stack with correct cumulative offsets.
   - `nes-palette.spec.ts`: each rock palette has 4 valid hex strings; palette length still 54.
   - `wall-renderer.spec.ts`: render each rock type without throwing.
   - `route-store.spec.ts`: `setRockType` updates the route.
   - `hit-detection.spec.ts`: click at a known pitch's segment hits that pitch with variable lengths.

**Verify:** `npm test -- --watch=false --browsers=ChromeHeadless`.

---

## Edge cases & error handling

| Case | Behavior |
|------|----------|
| `route.rockType` missing on legacy data | Default to `'granite'` via fallback in `renderScene` and `setRockType`. |
| Zero-length pitch | Renders as `MIN_PITCH_PX` (8px) so anchor still clickable. |
| Very long pitch (>1000ft) | Wall grows; canvas scrolls. No upper cap. |
| Mixed long + short pitches | Each gets its own height; segments stack correctly. |
| Rock changes mid-animation | Re-render happens immediately via effect; animation continues. |
| Unknown `rockType` value (typo) | `drawWall` falls back to granite. |

---

## Test plan

### Unit tests
- `layout.spec.ts`:
  - `pitchPx(100) === 40`; `pitchPx(200) === 80`; `pitchPx(0) === MIN_PITCH_PX`.
  - `computeLogicalHeight` of a route with 3 pitches of [100, 200, 50]ft = `40 + 80 + 20→max(8,20)=20` + chrome.
  - `computeSegments` returns N segments; `seg[i].top.y === seg[i+1].bottom.y`; cumulative heights match.
- `nes-palette.spec.ts`:
  - `ROCK_PALETTES.granite.length === 4`; same for the other 3.
  - Every color is a valid hex string and appears in `NES_PALETTE`.
- `wall-renderer.spec.ts`:
  - Renders each rock type without throwing.
  - Partial render < full render in fillRect count (preserved from existing test).
- `route-store.spec.ts`:
  - `setRockType('basalt')` updates `route().rockType`.
- `hit-detection.spec.ts`:
  - Variable-length route: click near pitch 0's mid-segment → returns 0; same for pitch 2.

### Manual checks (Phase 7)
- Open app → rock dropdown visible at top of form.
- Switch through all 4 rocks → wall texture and color change distinctively.
- Edit pitch 1 from 100ft to 400ft → that segment of the wall grows ~4x taller; later pitches shift up.
- Add a 0ft pitch → wall still renders, anchor still clickable.
- Add a 30-pitch route → canvas scrolls vertically.
- Click pitches on each rock → dialog opens with correct content.
- Export PNG → file saves with current rock + scaling.

---

## Verification commands

```bash
cd frontend
npx ng build
npm test -- --watch=false --browsers=ChromeHeadless
npm start
```

---

## Risks

1. **Variable-height layout breaks hit detection.** Mitigation: `hit-detection.ts` already calls `computeSegments(route)` which we own, so changes flow through.
2. **Texture density at very long routes.** A 600ft pitch is 240px tall — texture loop still runs per pixel. Mitigation: algorithms are O(W*H) but tiny; benchmark mentally, ~256*2400 = 600k pixels worst case, fillRect is fast.
3. **NES palette match for limestone's "pale blue" tint.** Using `#A4E4FC` from row 3 of palette as the highlight — valid NES entry, slight blue cast. Visually limestone-y.
4. **Sandstone risks clashing with route line yellow.** Mitigation: route-line yellow is `#FCBC3C`, sandstone uses orange `#FCA044` — different hue; if it bleeds we can swap route color to red highlight for sandstone, but defer.

---

## Definition of done

- [ ] `RockType` added to model, defaults to granite.
- [ ] Rock dropdown in form, wired to store.
- [ ] Each of 4 rocks renders with a visibly distinct palette + texture.
- [ ] Pitch heights scale linearly with `lengthFt` (min 8px).
- [ ] All tests pass.
- [ ] Build clean.
