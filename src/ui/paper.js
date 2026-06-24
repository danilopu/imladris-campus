// In-app reader for the concept paper. The markdown (and the renderer) are dynamically
// imported on first open, so they never weigh down the initial bundle. Lets anyone open
// and read the research paper from inside the application to understand the campus.
export function buildPaper() {
  const root = document.createElement('div');
  root.innerHTML = `
    <div class="paper hidden" id="paper">
      <div class="paper-card">
        <button class="paper-close" id="paperClose" aria-label="Close">×</button>
        <div class="paper-body" id="paperBody"><p class="paper-loading">Loading the paper…</p></div>
      </div>
    </div>`;
  document.body.appendChild(root);
  const panel = root.querySelector('#paper'), body = root.querySelector('#paperBody');
  const close = () => panel.classList.add('hidden');
  root.querySelector('#paperClose').onclick = close;
  panel.addEventListener('click', e => { if (e.target === panel) close(); });
  addEventListener('keydown', e => { if (e.key === 'Escape' && !panel.classList.contains('hidden')) close(); });

  let loaded = false;
  async function open() {
    panel.classList.remove('hidden');
    if (loaded) return; loaded = true;
    try {
      const [{ marked }, md] = await Promise.all([
        import('marked'),
        import('../../living-campus-paper.md?raw')
      ]);
      body.innerHTML = marked.parse(md.default);
    } catch (e) { body.innerHTML = '<p>Could not load the paper.</p>'; }
  }
  return { open };
}
