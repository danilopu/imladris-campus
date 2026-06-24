import {
  Group, Mesh, MeshStandardMaterial, BoxGeometry, ConeGeometry, CylinderGeometry,
  Shape, ExtrudeGeometry, Line, LineBasicMaterial, BufferGeometry, Vector3
} from 'three';
import { terrain, riverX } from './terrain.js';
import { corePos, livePos } from './buildings.js';

const lerp = (a, b, t) => a + (b - a) * t;
// shortest-path angle damping so pods turn smoothly through corners
function dampAngle(cur, target, lambda, dt) {
  let d = target - cur; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
  return cur + d * (1 - Math.exp(-lambda * dt));
}

// Movement layer: arched bridge, stone lanterns, the gravity-balanced funicular,
// a bobbing boat, and AI-dispatched autonomous pods touring the campus loop.
// glow[] = lantern + funicular-car + pod-light emissives.
export function buildTransport() {
  const group = new Group();
  const glow = [];
  let funCar = null, funA = null, funB = null, boat = null;
  const pods = [];

  function box(w, h, d, color, o = {}) {
    const m = new Mesh(new BoxGeometry(w, h, d), new MeshStandardMaterial({ color, roughness: o.rough != null ? o.rough : 0.85, metalness: o.metal || 0, emissive: o.emissive || 0x000000, emissiveIntensity: o.ei || 0, flatShading: true }));
    m.castShadow = true; m.receiveShadow = true; return m;
  }

  // arched bridge over the river
  {
    const z0 = -6, bx = riverX(z0), by = terrain(bx, z0);
    const shape = new Shape(); shape.moveTo(-6, 0); shape.quadraticCurveTo(0, 4.4, 6, 0); shape.lineTo(6, -0.9); shape.quadraticCurveTo(0, 3.5, -6, -0.9); shape.lineTo(-6, 0);
    const geo = new ExtrudeGeometry(shape, { depth: 2.4, bevelEnabled: false }); geo.translate(0, 0, -1.2);
    const br = new Mesh(geo, new MeshStandardMaterial({ color: 0xb04a36, roughness: 0.7, flatShading: true }));
    br.castShadow = true; br.receiveShadow = true; br.position.set(bx, by + 1.4, z0); br.rotation.y = Math.PI / 2; group.add(br);
  }

  // stone lanterns — amber path lights
  [[-12, -30], [2, -14], [14, 2], [corePos.x - 9, corePos.z - 8]].forEach(p => {
    const by = terrain(p[0], p[1]), g = new Group();
    const base = new Mesh(new CylinderGeometry(0.5, 0.7, 1.4, 6), new MeshStandardMaterial({ color: 0x9a958a, roughness: 1, flatShading: true })); base.position.y = 0.7; g.add(base);
    const lite = new Mesh(new BoxGeometry(0.9, 0.9, 0.9), new MeshStandardMaterial({ color: 0xffb24d, emissive: 0xffb24d, emissiveIntensity: 1.1 })); lite.position.y = 1.8; g.add(lite); glow.push(lite.material);
    const cap = new Mesh(new ConeGeometry(0.9, 0.6, 6), new MeshStandardMaterial({ color: 0x8a857a, roughness: 1, flatShading: true })); cap.position.y = 2.55; cap.rotation.y = 0.4; g.add(cap);
    g.position.set(p[0], by, p[1]); g.traverse(o => { if (o.isMesh) o.castShadow = true; }); group.add(g);
  });

  // funicular — a single car shuttles along the cable between ridge and valley
  {
    funA = new Vector3(corePos.x - 6, terrain(corePos.x - 6, corePos.z - 7) + 2, corePos.z - 7);
    funB = new Vector3(livePos.x + 8, terrain(livePos.x + 8, livePos.z + 8) + 2, livePos.z + 8);
    const cable = new Line(new BufferGeometry().setFromPoints([funA, funB]), new LineBasicMaterial({ color: 0xcbb896, transparent: true, opacity: 0.6 })); group.add(cable);
    funCar = box(1.9, 1.4, 2.6, 0xf0a93f, { emissive: 0xf0a93f, ei: 0.35, rough: 0.4 }); group.add(funCar); glow.push(funCar.material);
  }

  // dock + boat
  {
    const z = -50, x = riverX(z), by = terrain(x + 4.5, z);
    const dock = box(2, 0.4, 5, 0x7a5a3a, { rough: 0.9 }); dock.position.set(x + 4.5, by + 0.6, z); group.add(dock);
    boat = box(1.4, 0.6, 3, 0x9a6a44, { rough: 0.8 }); boat.position.set(x, terrain(x, z) + 0.7, z + 2); boat.userData = { x, z0: z + 2 }; group.add(boat);
  }

  // autonomous electric pods — dispatched on demand by the AI, car-light and quiet (paper §7)
  const podLoop = [[20, 30], [6, 2], [-12, -30], [-22, -44], [-40, -20], [-44, 6], [-20, 24], [4, 36]];
  function makePod(col) {
    const g = new Group();
    const body = new Mesh(new BoxGeometry(1.6, 1.0, 2.6), new MeshStandardMaterial({ color: 0xeef1f4, roughness: 0.4, metalness: 0.2, flatShading: true })); body.position.y = 0.7; body.castShadow = true; g.add(body);
    const cabin = new Mesh(new BoxGeometry(1.4, 0.7, 1.5), new MeshStandardMaterial({ color: 0x2a3138, roughness: 0.2, metalness: 0.4, transparent: true, opacity: 0.7 })); cabin.position.set(0, 1.25, 0.1); g.add(cabin);
    const lite = new Mesh(new BoxGeometry(1.2, 0.18, 0.12), new MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 1.0 })); lite.position.set(0, 0.7, 1.32); g.add(lite); glow.push(lite.material);
    return g;
  }
  [['#7ad6a8', 0], ['#6ad6ff', 0.4], ['#f0a93f', 0.72]].forEach(([col, off]) => {
    const g = makePod(col); pods.push({ g, seg: 0, t: off, sp: 0.06 + Math.random() * 0.02 }); group.add(g);
  });

  function update(dt, elapsed) {
    const now = elapsed * 1000;
    if (funCar) { const t = 0.5 + 0.5 * Math.sin(now * 0.0002); funCar.position.lerpVectors(funA, funB, t); }
    if (boat) { boat.position.y = terrain(boat.userData.x, boat.userData.z0) + 0.7 + Math.sin(now * 0.0015) * 0.12; boat.rotation.z = Math.sin(now * 0.0012) * 0.05; }
    pods.forEach(p => {
      p.t += dt * p.sp; if (p.t >= 1) { p.t -= 1; p.seg = (p.seg + 1) % podLoop.length; }
      const a = podLoop[p.seg], b = podLoop[(p.seg + 1) % podLoop.length];
      const x = lerp(a[0], b[0], p.t), z = lerp(a[1], b[1], p.t);
      p.g.position.set(x, terrain(x, z) + 0.15, z);
      p.g.rotation.y = dampAngle(p.g.rotation.y, Math.atan2(b[0] - a[0], b[1] - a[1]), 4, dt);
    });
  }

  return { group, update, glow };
}
