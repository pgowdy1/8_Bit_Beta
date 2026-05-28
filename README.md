# 8-Bit Beta

An 8-Bit climbing route builder. Turn a multi-pitch route description into an
interactive NES-style pixel-art topo. Click a pitch on the rendered wall to see
its description and (if provided) move-by-move beta.

## Running locally

```bash
cd frontend
npm install   # only the first time
npm start
```

Then open http://localhost:4200/.

### Tests

```bash
cd frontend
npm test
```

### Production build

```bash
cd frontend
npm run build
```

## Project structure

```
frontend/
  src/
    app/
      components/
        route-form/      # Left-side form: enter route + pitches + moves
        topo-canvas/     # Right-side HTML canvas wall render + click handling
        nes-dialog/      # NES-style popup with pitch description and moves
      rendering/
        nes-palette.ts   # Strict NES PPU palette + per-scene sub-palettes
        layout.ts        # Logical-pixel layout math for the wall
        wall-renderer.ts # Canvas drawing (wall, route line, anchors, labels)
        hit-detection.ts # Maps click coords to a pitch index
      state/
        route-store.ts   # Signal-based store for the current route
      models/
        route.model.ts   # Route, Pitch, Move types
```

The backend is intentionally not yet scaffolded — V1 is browser-only. Persistence
and AI-assisted ingestion are planned for later phases.
