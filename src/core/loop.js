import { Clock } from 'three';

// Central loop. Registered systems each expose update(dt, elapsed).
// A per-frame try/catch keeps one faulty system from killing the whole render.
export function createLoop(render) {
  const clock = new Clock();
  const systems = [];
  let loggedErr = false;

  function add(system) { if (system && typeof system.update === 'function') systems.push(system); }

  // lightweight FPS tracking (rolling ~0.5s) exposed for the harness + an optional meter
  let frames = 0, acc = 0, fps = 0;

  function tick() {
    requestAnimationFrame(tick);
    const raw = clock.getDelta();
    const dt = Math.min(raw, 0.05);
    const t = clock.elapsedTime;
    frames++; acc += raw;
    if (acc >= 0.5) { fps = Math.round(frames / acc); frames = 0; acc = 0; if (typeof window !== 'undefined') window.__fps = fps; }
    try {
      for (const s of systems) s.update(dt, t);
      render();
    } catch (e) {
      if (!loggedErr) { loggedErr = true; console.error('Loop error:', e); }
    }
  }

  return { add, start: () => tick(), getFps: () => fps };
}
