import {
  Group, Vector3, BufferGeometry, Float32BufferAttribute, BufferAttribute, LineSegments,
  LineBasicMaterial, Points, PointsMaterial, AdditiveBlending, CanvasTexture, Mesh,
  SphereGeometry, MeshStandardMaterial, QuadraticBezierCurve3
} from 'three';
import { terrain, riverX } from '../world/terrain.js';

const rand = Math.random;

function tex() {
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, '#fff'); g.addColorStop(0.35, '#fff'); g.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new CanvasTexture(c);
}

// The mycelial network (paper §3/§5): a living, bioluminescent web threaded through the
// forest floor, connecting the woods as one continuous analog organism. Sensor nodes at
// its ends blink — brighter at night — and arc their afferent signals up to the AI brain.
// Reads as "beneath the surface": ground-hugging, faint, partly occluded by terrain/trees.
export function buildMycelium(brain) {
  const group = new Group();

  // nodes on valid forest ground (skip water + peaks + the river channel), out to the rim
  const nodes = [];
  let tries = 0;
  while (nodes.length < 46 && tries < 800) {
    tries++;
    const x = (rand() * 2 - 1) * 82, z = (rand() * 2 - 1) * 82, y = terrain(x, z);
    if (y < 3 || y > 16 || Math.abs(x - riverX(z)) < 6) continue;
    nodes.push(new Vector3(x, y, z));
  }

  // connect each node to its ~3 nearest neighbours → an organic web
  const edges = [], seen = new Set();
  nodes.forEach((a, i) => {
    nodes.map((b, j) => ({ j, d: a.distanceToSquared(b) })).filter(o => o.j !== i).sort((p, q) => p.d - q.d).slice(0, 3)
      .forEach(o => { const key = i < o.j ? `${i}-${o.j}` : `${o.j}-${i}`; if (seen.has(key)) return; seen.add(key); edges.push([i, o.j]); });
  });

  // web lines, subdivided to hug the terrain
  const wp = [];
  edges.forEach(([i, j]) => {
    const a = nodes[i], b = nodes[j]; let prev = null;
    for (let s = 0; s <= 5; s++) { const t = s / 5, x = a.x + (b.x - a.x) * t, z = a.z + (b.z - a.z) * t, y = terrain(x, z) + 0.14; if (prev) wp.push(prev[0], prev[1], prev[2], x, y, z); prev = [x, y, z]; }
  });
  const wgeo = new BufferGeometry(); wgeo.setAttribute('position', new Float32BufferAttribute(wp, 3));
  const webMat = new LineBasicMaterial({ color: 0x4fe0a0, transparent: true, opacity: 0.16, blending: AdditiveBlending, depthWrite: false });
  group.add(new LineSegments(wgeo, webMat));

  // signal pulses travelling the web
  const TEX = tex(), MAX = 70, ppos = new Float32Array(MAX * 3), pulses = [];
  const pgeo = new BufferGeometry(); pgeo.setAttribute('position', new BufferAttribute(ppos, 3));
  const pmat = new PointsMaterial({ color: 0x8fffc8, size: 5, sizeAttenuation: false, transparent: true, opacity: 0.85, map: TEX, blending: AdditiveBlending, depthWrite: false });
  group.add(new Points(pgeo, pmat));
  const spawn = () => { if (pulses.length < MAX) { const e = edges[(rand() * edges.length) | 0]; pulses.push({ a: nodes[e[0]], b: nodes[e[1]], t: rand(), sp: 0.15 + rand() * 0.2 }); } };
  for (let i = 0; i < 42; i++) spawn();

  // sensor tips (blink) + faint arcs carrying their signal up to the brain
  const sensorMats = [], bp = [];
  nodes.map((_, i) => i).sort(() => rand() - 0.5).slice(0, 12).forEach(i => {
    const n = nodes[i];
    const m = new MeshStandardMaterial({ color: 0x7ad6a8, emissive: 0x7ad6a8, emissiveIntensity: 1.0 });
    const tip = new Mesh(new SphereGeometry(0.38, 8, 7), m); tip.position.set(n.x, n.y + 0.4, n.z); group.add(tip);
    sensorMats.push({ mat: m, phase: rand() * 6.28 });
    const mid = n.clone().add(brain).multiplyScalar(0.5); mid.y += 3 + n.distanceTo(brain) * 0.05;
    const cp = new QuadraticBezierCurve3(new Vector3(n.x, n.y + 0.4, n.z), mid, brain).getPoints(16);
    for (let s = 0; s < cp.length - 1; s++) bp.push(cp[s].x, cp[s].y, cp[s].z, cp[s + 1].x, cp[s + 1].y, cp[s + 1].z);
  });
  const bgeo = new BufferGeometry(); bgeo.setAttribute('position', new Float32BufferAttribute(bp, 3));
  const brainMat = new LineBasicMaterial({ color: 0x7ad6a8, transparent: true, opacity: 0.08, blending: AdditiveBlending, depthWrite: false });
  group.add(new LineSegments(bgeo, brainMat));

  let night = 0;
  function setNight(star) { night = star; }

  function update(dt, elapsed) {
    let n = 0;
    for (const p of pulses) { if (n >= MAX) break; p.t += dt * p.sp; if (p.t >= 1) p.t -= 1; ppos[n * 3] = p.a.x + (p.b.x - p.a.x) * p.t; ppos[n * 3 + 1] = p.a.y + (p.b.y - p.a.y) * p.t + 0.2; ppos[n * 3 + 2] = p.a.z + (p.b.z - p.a.z) * p.t; n++; }
    for (let j = n; j < MAX; j++) { ppos[j * 3] = 99999; ppos[j * 3 + 1] = 99999; ppos[j * 3 + 2] = 99999; }
    pgeo.attributes.position.needsUpdate = true;
    if (pulses.length < 42 && rand() < 0.1) spawn();
    // come alive at night
    webMat.opacity = 0.13 + night * 0.4;
    brainMat.opacity = 0.07 + night * 0.26;
    pmat.opacity = 0.55 + night * 0.4;
    sensorMats.forEach(s => { const blink = 0.5 + 0.5 * Math.sin(elapsed * 3 + s.phase); s.mat.emissiveIntensity = (0.45 + night * 1.6) * (0.4 + 0.8 * blink); });
  }

  return { group, update, setNight };
}
