import { Group, Mesh, SphereGeometry, BoxGeometry, CylinderGeometry, ConeGeometry, MeshStandardMaterial, Vector3 } from 'three';
import { terrain } from '../world/terrain.js';

const rand = Math.random;
const lerp = (a, b, t) => a + (b - a) * t;

function makeDrone() {
  const g = new Group();
  const body = new Mesh(new SphereGeometry(0.6, 10, 8), new MeshStandardMaterial({ color: 0x20272b, metalness: 0.5, roughness: 0.4, emissive: 0x7ad6a8, emissiveIntensity: 0.6 }));
  g.add(body);
  for (let a = 0; a < 4; a++) { const arm = new Mesh(new BoxGeometry(2, 0.1, 0.1), new MeshStandardMaterial({ color: 0x3a4348 })); arm.rotation.y = a * Math.PI / 2; g.add(arm); }
  return g;
}
function makeDeer() {
  const g = new Group(), c = 0x8a5a3a, mat = new MeshStandardMaterial({ color: c, roughness: 0.9, flatShading: true });
  const body = new Mesh(new BoxGeometry(2, 1.05, 0.85), mat); body.position.y = 1.35; body.castShadow = true; g.add(body);
  const neck = new Mesh(new BoxGeometry(0.55, 1.1, 0.5), mat); neck.position.set(0.85, 2, 0); neck.rotation.z = -0.55; g.add(neck); g.userData.neck = neck;
  const head = new Mesh(new BoxGeometry(0.85, 0.45, 0.45), mat); head.position.set(1.35, 2.35, 0); neck.add(head);
  [[-0.7, 0.35], [0.7, 0.35], [-0.7, -0.35], [0.7, -0.35]].forEach(p => { const leg = new Mesh(new CylinderGeometry(0.12, 0.12, 1.4, 5), new MeshStandardMaterial({ color: 0x6b4630 })); leg.position.set(p[0], 0.7, p[1]); g.add(leg); });
  return g;
}
function makeBird() {
  const g = new Group(), mat = new MeshStandardMaterial({ color: 0x2a2f3a, roughness: 1, flatShading: true });
  [-1, 1].forEach(s => { const w = new Mesh(new ConeGeometry(0.5, 1.6, 3), mat); w.rotation.x = Math.PI / 2; w.position.x = s * 0.7; g.add(w); });
  return g;
}

export function buildAgents() {
  const group = new Group();

  // drones (patrol; fire dispatch handled by setFireTarget)
  const drones = [];
  for (let i = 0; i < 4; i++) { const d = makeDrone(); d.userData = { r: 26 + i * 8, ph: i * 1.6, sp: 0.16 + i * 0.04, h: 18 + i * 3, mode: 'patrol' }; group.add(d); drones.push(d); }

  // deer
  const deer = [];
  const deerPaths = [[[44, 8], [50, 16], [42, 22], [36, 14]], [[-12, 32], [-20, 40], [-8, 44], [0, 36]]];
  for (let i = 0; i < 4; i++) { const g = makeDeer(); const path = deerPaths[i % deerPaths.length]; deer.push({ g, path, seg: 0, t: rand(), sp: 0.04 + rand() * 0.05, graze: rand() * 6.28 }); group.add(g); }

  // birds
  const birds = [];
  for (let i = 0; i < 11; i++) { const g = makeBird(); g.userData = { r: 34 + rand() * 26, ph: rand() * 6.28, sp: 0.1 + rand() * 0.08, h: 42 + rand() * 14, wob: rand() * 6.28 }; group.add(g); birds.push(g); }

  let reconTimer = 0;

  function update(dt, t) {
    if (reconTimer > 0) { reconTimer -= dt; if (reconTimer <= 0 && drones[0]) drones[0].userData.mode = 'patrol'; }
    drones.forEach(d => {
      const u = d.userData;
      if (u.mode === 'fire-go' && u.fpt) { d.position.lerp(u.fpt, 1 - Math.exp(-3 * dt)); d.rotation.y += dt * 2; if (d.position.distanceTo(u.fpt) < 2.5) u.mode = 'fire-hover'; }
      else if (u.mode === 'fire-hover') { u.ph += dt * 0.7; d.position.set(u.fc.x + Math.cos(u.ph) * 7, u.fc.y + 9, u.fc.z + Math.sin(u.ph) * 7); }
      else { u.ph += dt * u.sp; const x = Math.cos(u.ph) * u.r, z = Math.sin(u.ph) * u.r - 8; d.position.set(x, terrain(x, z) + u.h, z); d.rotation.y = -u.ph; }
    });
    deer.forEach(dd => {
      dd.graze += dt; const grazing = Math.sin(dd.graze * 0.4) > 0.4;
      if (!grazing) { dd.t += dt * dd.sp; if (dd.t >= 1) { dd.t -= 1; dd.seg = (dd.seg + 1) % dd.path.length; } const a = dd.path[dd.seg], b = dd.path[(dd.seg + 1) % dd.path.length]; const x = lerp(a[0], b[0], dd.t), z = lerp(a[1], b[1], dd.t); dd.g.position.set(x, terrain(x, z), z); dd.g.rotation.y = Math.atan2(b[0] - a[0], b[1] - a[1]); dd.g.userData.neck.rotation.z = -0.55; }
      else dd.g.userData.neck.rotation.z = -1.15 + Math.sin(t * 4) * 0.08;
    });
    birds.forEach(b => { const u = b.userData; u.ph += dt * u.sp; const x = Math.cos(u.ph) * u.r, z = Math.sin(u.ph) * u.r - 4; b.position.set(x, u.h + Math.sin(t * 2 + u.wob) * 3, z); b.rotation.y = -u.ph + Math.PI / 2; const flap = Math.sin(t * 20 + u.wob) * 0.5; b.children[0].rotation.z = flap; b.children[1].rotation.z = -flap; });
  }

  // called by fire system
  function dispatchTo(center) { [1, 2, 3].forEach(i => { const d = drones[i]; if (!d) return; d.userData.mode = 'fire-go'; d.userData.fc = center; d.userData.fpt = new Vector3(center.x + 7, center.y + 9, center.z); }); }
  function recall() { [1, 2, 3].forEach(i => { if (drones[i]) drones[i].userData.mode = 'patrol'; }); }

  // recon: send the lead drone out to a point and bring it home (event-loop demo).
  function recon(center) { const d = drones[0]; if (!d) return; d.userData.mode = 'fire-go'; d.userData.fc = center; d.userData.fpt = new Vector3(center.x + 7, center.y + 9, center.z); reconTimer = 7; }

  return { group, update, drones, dispatchTo, recall, recon };
}
