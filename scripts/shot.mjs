// Headless-Chrome screenshot helper (Playwright driving the installed Chrome; no browser download).
//
//   node scripts/shot.mjs --out screenshots/aerial.png [--url http://localhost:5173] [--w 1440] [--h 900]
//        [--dpr 1] [--wait 3500] [--js "<code>"]... [--click "<selector>"]... [--scroll "<selector>"] [--full]
//
// --js runs in the page (the dev build exposes the zustand store as window.__store), e.g.
//   --js "__store.getState().enterSpace()"  --js "__store.getState().goRoom('kitchen')"
//   --js "__store.getState().setLayer('raw', true)"  --js "__store.getState().setWallMode('full')"
// Steps run in the order given; each is followed by a 1.2 s settle. Console errors/warnings and page
// errors are printed; the process exits 2 if any console error or page error happened.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const get = (k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : d; };
const all = (k) => args.flatMap((a, i) => (a === `--${k}` ? [args[i + 1]] : []));
const has = (k) => args.includes(`--${k}`);

const url = get('url', 'http://localhost:5173');
const w = +get('w', 1440);
const h = +get('h', 900);
const dpr = +get('dpr', 1);
const wait = +get('wait', 3500);
const out = get('out', 'screenshots/shot.png');
fs.mkdirSync(path.dirname(out), { recursive: true });

const mobile = w < 768;
const browser = await chromium.launch({
  channel: 'chrome',
  headless: true,
  args: ['--ignore-gpu-blocklist', '--enable-webgl', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--enable-gpu-rasterization'],
});
const ctx = await browser.newContext({
  viewport: { width: w, height: h },
  deviceScaleFactor: dpr,
  isMobile: mobile,
  hasTouch: mobile,
});
const page = await ctx.newPage();
const problems = [];
page.on('console', (m) => {
  const t = m.type();
  if (t === 'error' || t === 'warning') {
    const text = m.text();
    // ignore the harmless GL driver perf note from software rendering
    if (/GPU stall|ReadPixels|Automatic fallback to software WebGL/i.test(text)) return;
    console.log(`[console.${t}] ${text}`);
    if (t === 'error') problems.push(text);
  }
});
page.on('pageerror', (e) => { console.log(`[pageerror] ${e.message}`); problems.push(e.message); });

await page.goto(url, { waitUntil: 'load' });
await page.waitForTimeout(wait);
for (const c of all('click')) { await page.click(c); await page.waitForTimeout(1200); }
for (const j of all('js')) { await page.evaluate(j); await page.waitForTimeout(1200); }
const sc = get('scroll');
if (sc) { await page.locator(sc).first().scrollIntoViewIfNeeded(); await page.waitForTimeout(1200); }
await page.waitForTimeout(has('wait2') ? +get('wait2') : 1500);
await page.screenshot({ path: out, fullPage: has('full') });
console.log(`saved ${out} (${w}x${h}) errors=${problems.length}`);
await browser.close();
process.exit(problems.length ? 2 : 0);
