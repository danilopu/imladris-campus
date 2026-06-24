// Asset manifest — the single place that maps logical building IDs to .glb files
// and their load-time transforms. Builders route through place(MODELS[id].url, ...)
// with a procedural fallback, so the scene renders fully today and each model snaps
// in the moment its file lands in public/models/.
//
// To enable a model: drop the .glb in public/models/ and flip `enabled: true`
// (and tune scale/rotationY to match the ~180-unit island — see ASSETS.md).
// While `enabled` is false, url is null and place() just keeps the procedural
// fallback — no network request, no 404s.

const BASE = 'models/';

const defs = {
  observatory:   { file: 'observatory.glb',   enabled: false, scale: 1, rotationY: 0 },
  data_center:   { file: 'data_center.glb',   enabled: false, scale: 1, rotationY: 0 },
  greenhouse:    { file: 'greenhouse.glb',     enabled: false, scale: 1, rotationY: 0 },
  dome_hall:     { file: 'dome_hall.glb',      enabled: false, scale: 1, rotationY: 0 },
  glass_tower:   { file: 'kaykit/building_A.gltf', enabled: true, scale: 2, rotationY: 0 }, // CC0 KayKit City Builder
  ring_lab:      { file: 'ring_lab.glb',       enabled: false, scale: 1, rotationY: 0 },
  water_tower:   { file: 'water_tower.glb',    enabled: false, scale: 1, rotationY: 0 },
  vertical_farm: { file: 'vertical_farm.glb',  enabled: false, scale: 1, rotationY: 0 },
  memory_vault:  { file: 'memory_vault.glb',   enabled: false, scale: 1, rotationY: 0 },
  // CC0 KayKit City Builder dwellings (living quarter)
  res_b:         { file: 'kaykit/building_B.gltf', enabled: true, scale: 2, rotationY: 0 },
  res_c:         { file: 'kaykit/building_C.gltf', enabled: true, scale: 2, rotationY: 0 },
  res_d:         { file: 'kaykit/building_D.gltf', enabled: true, scale: 2, rotationY: 0 }
};

export const MODELS = Object.fromEntries(
  Object.entries(defs).map(([id, d]) => [id, {
    id,
    file: d.file,
    enabled: d.enabled,
    url: d.enabled ? BASE + d.file : null,
    scale: d.scale ?? 1,
    rotationY: d.rotationY ?? 0
  }])
);
