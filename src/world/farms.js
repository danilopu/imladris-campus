import {
  Group, Mesh, InstancedMesh, Object3D, MeshStandardMaterial, BoxGeometry,
  ConeGeometry, CylinderGeometry, IcosahedronGeometry, TorusGeometry
} from 'three';
import { terrain } from './terrain.js';
import { place } from '../assets/loader.js';
import { MODELS } from '../assets/manifest.js';

const rand = Math.random;

// Food loop: planted fields, orchard, rice paddies, aquaponics, vertical farm, beehives.
// Static props; glow[] surfaces the emissive grow-lights so day/night can brighten them.
export function buildFarms() {
  const group = new Group();
  const glow = [];          // emissive mats day/night manages (grow-lights)
  const fieldMats = [];     // soil beds — glow green while irrigating (event-driven)
  const hiveMats = [];      // hive cores — spike on telemetry alert (event-driven)
  const dummy = new Object3D();
  let irrTimer = 0;

  // planted fields — instanced crop cones on a soil bed
  function field(cx, cz, w, d, rows, cols) {
    const by = terrain(cx, cz);
    const bed = new Mesh(new BoxGeometry(w, 0.6, d), new MeshStandardMaterial({ color: 0x5a4632, roughness: 1, flatShading: true, emissive: 0x2f7d3a, emissiveIntensity: 0 }));
    bed.position.set(cx, by + 0.3, cz); bed.receiveShadow = true; group.add(bed); fieldMats.push(bed.material);
    const cropG = new ConeGeometry(0.5, 1.4, 5); cropG.translate(0, 0.7, 0);
    const crops = new InstancedMesh(cropG, new MeshStandardMaterial({ color: 0x66ad4c, roughness: 0.9, flatShading: true }), rows * cols);
    let i = 0;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const x = cx - w / 2 + 0.9 + c * ((w - 1.8) / Math.max(cols - 1, 1)), z = cz - d / 2 + 0.9 + r * ((d - 1.8) / Math.max(rows - 1, 1));
      dummy.position.set(x, by + 0.6, z); dummy.rotation.set(0, 0, 0); const s = 0.7 + rand() * 0.5; dummy.scale.set(s, s, s); dummy.updateMatrix(); crops.setMatrixAt(i++, dummy.matrix);
    }
    crops.castShadow = true; group.add(crops);
  }
  field(-32, -28, 12, 9, 4, 6); field(-8, -44, 9, 8, 4, 5); field(22, -18, 10, 8, 4, 5); field(-44, -6, 9, 9, 4, 5);

  // orchard — little fruit trees in a grid
  const trunkMat = new MeshStandardMaterial({ color: 0x6b4a30, roughness: 1, flatShading: true });
  function miniTree(x, z, s) {
    const by = terrain(x, z), g = new Group();
    const tr = new Mesh(new CylinderGeometry(0.2, 0.3, 1.6 * s, 5), trunkMat); tr.position.y = 0.8 * s; g.add(tr);
    const can = new Mesh(new IcosahedronGeometry(1.2 * s, 0), new MeshStandardMaterial({ color: 0x86c25c, roughness: 0.95, flatShading: true })); can.position.y = 2 * s; can.castShadow = true; g.add(can);
    g.position.set(x, by, z); group.add(g);
  }
  (function orchard(cx, cz, rows, cols) { for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) miniTree(cx + c * 3.2, cz + r * 3.2, 0.8 + rand() * 0.3); })(-58, -30, 3, 4);

  // rice paddies — stepped flooded terraces
  (function paddies(cx, cz) {
    for (let i = 0; i < 4; i++) {
      const w = 11 - i * 1.6, x = cx, z = cz + i * 3.6, by = terrain(x, z);
      const pad = new Mesh(new BoxGeometry(w, 0.4, 3.2), new MeshStandardMaterial({ color: 0x5fa890, emissive: 0x123a32, emissiveIntensity: 0.3, roughness: 0.2, metalness: 0.2, transparent: true, opacity: 0.9 }));
      pad.position.set(x, by + 0.3 - i * 0.08, z); group.add(pad);
      const rim = new Mesh(new BoxGeometry(w + 0.6, 0.5, 0.4), new MeshStandardMaterial({ color: 0x6b5640, roughness: 1 })); rim.position.set(x, by + 0.3 - i * 0.08, z - 1.7); group.add(rim);
    }
  })(-30, -12);

  // aquaponics — circular fish-and-greens tanks
  (function aquaponics(cx, cz) {
    [[0, 0], [4.6, 0.8], [2.2, 4.4]].forEach(o => {
      const x = cx + o[0], z = cz + o[1], by = terrain(x, z);
      const p = new Mesh(new CylinderGeometry(2.2, 2.2, 0.8, 18), new MeshStandardMaterial({ color: 0x3f9bb0, emissive: 0x12414f, emissiveIntensity: 0.4, roughness: 0.15, metalness: 0.3, transparent: true, opacity: 0.9 }));
      p.position.set(x, by + 0.4, z); group.add(p);
      const ring = new Mesh(new TorusGeometry(2.2, 0.16, 8, 20), new MeshStandardMaterial({ color: 0xcfcfc4, roughness: 0.8 })); ring.rotation.x = Math.PI / 2; ring.position.set(x, by + 0.65, z); group.add(ring);
    });
  })(-2, -32);

  // vertical farm — glass tower with glowing grow-shelves (hero: swappable .glb)
  function vertFarmFab() {
    const g = new Group();
    const glass = new Mesh(new BoxGeometry(5, 12, 5), new MeshStandardMaterial({ color: 0xbfe0e8, transparent: true, opacity: 0.32, roughness: 0.05, metalness: 0.2 })); glass.position.y = 6; glass.castShadow = true; g.add(glass);
    for (let k = 0; k < 5; k++) { const band = new Mesh(new BoxGeometry(5.2, 0.5, 5.2), new MeshStandardMaterial({ color: 0x6ad07a, emissive: 0x39c06a, emissiveIntensity: 0.8 })); band.position.y = 1.6 + k * 2.2; g.add(band); glow.push(band.material); }
    return g;
  }
  { const x = 20, z = -34, by = terrain(x, z), M = MODELS.vertical_farm; group.add(place(M.url, vertFarmFab, { position: [x, by, z], scale: M.scale, rotationY: M.rotationY })); }

  // beehives — stacked supers with a faint glow
  function hive(x, z) {
    const by = terrain(x, z), g = new Group();
    for (let k = 0; k < 3; k++) { const b = new Mesh(new BoxGeometry(1.4, 0.5, 1.4), new MeshStandardMaterial({ color: k % 2 ? 0xf2e3b0 : 0xe7d295, roughness: 0.9, flatShading: true })); b.position.y = 0.25 + k * 0.5; b.castShadow = true; g.add(b); }
    const glowM = new Mesh(new IcosahedronGeometry(0.2, 0), new MeshStandardMaterial({ color: 0xffd27a, emissive: 0xffd27a, emissiveIntensity: 0.6 })); glowM.position.y = 1.75; g.add(glowM); hiveMats.push(glowM.material);
    g.position.set(x, by, z); group.add(g);
  }
  hive(-26, -22); hive(-23, -25.4);

  // event-loop hooks: irrigation pulse + hive telemetry alert (both fade in update)
  function irrigate() { irrTimer = 4.5; }
  function alertHive() { hiveMats.forEach(m => { m.emissiveIntensity = 2.6; }); }

  function update(dt) {
    if (irrTimer > 0) { irrTimer -= dt; const e = Math.max(0, irrTimer / 4.5) * 0.9; fieldMats.forEach(m => { m.emissiveIntensity = e; }); }
    hiveMats.forEach(m => { if (m.emissiveIntensity > 0.6) m.emissiveIntensity = Math.max(0.6, m.emissiveIntensity - dt * 0.6); });
  }

  return { group, update, glow, irrigate, alertHive };
}
