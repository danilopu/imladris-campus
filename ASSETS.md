# ASSETS.md — Model Wishlist & Art Brief

The single change that closes the gap to a hand-crafted diorama is replacing procedural
placeholders with real modeled `.glb` assets. This is the brief for that art.

## Style targets
- **Low-poly, stylized, warm.** Reference: low-poly isometric dioramas (e.g. the three.js
  "LittlestTokyo" model), flat-shaded with soft gradients, gentle bevels.
- **Palette** (see `src/config.js`): pine/moss greens, warm timber, amber, glacial blue,
  bioluminescent green accents.
- **Scale:** the island is ~180 units across; a 1-storey building is ~3–4 units tall. Model to
  roughly that scale or set `scale` in `place()`.
- **Budget:** keep each prop a few hundred to a few thousand triangles. Use shared materials.
  Mark glowing parts with an emissive material so they bloom.
- **Format:** glTF binary (`.glb`), Draco-compressed if large. Y-up. Origin at the base center.

## Wire-up
The hero buildings are already wired through `place()` with procedural fallbacks. To turn a
real model on, drop the `.glb` in `public/models/` and flip its entry in
`src/assets/manifest.js`:
```js
// src/assets/manifest.js
observatory: { file: 'observatory.glb', enabled: true, scale: 1, rotationY: 0 },
```
That's it — the procedural fallback keeps rendering until the file loads, then swaps out.
Adding a *new* placement uses the same pattern directly:
```js
import { place } from '../assets/loader.js';
import { MODELS } from '../assets/manifest.js';
const M = MODELS.observatory;
group.add(place(M.url, proceduralFallback, { position:[x,y,z], scale:M.scale, rotationY:M.rotationY }));
```
Note: a swapped-in model's emissive parts won't auto-bloom with day/night yet — pass
`onLoad(model)` to `place()` to register them (or name glowing nodes per the convention below).

## Delivered (CC0 packs in `public/models/`)
- `village/` — KayKit medieval builder: houses, tower-house, market, dock, farm, windmill,
  barrel/crate/logs → the riverside hamlet, chicken farm, footbridge (`vil_*` in the manifest).
- `characters/` — rigged people (Idle/Walk/Run): the Explore avatar + villager NPCs (`char_*`).
- `nature/` — Quaternius birch trees, flowering bushes, flower clumps (`nat_*`).
- `kaykit/`, `kaykit-space/` — City Builder dwellings + Space Base modules/props (research ridge).
Each has a `SOURCE.md`. The wishlist below is what's still procedural and worth modelling next.

## Wishlist (priority order)

### Hero architecture (biggest visual payoff)
- `observatory.glb` — domed observatory + adjoining labs (Research Ridge).
- `dome_hall.glb` — large research dome/hall.
- `glass_tower.glb` — tall glass lab tower with lit interior.
- `ring_lab.glb` — stilted ring/torus building.
- `pavilion_a.glb`, `pavilion_b.glb` — timber dwellings w/ green roofs (Living Quarter; reuse many).
- `greenhouse.glb` — glass barrel-vault greenhouse (Greenworks).
- `data_center.glb` — low server block with cool glow (the "brain").
- `vertical_farm.glb` — glass tower with glowing grow-shelves.
- `mill_house.glb` — small water-mill building beside the wheels.
- `comms_mast.glb`, `water_tower.glb`, `funicular_car.glb` + station.

### Farms & props
- `wind_turbine.glb` (blades as a separate node so they can spin).
- `water_wheel.glb` (wheel as a separate spinnable node).
- `solar_panel.glb` (tile + instance it).
- `crop_row.glb`, `orchard_tree.glb`, `rice_paddy.glb`, `aquaponics_tank.glb`, `beehive.glb`,
  `stone_lantern.glb`, `arched_bridge.glb`, `dock.glb`, `boat.glb`.

### Nature
- `tree_deciduous_*.glb` (2–3 variants), `tree_conifer_*.glb`, `bush.glb`, `boulder_*.glb`,
  `rock_lantern.glb`. Instance these heavily.

### Characters / fauna (small)
- `person.glb` (simple, walk-cycle optional), `deer.glb`, `sheep.glb`, `duck.glb`, `heron.glb`,
  `drone.glb` (rotors as separate nodes), `fish.glb`, `bird.glb`.

## Notes
- Animated rigs aren't required — most motion is procedural (orbit paths, bobbing, spinning nodes).
  If a model has a sub-node that should rotate (rotor, wheel, turbine blades), name it clearly
  (e.g. `Rotor`, `Wheel`, `Blades`) so code can find and spin it.
- Until a model exists, the procedural fallback renders — so assets can land incrementally.
