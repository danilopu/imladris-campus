import { Clock } from 'three';

// Central loop. Registered systems each expose update(dt, elapsed).
// Each system is sandboxed in its own try/catch so one faulty system can never freeze
// movement or rendering — it's just skipped, and its error is logged once (with stack).
export function createLoop(render) {
  const clock = new Clock();
  const systems = [];
  const errored = new Set();
  let renderErr = false;

  function add(system, name) { if (system && typeof system.update === 'function') systems.push({ system, name: name || `#${systems.length}` }); }

  // lightweight FPS tracking (rolling ~0.5s) exposed for the harness + an optional meter
  let frames = 0, acc = 0, fps = 0;

  function tick() {
    requestAnimationFrame(tick);
    const raw = clock.getDelta();
    const dt = Math.min(raw, 0.05);
    const t = clock.elapsedTime;
    frames++; acc += raw;
    if (acc >= 0.5) { fps = Math.round(frames / acc); frames = 0; acc = 0; if (typeof window !== 'undefined') window.__fps = fps; }
    for (const entry of systems) {
      try { entry.system.update(dt, t); }
      catch (e) { if (!errored.has(entry)) { errored.add(entry); console.error(`System "${entry.name}" update error (isolated):`, e); } }
    }
    try { render(); }
    catch (e) { if (!renderErr) { renderErr = true; console.error('Render error:', e); } }
  }

  return { add, start: () => tick(), getFps: () => fps };
}
