// Verification harness — boots the built app, screenshots key states, and reports model
// loads + page errors. Ends "building blind": run after a change to actually see it.
//
//   npm run build && npm run shoot
//
// Screenshots land in tools/shots/. Each step is guarded so one flaky click can't abort
// the run. Model (.glb/.gltf) requests are logged with status so we know assets loaded.
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const PORT = 4317;
const APP_URL = `http://localhost:${PORT}/`;
const OUT = fileURLToPath(new URL('./shots/', import.meta.url));
mkdirSync(OUT, { recursive: true });

const wait = (ms) => new Promise(r => setTimeout(r, ms));
const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { shell: true, stdio: 'ignore' });
const errors = [], models = [];
// sample window.__fps for ~2.5s and return the median (robust to spikes)
const measureFps = (page) => page.evaluate(() => new Promise(resolve => {
  const s = []; const id = setInterval(() => { if (window.__fps) s.push(window.__fps); }, 200);
  setTimeout(() => { clearInterval(id); s.sort((a, b) => a - b); resolve(s.length ? s[Math.floor(s.length / 2)] : 0); }, 2500);
}));

async function step(name, fn) { try { await fn(); } catch (e) { console.error(`step "${name}" skipped: ${e.message.split('\n')[0]}`); } }

try {
  await wait(2500);
  const browser = await chromium.launch({ args: ['--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.bringToFront();
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(String(e)));
  page.on('response', r => { const u = r.url(); if (/\.(glb|gltf|bin)$/i.test(u)) models.push(`${r.status()} ${u.split('/').pop()}`); });
  page.on('requestfailed', r => { const u = r.url(); if (/models\//.test(u)) models.push(`FAIL ${u.split('/').pop()}`); });
  const click = (sel) => page.click(sel, { force: true });

  await page.goto(APP_URL, { waitUntil: 'load' });
  await page.waitForSelector('#loader.gone', { timeout: 8000 }).catch(() => {});
  await wait(3500);
  // force High quality (tilt-shift etc. on) for the look screenshots
  await step('quality-high', async () => {
    for (let i = 0; i < 3; i++) { const t = await page.textContent('#btnQuality'); if (/^High/.test(t || '')) break; await click('#btnQuality'); await wait(300); }
    console.log('Quality:', await page.textContent('#btnQuality'));
  });
  await wait(600);
  await step('day', async () => { await page.screenshot({ path: OUT + 'day.png' }); });
  const fpsDiorama = await measureFps(page);

  await step('night', async () => {
    await click('#btnNight'); await wait(2500);
    await page.screenshot({ path: OUT + 'night.png' });
    await click('#btnNight'); await wait(1500);
  });

  await step('systems', async () => {
    await click('#btnSystems'); await wait(400);
    await page.screenshot({ path: OUT + 'systems.png' });
    await click('#btnSystems'); await wait(300);
  });

  await step('sector', async () => {
    await page.locator('.schip').first().click({ force: true }); await wait(800);
    const box = await page.locator('canvas').boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.wheel(0, -900); await wait(1800);
    await page.screenshot({ path: OUT + 'sector.png' });
    await click('#btnReset'); await wait(1600);
  });

  let fpsExplore = 0, noteCount = -1;
  await step('explore', async () => {
    await click('#btnExplore'); await wait(2200); // let the character model load
    await page.keyboard.down('w'); await wait(1200); await page.keyboard.up('w');
    // drop an annotation: M, type a comment, Enter
    await page.keyboard.press('m'); await wait(500);
    await page.fill('#noteText', 'TEST: put a greenhouse here').catch(() => {});
    await page.keyboard.press('Enter'); await wait(400);
    await page.screenshot({ path: OUT + 'explore.png' });
    fpsExplore = await measureFps(page);
    noteCount = await page.evaluate(() => JSON.parse(localStorage.getItem('imladris.annotations.v1') || '[]').length);
    await click('#btnExplore'); await wait(400);
  });
  console.log('Annotations persisted:', noteCount);

  // plan grid overlay
  await step('plan', async () => {
    await click('#btnPlan'); await wait(600);
    await page.screenshot({ path: OUT + 'plan.png' });
    await click('#btnPlan'); await wait(300);
  });

  // research paper reader
  let paperLen = -1;
  await step('paper', async () => {
    await click('#btnPaper'); await wait(1200);
    await page.screenshot({ path: OUT + 'paper.png' });
    paperLen = await page.evaluate(() => (document.querySelector('#paperBody')?.innerText || '').length);
    await page.keyboard.press('Escape'); await wait(300);
  });
  console.log('Paper text length:', paperLen);

  console.log(`FPS — diorama: ${fpsDiorama}, explore: ${fpsExplore}`);
  await browser.close();
} finally {
  server.kill();
}

console.log(`\nShots → ${OUT}`);
console.log('Models:', models.length ? models.join(', ') : '(none requested)');
if (errors.length) { console.error(`\nPAGE ERRORS (${errors.length}):`); errors.slice(0, 20).forEach(e => console.error('  • ' + e)); process.exit(1); }
console.log('No page errors.');
