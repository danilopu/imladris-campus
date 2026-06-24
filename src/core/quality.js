// Quality presets — the user's perf lever (real FPS can only be felt on real hardware,
// not in a headless harness, so we expose the controls rather than guess a number).
// Each level trades the expensive things first: pixel ratio (huge on hi-DPI), shadow-map
// resolution / shadows, GTAO, then bloom. Auto-defaults from device heuristics.
export function createQuality({ renderer, postfx, key }) {
  const maxPR = Math.min(window.devicePixelRatio || 1, 2);
  const LEVELS = {
    High:   { pr: maxPR,             shadow: 2048, gtao: true,  bloom: true },
    Medium: { pr: Math.min(maxPR, 1.5), shadow: 1024, gtao: false, bloom: true },
    Low:    { pr: 1,                 shadow: 0,    gtao: false, bloom: false }
  };
  const order = ['High', 'Medium', 'Low'];
  let cur = 'High';

  function apply(name) {
    cur = name; const q = LEVELS[name];
    renderer.setPixelRatio(q.pr);
    if (q.shadow === 0) {
      renderer.shadowMap.enabled = false;
    } else {
      renderer.shadowMap.enabled = true;
      if (key && key.shadow.mapSize.width !== q.shadow) {
        key.shadow.mapSize.set(q.shadow, q.shadow);
        if (key.shadow.map) { key.shadow.map.dispose(); key.shadow.map = null; } // force regen at new size
      }
    }
    postfx.setGtao(q.gtao);
    if (postfx.bloom) postfx.bloom.enabled = q.bloom;
    window.dispatchEvent(new Event('resize')); // re-apply renderer/composer sizes for the new pixel ratio
  }

  // default: step down on weaker / very hi-DPI devices
  const weak = (navigator.hardwareConcurrency || 4) <= 4 || (window.devicePixelRatio || 1) > 2;
  apply(weak ? 'Medium' : 'High');

  function cycle() { apply(order[(order.indexOf(cur) + 1) % order.length]); return cur; }
  return { apply, cycle, get level() { return cur; } };
}
