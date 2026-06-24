# CLAUDE.md — Project Imladris (The Living Campus)

Context for Claude Code working on this repo. Read this first.

## What this is
A real-time 3D diorama of a self-sustaining R&D campus — a "modern Rivendell" rendered as a
floating low-poly island. It is the production version of a concept developed iteratively as a
single-file three.js artifact (see `reference/campus-world.html`, the full working prototype).
This repo is the refactor: modular, optimized, and ready for real `.glb` assets.

## The goal that drives every decision
Two things at once, which is why we left the single-file artifact:
1. **Diorama-grade visual richness** — via real modeled assets loaded as glTF.
2. **Smooth performance** — via instancing, LOD, and a real post-processing pipeline.

The companion concept paper (`reference/` or ask the user) defines the campus as a single
**organism**: brain (sentinel AI), nervous system (network), senses, metabolism (energy/water/food),
muscles (drones/transport), immune system (defence/fire), memory. The visualization's job is to make
that organism visibly **alive** — systems sensing, deciding, and acting in one loop.

## Run
```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build to dist/
```
Node 18+. Verified to build with three ^0.160 + vite ^5.4.

## Architecture
```
src/
  config.js            All tunables: palette, world dims, counts, sectors, camera, postfx.
  main.js              Wires every module into the scene + loop. Start here to trace flow.
  core/
    scene.js           Renderer, scene, ORTHOGRAPHIC camera (diorama look), resize.
    lights.js          Hemisphere + key/fill/rim directional, soft shadows; sky gradient shader.
    postfx.js          EffectComposer: Render → UnrealBloom → SMAA → Output (filmic).
    controls.js        Custom ORTHO orbit (zoom = camera.zoom), touch + pinch, frame()/reset().
    loop.js            Clock-based loop. Systems register via add({update(dt,elapsed)}). Per-frame try/catch.
  world/
    terrain.js         terrain(x,z) heightfield (single source of truth), floating island, 3 rivers, pond.
    water.js           Flowing glints, waterfall, spinning water wheels (micro-hydro).
    vegetation.js      Instanced conifers, deciduous canopies, bushes, boulders, wildflowers.
    sectors.js         Floating sector labels + jump-to-sector camera framing.
  systems/
    network.js         Glowing pulses flowing along edges (sensors→brain, sources→reservoir→brain).
    agents.js          Drones (patrol + fire dispatch), deer, birds. Exposes dispatchTo()/recall().
    fire.js            Wildfire state machine + particle flames/smoke/scorch; triggers drone response.
    events.js          Status-ticker event loop (pauses during fire).
  ui/
    ui.js / ui.css     Toolbar, sector chips, status ticker.
  assets/
    loader.js          GLTFLoader+DRACO. place(url, fallbackFactory, transform) = the richness bridge.
public/models/         Drop .glb files here (see ASSETS.md).
reference/              The full single-file prototype — the behavioral spec to port from.
```

## Conventions
- **Y up.** Ground height ALWAYS comes from `terrain(x,z)` — never hardcode heights for placed objects.
- Every animated subsystem exports `{ group, update(dt, elapsed) }` and is registered in `main.js` via `loop.add(...)`.
- Tunables live in `config.js`. Prefer editing there over magic numbers in modules.
- Bloom keys off **emissive** materials — give anything that should glow an `emissive` + `emissiveIntensity`.
- Keep instanced meshes for anything numerous (trees, rocks, crops). Avoid per-object meshes at scale.

## How to add a real model (the main richness task)
1. Put `observatory.glb` in `public/models/`.
2. In the relevant builder, replace procedural geometry with:
   ```js
   import { place } from '../assets/loader.js';
   group.add(place('models/observatory.glb', () => makeProceduralObservatory(), { position:[x,y,z], scale:1 }));
   ```
   It shows the procedural fallback until the GLB loads, so the scene never breaks.
3. Asset list + style targets are in `ASSETS.md`.

## What's already ported vs. TODO
See `PORTING.md`. Core world + water + vegetation + sectors + network + agents + fire + events + UI
are functional. Buildings/farms are still mostly procedural placeholders awaiting `.glb` assets, and
several agent types from the prototype (people, sheep, ducks, butterflies, fish, clouds, funicular)
are not yet ported — they're straightforward to lift from `reference/campus-world.html`.

## Honest constraints
- The prototype's fire/water/animals are *stylized*, not physical simulations — keep that bar unless asked.
- three is heavy (~600 kB). That's expected; optimize the scene (LOD/instancing), not the lib.
