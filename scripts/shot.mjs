// Headless-Chrome screenshot helper (Playwright driving the installed Chrome; no browser download).
//
//   node scripts/shot.mjs --out screenshots/aerial.png [--url http://localhost:5173] [--w 1440] [--h 900]
//        [--dpr 1] [--wait 3500] [--js "<code>"]... [--click "<selector>"]... [--scroll "<selector>"] [--full]
//        [--sw]   (force software GL; default uses the machine GPU through ANGLE)
//
// --js runs in the page (the dev build exposes the zustand store as window.__store), e.g.
//   --js "__store.getState().enterSpace()"  --js "__store.getState().goRoom('kitchen')"
//   --js "__store.getState().setLayer('raw', true)"  --js "__store.getState().setWallMode('full')"
// Steps run in the order given; each is followed by a 1.2 s settle. Console errors/warnings and page
// errors are printed; the process exits 2 if any console error or page error happened.
//
// Many agents may call this at once: a system-wide semaphore (3 slots) keeps RAM/CPU sane.
import { chromium } from 'playwright';
import fs from 'node:fs';
import os from 'node:os';
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

// ---- semaphore ---------------------------------------------------------------------------------
const SLOTS = 3;
const lockDir = path.join(os.tmpdir(), 'aurexa-shot-locks');
fs.mkdirSync(lockDir, { recursive: true });
let slotFile = null;
async function acquire() {
  const start = Date.now();
  while (Date.now() - start < 10 * 60_000) {
    for (let i = 0; i < SLOTS; i++) {
      const f = path.join(lockDir, `slot-${i}`);
      try {
        fs.writeFileSync(f, String(process.pid), { flag: 'wx' });
        slotFile = f;
        return;
      } catch {
        // taken: reap if stale (> 4 min old)
        try { if (Date.now() - fs.statSync(f).mtimeMs > 4 * 60_000) fs.unlinkSync(f); } catch { /* raced */ }
      }
    }
    await new Promise((r) => setTimeout(r, 800 + Math.random() * 700));
  }
  console.log('could not get a screenshot slot after 10 minutes');
  process.exit(3);
}
const release = () => { try { if (slotFile) fs.unlinkSync(slotFile); } catch { /* gone */ } slotFile = null; };
process.on('exit', release);
process.on('SIGINT', () => { release(); process.exit(130); });
await acquire();

// ---- browser ------------------------------------------------------------------------------------
const mobile = w < 768;
const glArgs = has('sw')
  ? ['--ignore-gpu-blocklist', '--enable-unsafe-swiftshader', '--use-angle=swiftshader']
  : ['--ignore-gpu-blocklist', '--enable-gpu-rasterization', '--use-angle=d3d11'];
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: glArgs });
try {
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
      if (/GPU stall|ReadPixels|Automatic fallback to software WebGL|swiftshader/i.test(text)) return;
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
  const info = await page.evaluate(() => {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2');
    const ext = gl && gl.getExtension('WEBGL_debug_renderer_info');
    return gl ? (ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'webgl2') : 'NO WEBGL';
  });
  console.log(`saved ${out} (${w}x${h}) errors=${problems.length} gl=${String(info).slice(0, 60)}`);
  await browser.close();
  release();
  process.exit(problems.length ? 2 : 0);
} catch (e) {
  console.log('shot failed:', e.message);
  try { await browser.close(); } catch { /* ignore */ }
  release();
  process.exit(1);
}
