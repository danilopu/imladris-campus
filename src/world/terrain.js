import {
  PlaneGeometry, CylinderGeometry, Mesh, MeshStandardMaterial, Group,
  Float32BufferAttribute, Color, CatmullRomCurve3, TubeGeometry, Vector3,
  TorusGeometry, Sprite, SpriteMaterial, CanvasTexture
} from 'three';
import { WORLD, PALETTE } from '../config.js';

const HALF = WORLD.half;

// soft, voluminous cloud billboard (overlapping radial blobs) — reads natural, unlike
// faceted low-poly cloud geometry
export function cloudTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
  [[64, 74, 40], [40, 78, 28], [90, 78, 30], [56, 60, 32], [80, 62, 26], [64, 84, 30]].forEach(([bx, by, br]) => {
    const g = x.createRadialGradient(bx, by, 0, bx, by, br);
    g.addColorStop(0, 'rgba(255,255,255,0.96)'); g.addColorStop(0.55, 'rgba(255,255,255,0.5)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.beginPath(); x.arc(bx, by, br, 0, 6.28); x.fill();
  });
  return new CanvasTexture(c);
}
export function makeCloud(tex, scale) {
  const s = new Sprite(new SpriteMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0.92 }));
  s.scale.set(scale, scale * 0.62, 1); return s;
}
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };

export function riverX(z) { return WORLD.river.amp * Math.sin(z * WORLD.river.freq); }
// distance from (x,z) to the mountain-river (tributary) channel — lets vegetation keep its banks clear
export function tribDist(x, z) { return segDist(x, z, WORLD.tributary.a, WORLD.tributary.b); }
function gauss(x, z, cx, cz, s) { const dx = x - cx, dz = z - cz; return Math.exp(-((dx * dx + dz * dz) / (2 * s * s))); }
function segDist(px, pz, a, b) {
  const dx = b.x - a.x, dz = b.z - a.z, L = dx * dx + dz * dz || 1;
  let t = ((px - a.x) * dx + (pz - a.z) * dz) / L; t = clamp(t, 0, 1);
  return Math.hypot(px - (a.x + t * dx), pz - (a.z + t * dz));
}

// Single source of truth for ground height — every placement samples this.
export function terrain(x, z) {
  let roll = (Math.sin(x * 0.06) * Math.cos(z * 0.05) + Math.sin(x * 0.09 + 1) * 0.5) * 1.7;
  let hill = gauss(x, z, 22, 54, 25) * 17 + gauss(x, z, -30, 60, 18) * 8;
  // main river widens + deepens below the junction (z≈18) where the mountain river unites
  const below = smooth(20, -14, z); // 0 above the junction → 1 well downstream
  const river = -Math.exp(-((x - riverX(z)) ** 2) / (2 * (49 + below * 48))) * (3.2 + below * 1.4);
  // mountain river: a deeper tributary from the high ridge joining at a sharp angle
  const rb = segDist(x, z, WORLD.tributary.a, WORLD.tributary.b);
  const trib = -Math.exp(-(rb * rb) / (2 * 34)) * 3.0;
  // Flatten the LAND toward the rim first, then carve the rivers in afterwards — so the
  // channels persist all the way to (and over) the edge instead of drying up. The interior
  // is unchanged (edge factor ≈ 0 there), so placements are unaffected.
  let land = roll + hill + 2.2;
  const m = Math.max(Math.abs(x), Math.abs(z)) / HALF;
  land = lerp(land, 1.0, smooth(0.84, 1.0, m));
  return land + river + trib;
}

function buildTop() {
  const seg = WORLD.topSegments;
  const g = new PlaneGeometry(HALF * 2 + 4, HALF * 2 + 4, seg, seg);
  g.rotateX(-Math.PI / 2);
  const p = g.attributes.position, colors = [];
  const cGrass = new Color(PALETTE.grass), cGrass2 = new Color(PALETTE.grassDk),
    cRock = new Color(PALETTE.rock), cSand = new Color(0xb9b083), cSnow = new Color(PALETTE.snow);
  let s = 1;
  const rand = () => { s = (s * 1664525 + 1013904223) & 0x7fffffff; return s / 0x7fffffff; };
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i), y = terrain(x, z); p.setY(i, y);
    const d = Math.abs(x - riverX(z)); const col = new Color();
    if (y > 17) col.copy(cSnow).lerp(cRock, clamp((22 - y) / 8, 0, 1));
    else if (y > 9) col.copy(cRock).lerp(cGrass2, clamp((17 - y) / 9, 0, 1));
    else if (d < 4.6) col.copy(cSand);
    else col.copy(cGrass).lerp(cGrass2, rand() * 0.5);
    colors.push(col.r, col.g, col.b);
  }
  g.setAttribute('color', new Float32BufferAttribute(colors, 3));
  g.computeVertexNormals();
  const mesh = new Mesh(g, new MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.96, metalness: 0 }));
  mesh.receiveShadow = true; mesh.castShadow = true;
  return mesh;
}

// shallow soil cap right under the grass (matches the square island footprint)
function buildBlock() {
  const g = new CylinderGeometry(HALF * 1.414, HALF * 1.3, 18, 4, 2, false);
  g.rotateY(Math.PI / 4); g.translate(0, -9, 0);
  const p = g.attributes.position, colors = [];
  const lip = new Color(PALETTE.soilLip), soil = new Color(0x836a4a), rock = new Color(0x6f5c47);
  let s2 = 7; const rnd = () => { s2 = (s2 * 1664525 + 1013904223) & 0x7fffffff; return s2 / 0x7fffffff; };
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i); const col = new Color();
    if (y > -3) col.copy(lip); else col.copy(soil).lerp(rock, clamp((-y - 3) / 15, 0, 1));
    col.offsetHSL(0, 0, (rnd() - 0.5) * 0.12);
    colors.push(col.r, col.g, col.b);
  }
  g.setAttribute('color', new Float32BufferAttribute(colors, 3));
  g.computeVertexNormals();
  const mesh = new Mesh(g, new MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1, metalness: 0 }));
  mesh.castShadow = true; mesh.receiveShadow = true;
  return mesh;
}

// the rocky keel: an inverted-mountain mass tapering to a point, eroded with radial noise
// and stratified — the geological underside of a chunk of land torn from the earth
function buildKeel() {
  const topY = -16, botY = -98, span = topY - botY;
  const g = new CylinderGeometry(HALF * 0.82, HALF * 0.08, span, 12, 16, false);
  g.translate(0, (topY + botY) / 2, 0);
  const p = g.attributes.position, colors = [];
  const rockHi = new Color(0x6f5d4a), rockMid = new Color(0x584a39), rockLo = new Color(0x46392c), rockDeep = new Color(0x352b21);
  let s = 13; const rnd = () => { s = (s * 1664525 + 1013904223) & 0x7fffffff; return s / 0x7fffffff; };
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const ang = Math.atan2(z, x), rad = Math.hypot(x, z), t = clamp((topY - y) / span, 0, 1);
    const noise = Math.sin(ang * 3 + y * 0.13) * 0.5 + Math.sin(ang * 6 - y * 0.09) * 0.32 + Math.sin(ang * 11 + y * 0.05) * 0.18;
    const nr = Math.max(0.6, rad + noise * (2.5 + t * 8));
    p.setX(i, Math.cos(ang) * nr); p.setZ(i, Math.sin(ang) * nr);
    const col = new Color();
    if (t < 0.3) col.copy(rockHi).lerp(rockMid, t / 0.3);
    else if (t < 0.7) col.copy(rockMid).lerp(rockLo, (t - 0.3) / 0.4);
    else col.copy(rockLo).lerp(rockDeep, (t - 0.7) / 0.3);
    col.offsetHSL(0, 0, (rnd() - 0.5) * 0.1 + Math.sin(y * 0.4) * 0.05); // strata bands + grain
    colors.push(col.r, col.g, col.b);
  }
  g.setAttribute('color', new Float32BufferAttribute(colors, 3));
  g.computeVertexNormals();
  const mesh = new Mesh(g, new MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1, metalness: 0 }));
  mesh.castShadow = true; mesh.receiveShadow = true;
  return mesh;
}

function waterMat() {
  return new MeshStandardMaterial({ color: PALETTE.water, emissive: 0x14485e, emissiveIntensity: 0.5, roughness: 0.12, metalness: 0.25, transparent: true, opacity: 0.92 });
}

// Returns { group, terrain, riverCurves, pondC } for downstream systems.
export function buildIsland() {
  const group = new Group();
  group.add(buildTop(), buildBlock(), buildKeel());

  // a soft collar of cloud billboards wrapping the island base — nestled in the sky
  const cTex = cloudTexture();
  for (let i = 0; i < 30; i++) {
    const a = (i / 30) * 6.28 + (Math.random() - 0.5) * 0.4, r = HALF * (0.92 + Math.random() * 0.5);
    const cl = makeCloud(cTex, 34 + Math.random() * 28);
    cl.position.set(Math.cos(a) * r, -7 + Math.random() * 13, Math.sin(a) * r);
    group.add(cl);
  }

  const riverCurves = [];
  { const pts = []; for (let z = 92; z >= -92; z -= 5) pts.push(new Vector3(riverX(z), terrain(riverX(z), z) + 0.5, z)); riverCurves.push(new CatmullRomCurve3(pts)); }
  { const pts = []; const a = WORLD.tributary.a, b = WORLD.tributary.b; for (let i = 0; i <= 12; i++) { const t = i / 12, x = lerp(a.x, b.x, t), z = lerp(a.z, b.z, t); pts.push(new Vector3(x, terrain(x, z) + 0.6, z)); } riverCurves.push(new CatmullRomCurve3(pts)); }
  { const pts = []; const a = WORLD.stream.a, b = WORLD.stream.b; for (let i = 0; i <= 10; i++) { const t = i / 10, x = lerp(a.x, b.x, t), z = lerp(a.z, b.z, t); pts.push(new Vector3(x, terrain(x, z) + 0.5, z)); } riverCurves.push(new CatmullRomCurve3(pts)); }

  const radii = [5.2, 3.2, 1.6]; // main river, mountain river, western creek
  riverCurves.forEach((curve, i) => {
    const geo = new TubeGeometry(curve, 110, radii[i], 8, false); geo.scale(1, 0.3, 1);
    const m = new Mesh(geo, waterMat()); m.receiveShadow = true; if (i === 2) m.position.y -= 0.15; group.add(m);
  });

  // pond at the cascade base
  const pondC = new Vector3(34, terrain(34, 24), 24);
  const pond = new Mesh(new CylinderGeometry(6.5, 6.5, 1, 26), waterMat());
  pond.position.set(pondC.x, pondC.y + 0.4, pondC.z); group.add(pond);
  const lipRing = new Mesh(new TorusGeometry(6.5, 0.4, 8, 28), new MeshStandardMaterial({ color: 0x7d8a6a, roughness: 1, flatShading: true }));
  lipRing.rotation.x = Math.PI / 2; lipRing.position.set(pondC.x, pondC.y + 0.5, pondC.z); group.add(lipRing);

  return { group, terrain, riverCurves, pondC };
}
