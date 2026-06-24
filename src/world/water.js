import {
  Group, Mesh, Points, BufferGeometry, BufferAttribute, PointsMaterial,
  CanvasTexture, AdditiveBlending, CylinderGeometry, BoxGeometry, TorusGeometry,
  MeshStandardMaterial, Vector3, PlaneGeometry, DoubleSide
} from 'three';
import { terrain, riverX } from './terrain.js';

const rand = Math.random;

function glowTex() {
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new CanvasTexture(c);
}

// Flowing-water sparkle, a waterfall, and micro-hydro wheels that spin.
export function buildWater(riverCurves, pondC) {
  const group = new Group();
  const TEX = glowTex();

  // glints flowing along all rivers
  const glN = 110, glPos = new Float32Array(glN * 3), glPart = [];
  const glGeo = new BufferGeometry(); glGeo.setAttribute('position', new BufferAttribute(glPos, 3));
  group.add(new Points(glGeo, new PointsMaterial({ size: 3.4, sizeAttenuation: false, color: 0xd6f4ff, transparent: true, opacity: 0.7, map: TEX, blending: AdditiveBlending, depthWrite: false })));
  for (let i = 0; i < glN; i++) glPart.push({ c: riverCurves[i % riverCurves.length], t: rand(), sp: 0.05 + rand() * 0.08 });

  // water wheels
  const wheels = [];
  function waterWheel(x, z) {
    const by = terrain(x, z), g = new Group();
    const hub = new Mesh(new CylinderGeometry(0.3, 0.3, 2.6, 8), new MeshStandardMaterial({ color: 0x6b4a30, roughness: 0.9 })); hub.rotation.x = Math.PI / 2; g.add(hub);
    const wheel = new Group();
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * 6.28;
      const spoke = new Mesh(new BoxGeometry(0.18, 3.4, 0.18), new MeshStandardMaterial({ color: 0x7a5230, roughness: 0.9, flatShading: true })); spoke.rotation.z = a; wheel.add(spoke);
      const pad = new Mesh(new BoxGeometry(0.25, 1.1, 2.6), new MeshStandardMaterial({ color: 0x8a6a44, roughness: 0.9, flatShading: true })); pad.position.set(Math.cos(a) * 1.7, Math.sin(a) * 1.7, 0); pad.rotation.z = a; wheel.add(pad);
    }
    wheel.add(new Mesh(new TorusGeometry(1.75, 0.12, 6, 20), new MeshStandardMaterial({ color: 0x6b4a30, roughness: 0.9 })));
    wheel.traverse(o => { if (o.isMesh) o.castShadow = true; });
    g.add(wheel); g.position.set(x, by + 1.7, z); group.add(g); wheels.push(wheel);
  }
  waterWheel(36, 20); waterWheel(30, 15);

  // waterfall into the pond
  const wfC = new Vector3(31, terrain(31, 27) + 4.5, 27);
  const wfN = 46, wfPos = new Float32Array(wfN * 3), wfPart = [];
  const wfGeo = new BufferGeometry(); wfGeo.setAttribute('position', new BufferAttribute(wfPos, 3));
  group.add(new Points(wfGeo, new PointsMaterial({ size: 4, sizeAttenuation: false, color: 0xcfeefb, transparent: true, opacity: 0.85, map: TEX, blending: AdditiveBlending, depthWrite: false })));
  const sheet = new Mesh(new PlaneGeometry(2.4, 4.6), new MeshStandardMaterial({ color: 0xbfe6f2, transparent: true, opacity: 0.5, roughness: 0.1, side: DoubleSide, emissive: 0x2a6a82, emissiveIntensity: 0.3 }));
  sheet.position.set(wfC.x, wfC.y - 1.3, wfC.z); group.add(sheet);

  // overflow: the united river spills off the southern rim and falls into the clouds
  const ovC = new Vector3(riverX(-84), terrain(riverX(-84), -84) + 0.4, -86);
  const ovN = 80, ovPos = new Float32Array(ovN * 3), ovPart = [];
  const ovGeo = new BufferGeometry(); ovGeo.setAttribute('position', new BufferAttribute(ovPos, 3));
  group.add(new Points(ovGeo, new PointsMaterial({ size: 5, sizeAttenuation: false, color: 0xd6f4ff, transparent: true, opacity: 0.8, map: TEX, blending: AdditiveBlending, depthWrite: false })));

  function update(dt, t) {
    let g = 0;
    for (const p of glPart) { p.t += dt * p.sp; if (p.t >= 1) p.t -= 1; const pt = p.c.getPoint(p.t); glPos[g * 3] = pt.x; glPos[g * 3 + 1] = pt.y + 0.3 + Math.sin(t * 6 + g) * 0.15; glPos[g * 3 + 2] = pt.z; g++; }
    glGeo.attributes.position.needsUpdate = true;
    wheels.forEach((w, i) => { w.rotation.z += dt * (0.9 + i * 0.2); });
    while (wfPart.length < wfN) wfPart.push({ x: wfC.x + (rand() - 0.5) * 2, y: wfC.y + rand() * 0.5, z: wfC.z + (rand() - 0.5) * 1.4, vy: -(4 + rand() * 3) });
    let wn = 0;
    for (let i = wfPart.length - 1; i >= 0; i--) { const p = wfPart[i]; p.y += p.vy * dt; p.vy -= dt * 6; if (p.y <= pondC.y + 0.5) { wfPart.splice(i, 1); continue; } wfPos[wn * 3] = p.x; wfPos[wn * 3 + 1] = p.y; wfPos[wn * 3 + 2] = p.z; wn++; }
    for (let j = wn; j < wfN; j++) { wfPos[j * 3] = 99999; wfPos[j * 3 + 1] = 99999; wfPos[j * 3 + 2] = 99999; }
    wfGeo.attributes.position.needsUpdate = true;

    // overflow off the southern rim, falling far into the clouds
    while (ovPart.length < ovN) ovPart.push({ x: ovC.x + (rand() - 0.5) * 12, y: ovC.y - rand() * 3, z: ovC.z - rand() * 2, vy: -(2 + rand() * 4), vz: -(1.5 + rand() * 2.5) });
    let on = 0;
    for (let i = ovPart.length - 1; i >= 0; i--) { const p = ovPart[i]; p.y += p.vy * dt; p.vy -= dt * 5; p.z += p.vz * dt; if (p.y < ovC.y - 75) { ovPart.splice(i, 1); continue; } ovPos[on * 3] = p.x; ovPos[on * 3 + 1] = p.y; ovPos[on * 3 + 2] = p.z; on++; }
    for (let j = on; j < ovN; j++) { ovPos[j * 3] = 99999; ovPos[j * 3 + 1] = 99999; ovPos[j * 3 + 2] = 99999; }
    ovGeo.attributes.position.needsUpdate = true;
  }

  return { group, update };
}
