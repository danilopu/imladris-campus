import {
  Group, Mesh, MeshStandardMaterial, CylinderGeometry, ConeGeometry,
  Sprite, SpriteMaterial, CanvasTexture, Vector3
} from 'three';
import { terrain } from '../world/terrain.js';
import { addressOf } from '../world/zones.js';

const KEY = 'imladris.annotations.v1';

function numSprite(n) {
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  x.beginPath(); x.arc(32, 32, 26, 0, 6.28); x.fillStyle = '#f0a93f'; x.fill();
  x.font = '700 34px -apple-system,system-ui,sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#1a1f2e'; x.fillText(String(n), 32, 35);
  const s = new Sprite(new SpriteMaterial({ map: new CanvasTexture(c), transparent: true, depthWrite: false, depthTest: false })); s.scale.set(1.8, 1.8, 1); s.renderOrder = 8; return s;
}

// In-world annotations: while exploring, the avatar drops a pin and writes a comment.
// Each note records { id, x,y,z, address, text } — persisted to localStorage and
// exportable as a task checklist, so "mark a spot + say what's needed" becomes work
// items that already know exactly where and what.  getMarkPose() -> Vector3 | null.
export function buildAnnotations({ getMarkPose }) {
  const group = new Group();
  const pins = [];
  let nextId = 1;

  // --- DOM: notes panel + comment input ---
  const root = document.createElement('div');
  root.innerHTML = `
    <div class="notes hidden" id="notesPanel">
      <div class="notes-head"><h2>Annotations</h2>
        <div class="notes-actions"><button id="notesExport">Export</button><button id="notesClear">Clear</button></div></div>
      <div class="notes-list" id="notesList"></div>
      <p class="notes-hint">In Explore, press <b>M</b> to mark where you stand.</p>
    </div>
    <div class="note-input hidden" id="noteInput">
      <span id="noteAddr"></span>
      <input id="noteText" placeholder="What needs doing here?" autocomplete="off" />
      <div class="note-input-row"><button id="noteSave">Save (Enter)</button><button id="noteCancel">Cancel (Esc)</button></div>
    </div>`;
  document.body.appendChild(root);
  const panel = root.querySelector('#notesPanel'), listEl = root.querySelector('#notesList');
  const inputBox = root.querySelector('#noteInput'), textEl = root.querySelector('#noteText'), addrEl = root.querySelector('#noteAddr');

  function makePin(n) {
    const g = new Group();
    const pole = new Mesh(new CylinderGeometry(0.08, 0.08, 3, 5), new MeshStandardMaterial({ color: 0xcfd6da, roughness: 0.6 })); pole.position.y = 1.5; g.add(pole);
    const flag = new Mesh(new ConeGeometry(0.5, 0.7, 4), new MeshStandardMaterial({ color: 0xf0a93f, emissive: 0xf0a93f, emissiveIntensity: 0.7, flatShading: true })); flag.position.set(0, 3.2, 0); g.add(flag);
    const num = numSprite(n); num.position.set(0, 4.1, 0); g.add(num);
    return g;
  }

  function makePin_(pin) { const m = makePin(pin.id); m.position.copy(pin.pos); group.add(m); pin.mesh = m; }

  function add(pos, text = '') {
    const a = addressOf(pos.x, pos.z);
    const pin = { id: nextId++, pos: pos.clone(), address: a, text };
    makePin_(pin); pins.push(pin); save(); renderList();
    return pin;
  }
  function remove(id) { const i = pins.findIndex(p => p.id === id); if (i < 0) return; group.remove(pins[i].mesh); pins.splice(i, 1); save(); renderList(); }
  function clear() { pins.forEach(p => group.remove(p.mesh)); pins.length = 0; save(); renderList(); }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(pins.map(p => ({ id: p.id, x: p.pos.x, y: p.pos.y, z: p.pos.z, text: p.text, address: p.address })))); } catch (e) { /* ignore */ }
  }
  function load() {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY) || '[]');
      raw.forEach(d => { const pin = { id: d.id, pos: new Vector3(d.x, d.y, d.z), address: d.address || addressOf(d.x, d.z), text: d.text || '' }; makePin_(pin); pins.push(pin); nextId = Math.max(nextId, d.id + 1); });
      renderList();
    } catch (e) { /* ignore */ }
  }

  function renderList() {
    listEl.innerHTML = pins.length ? '' : '<p class="notes-empty">No annotations yet.</p>';
    pins.forEach(p => {
      const row = document.createElement('div'); row.className = 'note-row';
      row.innerHTML = `<span class="note-n">${p.id}</span><div class="note-body"><div class="note-addr">${p.address.label}</div><div class="note-txt">${p.text || '<i>(no comment)</i>'}</div></div><button class="note-del" title="Delete">×</button>`;
      row.querySelector('.note-del').onclick = () => remove(p.id);
      listEl.appendChild(row);
    });
  }

  // export → a task checklist (markdown + JSON), copied to clipboard and downloaded
  function exportData() {
    if (!pins.length) return;
    const md = pins.map(p => `- [ ] [${p.address.label}] ${p.text || '(no comment)'}  _(x ${p.pos.x.toFixed(1)}, y ${p.pos.y.toFixed(1)}, z ${p.pos.z.toFixed(1)})_`).join('\n');
    const json = JSON.stringify(pins.map(p => ({ id: p.id, address: p.address.label, zone: p.address.zoneId, cell: p.address.cell, text: p.text, x: +p.pos.x.toFixed(2), y: +p.pos.y.toFixed(2), z: +p.pos.z.toFixed(2) })), null, 2);
    if (navigator.clipboard) navigator.clipboard.writeText(md).catch(() => {});
    const blob = new Blob([json], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'annotations.json'; a.click();
  }

  // --- marking flow ---
  let pending = null;
  function startMark() {
    const pos = getMarkPose && getMarkPose(); if (!pos) return;
    pending = add(pos);
    addrEl.textContent = pending.address.label; textEl.value = '';
    inputBox.classList.remove('hidden'); setTimeout(() => textEl.focus(), 0);
  }
  function commit() { if (!pending) return; pending.text = textEl.value.trim(); save(); renderList(); inputBox.classList.add('hidden'); pending = null; }
  function cancel() { if (!pending) return; remove(pending.id); inputBox.classList.add('hidden'); pending = null; }

  textEl.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') commit(); else if (e.key === 'Escape') cancel(); });
  root.querySelector('#noteSave').onclick = commit;
  root.querySelector('#noteCancel').onclick = cancel;
  root.querySelector('#notesExport').onclick = exportData;
  root.querySelector('#notesClear').onclick = () => { if (confirm('Delete all annotations?')) clear(); };

  addEventListener('keydown', e => {
    if (e.key === 'm' || e.key === 'M') { if (getMarkPose && getMarkPose()) { e.preventDefault(); startMark(); } }
  });

  function togglePanel() { const hidden = panel.classList.toggle('hidden'); return !hidden; }

  load();
  return { group, startMark, togglePanel, exportData, get count() { return pins.length; } };
}
