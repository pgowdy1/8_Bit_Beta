# 8-Bit Climbing Route Topo Visualizer

**Branch:** `feature/8bit-route-topo-visualizer`
**Scope:** Large (new app scaffold + multiple components + canvas rendering engine)
**Layers:** Frontend only for V1 (backend deferred — no persistence yet)
**Complexity assessment:** Solo build (`/new-feature`-style) — single layer, no contracts to coordinate, but non-trivial UI work. Use the incremental build-verify loop.

---

## Description

A web app that takes a structured description of a multi-pitch climbing route and renders it as an interactive 8-bit pixel-art topo in the style of an NES game. The user fills out a route on the left side of the screen; the right side shows a live 8-bit render of a big wall with the route line traced pitch-by-pitch. Clicking a pitch on the render opens an NES-style dialog box with that pitch's description and (if provided) move-by-move beta.

V1 is intentionally narrow: one feature archetype (big wall), form-only input, no persistence. Backend, image upload, AI ingestion, and other archetypes are explicitly deferred.

---

## Requirements

### Functional
- User can enter a route name, feature name (e.g., "El Capitan"), and a list of pitches.
- Each pitch has: grade (e.g., "5.10a"), length in feet, description text, optional moves array (each move = short label + optional detail text).
- The render updates live as the form changes.
- When the user finalizes the route (or clicks a "Render" button), the route line animates onto the wall pitch-by-pitch (~150ms per pitch).
- Clicking a pitch anchor on the rendered wall opens an NES-style dialog box overlay with the pitch's description. If the pitch has moves, render them as a list under the description. If no moves, omit that section entirely.
- The wall canvas auto-scales taller to fit any pitch count (canvas scrollable vertically when needed).
- Export-to-PNG button so user can save their render.

### Non-functional / Style
- Strict NES PPU palette (~54 colors), 4-color sub-palettes per scene region, pixel-perfect (no anti-aliasing).
- Pixel font for all UI text (Press Start 2P or equivalent).
- Chunky NES-style chrome on the form, buttons, and dialog box (double pixel borders, classic blue/black inner/outer).
- Zoneless, signal-based Angular per CLAUDE.md conventions.
- No backend in V1. State lives in component signals; no localStorage either (intentional — keeps V1 small).

### Out of scope (V1)
- Image upload / topo photo tracing
- AI/LLM-assisted ingestion
- Multiple feature archetypes (spire, dome, snowy peak)
- Saved routes, list view, share-by-URL
- Day/night toggle, weather
- Sound effects / chiptune
- Mobile-first layout (responsive collapse OK, but desktop is primary target)

---

## Affected files

### New (frontend scaffold + feature code)
- `frontend/` — entire Angular app, scaffolded fresh via `ng new`. Notable files:
  - `frontend/package.json`, `frontend/angular.json`, `frontend/tsconfig.json`, etc. — CLI scaffold
  - `frontend/src/index.html` — load Press Start 2P from Google Fonts
  - `frontend/src/styles.scss` — global NES chrome styles, font family
  - `frontend/src/app/app.ts` — root component, hosts split-view layout
  - `frontend/src/app/app.html`, `.scss`
  - `frontend/src/app/models/route.model.ts` — `Route`, `Pitch`, `Move` types
  - `frontend/src/app/state/route-store.ts` — signal-based store for current route + selected pitch
  - `frontend/src/app/components/route-form/route-form.ts/.html/.scss` — left-side form
  - `frontend/src/app/components/topo-canvas/topo-canvas.ts/.html/.scss` — right-side canvas wrapper + click handling
  - `frontend/src/app/components/nes-dialog/nes-dialog.ts/.html/.scss` — NES-style overlay dialog
  - `frontend/src/app/rendering/nes-palette.ts` — palette constants
  - `frontend/src/app/rendering/wall-renderer.ts` — wall + sky + route-line draw logic
  - `frontend/src/app/rendering/hit-detection.ts` — map canvas (x,y) → pitch index
  - Unit tests next to each source file (`.spec.ts`)

### Modified
- `README.md` — append a short "Running locally" section after the app is up

### Deferred (NOT in this PR)
- Any `backend/` scaffolding — wait until we need persistence or AI proxying

---

## Data model

```ts
// frontend/src/app/models/route.model.ts
export interface Move {
  label: string;          // e.g., "Hand jam to undercling"
  detail?: string;        // optional longer beta
}

export interface Pitch {
  grade: string;          // "5.10a", "5.11c", etc.
  lengthFt: number;       // pitch length in feet
  description: string;    // free text
  moves?: Move[];         // optional move-by-move
}

export interface Route {
  name: string;           // e.g., "The Nose"
  featureName: string;    // e.g., "El Capitan"
  pitches: Pitch[];
}
```

State store (`route-store.ts`) exposes:
- `route: WritableSignal<Route>`
- `selectedPitchIndex: WritableSignal<number | null>`
- Derived: `totalLengthFt`, `pitchCount`
- Methods: `addPitch()`, `removePitch(idx)`, `updatePitch(idx, patch)`, `selectPitch(idx | null)`

---

## Rendering plan (the meaty part)

### Coordinate system
- Logical pixel grid: 256 wide × variable height (NES screen is 256×240; we use 256 wide and grow height).
- Render at 1:1 to an offscreen canvas, then scale up to the visible canvas (e.g., 4x or 6x) using `imageSmoothingEnabled = false` for crisp pixels.
- Height grows with pitch count: each pitch occupies `~40` logical pixels of vertical wall, so a 10-pitch route is 400px of wall + sky + ground = ~480 logical pixels tall (~1920 device px at 4x scale).

### Scene composition (bottom to top)
1. Ground / talus base (~24 logical px tall): dark gray + brown dithered tiles.
2. Wall face: vertical rock texture tiles. Wall has a slight irregular silhouette (notches on edges every few rows) to look hand-drawn rather than a flat rectangle. Two-tone gray with dither for shading.
3. Summit cap (~16 logical px): wall tapers to a flat or slightly rounded top.
4. Sky: light blue solid above the summit + a few static cloud sprites.

### Route line and anchors
- Pitches stack bottom-to-top. Pitch 1 starts at a belay anchor near the base, pitch N ends at the summit.
- Each pitch is rendered as a line of yellow (NES `#FCBC3C`) pixels from its lower anchor to its upper anchor. The line has a slight side-to-side wander based on `(pitchIndex * lengthFt)` so consecutive pitches don't all sit in a single vertical column.
- Anchors are 4×4 px sprites (red/black) at the join between pitches.
- Pitch numbers (1, 2, 3...) drawn in pixel font next to each anchor.

### Animation
- On initial render (or when user clicks "Render"), the route line draws in sequentially: pitch 1's segment animates from bottom anchor to top anchor over ~150ms, then pitch 2, etc.
- Implemented via `requestAnimationFrame` loop with a per-pitch progress value.

### Hit detection
- Each pitch's hitbox = the bounding rect of its line segment + small margin around anchors.
- On canvas click, map device-pixel coords → logical-pixel coords → iterate pitches and return first match.
- Hover state: cursor switches to pointer when over a pitch hitbox.

### Strict NES palette
- Hardcoded array of the 54 NES PPU colors in `nes-palette.ts`.
- Each scene region (sky, wall, ground, route-line, UI) defined as a 4-color sub-palette referencing only NES palette indices.
- No gradient fills, no anti-aliasing, no alpha blending other than full transparent vs. opaque.

---

## NES UI chrome

- Pixel font: Press Start 2P (Google Fonts), loaded in `index.html`.
- Form fields: thick double-pixel borders, black inner, white outer, with chunky labels above.
- Buttons: 2-tone with classic NES button feel (red top bevel, dark red bottom bevel, shifts down 1px on active).
- Dialog box overlay (nes-dialog component):
  - Outer rectangle filled with NES dark blue `#0078F8`.
  - Inner area filled with black, with a 4px white inset border.
  - "▼" prompt indicator blinks in the bottom-right of the dialog (CSS animation).
  - Close on Esc, click outside, or close button.
  - Optional: type-on text animation revealing description one character at a time (~30ms per char). Behind a "skip" tap.

---

## Implementation steps (ordered)

### Layer 0 — Scaffold
1. `ng new frontend --routing=false --style=scss --skip-git --strict --inline-style=false --inline-template=false --ssr=false --zoneless` (Angular 21 supports `--zoneless` flag; if not, set `provideZonelessChangeDetection()` manually).
2. Verify `npm start` boots and serves at `http://localhost:4200`.
3. Add Press Start 2P link tag to `frontend/src/index.html`.
4. Wipe the boilerplate from `app.ts`/`app.html` to a minimal split-view shell.

**Verify Layer 0:** `npx ng build` succeeds; `npm start` serves the default page.

### Layer 1 — Data + state
5. Create `models/route.model.ts`.
6. Create `state/route-store.ts` as an `@Injectable({ providedIn: 'root' })` class exposing signals. Seed with a small example route (3 pitches on a fictional wall) for dev convenience.

**Verify Layer 1:** Compile check.

### Layer 2 — Form
7. Create `route-form` component. Uses `[(ngModel)]` or `FormControl` + signals to two-way-bind to the route store.
8. Pitch list: each pitch is an editable card with inline add/remove buttons. Moves nested inside each pitch (collapsible).
9. Apply NES chrome styles.

**Verify Layer 2:** Form renders, edits update `routeStore.route()`. Manual visual check.

### Layer 3 — Rendering engine
10. Create `nes-palette.ts` with the full NES PPU palette as `readonly string[]`.
11. Create `wall-renderer.ts` exporting a class/function `renderScene(ctx, route, progress)`.
    - `progress` is an object `{ pitchIndex: number, fraction: number }` — pitches before `pitchIndex` are fully drawn, the one at `pitchIndex` is drawn up to `fraction`, later pitches not drawn.
    - Pure function of inputs; no DOM access beyond the passed `CanvasRenderingContext2D`.
12. Create `hit-detection.ts` exporting `hitTest(route, canvasSize, logicalSize, x, y): number | null`.

**Verify Layer 3:** Add a quick test harness page or just call from `topo-canvas` to render. Pure-function tests for `hitTest`.

### Layer 4 — Canvas component
13. Create `topo-canvas` component. Uses an effect to react to `routeStore.route()` and re-render. Owns the animation loop.
14. Sets canvas backing-store size to logical pixels (e.g., `256 × computedHeight`), and CSS size to a scaled-up display size (e.g., 4x).
15. Disables `imageSmoothingEnabled` on the context.
16. Click handler → `hitTest()` → `routeStore.selectPitch(idx)`.
17. Hover handler → toggles `cursor: pointer` via host binding.

**Verify Layer 4:** Wall renders correctly with seeded route; route line animates on form changes; clicks correctly identify pitches.

### Layer 5 — Dialog
18. Create `nes-dialog` component. Driven by `routeStore.selectedPitchIndex()` — shows when non-null.
19. Renders the selected pitch's description, then the moves list if present, with NES chrome.
20. Add type-on text animation (~30ms/char) with a skip-on-click behavior.
21. Esc key + backdrop click + close button all dismiss.

**Verify Layer 5:** Click a pitch on the canvas → dialog appears with correct content. Esc dismisses.

### Layer 6 — Polish
22. Add "Render" button (also kicks off animation explicitly) and "Export PNG" button (uses `canvas.toDataURL('image/png')` to trigger a download).
23. Sky clouds, summit shading, wall edge irregularity — visual polish.
24. Add a small pixel-art climber sprite at the current "lead" position during animation.
25. Update README.md with run instructions.

**Verify Layer 6:** Full manual run-through — load app, edit form, watch render, click pitches, see dialogs, export PNG.

---

## Edge cases & error handling

| Case | Behavior |
|------|----------|
| Zero pitches | Render shows the wall with no route line; canvas still loads. Form prompts "Add your first pitch." |
| Very long pitch description (>500 chars) | Dialog grows vertically up to ~70% viewport height, then scrolls inside. |
| Pitch with no description text | Dialog shows "(no description)" placeholder. Don't crash. |
| Pitch with moves array of length 0 | Treat as if `moves` were absent — no moves section. |
| >30 pitches | Wall grows accordingly; canvas scrollable. Test with 35-pitch seed route. |
| Invalid grade format ("5.junk") | No validation enforced in V1 — accept any string. Document as known limitation. |
| Length 0 or negative | Treat as 0; pitch still listed but its line segment collapses to a dot at its anchor. |
| User rapidly edits form during animation | Cancel in-flight animation, restart from current state. |
| Window resize | Recompute display scale to maintain crisp integer scaling; re-render. |

---

## Test plan

### Unit tests
- `route-store.spec.ts`: add/remove/update pitch, select/deselect pitch, derived totals correct.
- `nes-palette.spec.ts`: palette length == 54, all entries are valid hex strings.
- `hit-detection.spec.ts`: clicks on anchors return correct pitch index; clicks far from any pitch return null; edge cases (canvas border, between pitches).
- `wall-renderer.spec.ts`: rendering a known route to an offscreen canvas produces expected pixel at known coordinates (e.g., "pixel at (route-line position, mid-pitch) should be yellow"). Use jsdom's canvas mock or skip if too brittle.

### Component tests
- `route-form.spec.ts`: typing in fields updates the store; add-pitch button creates a new pitch; remove-pitch button removes correct pitch.
- `nes-dialog.spec.ts`: opens when `selectedPitchIndex` is set; closes on Esc; renders moves only when present.
- `topo-canvas.spec.ts`: clicks at known coords trigger `selectPitch` with expected index (mocked hit-detection).

### Manual checks (Phase 7)
- Edit a pitch's grade — render updates.
- Add a 30th pitch — canvas grows, scroll works.
- Click each anchor — dialog shows correct pitch.
- Esc dismisses dialog.
- Export PNG produces a file with the current render.

---

## Verification commands

```bash
# Build (from frontend/)
npx ng build

# Tests (from frontend/)
npm test -- --watch=false --browsers=ChromeHeadless

# Dev server (from frontend/)
npm start
# then visit http://localhost:4200
```

---

## Risks / unknowns

1. **Angular 21 zoneless scaffold quirks.** If `ng new --zoneless` flag isn't supported in 21.1, we'll add `provideZonelessChangeDetection()` manually in `app.config.ts`. Mitigation: known fallback documented.
2. **Canvas hit detection accuracy for thin route lines.** A 1px-wide logical line is 4 device pixels at 4x scale — clickable but tight. Mitigation: hitbox is generous (full bounding rect of the pitch segment plus 6 logical px margin), not just the rendered line itself.
3. **Press Start 2P load failure** (offline / blocked). Mitigation: CSS fallback to `monospace` so layout doesn't break.
4. **Headless Chrome / Karma in CI environments.** If `npm test` fails to launch a browser locally we'll fall back to `ChromeHeadlessNoSandbox` config. Note in test failures.
5. **Time to ship.** Layer 6 polish is optional. Stop layer 6 at any point if other layers are taking long — V1 just needs Layers 0–5 working.

---

## Definition of done (V1)

- [ ] Angular app scaffolded under `frontend/`, builds cleanly.
- [ ] Form lets user edit a route with N pitches and optional moves.
- [ ] Canvas renders a big wall with the route line, in strict NES palette.
- [ ] Route line animates pitch-by-pitch on render.
- [ ] Clicking a pitch opens an NES-style dialog with description (and moves if present).
- [ ] Esc dismisses the dialog.
- [ ] Auto-scaling wall handles 30+ pitches.
- [ ] Export-PNG works.
- [ ] All unit and component tests pass.
- [ ] README has run instructions.
