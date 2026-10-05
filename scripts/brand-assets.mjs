// Brand asset generator:  npm run assets   (idempotent; reads brand-src/, writes public/brand + public)
//
//   public/favicon.png (256), favicon-32.png, favicon.ico (16/32/48), apple-touch-icon.png (180)
//   public/brand/mark.png, wordmark-{light,dark}.png, lockup-{light,dark}.png (+ lockup-tagline-*)
//   public/og.png (1200 x 630)
//
// logo-light.png and logo-dark.png show the same mark on pure white and pure black. That is a
// two-background matte: alpha = 1 - (white render - black render) / 255 and colour = black render / alpha,
// which recovers the mark exactly, with no halo on any backdrop. The wordmark is single-ink, so its alpha
// is the ink density. The originals in brand-src/ are only ever read (they are not served or built).
//
// The og.png title line comes from KITCHEN_NAME in src/config.ts: re-run this script after changing it.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { loadPublicSans, measureText, textPath } from './lib/text-path.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'brand-src');
const PUB = path.join(ROOT, 'public');
const BRAND = path.join(PUB, 'brand');
fs.mkdirSync(BRAND, { recursive: true });

const COLORS = { teal: '#1d6866', tealLight: '#8cc1c0', orange: '#cb622a', cream: '#f6e3c2', stage: '#070d0e' };

// Regions of the 1000 x 1000 source logos (padded around the real content).
const MARK_BOX = { x: 240, y: 90, w: 520, h: 520 };
const WORDMARK_BOX = { x: 160, y: 640, w: 680, h: 215 }; // AUREXA + rule + DESIGN CONSULTANTS
const LETTERS_BOX = { x: 160, y: 640, w: 680, h: 125 }; // AUREXA only

// Lockup geometry at 2x (the PNG is 2x; CSS height = natural height / 2).
const LOCKUP = { pad: 4, markH: 88, gap: 28, capH: 40 };

const png = (img) => img.png({ compressionLevel: 9, effort: 10 });
const write = async (file, img) => {
  await png(img).toFile(file);
  const m = await sharp(file).metadata();
  console.log(`  ${path.relative(ROOT, file).replace(/\\/g, '/')}  ${m.width}x${m.height}`);
};

// ---- pixel work ----------------------------------------------------------------------------------
async function readRaw(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, w: info.width, h: info.height };
}

const clamp255 = (v) => (v < 0 ? 0 : v > 255 ? 255 : Math.round(v));

/** Exact matte of the mark from the white and black renders. Returns an RGBA image (straight alpha). */
function matteMark(light, dark, box) {
  const out = Buffer.alloc(box.w * box.h * 4);
  for (let y = 0; y < box.h; y++) {
    for (let x = 0; x < box.w; x++) {
      const i = ((box.y + y) * light.w + box.x + x) * 4;
      const o = (y * box.w + x) * 4;
      const diff = (light.data[i] - dark.data[i] + light.data[i + 1] - dark.data[i + 1] + light.data[i + 2] - dark.data[i + 2]) / 3;
      const a = Math.min(1, Math.max(0, 1 - diff / 255));
      if (a < 0.004) continue;
      for (let k = 0; k < 3; k++) {
        const fromDark = dark.data[i + k];
        const fromLight = light.data[i + k] - 255 * (1 - a);
        out[o + k] = clamp255((fromDark + fromLight) / (2 * a));
      }
      out[o + 3] = clamp255(a * 255);
    }
  }
  return { data: out, w: box.w, h: box.h };
}

/** Single-ink matte: alpha is the ink density (black ink on white, or white ink on black). */
function matteInk(src, box, ink) {
  const out = Buffer.alloc(box.w * box.h * 4);
  const rgb = ink === 'black' ? [0, 0, 0] : [255, 255, 255];
  for (let y = 0; y < box.h; y++) {
    for (let x = 0; x < box.w; x++) {
      const i = ((box.y + y) * src.w + box.x + x) * 4;
      const o = (y * box.w + x) * 4;
      const mean = (src.data[i] + src.data[i + 1] + src.data[i + 2]) / 3;
      const a = ink === 'black' ? 1 - mean / 255 : mean / 255;
      out[o] = rgb[0]; out[o + 1] = rgb[1]; out[o + 2] = rgb[2];
      out[o + 3] = clamp255(a * 255);
    }
  }
  return { data: out, w: box.w, h: box.h };
}

/** Tight crop to the pixels with alpha above `thr`. */
function trim(img, thr = 6) {
  let x0 = img.w; let y0 = img.h; let x1 = -1; let y1 = -1;
  for (let y = 0; y < img.h; y++) {
    for (let x = 0; x < img.w; x++) {
      if (img.data[(y * img.w + x) * 4 + 3] > thr) {
        if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) throw new Error('trim: image is empty');
  return sharp(img.data, { raw: { width: img.w, height: img.h, channels: 4 } })
    .extract({ left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 });
}

const toBuffer = async (sharpImg) => sharpImg.png().toBuffer();
const sized = async (buf) => {
  const m = await sharp(buf).metadata();
  return { buf, w: m.width, h: m.height };
};
const resizeTo = async (src, opts) => sized(await sharp(src.buf).resize({ ...opts, kernel: 'lanczos3' }).png().toBuffer());

// ---- build ---------------------------------------------------------------------------------------
console.log('brand assets');
const light = await readRaw(path.join(SRC, 'logo-light.png'));
const dark = await readRaw(path.join(SRC, 'logo-dark.png'));
if (light.w !== dark.w || light.h !== dark.h) throw new Error('logo-light and logo-dark must have the same size');

const mark = await sized(await toBuffer(trim(matteMark(light, dark, MARK_BOX))));
const ink = {
  light: {
    wordmark: await sized(await toBuffer(trim(matteInk(light, WORDMARK_BOX, 'black')))),
    letters: await sized(await toBuffer(trim(matteInk(light, LETTERS_BOX, 'black')))),
  },
  dark: {
    wordmark: await sized(await toBuffer(trim(matteInk(dark, WORDMARK_BOX, 'white')))),
    letters: await sized(await toBuffer(trim(matteInk(dark, LETTERS_BOX, 'white')))),
  },
};

// Transparent brand cuts for the UI.
await write(path.join(BRAND, 'mark.png'), sharp((await resizeTo(mark, { width: 600 })).buf));
for (const tone of ['light', 'dark']) {
  await write(path.join(BRAND, `wordmark-${tone}.png`), sharp(ink[tone].wordmark.buf));
}

/** Horizontal lockup: mark on the left, wordmark on the right, vertically centred, transparent, 2x. */
async function buildLockup(tone, tagline) {
  const { pad, markH, gap, capH } = LOCKUP;
  const m = await resizeTo(mark, { height: markH });
  const wmSrc = tagline ? ink[tone].wordmark : ink[tone].letters;
  const wm = tagline
    ? await resizeTo(wmSrc, { height: markH })
    : await resizeTo(wmSrc, { height: capH });
  const h = markH + pad * 2;
  const w = pad + m.w + gap + wm.w + pad;
  const base = sharp({ create: { width: w, height: h, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } });
  return base.composite([
    { input: m.buf, left: pad, top: pad },
    { input: wm.buf, left: pad + m.w + gap, top: Math.round((h - wm.h) / 2) },
  ]);
}
for (const tone of ['light', 'dark']) {
  await write(path.join(BRAND, `lockup-${tone}.png`), await buildLockup(tone, false));
  await write(path.join(BRAND, `lockup-tagline-${tone}.png`), await buildLockup(tone, true));
}

// Favicons: the mark on a transparent square.
async function squareIcon(size, padFrac, background) {
  const inner = Math.round(size * (1 - 2 * padFrac));
  const m = await resizeTo(mark, { width: inner, height: inner, fit: 'inside' });
  const bg = background ?? { r: 0, g: 0, b: 0, alpha: 0 };
  return sharp({ create: { width: size, height: size, channels: 4, background: bg } })
    .composite([{ input: m.buf, left: Math.round((size - m.w) / 2), top: Math.round((size - m.h) / 2) }]);
}
await write(path.join(PUB, 'favicon.png'), await squareIcon(256, 0.06));
await write(path.join(PUB, 'favicon-32.png'), await squareIcon(32, 0.02));
await write(path.join(PUB, 'apple-touch-icon.png'), await squareIcon(180, 0.14, { r: 246, g: 227, b: 194, alpha: 1 }));

// favicon.ico: PNG-embedded images, hand-assembled (6-byte header, 16-byte entries).
const icoSizes = [16, 32, 48];
const icoImages = [];
for (const s of icoSizes) icoImages.push({ size: s, buf: await png(await squareIcon(s, s <= 16 ? 0 : 0.02)).toBuffer() });
{
  const header = Buffer.alloc(6);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(icoImages.length, 4);
  const entries = Buffer.alloc(16 * icoImages.length);
  let offset = header.length + entries.length;
  icoImages.forEach((img, i) => {
    const o = i * 16;
    entries[o] = img.size; entries[o + 1] = img.size;
    entries.writeUInt16LE(1, o + 4); // colour planes
    entries.writeUInt16LE(32, o + 6); // bits per pixel
    entries.writeUInt32LE(img.buf.length, o + 8);
    entries.writeUInt32LE(offset, o + 12);
    offset += img.buf.length;
  });
  const ico = Buffer.concat([header, entries, ...icoImages.map((i) => i.buf)]);
  fs.writeFileSync(path.join(PUB, 'favicon.ico'), ico);
  console.log(`  public/favicon.ico  ${icoSizes.join('/')} (${ico.length} bytes)`);
}

// ---- OG image ------------------------------------------------------------------------------------
const config = fs.readFileSync(path.join(ROOT, 'src', 'config.ts'), 'utf8');
const kitchenName = /KITCHEN_NAME\s*=\s*'([^']*)'/.exec(config)?.[1] ?? '[Kitchen Name]';

async function buildOg() {
  const W = 1200; const H = 630;
  const font = loadPublicSans(600);
  const fontLight = loadPublicSans(500);

  const markH = 330;
  const m = await resizeTo(mark, { height: markH });
  const markX = 96; const markY = Math.round((H - markH) / 2);

  const colX = 552;
  const wm = await resizeTo(ink.dark.wordmark, { width: 300 });
  const wmY = 150;

  const line1 = `AUREXA × ${kitchenName.toUpperCase()}`;
  const line2 = 'CLOUD KITCHEN PROPOSAL';
  const colW = 1200 - colX - 72;
  // Largest size (up to 34 px) that keeps the longer line inside the column.
  const track = 0.16;
  let size = 34;
  while (measureText(font, line1, { size, tracking: track }) > colW && size > 20) size -= 0.5;
  const t1 = textPath(font, line1, { x: colX, y: 392, size, tracking: track });
  const t2 = textPath(fontLight, line2, { x: colX, y: 392 + size * 1.75, size: size * 0.86, tracking: 0.22 });

  // Faint plan grid, faded out from the mark.
  const grid = [];
  for (let x = 0; x <= W; x += 48) grid.push(`M${x} 0V${H}`);
  for (let y = 0; y <= H; y += 48) grid.push(`M0 ${y}H${W}`);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <radialGradient id="glow" cx="${markX + m.w / 2}" cy="${H / 2}" r="620" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="${COLORS.teal}" stop-opacity="0.55"/>
      <stop offset="0.45" stop-color="${COLORS.teal}" stop-opacity="0.16"/>
      <stop offset="1" stop-color="${COLORS.teal}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="warm" cx="1120" cy="610" r="420" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="${COLORS.orange}" stop-opacity="0.06"/>
      <stop offset="1" stop-color="${COLORS.orange}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="fade" cx="${markX + m.w / 2}" cy="${H / 2}" r="560" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#fff" stop-opacity="1"/>
      <stop offset="1" stop-color="#fff" stop-opacity="0"/>
    </radialGradient>
    <mask id="gridMask"><rect width="${W}" height="${H}" fill="url(#fade)"/></mask>
  </defs>
  <rect width="${W}" height="${H}" fill="${COLORS.stage}"/>
  <rect width="${W}" height="${H}" fill="url(#glow)"/>
  <rect width="${W}" height="${H}" fill="url(#warm)"/>
  <path d="${grid.join('')}" stroke="${COLORS.tealLight}" stroke-opacity="0.07" stroke-width="1" mask="url(#gridMask)"/>
  <rect x="${colX - 48}" y="168" width="1.5" height="294" fill="${COLORS.cream}" fill-opacity="0.2"/>
  <rect x="${colX}" y="318" width="64" height="3" fill="${COLORS.orange}"/>
  <path d="${t1.d}" fill="${COLORS.cream}"/>
  <path d="${t2.d}" fill="${COLORS.tealLight}"/>
</svg>`;

  return sharp(Buffer.from(svg)).composite([
    { input: m.buf, left: markX, top: markY },
    { input: wm.buf, left: colX, top: wmY },
  ]);
}
await write(path.join(PUB, 'og.png'), await buildOg());

console.log('done');
