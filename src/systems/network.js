import {
  Group, Points, BufferGeometry, BufferAttribute, PointsMaterial, AdditiveBlending,
  CanvasTexture, Color, QuadraticBezierCurve3, Vector3, LineSegments,
  Float32BufferAttribute, LineBasicMaterial
} from 'three';

const rand = Math.random;
const C = { bio: new Color(0x7ad6a8), energy: new Color(0xffb24d), cmd: new Color(0xf0a93f) };

function tex() {
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, '#fff'); g.addColorStop(0.35, '#fff'); g.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new CanvasTexture(c);
}
const arc = (a, b, lift) => { const m = a.clone().add(b).multiplyScalar(0.5); m.y += lift || a.distanceTo(b) * 0.22 + 4; return new QuadraticBezierCurve3(a, m, b); };

// nodes: { brain:Vector3, sensors:[Vector3], sources:[Vector3], reservoir:Vector3 }
export function buildNetwork({ brain, sensors = [], sources = [], reservoir }) {
  const group = new Group();
  const edges = [];
  const addEdge = (a, b, color, density = 1, kind = 'data') => edges.push({ curve: arc(a, b), color, density, kind });
  sensors.forEach(s => addEdge(s, brain, C.bio, 0.7, 'sensor'));
  sources.forEach(s => addEdge(s, reservoir, C.energy, 1, 'source'));
  if (reservoir) addEdge(reservoir, brain, C.energy, 0.8, 'cmd');

  // faint wires
  const sp = [], sc = [];
  edges.forEach(e => { const n = 22; for (let i = 0; i < n; i++) { const a = e.curve.getPoint(i / n), b = e.curve.getPoint((i + 1) / n); sp.push(a.x, a.y, a.z, b.x, b.y, b.z); for (let k = 0; k < 2; k++) sc.push(e.color.r, e.color.g, e.color.b); } });
  const lg = new BufferGeometry(); lg.setAttribute('position', new Float32BufferAttribute(sp, 3)); lg.setAttribute('color', new Float32BufferAttribute(sc, 3));
  group.add(new LineSegments(lg, new LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.12, blending: AdditiveBlending, depthWrite: false })));

  // pulses
  const MAX = 150, pulses = [], pos = new Float32Array(MAX * 3), col = new Float32Array(MAX * 3);
  const geo = new BufferGeometry(); geo.setAttribute('position', new BufferAttribute(pos, 3)); geo.setAttribute('color', new BufferAttribute(col, 3));
  group.add(new Points(geo, new PointsMaterial({ size: 7, sizeAttenuation: false, vertexColors: true, transparent: true, opacity: 0.95, map: tex(), blending: AdditiveBlending, depthWrite: false })));
  const spawn = (e, sp, c, once) => { if (pulses.length < MAX) pulses.push({ e, t: 0, sp: sp || 0.18 + rand() * 0.14, c, once }); };
  edges.forEach(e => { const n = Math.round(e.density * 2); for (let i = 0; i < n; i++) { spawn(e); if (pulses.length) pulses[pulses.length - 1].t = rand(); } });

  // Reactive alarm: race a bright pulse from the sensor nearest a threat up to the
  // brain, then surge the reservoir→brain command line. Lets the viewer see the
  // campus sense → decide before the drones launch.
  const ALARM = new Color(0xff7a3a);
  // alert(center, color): race a bright pulse from the nearest sensor to the brain, then
  // surge the command line. color (hex/css/Color) tints the pulse to match the signal —
  // the Director uses this so every job visibly travels the nervous system to the brain.
  function alert(center, color) {
    const c = color ? new Color(color) : ALARM;
    let best = null, bd = Infinity;
    for (const e of edges) { if (e.kind !== 'sensor') continue; const d = e.curve.getPoint(0).distanceToSquared(center); if (d < bd) { bd = d; best = e; } }
    if (best) for (let i = 0; i < 5; i++) spawn(best, 0.5, c, true);
    const cmd = edges.find(e => e.kind === 'cmd');
    if (cmd) for (let i = 0; i < 4; i++) spawn(cmd, 0.45, c, true);
  }

  // Burst extra (one-shot) pulses along every edge of a kind — the event loop uses
  // this to show energy surges ('source') and command traffic ('cmd') flowing.
  function surge(kind, n = 6) {
    for (const e of edges) if (e.kind === kind) for (let i = 0; i < n; i++) spawn(e, 0.45 + rand() * 0.1, null, true);
  }

  function update(dt) {
    for (let k = pulses.length - 1; k >= 0; k--) { const p = pulses[k]; p.t += dt * p.sp; if (p.t >= 1) { if (p.once) { pulses.splice(k, 1); continue; } p.t -= 1; } }
    edges.forEach(e => { const want = Math.max(1, Math.round(e.density * 2)); const have = pulses.filter(p => p.e === e).length; if (have < want && rand() < 0.05) spawn(e); });
    let n = 0; for (const p of pulses) { if (n >= MAX) break; const pt = p.e.curve.getPoint(Math.min(p.t, 1)); const cc = p.c || p.e.color; pos[n * 3] = pt.x; pos[n * 3 + 1] = pt.y; pos[n * 3 + 2] = pt.z; col[n * 3] = cc.r; col[n * 3 + 1] = cc.g; col[n * 3 + 2] = cc.b; n++; }
    for (let j = n; j < MAX; j++) { pos[j * 3] = 99999; pos[j * 3 + 1] = 99999; pos[j * 3 + 2] = 99999; }
    geo.attributes.position.needsUpdate = true; geo.attributes.color.needsUpdate = true;
  }

  return { group, update, alert, surge };
}
