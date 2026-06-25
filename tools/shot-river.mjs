// Diagnostic: capture the rivers from several angles — top-down (north dryness + tributary),
// the south rim (overflow waterfall), and a north-end zoom. Boots the built app on a preview
// server and drives the ortho camera via synthetic mouse drags.
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const PORT = 4318;
const APP_URL = `http://localhost:${PORT}/`;
const OUT = fileURLToPath(new URL('./shots/', import.meta.url));
mkdirSync(OUT, { recursive: true });
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const VITE_BIN = fileURLToPath(new URL('../node_modules/vite/bin/vite.js', import.meta.url));
const server = spawn(process.execPath, [VITE_BIN, 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });

try {
  await wait(2500);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(APP_URL, { waitUntil: 'load' });
  await page.waitForSelector('#loader.gone', { timeout: 8000 }).catch(() => {});
  await wait(3500);

  const cx = 720, cy = 450;
  const drag = async (dx, dy) => {
    await page.mouse.move(cx, cy); await page.mouse.down();
    for (let i = 1; i <= 12; i++) { await page.mouse.move(cx + dx * i / 12, cy + dy * i / 12); await wait(18); }
    await page.mouse.up(); await wait(900);
  };
  const reset = async () => { await page.click('#btnReset', { force: true }); await wait(1800); };

  // 1) top-down overview (drag DOWN → top-down). North = top of island, South = bottom.
  await drag(0, 300);
  await wait(1200);
  await page.screenshot({ path: OUT + 'river-topdown.png' });

  // 2) south rim: rotate ~180° from default, keep a low-ish angle to see the overflow falling
  await reset();
  await drag(540, 0);          // spin theta ~180°
  await wait(800);
  await drag(0, -120);         // lower the pitch a touch toward the horizon
  await page.mouse.move(cx, cy); await page.mouse.wheel(0, -500); await wait(1200);
  await page.screenshot({ path: OUT + 'river-south.png' });

  // 3) tributary: frame the Research sector (which the mountain river runs through) and tilt
  //    toward top-down so the channel can't hide behind the ridge
  await reset();
  await page.locator('.schip', { hasText: 'Research' }).first().click({ force: true }).catch(() => {});
  await wait(1500);
  await drag(0, 210);
  await page.mouse.move(cx, cy); await page.mouse.wheel(0, -500); await wait(1300);
  await page.screenshot({ path: OUT + 'river-tributary.png' });

  await browser.close();
} finally {
  server.kill();
}
console.log('Shots → ' + OUT);
