import {
  Group, BufferGeometry, Float32BufferAttribute, LineBasicMaterial, LineSegments,
  Sprite, SpriteMaterial, CanvasTexture
} from 'three';
import { terrain } from './terrain.js';
import { SECTORS, WORLD } from '../config.js';

const HALF = WORLD.half;
const GRID = 8;                 // 8×8 planning cells (~22 units each)
const COLS = 'ABCDEFGH';
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// addressOf(x,z) -> a human label for a spot, combining the nearest named sector with a
// grid cell, e.g. "Research Ridge · D5". This is how we talk about *where* precisely.
export function addressOf(x, z) {
  let zone = null, best = Infinity;
  for (const s of SECTORS) { const dx = x - s.pos[0], dz = z - s.pos[1], d = dx * dx + dz * dz; if (d < best) { best = d; zone = s; } }
  const col = clamp(Math.floor((x + HALF) / (2 * HALF) * GRID), 0, GRID - 1);
  const row = clamp(Math.floor((z + HALF) / (2 * HALF) * GRID), 0, GRID - 1);
  const cell = COLS[col] + (row + 1);
  return { zone: zone ? zone.name : 'Open ground', zoneId: zone ? zone.id : null, cell, label: `${zone ? zone.name : 'Open'} · ${cell}` };
}

function tag(text, color = '#cfe6ff') {
  const c = document.createElement('canvas'); c.width = 64; c.height = 64; const x = c.getContext('2d');
  x.font = '600 34px -apple-system,system-ui,sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.lineWidth = 6; x.strokeStyle = 'rgba(8,12,20,0.7)'; x.strokeText(text, 32, 34); x.fillStyle = color; x.fillText(text, 32, 34);
  const t = new CanvasTexture(c); const s = new Sprite(new SpriteMaterial({ map: t, transparent: true, depthWrite: false, depthTest: false, opacity: 0.95 }));
  s.scale.set(5, 5, 1); s.renderOrder = 7; return s;
}

// A toggleable planning overlay: grid lines that hug the terrain + column/row labels,
// so the campus can be addressed and discussed like a map.
export function buildZoneOverlay() {
  const group = new Group(); group.visible = false;
  const step = (2 * HALF) / GRID, sub = step / 4, pts = [];
  const line = (fix, varyZ) => {
    let prev = null;
    for (let v = -HALF; v <= HALF + 0.001; v += sub) {
      const x = varyZ ? fix : v, z = varyZ ? v : fix, y = terrain(x, z) + 0.4;
      if (prev) pts.push(prev[0], prev[1], prev[2], x, y, z);
      prev = [x, y, z];
    }
  };
  for (let i = 0; i <= GRID; i++) { const p = -HALF + i * step; line(p, true); line(p, false); }
  const g = new BufferGeometry(); g.setAttribute('position', new Float32BufferAttribute(pts, 3));
  group.add(new LineSegments(g, new LineBasicMaterial({ color: 0x8fe3ff, transparent: true, opacity: 0.6, depthWrite: false })));

  for (let i = 0; i < GRID; i++) {
    const cc = -HALF + (i + 0.5) * step;
    const col = tag(COLS[i]); col.position.set(cc, terrain(cc, HALF) + 3, HALF + 4); group.add(col);
    const rowS = tag(String(i + 1)); rowS.position.set(-HALF - 4, terrain(-HALF, cc) + 3, cc); group.add(rowS);
  }

  return { group, setVisible: (v) => { group.visible = v; }, get visible() { return group.visible; } };
}
