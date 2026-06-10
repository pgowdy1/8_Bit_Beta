# Golden Hour Visual Overhaul — Design

**Date:** 2026-06-10
**Status:** Approved (brainstorm with visual companion; mockups in `.superpowers/brainstorm/1505-1781099801/content/`)

## Goal

Transform the topo visualizer from a flat gray rectangle into a dramatic, poster-grade pixel-art scene. This is demo material for a marketing-campaign pitch: it will be shown **live in the browser** and as **screenshots in a deck**, so both the draw animation and a single frozen frame must look great. No brand-color constraints — it just needs to look stunning.

## Decisions (locked during brainstorm)

| Question | Decision |
|---|---|
| Art direction | **Golden Hour** — alpenglow dusk, banded sunset sky, hazy ridges, sun-warmed rock |
| Rope style | **Natural sag + quickdraws** — catenary bow, belay knots, protection sprites |
| Climber motion | **Rides the draw only** — leads the rope tip during animation, static at summit after; no ambient motion |
| Scope | **Canvas + UI chrome** — form panel, buttons, dialog restyled to match |
| Implementation | **Hybrid** — procedural scene layers + hand-editable pixel-matrix sprites |

## Scene composition

Layers render back-to-front, all **deterministic** (no `Math.random`; seeded arithmetic like the existing textures) so redraws, exports, and tests are stable:

1. **Banded sky** — six-color gradient, top→horizon: `#2A2A6A → #4A3A8A → #8A4A8A → #C85A70 → #E8804A → #F8A85A`. The bottom three warm bands have fixed heights anchored to the horizon; the top three split the remaining height. Taller routes therefore climb into darker sky — altitude reads visually.
2. **Stars** — sparse white pixels, top two bands only, deterministic positions.
3. **Sun** — amber core `#FFE0A0` with `#F8A85A` halo, low on the horizon, partially behind the ridgeline.
4. **Underlit clouds** — chunky cloud sprites (body `#F8B888`, underside `#C85A70`, top highlight `#FFE0C0`), repeated at deterministic vertical intervals so tall routes get clouds at multiple heights.
5. **Background ridges** — two jagged silhouette layers above the ground line: far `#5A3A7A`, near `#3A2A5A`.
6. **Main wall** — jagged stair-stepped silhouette replacing the rectangle: wider at the base, irregular notches/ledges on both edges, sunlit edge on the right, deep shadow on the left. Existing rock-type texture motifs (granite speckle/crystals/cracks, limestone bands/pockets/drips, basalt columns/strata, sandstone laminations/scoops) are **kept** and recolored. Anchors wander within `x ∈ [102, 154]` (per `anchorX`); wall edges sit at 64/192, so silhouette notches up to ~10 px deep leave ≥ 28 px of rock between the silhouette and any anchor — the rope never exits rock.
7. **Ground** — dusk meadow `#2A2030` with pine silhouette sprites (near-black `#201828`) replacing talus speckle.
8. **Route layer** — rope, quickdraws, anchors, pitch labels, climber.
9. **Garnish** — 1–2 bird silhouettes gliding near the summit.

Logical width: 384 px (widened post-verification for landscape panels; wall at x 96–288). Display scale: responsive integer fit of the whole scene (2x–8x). Unchanged: pitch-height-from-rope-length math (`PIXELS_PER_FOOT`), variable canvas height, PNG export, 220 ms/pitch draw animation mechanics.

## Color system

All constants live in `nes-palette.ts` (file name kept; values are no longer NES-strict — colors are hand-tunable named constants, which is the established workflow).

Rock palettes keep the `RockPalette` shape (`shadow / base / midtone / highlight`), re-tuned to sunset lighting while staying mutually distinguishable:

| Rock | shadow | base | midtone | highlight |
|---|---|---|---|---|
| granite | `#5A4A5A` | `#8E7E80` | `#B89A8A` | `#E8C8A8` |
| limestone | `#7A5A4A` | `#C8A878` | `#E0C090` | `#F8E8B8` |
| basalt | `#241A28` | `#4A3A44` | `#6A5258` | `#A87858` |
| sandstone | `#6A3A2A` | `#B86A40` | `#D88A50` | `#F8B878` |

New exports: `SKY_BANDS`, `RIDGE_COLORS`, `GROUND_COLORS`, `ROPE_COLORS`, `SPRITE_PALETTES` (climber, quickdraw, anchor, cloud, pine, bird; the sun is procedural rects via `SUN_COLORS`). All hexes above are starting points for hand-tuning.

## Rope, quickdraws, anchors, climber

**Rope geometry.** Per pitch, a quadratic curve bowing slightly downhill/outward from the straight anchor-to-anchor chord, sampled to logical-pixel points by `ropePath(segment)` in `layout.ts`. Renderer, climber placement, and hit detection all consume the same samples. Rendered 2 px thick in `#FFF0A0` via `fillRect` (no canvas stroke), with darker-gold shading pixels for strand texture. A loose tail curls at the base of pitch 1.

**Quickdraws.** The approved 5×9 sprite — steel hanger `#BCBCBC` with dark bolt pixel, blue sling `#3CBCFC`, carabiner `#E8E8E8` with the rope passing through the gate. Placement: deterministic, ~1 per 40 logical px of pitch length. Pitches shorter than 16 px get none; pitches of 16 px or more get at least one.

**Anchors.** Belay stations become a chained-anchor sprite (two bolts + dark chain V + highlight knot pixel), replacing the 4×4 red square. Pitch-number labels keep the 3×5 numerals and gain a 1 px dark outline (`#2A1A20`) for legibility on sky and lit rock.

**Climber.** 8×8 sprite: red helmet, skin-tone face, blue shirt, dark pants, facing the wall with one arm up. During animation, positioned at the leading rope-tip sample (follows the sag). After animation completes — and on any static redraw (resize, fully-rendered draw) — stands on the summit beside the top anchor.

**Animation.** Mechanically unchanged (per-pitch fraction, 220 ms). Rope pixels, that pitch's quickdraws, and the climber appear progressively with the fraction.

## Architecture

`wall-renderer.ts` becomes a thin orchestrator; drawing splits into focused modules under `src/app/rendering/`:

| Module | Responsibility |
|---|---|
| `sprites.ts` | Sprite matrices (2D color-index arrays, `TINY_DIGITS`-style) + `drawSprite(ctx, matrix, palette, x, y)` |
| `sky.ts` | Sky bands, stars, sun, clouds, birds |
| `terrain.ts` | Ridges, wall silhouette, rock textures (moved from wall-renderer), ground, pines |
| `rope.ts` | Rope, quickdraws, anchors, pitch labels |
| `layout.ts` | + `ropePath(segment)`, `wallSilhouette(route)`; existing exports unchanged |
| `wall-renderer.ts` | `renderScene` composes layers in order; `RenderProgress` API unchanged |
| `hit-detection.ts` | Proximity test against shared `ropePath` samples instead of straight segments; same tolerance |

`topo-canvas.ts` needs no changes: the climber's position derives from `RenderProgress` inside `renderScene`, and the component's public surface (`replay`, `exportPng`, hit handlers) is untouched.

## UI chrome

One SCSS theme pass — colors and borders only, no layout changes:

- Panel/dialog background: deep indigo `#1A1A3E` (sky top band)
- Text: cream `#F8E8C8`
- Primary buttons: sunset orange `#E8804A`
- Chunky pixel borders in the existing NES-dialog style

## Testing

- Vitest + jsdom; renderer tests use the existing hand-rolled `MockCtx` (`fillStyle`, `fillRect`, `save`, `restore`, `scale`) — sufficient because all drawing stays `fillRect`-based.
- New tests: `ropePath` determinism + endpoints land on anchors; quickdraw count/spacing rules (incl. short-pitch omission); climber position mid-animation and at rest; hit detection along the curved rope; sprite matrices within bounds and referencing valid palette indices.
- All `Route` fixtures include `rockType`. Run with `npm test` (runs once; no Karma flags).

## Out of scope

- Ambient animation (cloud drift, star twinkle) and summit-celebration sequence — explicitly declined
- PNG/sprite-sheet asset pipeline
- Backend changes, new route data fields, hit-detection UX changes
- Away brand colors/logo
