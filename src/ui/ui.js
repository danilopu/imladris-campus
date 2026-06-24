// Minimal DOM UI: brand, toolbar (explore, systems, auto-orbit, night, wildfire, reset,
// quality), sector chips, ticker. The quality chip doubles as a live FPS readout.
export function buildUI({ controls, sectors, fire, night, systems, explore, quality, plan, notes, paper, mycelium }) {
  const root = document.createElement('div');
  root.innerHTML = `
    <div class="top">
      <div class="brand"><h1>Project <span>Imladris</span></h1><p>The Living Campus</p></div>
      <div class="tools">
        <button class="btn" id="btnPaper">Paper</button>
        <button class="btn" id="btnExplore">Explore</button>
        <button class="btn" id="btnNotes">Notes</button>
        <button class="btn" id="btnPlan">Plan grid</button>
        <button class="btn on" id="btnMycelium">Mycelium</button>
        <button class="btn" id="btnSystems">Systems</button>
        <button class="btn on" id="btnRotate">Auto-orbit</button>
        <button class="btn" id="btnNight">Night</button>
        <button class="btn" id="btnFire">Wildfire</button>
        <button class="btn" id="btnReset">Reset</button>
        <button class="btn" id="btnQuality" title="Render quality (and live FPS)">Quality</button>
      </div>
    </div>
    <div class="sectorbar" id="sectorbar"></div>
    <div class="explore-hint" id="exploreHint">WASD / arrows to walk · Shift to jog · drag to look · <b>M</b> to mark a spot · Exit to return</div>
    <div class="ticker"><span class="pulse"></span><span id="tickerText">Initializing…</span></div>`;
  document.body.appendChild(root);

  const bar = root.querySelector('#sectorbar');
  sectors.forEach(s => { const b = document.createElement('button'); b.className = 'schip'; b.innerHTML = `<span class="sdot" style="background:${s.col}"></span>${s.name}`; b.onclick = () => s.frame(); bar.appendChild(b); });

  const btnRotate = root.querySelector('#btnRotate');
  controls.onAuto(v => btnRotate.classList.toggle('on', v));
  btnRotate.onclick = () => controls.setAuto(!controls.autoRotate);
  root.querySelector('#btnReset').onclick = () => controls.reset();
  root.querySelector('#btnFire').onclick = () => fire.trigger();

  if (night) {
    const btnNight = root.querySelector('#btnNight');
    btnNight.onclick = () => { const n = night.toggle(); btnNight.classList.toggle('on', n); btnNight.textContent = n ? 'Day' : 'Night'; };
  }
  if (systems) {
    const btnSystems = root.querySelector('#btnSystems');
    btnSystems.onclick = () => { const open = systems.toggleLegend(); btnSystems.classList.toggle('on', open); };
  }
  if (paper) {
    root.querySelector('#btnPaper').onclick = () => paper.open();
  }
  if (plan) {
    const btnPlan = root.querySelector('#btnPlan');
    btnPlan.onclick = () => { const on = plan.toggle(); btnPlan.classList.toggle('on', on); };
  }
  if (mycelium) {
    const btnMycelium = root.querySelector('#btnMycelium');
    btnMycelium.onclick = () => { const on = mycelium.toggle(); btnMycelium.classList.toggle('on', on); };
  }
  if (notes) {
    const btnNotes = root.querySelector('#btnNotes');
    btnNotes.onclick = () => { const open = notes.togglePanel(); btnNotes.classList.toggle('on', open); };
  }
  if (quality) {
    const btnQuality = root.querySelector('#btnQuality');
    const paint = () => { btnQuality.textContent = `${quality.level} · ${window.__fps || '–'} fps`; };
    btnQuality.onclick = () => { quality.cycle(); paint(); };
    paint(); setInterval(paint, 500); // live FPS readout
  }
  if (explore) {
    const btnExplore = root.querySelector('#btnExplore');
    const hint = root.querySelector('#exploreHint');
    const sectorbar = root.querySelector('#sectorbar');
    btnExplore.onclick = () => {
      const on = explore.toggle();
      btnExplore.classList.toggle('on', on);
      btnExplore.textContent = on ? 'Exit' : 'Explore';
      hint.classList.toggle('show', on);
      sectorbar.style.display = on ? 'none' : '';
    };
  }

  const tickerText = root.querySelector('#tickerText');
  const tickerPulse = root.querySelector('.ticker .pulse');
  const setTicker = (t, c) => { tickerText.textContent = t; if (tickerPulse) tickerPulse.style.background = c; };
  return { setTicker };
}
