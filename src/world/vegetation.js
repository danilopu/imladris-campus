import {
  Group, InstancedMesh, Object3D, CylinderGeometry, ConeGeometry, IcosahedronGeometry,
  MeshStandardMaterial, Points, BufferGeometry, Float32BufferAttribute, PointsMaterial,
  CanvasTexture
} from 'three';
import { terrain, riverX } from './terrain.js';
import { COUNTS } from '../config.js';

const dummy = new Object3D();
let s = 99; const rand = () => { s = (s * 1664525 + 1013904223) & 0x7fffffff; return s / 0x7fffffff; };

function flowerTex() {
  const c = document.createElement('canvas'); c.width = c.height = 32; const x = c.getContext('2d');
  const g = x.createRadialGradient(16, 16, 0, 16, 16, 16); g.addColorStop(0, '#fff'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 32, 32); return new CanvasTexture(c);
}

export function buildVegetation() {
  const group = new Group();

  // deciduous: trunk + puffy canopy
  const dec = [];
  for (let i = 0; i < COUNTS.deciduous; i++) {
    let x, z, y, d, t = 0;
    do { x = (rand() * 2 - 1) * 84; z = (rand() * 2 - 1) * 84; y = terrain(x, z); d = Math.abs(x - riverX(z)); t++; }
    while ((y < 4 || y > 16 || d < 6) && t < 10);
    if (t >= 10) continue; dec.push({ x, z, y, sc: 0.8 + rand() * 0.9 });
  }
  addTrees(group, dec, 0x6b4a30, 0x4f9a4e, 2.5, true);

  // conifers up high
  const con = [];
  for (let i = 0; i < COUNTS.conifers; i++) {
    let x, z, y, d, t = 0;
    do { x = (rand() * 2 - 1) * 84; z = (rand() * 2 - 1) * 84; y = terrain(x, z); d = Math.abs(x - riverX(z)); t++; } while ((y < 4 || d < 6) && t < 10);
    if (t >= 10) continue; con.push({ x, z, y, sc: 0.8 + rand() * 0.9 });
  }
  addConifers(group, con);

  // bushes
  instanced(group, new IcosahedronGeometry(1, 0), new MeshStandardMaterial({ color: 0x4e8a48, roughness: 1, flatShading: true }), COUNTS.bushes,
    () => { const x = (rand() * 2 - 1) * 84, z = (rand() * 2 - 1) * 84, y = terrain(x, z); if (y < 3 || y > 16) return null; return { x, y: y + 0.5, z, sx: 0.6 + rand() * 0.9, sy: 0.5, rot: true }; }, true);

  // boulders
  instanced(group, new IcosahedronGeometry(1, 0), new MeshStandardMaterial({ color: 0x8f8a7e, roughness: 1, flatShading: true }), COUNTS.rocks,
    () => { const x = (rand() * 2 - 1) * 86, z = (rand() * 2 - 1) * 86, y = terrain(x, z); if (y < 2) return null; return { x, y: y + 0.5, z, sx: 1.0 + rand() * 2, sy: 0.6 + rand() * 0.5, rot: true }; }, true);

  // wildflowers (points)
  addFlowers(group);

  return { group };
}

function addTrees(group, spots, trunkC, leafC, leafR, cast) {
  const tg = new CylinderGeometry(0.45, 0.7, 3.4, 5); tg.translate(0, 1.7, 0);
  const trunks = new InstancedMesh(tg, new MeshStandardMaterial({ color: trunkC, roughness: 1, flatShading: true }), spots.length);
  const cg = new IcosahedronGeometry(leafR, 1);
  const leaves = new InstancedMesh(cg, new MeshStandardMaterial({ color: leafC, roughness: 0.95, flatShading: true }), spots.length * 2);
  if (cast) leaves.castShadow = true;
  let li = 0;
  spots.forEach((p, i) => {
    dummy.position.set(p.x, p.y, p.z); dummy.rotation.set(0, rand() * 6, 0); dummy.scale.setScalar(p.sc); dummy.updateMatrix(); trunks.setMatrixAt(i, dummy.matrix);
    const baseY = p.y + 5.2 * p.sc;
    for (let k = 0; k < 2; k++) {
      dummy.position.set(p.x + (rand() - 0.5) * 1.2 * p.sc, baseY + (k ? 1.3 : 0) * p.sc, p.z + (rand() - 0.5) * 1.2 * p.sc);
      dummy.rotation.set(rand(), rand(), rand()); const sc = p.sc * (k ? 0.72 : 1); dummy.scale.set(sc, sc * 0.82, sc); dummy.updateMatrix(); leaves.setMatrixAt(li++, dummy.matrix);
    }
  });
  leaves.count = li; group.add(trunks, leaves);
}

function addConifers(group, spots) {
  const tg = new CylinderGeometry(0.35, 0.5, 2, 5); tg.translate(0, 1, 0);
  const trunks = new InstancedMesh(tg, new MeshStandardMaterial({ color: 0x5a4226, roughness: 1, flatShading: true }), spots.length);
  const cg = new ConeGeometry(2, 7, 7); cg.translate(0, 5, 0);
  const cones = new InstancedMesh(cg, new MeshStandardMaterial({ color: 0x35663f, roughness: 0.95, flatShading: true }), spots.length); cones.castShadow = true;
  spots.forEach((p, i) => { dummy.position.set(p.x, p.y, p.z); dummy.rotation.set(0, rand() * 6, 0); dummy.scale.setScalar(p.sc); dummy.updateMatrix(); trunks.setMatrixAt(i, dummy.matrix); cones.setMatrixAt(i, dummy.matrix); });
  group.add(trunks, cones);
}

function instanced(group, geo, mat, count, gen, cast) {
  const mesh = new InstancedMesh(geo, mat, count); if (cast) { mesh.castShadow = true; mesh.receiveShadow = true; }
  let n = 0, tries = 0;
  while (n < count && tries < count * 6) { tries++; const r = gen(); if (!r) continue; dummy.position.set(r.x, r.y, r.z); dummy.rotation.set(r.rot ? rand() * 6 : 0, rand() * 6, r.rot ? rand() * 6 : 0); dummy.scale.set(r.sx, r.sy, r.sx); dummy.updateMatrix(); mesh.setMatrixAt(n++, dummy.matrix); }
  mesh.count = n; group.add(mesh);
}

function addFlowers(group) {
  const meadows = [[44, 12], [-14, 36], [-58, -6], [48, -12]];
  const cols = [[1, 0.85, 0.3], [0.95, 0.5, 0.7], [0.7, 0.5, 0.95], [1, 1, 0.95], [1, 0.45, 0.35]];
  const fp = [], fc = [];
  for (let i = 0; i < COUNTS.flowers; i++) {
    const m = meadows[i % meadows.length]; const x = m[0] + (rand() - 0.5) * 22, z = m[1] + (rand() - 0.5) * 22, y = terrain(x, z);
    if (y < 2.5 || y > 13) continue; fp.push(x, y + 0.6, z); const c = cols[Math.floor(rand() * cols.length)]; fc.push(c[0], c[1], c[2]);
  }
  const g = new BufferGeometry(); g.setAttribute('position', new Float32BufferAttribute(fp, 3)); g.setAttribute('color', new Float32BufferAttribute(fc, 3));
  group.add(new Points(g, new PointsMaterial({ size: 3, sizeAttenuation: false, vertexColors: true, transparent: true, opacity: 0.9, map: flowerTex(), depthWrite: false })));
}
