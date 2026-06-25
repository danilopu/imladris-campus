// Guided tour: an auto-advancing flythrough that frames each sector and narrates the
// system living there (the campus as one organism). Reuses the sector frame() helpers and
// the ticker. Stoppable any time; restores auto-orbit + a clean ticker on stop.
const NARRATION = {
  research: 'Research Ridge — the cortex: labs, observatory and the Sentinel AI that senses and decides.',
  green:    'Greenworks — the lungs: greenhouses and the data-center brain humming on midday surplus.',
  agri:     'Agriculture — the gut: fields, paddies and aquaponics turning sun and water into food.',
  living:   'Living Quarter — the hearth: a riverside hamlet on the banks, market, dock and bridge.',
  energy:   'Energy Field — the metabolism: solar, micro-hydro wheels and the pumped reservoir.',
  wild:     'Wildwood — the skin: forest, the chicken farm, and the mycelial nervous system below.'
};

export function createTour({ controls, sectors }) {
  let setTicker = () => {};
  let onState = () => {};
  let active = false, idx = 0, timer = 0;
  const HOLD = 6.5; // seconds per stop
  const order = ['research', 'green', 'agri', 'living', 'energy', 'wild']
    .map(id => sectors.find(s => s.id === id)).filter(Boolean);

  function go(i) {
    idx = (i + order.length) % order.length;
    const s = order[idx];
    s.frame();                         // damped camera move (smooth, fps-independent)
    setTicker(NARRATION[s.id] || s.name, s.col);
    timer = 0;
  }
  function start() { if (active || !order.length) return; active = true; onState(true); go(0); }
  function stop() {
    if (!active) return;
    active = false; onState(false);
    controls.reset();                  // back to the orbiting establishing shot
    setTicker('Tour ended — back to the living campus.', '#7ad6a8');
  }
  function toggle() { active ? stop() : start(); return active; }

  function update(dt) {
    if (!active) return;
    timer += dt;
    if (timer >= HOLD) go(idx + 1);
  }

  return {
    update, toggle, start, stop,
    get active() { return active; },
    setTicker: (fn) => { if (typeof fn === 'function') setTicker = fn; },
    onState: (fn) => { if (typeof fn === 'function') onState = fn; }
  };
}
