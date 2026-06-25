import {
  Group, Mesh, MeshStandardMaterial, BoxGeometry, ConeGeometry, CylinderGeometry,
  SphereGeometry, TorusGeometry, DoubleSide
} from 'three';
import { terrain, riverX } from './terrain.js';
import { place, loadModel } from '../assets/loader.js';
import { MODELS } from '../assets/manifest.js';

const rand = Math.random;

// All the campus architecture ported from the prototype. Hero structures route
// through place(MODELS[id].url, fallbackFactory, transform): they render the
// procedural fallback today and auto-swap to a .glb the moment one is enabled in
// assets/manifest.js. Numerous/instanced props (pavilions, solar, sensors) stay
// procedural-direct for now — they're lower asset priority (see ASSETS.md).
// Sector anchors (shared with transport/hotspots).
export const corePos = { x: 46, z: 50 };   // Research Ridge — east of BOTH the main river & the tributary
export const livePos = { x: -34, z: -46 };  // Living Quarter — west-bank hamlet square
export const greenPos = { x: 8, z: -26 };   // Greenworks
export const resPos = { x: -8, z: 60 };     // reservoir / storage
export const vaultPos = { x: -20, z: 54 };  // Memory — data & seed vault

// developed plots that vegetation should keep clear, so buildings aren't buried in forest
export const clearings = [
  { x: 46, z: 50, r: 20 }, { x: 11, z: 44, r: 9 }, { x: 38, z: 44, r: 9 },
  { x: 8, z: -26, r: 15 }, { x: 17, z: -23, r: 8 },
  // riverside hamlet: west bank square + market, a few east-bank cottages, the chicken farm
  { x: -34, z: -48, r: 17 }, { x: -7, z: -44, r: 10 }, { x: -55, z: -37, r: 12 },
  { x: -50, z: 6, r: 14 }, { x: -20, z: 54, r: 9 }, { x: 46, z: -4, r: 9 }, { x: -46, z: 22, r: 8 }
];

export function buildBuildings() {
  const group = new Group();
  const glow = [];          // emissive materials that brighten at night
  const turbines = [];      // blade groups to spin
  const chickens = [];      // { g, phase } hens pecking in the farm yard
  const sensorTips = [];    // { mat, base, phase } pulsing nervous-system endpoints
  let beaconMat = null;     // comms-mast warning beacon
  let computeMat = null;    // data-center compute load — brightens at midday surplus
  let resWater = null, resBotY = 0, resTopY = 0; // reservoir level, follows the sun
  let dayPhase = 1;         // 1 = midday, 0 = midnight (set by day/night via setDayPhase)

  function box(w, h, d, color, o = {}) {
    const m = new Mesh(new BoxGeometry(w, h, d), new MeshStandardMaterial({
      color, roughness: o.rough != null ? o.rough : 0.85, metalness: o.metal || 0,
      emissive: o.emissive || 0x000000, emissiveIntensity: o.ei || 0, flatShading: true,
      transparent: !!o.trans, opacity: o.trans || 1
    }));
    m.castShadow = true; m.receiveShadow = true; return m;
  }

  // hero(id, x, z, factory) — place a swappable building, fallback built at local origin.
  function hero(id, x, z, factory) {
    const M = MODELS[id], by = terrain(x, z);
    group.add(place(M ? M.url : null, factory, { position: [x, by, z], scale: M ? M.scale : 1, rotationY: M ? M.rotationY : 0 }));
  }

  function pavilion(x, z, w, d, wallC, roofC) {
    const g = new Group(), by = terrain(x, z), wallH = 3.4;
    const wall = box(w, wallH, d, wallC, { rough: 0.8 }); wall.position.set(x, by + wallH / 2, z); g.add(wall);
    const win = box(w + 0.06, wallH * 0.42, d + 0.06, 0xffce7a, { emissive: 0xffce7a, ei: 0.5, rough: 0.3 });
    win.position.set(x, by + wallH * 0.5, z); g.add(win); glow.push(win.material);
    const roof = new Mesh(new ConeGeometry(Math.max(w, d) * 0.92, 2.4, 4), new MeshStandardMaterial({ color: roofC, roughness: 0.7, flatShading: true, metalness: 0.05 }));
    roof.rotation.y = Math.PI / 4; roof.position.set(x, by + wallH + 1.2, z); roof.castShadow = true; g.add(roof);
    return g;
  }

  // local-origin pavilion (fallback for swappable dwellings — built at origin so place()
  // can position it; the world-coord pavilion() above is for direct procedural placement)
  function pavilionFab(w, d, wallC, roofC) {
    const g = new Group(), wallH = 3.4;
    const wall = box(w, wallH, d, wallC, { rough: 0.8 }); wall.position.y = wallH / 2; g.add(wall);
    const win = box(w + 0.06, wallH * 0.42, d + 0.06, 0xffce7a, { emissive: 0xffce7a, ei: 0.5, rough: 0.3 }); win.position.y = wallH * 0.5; g.add(win); glow.push(win.material);
    const roof = new Mesh(new ConeGeometry(Math.max(w, d) * 0.92, 2.4, 4), new MeshStandardMaterial({ color: roofC, roughness: 0.7, flatShading: true, metalness: 0.05 })); roof.rotation.y = Math.PI / 4; roof.position.y = wallH + 1.2; roof.castShadow = true; g.add(roof);
    return g;
  }

  // --- local-origin fallback factories for the hero buildings ---
  function observatoryFab() {
    const g = new Group();
    const drum = new Mesh(new CylinderGeometry(3.8, 4.1, 3.4, 22), new MeshStandardMaterial({ color: 0xd8dde0, roughness: 0.5, metalness: 0.3 })); drum.position.y = 1.7; drum.castShadow = true; g.add(drum);
    const dome = new Mesh(new SphereGeometry(3.9, 24, 14, 0, 6.28, 0, Math.PI / 2), new MeshStandardMaterial({ color: 0xeef1f2, roughness: 0.32, metalness: 0.4 })); dome.position.y = 3.4; dome.castShadow = true; g.add(dome);
    return g;
  }
  // Sentinel AI & Data Center — "the brain" (paper §3). A low server hall with lit
  // server-rack slots, roof cooling, and a compute core that brightens at midday surplus.
  function dataCenterFab() {
    const g = new Group();
    const shell = box(7, 3.8, 7, 0x222d34, { metal: 0.55, rough: 0.45 }); shell.position.y = 1.9; g.add(shell);
    // glowing server-rack slots down two faces
    const rackMat = new MeshStandardMaterial({ color: 0x0c2630, emissive: 0x6ad6ff, emissiveIntensity: 0.7, metalness: 0.4, roughness: 0.3 });
    for (let i = 0; i < 5; i++) {
      const z = -2.6 + i * 1.3;
      const a = new Mesh(new BoxGeometry(0.18, 2.8, 0.9), rackMat); a.position.set(3.55, 1.9, z); g.add(a);
      const b = new Mesh(new BoxGeometry(0.18, 2.8, 0.9), rackMat); b.position.set(-3.55, 1.9, z); g.add(b);
    }
    glow.push(rackMat);
    // roof cooling units
    for (let i = 0; i < 4; i++) { const cu = box(1.3, 0.6, 1.3, 0x9aa3a9, { metal: 0.4, rough: 0.6 }); cu.position.set(-2 + (i % 2) * 4, 4.1, -2 + Math.floor(i / 2) * 4); g.add(cu); }
    // compute load core — scheduled into the midday surplus, animated (not day/night-managed)
    computeMat = new MeshStandardMaterial({ color: 0x103040, emissive: 0x6ad6ff, emissiveIntensity: 0.6 });
    const core = new Mesh(new BoxGeometry(5, 0.6, 5), computeMat); core.position.y = 4.1; g.add(core);
    return g;
  }
  function greenhouseFab() {
    const g = new Group();
    const gh = new Mesh(new CylinderGeometry(3.4, 3.4, 13, 18, 1, false, 0, Math.PI), new MeshStandardMaterial({ color: 0xbfeede, roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0.42, emissive: 0x2f8a62, emissiveIntensity: 0.5 }));
    gh.rotation.z = Math.PI / 2; gh.position.y = 3.4; g.add(gh); glow.push(gh.material);
    return g;
  }
  function domeHallFab() {
    const g = new Group();
    const base = new Mesh(new CylinderGeometry(5, 5, 2.4, 24), new MeshStandardMaterial({ color: 0xdfe3e6, roughness: 0.5, metalness: 0.2 })); base.position.y = 1.2; base.castShadow = true; g.add(base);
    const dome = new Mesh(new SphereGeometry(5, 28, 16, 0, 6.28, 0, Math.PI / 2), new MeshStandardMaterial({ color: 0xeaf0f2, roughness: 0.25, metalness: 0.35, transparent: true, opacity: 0.92 })); dome.position.y = 2.4; dome.castShadow = true; g.add(dome);
    const win = new Mesh(new CylinderGeometry(5.05, 5.05, 0.8, 24), new MeshStandardMaterial({ color: 0x6ad6ff, emissive: 0x6ad6ff, emissiveIntensity: 0.5 })); win.position.y = 1.2; g.add(win); glow.push(win.material);
    return g;
  }
  function glassTowerFab() {
    const g = new Group();
    const t = new Mesh(new BoxGeometry(4.5, 14, 4.5), new MeshStandardMaterial({ color: 0x9fc0d6, transparent: true, opacity: 0.4, roughness: 0.05, metalness: 0.3, emissive: 0xffce7a, emissiveIntensity: 0.25 })); t.position.y = 7; t.castShadow = true; g.add(t); glow.push(t.material);
    const cap = new Mesh(new BoxGeometry(5, 0.8, 5), new MeshStandardMaterial({ color: 0xcfd6da, metalness: 0.4, roughness: 0.4 })); cap.position.y = 14.2; g.add(cap);
    return g;
  }
  function ringBuildingFab() {
    const g = new Group();
    const ring = new Mesh(new TorusGeometry(4, 1.1, 12, 26), new MeshStandardMaterial({ color: 0xd8dde0, roughness: 0.4, metalness: 0.2 })); ring.rotation.x = Math.PI / 2; ring.position.y = 3; ring.castShadow = true; g.add(ring);
    const win = new Mesh(new TorusGeometry(4, 0.5, 8, 26), new MeshStandardMaterial({ color: 0x7ad6a8, emissive: 0x7ad6a8, emissiveIntensity: 0.5 })); win.rotation.x = Math.PI / 2; win.position.y = 3; g.add(win); glow.push(win.material);
    for (let i = 0; i < 4; i++) { const a = i / 4 * 6.28; const leg = new Mesh(new CylinderGeometry(0.3, 0.3, 3, 6), new MeshStandardMaterial({ color: 0xb0b4ba })); leg.position.set(Math.cos(a) * 4, 1.5, Math.sin(a) * 4); g.add(leg); }
    return g;
  }
  function waterTowerFab() {
    const g = new Group();
    for (let i = 0; i < 4; i++) { const a = i / 4 * 6.28 + 0.4; const leg = new Mesh(new CylinderGeometry(0.18, 0.18, 6, 5), new MeshStandardMaterial({ color: 0x8a8f96 })); leg.position.set(Math.cos(a) * 1.4, 3, Math.sin(a) * 1.4); g.add(leg); }
    const tank = new Mesh(new CylinderGeometry(2, 2, 2.4, 14), new MeshStandardMaterial({ color: 0xb04a36, roughness: 0.7, flatShading: true })); tank.position.y = 7; tank.castShadow = true; g.add(tank);
    const top = new Mesh(new ConeGeometry(2.1, 1.2, 14), new MeshStandardMaterial({ color: 0x8a857a, roughness: 1 })); top.position.y = 8.6; g.add(top);
    return g;
  }
  // Memory — data & seed vault (the "ark", paper §9): a stone bunker carved into the
  // ridge with a glowing core that carries knowledge through hard times.
  function vaultFab() {
    const g = new Group();
    const mound = new Mesh(new CylinderGeometry(4.2, 5, 3, 6), new MeshStandardMaterial({ color: 0x6f6a5e, roughness: 1, flatShading: true })); mound.position.y = 1.5; mound.rotation.y = 0.5; mound.castShadow = true; mound.receiveShadow = true; g.add(mound);
    const cap = new Mesh(new SphereGeometry(4.2, 10, 6, 0, 6.28, 0, Math.PI / 2), new MeshStandardMaterial({ color: 0x5a5650, roughness: 1, flatShading: true })); cap.position.y = 3; g.add(cap);
    const door = new Mesh(new BoxGeometry(1.7, 2.4, 0.5), new MeshStandardMaterial({ color: 0xb6e87a, emissive: 0xb6e87a, emissiveIntensity: 0.9 })); door.position.set(0, 1.4, 4.4); g.add(door); glow.push(door.material);
    const lintel = new Mesh(new BoxGeometry(2.4, 0.5, 0.7), new MeshStandardMaterial({ color: 0x4a463f, roughness: 1, flatShading: true })); lintel.position.set(0, 2.8, 4.3); g.add(lintel);
    return g;
  }

  // research core + observatory — east ridge, on the bank above the river valley (labs
  // procedural, dome is a hero). Spaced so the rivers read clearly past them, not through them.
  group.add(pavilion(corePos.x - 2, corePos.z, 9, 7, 0xdfe3e6, 0x5a6b74));
  group.add(pavilion(corePos.x + 6, corePos.z + 2, 6, 6, 0xcfd6da, 0x55656e));
  hero('observatory', corePos.x, corePos.z + 8, observatoryFab);

  // --- riverside hamlet: CC0 KayKit village houses on the BANKS (never in the water),
  // a footbridge + gate-tower spanning the river, a dock, a market square, and (over in
  // Wildwood) a fenced chicken farm. Addresses the D2/B3 review notes directly. ---
  const HOUSE_IDS = ['vil_house1', 'vil_house2', 'vil_house3'];
  // place a village model at world (x,z); if faceTo given, rotate to face that point
  function vil(id, x, z, faceTo) {
    const M = MODELS[id], by = terrain(x, z);
    const ry = faceTo ? Math.atan2(faceTo[0] - x, faceTo[1] - z) : rand() * Math.PI * 2;
    group.add(place(M ? M.url : null, () => pavilionFab(4.4, 4.4, 0xc59a64, 0x5f8a59), { position: [x, by, z], scale: M ? M.scale : 1, rotationY: ry }));
  }

  function bridge(z) {
    const cx = riverX(z), wBank = cx - 12, eBank = cx + 12, len = eBank - wBank;
    const yDeck = Math.max(terrain(wBank, z), terrain(eBank, z)) + 0.5;
    const deck = box(len, 0.4, 4.2, 0x8a6a44, { rough: 0.9 }); deck.position.set((wBank + eBank) / 2, yDeck, z); group.add(deck);
    [-2.1, 2.1].forEach(dz => {
      const rail = box(len, 0.45, 0.16, 0x6b4a30, { rough: 1 }); rail.position.set((wBank + eBank) / 2, yDeck + 0.8, z + dz); group.add(rail);
      for (let p = 0; p <= 6; p++) { const px = wBank + len * p / 6; const post = box(0.2, 1.1, 0.2, 0x6b4a30, { rough: 1 }); post.position.set(px, yDeck + 0.55, z + dz); group.add(post); }
    });
    // piers dropping into the channel
    [cx - 3, cx + 3].forEach(px => { const pier = new Mesh(new CylinderGeometry(0.4, 0.5, 9, 7), new MeshStandardMaterial({ color: 0x6b4a30, roughness: 1, flatShading: true })); pier.position.set(px, yDeck - 4.5, z); pier.castShadow = true; group.add(pier); });
    // the "bridge-house": a gate-tower on the west abutment
    vil('vil_tower', wBank - 1.5, z, [cx, z]);
  }

  (function hamlet() {
    // houses lining the west bank (all face the river), sparser cottages on the east bank
    const zs = [-38, -44, -50, -56, -62];
    zs.forEach((z, i) => {
      const cx = riverX(z);
      const wx = cx - (11 + rand() * 3), wz = z + (rand() - 0.5) * 3;
      vil(HOUSE_IDS[i % 3], wx, wz, [cx, z]);
      if (i % 2 === 0) { const ex = cx + (11 + rand() * 3), ez = z + (rand() - 0.5) * 3; vil(HOUSE_IDS[(i + 1) % 3], ex, ez, [cx, z]); }
    });
    // market square + clutter set back on the west bank
    vil('vil_market', -44, -48, [riverX(-48), -48]);
    vil('vil_barrel', -40.5, -45.5); vil('vil_crate', -42, -50); vil('vil_logs', -47, -50.5);
    // dock at the water's edge
    { const z = -46, cx = riverX(z); vil('vil_dock', cx - 7, z, [cx, z]); }
    // footbridge + gate-tower across the river
    bridge(-50);
  })();

  (function chickenFarm() {
    const cx = -55, cz = -37;                       // Wildwood · B3 (review note)
    vil('vil_farm', cx, cz);                         // tilled yard
    vil('vil_house3', cx - 6, cz - 3, [cx, cz]);     // hen house / coop
    vil('vil_barrel', cx + 4.5, cz + 2.5);
    // low picket fence ring
    for (let a = 0; a < 16; a++) { const an = a / 16 * 6.28, fx = cx + Math.cos(an) * 7, fz = cz + Math.sin(an) * 7; const post = box(0.24, 1.0, 0.24, 0xc0a06a, { rough: 1 }); post.position.set(fx, terrain(fx, fz) + 0.5, fz); group.add(post); }
    // hens pecking in the yard (animated in update)
    for (let i = 0; i < 7; i++) {
      const an = rand() * 6.28, rr = rand() * 5, x = cx + Math.cos(an) * rr, z = cz + Math.sin(an) * rr, g = new Group();
      const bodyC = i % 3 === 0 ? 0x8a5a3a : 0xf2efe6;
      const body = new Mesh(new SphereGeometry(0.34, 8, 6), new MeshStandardMaterial({ color: bodyC, roughness: 0.95, flatShading: true })); body.scale.set(1, 0.9, 1.25); body.position.y = 0.45; body.castShadow = true; g.add(body);
      const head = new Mesh(new SphereGeometry(0.2, 7, 6), new MeshStandardMaterial({ color: bodyC, roughness: 0.95, flatShading: true })); head.position.set(0, 0.78, 0.3); g.add(head);
      const beak = new Mesh(new ConeGeometry(0.07, 0.18, 5), new MeshStandardMaterial({ color: 0xe0a020 })); beak.rotation.x = Math.PI / 2; beak.position.set(0, 0.76, 0.52); g.add(beak);
      const comb = new Mesh(new SphereGeometry(0.09, 6, 5), new MeshStandardMaterial({ color: 0xd64a3a, roughness: 0.9 })); comb.position.set(0, 0.95, 0.28); g.add(comb);
      g.position.set(x, terrain(x, z), z); g.rotation.y = rand() * 6.28; group.add(g);
      chickens.push({ g, phase: rand() * 6.28, baseY: terrain(x, z) });
    }
  })();

  // greenhouses + data center (the "brain")
  hero('greenhouse', greenPos.x, greenPos.z, greenhouseFab);
  hero('data_center', greenPos.x + 9, greenPos.z + 3, dataCenterFab);

  // wind turbines (ridge)
  [[2, 64], [20, 68], [-22, 66]].forEach(p => {
    const by = terrain(p[0], p[1]), g = new Group();
    const tower = new Mesh(new CylinderGeometry(0.45, 0.8, 15, 10), new MeshStandardMaterial({ color: 0xeceae2, roughness: 0.5 }));
    tower.position.y = 7.5; tower.castShadow = true; g.add(tower);
    const hub = new Group(); hub.position.set(0, 15, 1);
    const nac = box(1.2, 1.2, 2.6, 0xdad8d0, {}); nac.position.z = -0.5; hub.add(nac);
    const blades = new Group();
    for (let b = 0; b < 3; b++) { const bl = new Mesh(new BoxGeometry(0.28, 7.4, 0.95), new MeshStandardMaterial({ color: 0xf4f2ec, roughness: 0.4 })); bl.position.y = 3.7; bl.castShadow = true; const bgp = new Group(); bgp.add(bl); bgp.rotation.z = b * 2.094; blades.add(bgp); }
    hub.add(blades); g.add(hub); g.position.set(p[0], by, p[1]); group.add(g); turbines.push(blades);
  });

  // solar array — procedural panels, swapped for the CC0 Space Base solar model on load
  const solarSpots = [];
  { const ox = -50, oz = 4; for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) { const x = ox + c * 4.4, z = oz + r * 4.4, by = terrain(x, z); const p = box(3.6, 0.28, 2.3, 0x16243b, { metal: 0.4, rough: 0.3, emissive: 0x1d3f72, ei: 0.3 }); p.position.set(x, by + 1.3, z); p.rotation.x = -0.5; group.add(p); glow.push(p.material); solarSpots.push({ p, x, y: by + 0.9, z }); } }
  { const SM = MODELS.space_solar; if (SM && SM.url) loadModel(SM.url).then(scene => { solarSpots.forEach(s => { group.remove(s.p); const c = scene.clone(); c.scale.setScalar(SM.scale); c.position.set(s.x, s.y, s.z); c.traverse(o => { if (o.isMesh) o.castShadow = true; }); group.add(c); }); }).catch(() => { /* keep procedural panels */ }); }

  // reservoir (pumped-hydro storage) — water level follows the sun: pumped uphill at
  // midday surplus, released through the turbine at dusk (paper §10).
  {
    const by = terrain(resPos.x, resPos.z);
    const wall = new Mesh(new CylinderGeometry(6.4, 6.4, 2.6, 28, 1, true), new MeshStandardMaterial({ color: 0x6f6a5e, roughness: 1, flatShading: true, side: DoubleSide }));
    wall.position.set(resPos.x, by + 1.0, resPos.z); wall.castShadow = true; wall.receiveShadow = true; group.add(wall);
    resWater = new Mesh(new CylinderGeometry(6.1, 6.1, 0.4, 26), new MeshStandardMaterial({ color: 0x4fa8c4, emissive: 0x123a4d, emissiveIntensity: 0.5, roughness: 0.12, metalness: 0.3, transparent: true, opacity: 0.92 }));
    resBotY = by + 0.5; resTopY = by + 2.0; resWater.position.set(resPos.x, resBotY, resPos.z); group.add(resWater);
  }

  // comms mast with blinking beacon
  {
    const x = corePos.x + 8, z = corePos.z - 2, by = terrain(x, z), g = new Group(); // east of the core, clear of the river
    const mast = new Mesh(new CylinderGeometry(0.25, 0.5, 20, 6), new MeshStandardMaterial({ color: 0xc1c6ce, roughness: 0.5, metalness: 0.3 })); mast.position.y = 10; mast.castShadow = true; g.add(mast);
    for (let k = 1; k < 4; k++) { const ring = new Mesh(new TorusGeometry(0.95 - k * 0.16, 0.06, 6, 12), new MeshStandardMaterial({ color: 0xc1c6ce })); ring.position.y = 4 + k * 4.6; ring.rotation.x = Math.PI / 2; g.add(ring); }
    beaconMat = new MeshStandardMaterial({ color: 0xff5a4a, emissive: 0xff5a4a, emissiveIntensity: 1.4 });
    const beacon = new Mesh(new SphereGeometry(0.42, 8, 8), beaconMat); beacon.position.y = 20.4; g.add(beacon);
    g.position.set(x, by, z); group.add(g);
  }

  // (the living quarter is now the riverside hamlet built above — houses on the banks)

  // varied research facilities (heroes)
  hero('dome_hall', 50, 44, domeHallFab); // east of the tributary, beside the research cluster // moved off the tributary channel (was in the river)
  hero('glass_tower', 11, 44, glassTowerFab);
  hero('ring_lab', 38, 44, ringBuildingFab);
  hero('water_tower', -46, 22, waterTowerFab);
  hero('dome_hall', -60, 8, domeHallFab);
  hero('memory_vault', vaultPos.x, vaultPos.z, vaultFab);
  // drone landing pad (CC0 KayKit Space Base) near the eastern drone bay
  hero('space_pad', 46, -4, () => { const g = new Group(); const base = new Mesh(new CylinderGeometry(3, 3, 0.3, 12), new MeshStandardMaterial({ color: 0x3a4348, roughness: 0.6, metalness: 0.3 })); base.position.y = 0.15; g.add(base); return g; });

  // sensor posts — visible nervous-system endpoints that pulse
  function sensorPost(x, z, col) {
    const by = terrain(x, z), g = new Group();
    const post = new Mesh(new CylinderGeometry(0.12, 0.16, 2.4, 5), new MeshStandardMaterial({ color: 0x3a4348, roughness: 0.8 })); post.position.y = 1.2; g.add(post);
    const tipMat = new MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 1.4 });
    const tip = new Mesh(new SphereGeometry(0.34, 8, 8), tipMat); tip.position.y = 2.5; g.add(tip);
    g.position.set(x, by, z); group.add(g);
    sensorTips.push({ mat: tipMat, base: 1.4, phase: rand() * 6.28 });
  }
  [[-56, -16], [-40, -30], [-20, -10], [10, -38], [34, -30], [-30, 30], [18, 30], [-50, 18], [40, -2], [-12, -52]].forEach((p, i) => sensorPost(p[0], p[1], i % 3 === 0 ? 0x7ad6a8 : (i % 3 === 1 ? 0x6ad6ff : 0xb6e87a)));

  // day/night broadcasts the day fraction here (1 = noon, 0 = midnight)
  function setDayPhase(d) { dayPhase = d; }

  function update(dt, elapsed) {
    const now = elapsed * 1000;
    turbines.forEach((b, i) => { b.rotation.z += dt * (1.0 + i * 0.15); });
    // hens peck: a gentle forward dip + tiny hop, offset per bird
    chickens.forEach(c => { c.phase += dt * (1.4 + 0.3 * Math.sin(c.phase)); const peck = Math.max(0, Math.sin(c.phase * 2)); c.g.rotation.x = peck * 0.4; c.g.position.y = c.baseY + (1 - peck) * 0.04; });
    sensorTips.forEach(s => { s.mat.emissiveIntensity = s.base * (0.7 + 0.4 * Math.sin(now * 0.004 + s.phase)); });
    if (beaconMat) beaconMat.emissiveIntensity = Math.sin(now * 0.004) > 0.6 ? 2.2 : 0.35;
    // metabolic heartbeat: reservoir fills at noon, drains at dusk; compute follows surplus
    if (resWater) resWater.position.y = resBotY + (resTopY - resBotY) * dayPhase;
    if (computeMat) computeMat.emissiveIntensity = 0.4 + dayPhase * 1.4;
  }

  return { group, update, glow, setDayPhase };
}
