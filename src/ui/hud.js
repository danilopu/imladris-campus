import { SECTORS, WORLD } from '../config.js';
import { riverX } from '../world/terrain.js';
import { addressOf } from '../world/zones.js';

const HALF = WORLD.half;
function roundRect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

// Game-like Explore HUD: a live top-down minimap (island, rivers, sectors, your position
// + heading, dropped markers) plus a system-status readout (zone address, time, granary,
// FPS). Shown only while exploring. Cheap — a 180×180 2D canvas, no extra 3D camera.
export function buildHUD({ explore, director, daynight, getFps, getMarkers }) {
  const root = document.createElement('div');
  root.innerHTML = `
    <div class="hud hidden" id="hud">
      <div class="hud-map"><canvas id="hudMap" width="180" height="180"></canvas><div class="hud-zone" id="hudZone">—</div></div>
      <div class="hud-stats" id="hudStats"></div>
    </div>`;
  document.body.appendChild(root);
  const hud = root.querySelector('#hud'), canvas = root.querySelector('#hudMap'), ctx = canvas.getContext('2d');
  const zoneEl = root.querySelector('#hudZone'), statsEl = root.querySelector('#hudStats');
  const S = canvas.width;
  const toMap = (x, z) => [(x + HALF) / (2 * HALF) * S, (z + HALF) / (2 * HALF) * S];

  function drawMap() {
    ctx.clearRect(0, 0, S, S);
    ctx.fillStyle = '#2c4327'; roundRect(ctx, 5, 5, S - 10, S - 10, 12); ctx.fill();
    // rivers
    ctx.strokeStyle = 'rgba(120,200,220,0.85)'; ctx.lineJoin = 'round';
    ctx.lineWidth = 3.5; ctx.beginPath();
    for (let z = -HALF; z <= HALF; z += 5) { const [mx, my] = toMap(riverX(z), z); z === -HALF ? ctx.moveTo(mx, my) : ctx.lineTo(mx, my); } ctx.stroke();
    ctx.lineWidth = 2.4; ctx.beginPath(); const a = toMap(WORLD.tributary.a.x, WORLD.tributary.a.z), b = toMap(WORLD.tributary.b.x, WORLD.tributary.b.z); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    // sectors
    SECTORS.forEach(s => { const [mx, my] = toMap(s.pos[0], s.pos[1]); ctx.fillStyle = s.col; ctx.beginPath(); ctx.arc(mx, my, 2.6, 0, 6.28); ctx.fill(); });
    // dropped markers / sensors
    if (getMarkers) getMarkers().forEach(m => { const [mx, my] = toMap(m.x, m.z); ctx.fillStyle = m.color || '#f0a93f'; ctx.fillRect(mx - 1.6, my - 1.6, 3.2, 3.2); });
    // avatar (triangle pointing along heading)
    const p = explore.position, [ax, ay] = toMap(p.x, p.z);
    ctx.save(); ctx.translate(ax, ay); ctx.rotate(Math.PI - explore.heading);
    ctx.fillStyle = '#fff'; ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, -6.5); ctx.lineTo(4.5, 5.5); ctx.lineTo(-4.5, 5.5); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
  }

  function update() {
    if (!explore.active) return;
    drawMap();
    const p = explore.position, ad = addressOf(p.x, p.z);
    zoneEl.textContent = ad.cell;
    const silo = Math.round((director.storeLevel('granary') || 0) * 100);
    statsEl.innerHTML =
      `<div><span>Location</span><b>${ad.zone}</b></div>` +
      `<div><span>Time</span><b>${daynight.night ? 'Night' : 'Day'}</b></div>` +
      `<div><span>Granary</span><b>${silo}%</b></div>` +
      `<div><span>FPS</span><b>${(getFps && getFps()) || window.__fps || '–'}</b></div>`;
  }

  return { update, show: () => hud.classList.remove('hidden'), hide: () => hud.classList.add('hidden') };
}
