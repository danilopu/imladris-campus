import { Group, Sprite, SpriteMaterial, CanvasTexture, Vector2, Vector3, Raycaster } from 'three';
import { terrain, riverX } from '../world/terrain.js';
import { corePos, livePos, greenPos, resPos, vaultPos } from '../world/buildings.js';

const rand = Math.random;

function glowTex(hex) {
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, hex); g.addColorStop(0.35, hex); g.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new CanvasTexture(c);
}
const TEX = { moss: glowTex('rgba(122,214,168,1)'), amber: glowTex('rgba(240,169,63,1)'), blue: glowTex('rgba(95,179,201,1)') };

// The narrative layer: each living "organ" gets a glowing marker that opens an
// info card and flies the camera in. Text ported verbatim from the prototype.
const SYSTEMS = [
  { id: 'core', c: '#cfe6ff', t: 'Research Core & Observatory', tex: TEX.amber, p: [corePos.x, corePos.z], yo: 11, body: 'Perched on the hill for thin air, dark skies, and a clear horizon. You ascend here to think — the high half of the campus’s daily rhythm. The dome watches the stars; the labs watch the valley.' },
  { id: 'live', c: '#ffce7a', t: 'Living Complex', tex: TEX.amber, p: [livePos.x, livePos.z], yo: 9, body: 'Nestled low by the water where humans feel best — birdsong, humidity, a current. Terraces step down the slope, linked by bridges, with green roofs that continue the forest floor. You descend here to live.' },
  { id: 'green', c: '#7ad6a8', t: 'Greenhouses & Food Loop', tex: TEX.moss, p: [greenPos.x, greenPos.z], yo: 9, body: 'CO₂-enriched greenhouses and aquaponics grow nearly everything the campus eats — warmed by the data center’s waste heat. One loop closes: the brain heats the food it helps to grow.' },
  { id: 'brain', c: '#6ad6ff', t: 'Sentinel AI & Data Center', tex: TEX.moss, p: [greenPos.x + 9, greenPos.z + 3], yo: 8, body: 'The brain. A local, sovereign AI runs the farm and guards the campus, served privately over a closed network. Its senses are mostly biological — it perceives the valley more completely than any human could.' },
  { id: 'river', c: '#5fb3c9', t: 'River & Micro-Hydro', tex: TEX.blue, p: [riverX(-6), -6], yo: 7, body: 'The campus’s most reliable asset. A low-impact run-of-river turbine draws power without a dam, while the water also cools the data center and threads through the architecture as sound and thermal mass.' },
  { id: 'wind', c: '#f4f2ec', t: 'Wind Ridge', tex: TEX.amber, p: [20, 68], yo: 24, body: 'Turbines catch the exposed ridge wind — one layer of a portfolio that also includes solar, geothermal, and biogas. No single source carries the campus; the energy grid is deliberately redundant.' },
  { id: 'store', c: '#5fb3c9', t: 'Solar & Pumped-Hydro Storage', tex: TEX.blue, p: [resPos.x, resPos.z], yo: 8, body: 'Midday sun pumps water uphill to this reservoir; at night it flows back down through the turbine. The terrain itself becomes the battery — storage measured in hours, matched to the daily cycle.' },
  { id: 'fun', c: '#f0a93f', t: 'The Funicular', tex: TEX.amber, p: [(corePos.x + livePos.x) / 2, (corePos.z + livePos.z) / 2], yo: 11, body: 'Connects the high research core to the low living complex. A descending car lifts the ascending one on a shared cable — the mountain does the work. The campus stays car-light and quiet.' },
  { id: 'forest', c: '#7ad6a8', t: 'Forest Sensor Network', tex: TEX.moss, p: [-56, -16], yo: 12, body: 'The woods are wired as one continuous analog organism — soil moisture, mycelial signals, birdsong, and bioacoustics all feed the AI. Honest note: here, mushrooms are sensors and inspiration, never the computer itself.' },
  { id: 'drone', c: '#7ad6a8', t: 'Drone Sentinels', tex: TEX.moss, p: [38, -2], yo: 20, body: 'Solar-charged drones patrol for early wildfire detection and reconnaissance, launching the moment a heat signature appears — when minutes matter most. They excel at early suppression; they don’t replace defensible space and water reserves.' },
  { id: 'memory', c: '#b6e87a', t: 'Memory — Data & Seed Vault', tex: TEX.moss, p: [vaultPos.x, vaultPos.z], yo: 9, body: 'The ark. A tiered data vault holds the flood of sensor, vision, and audio data; the digital twin is the campus’s working memory. Alongside it, a seed vault — a small Svalbard — and a research-grade DNA archive encode knowledge to outlast the building itself. A place built to carry life and knowledge through hard times.' }
];

// buildHotspots({ camera, dom, controls }) -> { group, update, openSystem, toggleLegend }
export function buildHotspots({ camera, dom, controls }) {
  const group = new Group();
  const sprites = [];
  SYSTEMS.forEach(s => {
    const [hx, hz] = s.p, y = terrain(hx, hz) + s.yo;
    const spr = new Sprite(new SpriteMaterial({ map: s.tex, transparent: true, depthWrite: false, opacity: 0.95 }));
    spr.position.set(hx, y, hz); spr.scale.set(5.5, 5.5, 1); spr.renderOrder = 3; spr.userData = { sys: s, phase: rand() * 6.28 };
    group.add(spr); sprites.push(spr); s.pos = new Vector3(hx, y, hz);
  });

  // --- DOM: info card + explorable legend ---
  const domRoot = document.createElement('div');
  domRoot.innerHTML = `
    <aside class="info" id="info">
      <button class="info-close" id="infoClose" aria-label="Close">×</button>
      <p class="info-eyebrow" id="infoEyebrow">Living system</p>
      <h2 class="info-title" id="infoTitle"></h2>
      <p class="info-body" id="infoBody"></p>
    </aside>
    <div class="legend hidden" id="legend"></div>`;
  document.body.appendChild(domRoot);
  const info = domRoot.querySelector('#info');
  const legend = domRoot.querySelector('#legend');
  domRoot.querySelector('#infoClose').onclick = () => info.classList.remove('open');

  function openSystem(s) {
    domRoot.querySelector('#infoTitle').textContent = s.t;
    domRoot.querySelector('#infoBody').textContent = s.body;
    info.classList.add('open');
    const ang = Math.atan2(s.pos.z, s.pos.x);
    controls.frame(s.pos.x, s.pos.y - 4, s.pos.z, 1.7, ang + Math.PI * 0.6, 0.92);
    legend.classList.add('hidden');
  }

  legend.innerHTML = '<h2>Explore the organism</h2>';
  SYSTEMS.forEach(s => { const b = document.createElement('button'); b.innerHTML = `<span class="ldot" style="color:${s.c}"></span>${s.t}`; b.onclick = () => openSystem(s); legend.appendChild(b); });
  function toggleLegend() { const hidden = legend.classList.toggle('hidden'); return !hidden; }

  // --- raycast picking (treat a near-stationary press as a click, not a drag) ---
  const ray = new Raycaster(), ndc = new Vector2();
  let downX = 0, downY = 0, enabled = true;
  function setEnabled(v) { enabled = v; group.visible = v; }
  function pick(px, py) {
    if (!enabled) return;
    ndc.x = (px / innerWidth) * 2 - 1; ndc.y = -(py / innerHeight) * 2 + 1; ray.setFromCamera(ndc, camera);
    const hits = ray.intersectObjects(sprites, false); if (hits.length) openSystem(hits[0].object.userData.sys);
  }
  dom.addEventListener('pointerdown', e => { downX = e.clientX; downY = e.clientY; });
  dom.addEventListener('pointerup', e => { if (Math.hypot(e.clientX - downX, e.clientY - downY) < 6) pick(e.clientX, e.clientY); });

  function update(dt, elapsed) {
    const now = elapsed * 1000;
    sprites.forEach(s => { const p = 1 + 0.12 * Math.sin(now * 0.003 + s.userData.phase); s.scale.set(5.5 * p, 5.5 * p, 1); });
  }

  return { group, update, openSystem, toggleLegend, setEnabled };
}
