# PORTING.md — From Prototype to Modules

`reference/campus-world.html` is the complete single-file prototype. This maps its parts to the
new module structure, so porting the rest is mechanical.

| Prototype section (in the HTML)                     | Module here                  | Status |
|-----------------------------------------------------|------------------------------|--------|
| `terrain()`, island top/block, river tubes, pond    | `world/terrain.js`           | ported |
| Glints, waterfall, water wheels                     | `world/water.js`             | ported |
| Forest, conifers, bushes, rocks, flowers (instanced)| `world/vegetation.js`        | ported |
| Sectors + floating labels + flySector               | `world/sectors.js`           | ported |
| Network edges + pulse Points                        | `systems/network.js`         | ported |
| Drones, deer, birds                                 | `systems/agents.js`          | ported |
| Wildfire state machine + particles                  | `systems/fire.js`            | ported |
| Status-ticker event cycle                           | `systems/events.js`          | ported (trimmed) |
| Toolbar, sector bar, ticker DOM/CSS                 | `ui/ui.js`, `ui/ui.css`      | ported |
| Ortho orbit + touch controls                        | `core/controls.js`           | ported |
| Lights + sky gradient shader                        | `core/lights.js`             | ported |
| Renderer/camera/loop                                | `core/scene.js`, `core/loop.js` | ported |
| Buildings & observatory                             | `world/buildings.js`         | ported |
| Farms: orchard/paddies/aquaponics/vertical farm     | `world/farms.js`             | ported |
| Funicular, bridges, lanterns, dock+boat             | `world/transport.js`         | ported |
| Sheep, ducks, heron, fish, butterflies              | `systems/fauna.js`           | ported |
| People → CC0 character NPCs (idle + walkers)        | `systems/villagers.js`       | replaced (rigged GLB) |
| Fireflies + clouds                                  | `systems/fauna.js`           | ported (clouds thinned) |
| Day/night cycle + toggle                            | `core/daynight.js`           | ported |
| Hotspots + info panels                              | `ui/hotspots.js`             | ported |
| Reactive alarm (fire→sensor→brain pulse)            | `systems/network.js` + `fire.js` | added (beyond prototype) |

## Porting recipe
1. Find the section in the HTML (it's commented, e.g. `// ---------- living complex ----------`).
2. Create/extend the matching module exporting `{ group }` (+ `update(dt,elapsed)` if animated).
3. Replace globals with imports: `terrain`/`riverX` from `world/terrain.js`, tunables from `config.js`.
4. In `main.js`, `scene.add(mod.group)` and `loop.add(mod)` if animated.
5. For anything that should later be a real model, wrap creation in `place('models/x.glb', fallback, t)`.

## Gotchas
- The prototype is r128 globals (`THREE.*`); here import named exports from `'three'`.
- `OrbitControls` is unused on purpose — the custom ortho controls handle zoom via `camera.zoom`.
- Bloom replaces the prototype's fake additive-sprite glows; rely on `emissive` materials.
