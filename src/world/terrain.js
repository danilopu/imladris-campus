import {
  PlaneGeometry, CylinderGeometry, Mesh, MeshStandardMaterial, Group,
  Float32BufferAttribute, Color, CatmullRomCurve3, TubeGeometry, Vector3,
  TorusGeometry, IcosahedronGeometry
} from 'three';
import { WORLD, PALETTE } from '../config.js';

const HALF = WORLD.half;
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

function buildBlock() {
  const g = new CylinderGeometry(HALF * 1.414, HALF * 1.06, 46, 4, 3, false);
  g.rotateY(Math.PI / 4); g.translate(0, -23, 0);
  const p = g.attributes.position, colors = [];
  // lighter, warmer earth tones (the underside read too black) + per-vertex strata variation
  const lip = new Color(PALETTE.soilLip), soil = new Color(0x836a4a), rock = new Color(0x74614c), deep = new Color(0x564a3c);
  let s2 = 7; const rnd = () => { s2 = (s2 * 1664525 + 1013904223) & 0x7fffffff; return s2 / 0x7fffffff; };
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i); const col = new Color();
    if (y > -3) col.copy(lip);
    else if (y > -14) col.copy(soil).lerp(rock, (-y - 3) / 11);
    else col.copy(rock).lerp(deep, clamp((-y - 14) / 30, 0, 1));
    col.offsetHSL(0, 0, (rnd() - 0.5) * 0.13); // earthy striations
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
  group.add(buildTop(), buildBlock());

  // dangling roots + earth chunks under the rim — so the island reads as a piece plucked
  // from the ground and set in the sky, not a flat black slab
  const rootMat = new MeshStandardMaterial({ color: 0x4a3d2d, roughness: 1, flatShading: true });
  const earthMat = new MeshStandardMaterial({ color: 0x5e4d39, roughness: 1, flatShading: true });
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * 6.28 + (Math.random() - 0.5) * 0.3, r = 70 + Math.random() * 22, len = 9 + Math.random() * 22;
    const root = new Mesh(new CylinderGeometry(1.6 + Math.random() * 1.6, 0.2, len, 5), Math.random() < 0.5 ? rootMat : earthMat);
    root.position.set(Math.cos(a) * r, -34 - len * 0.5, Math.sin(a) * r);
    root.rotation.set((Math.random() - 0.5) * 0.3, Math.random() * 6.28, (Math.random() - 0.5) * 0.3);
    root.castShadow = true; group.add(root);
  }

  // a soft collar of clouds wrapping the island base — nestled in the sky
  const cloudMat = new MeshStandardMaterial({ color: 0xeef2f8, roughness: 1, flatShading: true, transparent: true, opacity: 0.55 });
  for (let i = 0; i < 44; i++) {
    const a = (i / 44) * 6.28 + (Math.random() - 0.5) * 0.35, r = HALF * (1.0 + Math.random() * 0.55);
    const puff = new Mesh(new IcosahedronGeometry(7 + Math.random() * 8, 0), cloudMat);
    puff.position.set(Math.cos(a) * r, -4 + Math.random() * 9, Math.sin(a) * r); puff.scale.set(1 + Math.random(), 0.45, 1 + Math.random());
    group.add(puff);
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
