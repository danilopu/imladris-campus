# KayKit — City Builder Bits (CC0)

- **Author:** Kay Lousberg (KayKit)
- **License:** CC0 1.0 (public domain — no attribution required, credit appreciated)
- **Source:** https://github.com/KayKit-Game-Assets/KayKit-City-Builder-Bits-1.0
  (also https://kaylousberg.itch.io/city-builder-bits)

Files here (`building_A.gltf` + `building_A.bin` + `citybits_texture.png`) are the
self-contained set GLTFLoader needs — the `.gltf` references the `.bin` and texture by
relative path, so they must stay co-located. Wired via `src/assets/manifest.js`
(`glass_tower`). Drop in more buildings (building_B…H) the same way.

`Rogue_Hooded.glb` is from **KayKit — Character Pack: Adventurers** (also CC0, Kay
Lousberg, https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0).
It's a single self-contained rigged+animated `.glb` used as the Explore-mode avatar
(`src/core/explore.js`), loaded on demand when you enter Explore.
