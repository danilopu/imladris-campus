import {
  Group, Mesh, MeshStandardMaterial, BoxGeometry, ConeGeometry, CylinderGeometry,
  SphereGeometry, TorusGeometry, DoubleSide
} from 'three';
import { terrain } from './terrain.js';
import { place, loadModel } from '../assets/loader.js';
import { MODELS } from '../assets/manifest.js';

const rand = Math.random;

// All the campus architecture ported from the prototype. Hero structures route
// through place(MODELS[id].url, fallbackFactory, transform): they render the
// procedural fallback today and auto-swap to a .glb the moment one is enabled in
// assets/manifest.js. Numerous/instanced props (pavilions, solar, sensors) stay
// procedural-direct for now — they're lower asset priority (see ASSETS.md).
// Sector anchors (shared with transport/hotspots).
export const corePos = { x: 22, z: 50 };   // Research Ridge
export const livePos = { x: -22, z: -44 };  // Living Quarter
export const greenPos = { x: 8, z: -26 };   // Greenworks
export const resPos = { x: -8, z: 60 };     // reservoir / storage
export const vaultPos = { x: -20, z: 54 };  // Memory — data & seed vault

export function buildBuildings() {
  const group = new Group();
  const glow = [];          // emissive materials that brighten at night
  const turbines = [];      // blade groups to spin
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
  // place a swappable dwelling: real CC0 model with a pavilion fallback
  function dwelling(id, x, z) {
    const M = MODELS[id], by = terrain(x, z);
    group.add(place(M ? M.url : null, () => pavilionFab(4.5, 4.5, 0xc59a64, 0x5f8a59), { position: [x, by, z], scale: M ? M.scale : 1, rotationY: rand() * Math.PI * 2 }));
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

  // research core + observatory (hill, north) — labs procedural, dome is a hero
  group.add(pavilion(corePos.x, corePos.z, 9, 7, 0xdfe3e6, 0x5a6b74));
  group.add(pavilion(corePos.x + 9, corePos.z - 4, 6, 6, 0xcfd6da, 0x55656e));
  hero('observatory', corePos.x - 3, corePos.z + 9, observatoryFab);

  // living complex (low, by river)
  for (let i = 0; i < 8; i++) {
    const ang = i * 0.8, rx = livePos.x + Math.cos(ang) * (7 + i * 1.7) + (i % 2 ? 3 : -2), rz = livePos.z + Math.sin(ang) * (6 + i * 1.1);
    group.add(pavilion(rx, rz, 4.6 + rand() * 1.6, 4.6 + rand() * 1.6, 0xc89a64, 0x5f8a59));
  }

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
    const x = corePos.x - 14, z = corePos.z - 2, by = terrain(x, z), g = new Group();
    const mast = new Mesh(new CylinderGeometry(0.25, 0.5, 20, 6), new MeshStandardMaterial({ color: 0xc1c6ce, roughness: 0.5, metalness: 0.3 })); mast.position.y = 10; mast.castShadow = true; g.add(mast);
    for (let k = 1; k < 4; k++) { const ring = new Mesh(new TorusGeometry(0.95 - k * 0.16, 0.06, 6, 12), new MeshStandardMaterial({ color: 0xc1c6ce })); ring.position.y = 4 + k * 4.6; ring.rotation.x = Math.PI / 2; g.add(ring); }
    beaconMat = new MeshStandardMaterial({ color: 0xff5a4a, emissive: 0xff5a4a, emissiveIntensity: 1.4 });
    const beacon = new Mesh(new SphereGeometry(0.42, 8, 8), beaconMat); beacon.position.y = 20.4; g.add(beacon);
    g.position.set(x, by, z); group.add(g);
  }

  // densify dwellings — real CC0 KayKit buildings (cycled for variety), pavilion fallback
  const resModels = ['res_a', 'res_b', 'res_c', 'res_d'];
  [[-30, -50], [-36, -42], [-16, -38], [-40, -52], [2, -50]].forEach((p, i) => dwelling(resModels[i % resModels.length], p[0], p[1]));

  // varied research facilities (heroes)
  hero('dome_hall', 36, 58, domeHallFab);
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
    sensorTips.forEach(s => { s.mat.emissiveIntensity = s.base * (0.7 + 0.4 * Math.sin(now * 0.004 + s.phase)); });
    if (beaconMat) beaconMat.emissiveIntensity = Math.sin(now * 0.004) > 0.6 ? 2.2 : 0.35;
    // metabolic heartbeat: reservoir fills at noon, drains at dusk; compute follows surplus
    if (resWater) resWater.position.y = resBotY + (resTopY - resBotY) * dayPhase;
    if (computeMat) computeMat.emissiveIntensity = 0.4 + dayPhase * 1.4;
  }

  return { group, update, glow, setDayPhase };
}
