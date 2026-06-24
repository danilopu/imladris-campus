import { Vector3 } from 'three';
import { terrain, riverX } from '../world/terrain.js';

// The routine operations of the campus, expressed as jobs on the Director bus. Each
// line names a real source location (`at`) so the Dispatcher can show the signal travel
// to the brain, plus the muscle effect type it triggers. Pauses while a fire is active
// (the fire system drives the ticker then). Extend freely — add a row, done.
const EVENTS = [
  { label: 'Soundscape nominal · 47 species detected · all systems green', col: '#7ad6a8', dur: 6 },
  { type: 'irrigate', at: [-8, -44], label: 'Hyperspectral scan · block 4 NIR stress → dosing drip', col: '#6ad6ff', dur: 7 },
  { type: 'recon', at: [10, -38], label: 'S-slope heat signature → drone dispatched for recon', col: '#f0a93f', dur: 8 },
  { type: 'energy', at: [-50, 4], label: 'Solar + wind surplus +38 kW → pumping reservoir uphill', col: '#ffb24d', dur: 7 },
  { type: 'compute', at: [-8, 60], label: 'Surplus window · scheduling digital-twin simulation', col: '#9fdcff', dur: 6 },
  { type: 'energy', at: [34, 24], label: 'Cascade micro-hydro online · +21 kW from the wheels → grid', col: '#5fb3c9', dur: 7 },
  { type: 'hive', at: [-26, -22], label: 'Hive 3 telemetry anomaly → apiarist alerted', col: '#7ad6a8', dur: 7 },
  { type: 'flood', at: [riverX(20), 20], label: 'Infrasound array — distant storm front → flood watch armed', col: '#5fb3c9', dur: 7 },
  { type: 'compute', at: [-8, 60], label: 'Funicular dispatched · ridge ↔ valley · gravity-balanced', col: '#f0a93f', dur: 6 }
];

const point = ([x, z]) => new Vector3(x, terrain(x, z) + 2.5, z);

// post: the Director's post fn. isFireActive: pause the routine loop during a wildfire.
export function buildEvents(post, isFireActive) {
  let i = -1, t = 0;
  function next() {
    i = (i + 1) % EVENTS.length; const e = EVENTS[i]; t = e.dur;
    const at = e.at ? point(e.at) : null;
    post({ type: e.type, from: at, to: at, label: e.label, col: e.col, instant: true });
  }
  next();
  function update(dt) { if (isFireActive()) return; t -= dt; if (t <= 0) next(); }
  return { update };
}
