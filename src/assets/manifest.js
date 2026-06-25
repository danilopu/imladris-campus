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
  // research-ridge labs → CC0 KayKit Space Base modules (modern future-tech look)
  glass_tower:   { file: 'kaykit-space/basemodule_A.gltf', enabled: true, scale: 4.6, rotationY: 0 },
  ring_lab:      { file: 'kaykit-space/basemodule_C.gltf', enabled: true, scale: 4.6, rotationY: 0 },
  water_tower:   { file: 'water_tower.glb',    enabled: false, scale: 1, rotationY: 0 },
  vertical_farm: { file: 'vertical_farm.glb',  enabled: false, scale: 1, rotationY: 0 },
  memory_vault:  { file: 'memory_vault.glb',   enabled: false, scale: 1, rotationY: 0 },
  // CC0 KayKit City Builder dwellings (living quarter)
  res_a:         { file: 'kaykit/building_A.gltf', enabled: true, scale: 2, rotationY: 0 },
  res_b:         { file: 'kaykit/building_B.gltf', enabled: true, scale: 2, rotationY: 0 },
  res_c:         { file: 'kaykit/building_C.gltf', enabled: true, scale: 2, rotationY: 0 },
  res_d:         { file: 'kaykit/building_D.gltf', enabled: true, scale: 2, rotationY: 0 },
  // CC0 KayKit Space Base props
  space_solar:   { file: 'kaykit-space/solarpanel.gltf', enabled: true, scale: 2, rotationY: 0 },
  space_pad:     { file: 'kaykit-space/landingpad_large.gltf', enabled: true, scale: 2.2, rotationY: 0 },
  space_rover:   { file: 'kaykit-space/spacetruck.gltf', enabled: true, scale: 1.5, rotationY: 0 },

  // --- CC0 KayKit village (medieval builder) — the living/food side of the organism.
  // Native models are ~1 unit; scale ~6 reads as a real house on the ~180-unit island. ---
  vil_house1:    { file: 'village/Houses_FirstAge_1_Level2.gltf', enabled: true, scale: 6, rotationY: 0 },
  vil_house2:    { file: 'village/Houses_FirstAge_2_Level2.gltf', enabled: true, scale: 6, rotationY: 0 },
  vil_house3:    { file: 'village/Houses_FirstAge_3_Level2.gltf', enabled: true, scale: 6, rotationY: 0 },
  vil_tower:     { file: 'village/TowerHouse_FirstAge.gltf',      enabled: true, scale: 6, rotationY: 0 },
  vil_market:    { file: 'village/Market_FirstAge_Level2.gltf',   enabled: true, scale: 5, rotationY: 0 },
  vil_dock:      { file: 'village/Dock_FirstAge.gltf',            enabled: true, scale: 6, rotationY: 0 },
  vil_farm:      { file: 'village/Farm_FirstAge_Level2.gltf',     enabled: true, scale: 6, rotationY: 0 },
  vil_farm_wheat:{ file: 'village/Farm_FirstAge_Level2_Wheat.gltf', enabled: true, scale: 6, rotationY: 0 },
  vil_windmill:  { file: 'village/Windmill_FirstAge.gltf',        enabled: true, scale: 6, rotationY: 0 },
  vil_barrel:    { file: 'village/Barrel.gltf',                   enabled: true, scale: 6, rotationY: 0 },
  vil_crate:     { file: 'village/Crate.gltf',                    enabled: true, scale: 6, rotationY: 0 },
  vil_logs:      { file: 'village/Logs.gltf',                     enabled: true, scale: 5, rotationY: 0 },

  // --- CC0 Quaternius stylized nature — birch groves, flowering bushes, flower clumps ---
  nat_birch1:    { file: 'nature/BirchTree_1.gltf', enabled: true, scale: 1.3, rotationY: 0 },
  nat_birch2:    { file: 'nature/BirchTree_2.gltf', enabled: true, scale: 1.2, rotationY: 0 },
  nat_birch3:    { file: 'nature/BirchTree_3.gltf', enabled: true, scale: 1.3, rotationY: 0 },
  nat_bush:      { file: 'nature/Bush_Small_Flowers.gltf', enabled: true, scale: 1.3, rotationY: 0 },
  nat_bushL:     { file: 'nature/Bush_Large_Flowers.gltf', enabled: true, scale: 1.4, rotationY: 0 },
  nat_flowers2:  { file: 'nature/Flower_2_Clump.gltf', enabled: true, scale: 1.8, rotationY: 0 },
  nat_flowers3:  { file: 'nature/Flower_3_Clump.gltf', enabled: true, scale: 1.8, rotationY: 0 },
  nat_flowers4:  { file: 'nature/Flower_4_Clump.gltf', enabled: true, scale: 1.8, rotationY: 0 },

  // --- CC0 character pack — avatar + villager NPCs (native ~3.2u tall → scale ~0.5 ≈ 1.7m) ---
  char_casualM:  { file: 'characters/Casual_Male.gltf',      enabled: true, scale: 0.52, rotationY: 0 },
  char_casualF:  { file: 'characters/Casual_Female.gltf',    enabled: true, scale: 0.52, rotationY: 0 },
  char_casual2M: { file: 'characters/Casual2_Male.gltf',     enabled: true, scale: 0.52, rotationY: 0 },
  char_worker:   { file: 'characters/Worker_Male.gltf',      enabled: true, scale: 0.52, rotationY: 0 },
  char_suitF:    { file: 'characters/Suit_Female.gltf',      enabled: true, scale: 0.52, rotationY: 0 },
  char_chef:     { file: 'characters/Chef_Male.gltf',        enabled: true, scale: 0.52, rotationY: 0 },
  char_elf:      { file: 'characters/Elf.gltf',              enabled: true, scale: 0.45, rotationY: 0 },
  char_doctor:   { file: 'characters/Doctor_Male_Young.gltf', enabled: true, scale: 0.52, rotationY: 0 }
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
