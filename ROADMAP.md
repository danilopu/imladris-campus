# ROADMAP.md — Build Order

A prioritized plan to take this scaffold to a polished, rich, smooth diorama.

## Phase 1 — Parity with the prototype (port what's missing) ✅ COMPLETE
Lifted from `reference/campus-world.html` into modules:
- [x] Buildings & facilities (`world/buildings.js`): observatory, labs, dome hall, glass tower,
      ring lab, dwellings, greenhouse, data center, comms mast, water tower, wind turbines, solar,
      reservoir, sensor posts. Procedural with `place()` ready for future GLBs.
- [x] Farms (`world/farms.js`): row crops, orchard, rice paddies, aquaponics, vertical farm, beehives.
- [x] Transport (`world/transport.js`): funicular (cable + animated car), arched bridge, lanterns, dock+boat.
- [x] Remaining fauna (`systems/fauna.js`): people, sheep, ducks, heron, jumping fish,
      butterflies (day), fireflies (night), drifting clouds.
- [x] Day/Night toggle (`core/daynight.js`): lerp sun/sky/emissive; fireflies in, butterflies out + Night button.
- [x] Reconnect the full event loop (`systems/events.js`): irrigation glow, hive alert, energy
      bursts (`network.surge`), recon drone (`agents.recon`) — each ticker line now drives a visible effect.
- [x] Bonus: reactive alarm — a wildfire races a pulse sensor→brain before drones launch.

## Phase 2 — Visual richness (the diorama look)
- [x] `.glb` asset pipeline wired hero-first (`assets/manifest.js` + `place()`); fallbacks render
      until a model loads. **CC0 model packs live** (all verified loading 200 via `npm run shoot`):
      - KayKit Space Base modules → research-ridge labs + solar/landing-pad/rover props.
      - **KayKit village (medieval)** → riverside hamlet houses on the banks, market, dock,
        footbridge gate-tower, and the Wildwood chicken farm (`world/buildings.js`, `vil_*`).
      - **Quaternius nature** → birch groves, flowering bushes, flower clumps scattered as
        accents over the instanced forest (`world/vegetation.js`, `nat_*`).
      - **Character pack** → rigged Explore avatar (Worker, Idle/Walk/Run mixer) + villager
        NPCs (`systems/villagers.js`, `char_*`). Add more by dropping files + a manifest line.
- [x] Tuned `postfx.js`: bloom threshold raised so only emissives glow; added **GTAO** contact-shadow
      pass (ortho-aware; radius in world units via `config.POSTFX.ao`).
- [x] Soft contact shadows (GTAO, real-time rather than baked); warmer golden key light; subtle vignette.
- [x] Look-polish pass: cinematic **colour-grade** (contrast/saturation/warm tint, all quality
      levels) + warmer lighting + **tilt-shift** miniature focus (High quality only).
- [ ] Texture/bevel pass on remaining procedural geometry — deferred (low ROI; heroes get replaced by GLBs).

## Foundation (cross-cutting substrate)
- [x] Verification harness (`tools/shoot.mjs`, `npm run shoot`): Playwright boots the build and
      screenshots day/night/systems/explore + captures page errors. Ends blind-building.
- [x] Director job-bus (`systems/director.js`): post/claim/complete jobs + storage registry —
      the master-loop spine. New sources emit jobs, new actors consume them.
- [x] Logistics on the Director (`systems/logistics.js`): fields ripen → harvest jobs → rovers
      haul to a silo that fills, then the campus consumes the store. First content on the substrate.
- [x] Asset robustness: `glowRegistry` + `place()` auto-registers loaded-model emissives with
      day/night; `assets/lod.js` distance-LOD helper. CC0 .glb models now drop in cleanly.

## Phase 3 — Performance & smoothness
- [x] Lazy-load the GLTF/DRACO loaders via dynamic import — split into on-demand chunks
      (~52 kB out of the initial bundle).
- [x] FPS meter + Quality toggle (`core/quality.js`): High/Medium/Low trades pixel ratio →
      shadow-map size → GTAO → bloom; auto-defaults by device. Quality chip shows live FPS.
      (Note: real FPS can only be felt on real hardware — the headless harness throttles rAF.)
- [x] Framerate-independent damping for camera/agents (smoothness, done earlier).
- [~] LOD on trees/props — `assets/lod.js` helper exists, but distance-LOD is a near-no-op in the
      **orthographic** diorama (every prop is ~equidistant from the camera). Lever applied instead:
      scattered bushes/flowers no longer cast shadows (`world/vegetation.js`), trimming the shadow
      pass. Distance-LOD would only pay off in Explore (perspective) — revisit if mobile FPS dips.
- [ ] Cap dynamic shadow casters / consider static shadow-map for the world geometry.

## Phase 4 — Depth & interaction
- [x] Clickable hotspots → info panels (`ui/hotspots.js`, done early in Phase 1).
- [x] Aliveness pass (paper §10): metabolic heartbeat (reservoir + compute follow the sun via
      day/night), the Memory organ (data/seed vault + hotspot), autonomous transport pods,
      hyperspectral-scan + infrasound flood-watch master-loop events.
- [x] One master loop: every routine op + harvest posts a job to the Director; the Dispatcher
      turns each into a sense-pulse to the brain + its muscle effect, and the Director drives the
      ticker (`systems/dispatcher.js`). Fire stays its own tight sense→act loop.
- [x] Spatial addressing (`world/zones.js`): `addressOf(x,z)` → "Research Ridge · D5" (nearest
      sector + 8×8 grid cell), plus a toggleable terrain-hugging **Plan grid** overlay.
- [x] In-world annotations → tasks (`systems/annotations.js`): in Explore, press **M** to drop a
      pin where the avatar stands, type a comment; persists to localStorage and **exports a task
      checklist** (markdown to clipboard + JSON download) tagged with zone + exact x/y/z.
- [x] A guided "tour" mode that flies sector to sector narrating each system (`systems/tour.js`;
      Tour button, organism-themed ticker per sector, stops on Explore).
- [ ] Survival/isolation mode (paper §10): storm severs link → dim nonessential systems, LoRa mesh.
- [ ] More scripted operations; seasonal/weather variation.
- [ ] Optional: data-drive the layout from a JSON so sectors/buildings are editable without code.

## Phase 5 — Immersion (new)
- [x] Third-person "Explore" mode (`core/explore.js`): perspective camera, WASD/arrows +
      drag-to-orbit + wheel zoom, terrain-following at human scale (1 unit ≈ 1 m).
- [x] Stylized CC0 avatar: rigged character (Worker) with **AnimationMixer** Idle/Walk/Run
      crossfade, velocity-smoothed movement (eases in/out), and **building collision**
      (`core/collision.js` circles). Procedural scientist remains as an instant fallback.
- [x] In-app **research paper reader** (`ui/paper.js`): Paper button → modal renders the concept
      paper (marked + the markdown, both lazy-loaded).
- [x] Touch joystick for mobile movement (`core/explore.js`): left-half virtual stick (analog
      speed) to walk, right side to look — pointer-id-tracked so both work at once; touch-only,
      so desktop is unaffected.
- [ ] Entry from a hotspot "walk here".

## Phase 6 — Deployment
- [x] Vercel-ready: `vercel.json` (framework=vite, dist output, model cache headers) + `DEPLOY.md`.
      `base: './'` keeps it portable to any static host. Push → import on Vercel → deploy.

## Definition of done (this iteration's north star)
A scene that (a) looks like the reference diorama thanks to real assets, (b) holds 60fps on
desktop and stays usable on mobile, and (c) visibly runs the campus as one living organism —
sensing, deciding, acting — with the wildfire response as the centerpiece demo.
