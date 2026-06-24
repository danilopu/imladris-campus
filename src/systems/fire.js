import {
  Group, Points, BufferGeometry, BufferAttribute, PointsMaterial, AdditiveBlending,
  CanvasTexture, Mesh, CircleGeometry, MeshStandardMaterial, PointLight, Vector3
} from 'three';
import { terrain } from '../world/terrain.js';

const rand = Math.random, lerp = (a, b, t) => a + (b - a) * t, clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function tex() { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, '#fff'); g.addColorStop(0.35, '#fff'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new CanvasTexture(c); }

// agents: the agents system (for drone dispatch). onTicker(text,color): UI hook.
// network: optional, so ignition can race an alarm pulse sensor→brain before dispatch.
export function buildFire(agents, onTicker, network = null, at = new Vector3(-54, terrain(-54, -16), -16)) {
  const group = new Group();
  const TEX = tex();
  const center = at.clone();
  let active = false, state = 'idle', timer = 0, fireI = 0, maxR = 2;

  const FN = 150, fpos = new Float32Array(FN * 3), fcol = new Float32Array(FN * 3), fpart = [];
  const fgeo = new BufferGeometry(); fgeo.setAttribute('position', new BufferAttribute(fpos, 3)); fgeo.setAttribute('color', new BufferAttribute(fcol, 3));
  const flames = new Points(fgeo, new PointsMaterial({ size: 6, sizeAttenuation: false, vertexColors: true, transparent: true, opacity: 0.95, map: TEX, blending: AdditiveBlending, depthWrite: false })); group.add(flames);

  const SN = 64, spos = new Float32Array(SN * 3), spart = [];
  const sgeo = new BufferGeometry(); sgeo.setAttribute('position', new BufferAttribute(spos, 3));
  const smat = new PointsMaterial({ size: 16, sizeAttenuation: false, color: 0x4a4d54, transparent: true, opacity: 0, map: TEX, depthWrite: false });
  group.add(new Points(sgeo, smat));

  const scorch = new Mesh(new CircleGeometry(1, 22), new MeshStandardMaterial({ color: 0x1b1510, roughness: 1, transparent: true, opacity: 0 }));
  scorch.rotation.x = -Math.PI / 2; scorch.position.set(center.x, center.y + 0.2, center.z); group.add(scorch);
  const light = new PointLight(0xff6a2a, 0, 46); light.position.set(center.x, center.y + 4, center.z); group.add(light);

  function trigger() { if (active) return; active = true; state = 'ignite'; timer = 0; fireI = 0.06; maxR = 2; onTicker('Ignition detected — Wildwood, S-slope', '#ff7a3a'); network?.alert(center); }

  function update(dt) {
    if (!active && fireI <= 0 && fpart.length === 0) { flames.visible = false; light.intensity = 0; return; }
    flames.visible = true; timer += dt;
    if (state === 'ignite') { fireI = Math.min(0.5, fireI + dt * 0.55); if (timer > 1.8) { state = 'spread'; onTicker('WILDFIRE — drone squadron dispatched', '#ff5a4a'); agents.dispatchTo(center); } }
    else if (state === 'spread') { fireI = Math.min(1, fireI + dt * 0.4); if (timer > 4.5) { state = 'suppress'; onTicker('Water drop in progress · containing the front', '#9fdcff'); } }
    else if (state === 'suppress') { fireI = Math.max(0, fireI - dt * 0.17); if (fireI <= 0.04) { state = 'contain'; timer = 0; onTicker('Fire contained · sector secured', '#7ad6a8'); agents.recall(); } }
    else if (state === 'contain') { fireI = Math.max(0, fireI - dt * 0.5); if (timer > 3.5) { active = false; state = 'idle'; } }

    const r = 2 + fireI * 5.5; if (r > maxR) maxR = r;
    const wantF = Math.round(fireI * FN);
    while (fpart.length < wantF) { const a = rand() * 6.28, rr = Math.sqrt(rand()) * r * 0.6; fpart.push({ x: center.x + Math.cos(a) * rr, z: center.z + Math.sin(a) * rr, y: center.y + 0.4, vy: 4 + rand() * 4, age: 0, life: 0.45 + rand() * 0.5 }); }
    let n = 0; for (let i = fpart.length - 1; i >= 0; i--) { const p = fpart[i]; p.age += dt; p.y += p.vy * dt; p.vy += dt * 2; if (p.age >= p.life || n >= FN) { fpart.splice(i, 1); continue; } fpos[n * 3] = p.x; fpos[n * 3 + 1] = p.y; fpos[n * 3 + 2] = p.z; const tt = p.age / p.life; fcol[n * 3] = 1; fcol[n * 3 + 1] = lerp(0.85, 0.2, tt); fcol[n * 3 + 2] = lerp(0.35, 0.02, tt); n++; }
    for (let j = n; j < FN; j++) { fpos[j * 3] = 99999; fpos[j * 3 + 1] = 99999; fpos[j * 3 + 2] = 99999; }
    fgeo.attributes.position.needsUpdate = true; fgeo.attributes.color.needsUpdate = true;

    const wantS = Math.round((fireI * 0.7 + (state === 'contain' ? 0.3 : 0)) * SN);
    while (spart.length < wantS) { const a = rand() * 6.28, rr = rand() * r * 0.5; spart.push({ x: center.x + Math.cos(a) * rr, z: center.z + Math.sin(a) * rr, y: center.y + 2, vy: 3 + rand() * 2, dx: (rand() - 0.5) * 2, age: 0, life: 1.6 + rand() * 1.2 }); }
    let sn = 0; for (let i = spart.length - 1; i >= 0; i--) { const p = spart[i]; p.age += dt; p.y += p.vy * dt; p.x += p.dx * dt; if (p.age >= p.life || sn >= SN) { spart.splice(i, 1); continue; } spos[sn * 3] = p.x; spos[sn * 3 + 1] = p.y; spos[sn * 3 + 2] = p.z; sn++; }
    for (let j = sn; j < SN; j++) { spos[j * 3] = 99999; spos[j * 3 + 1] = 99999; spos[j * 3 + 2] = 99999; }
    sgeo.attributes.position.needsUpdate = true; smat.opacity = clamp(fireI * 0.55 + (state === 'contain' ? 0.25 : 0), 0, 0.6);

    scorch.scale.setScalar(Math.max(0.1, maxR * 0.95)); scorch.material.opacity = clamp(maxR > 2 ? 0.85 : fireI, 0, 0.85);
    light.intensity = fireI * 3.2;
  }

  return { group, update, trigger, get active() { return active; } };
}
