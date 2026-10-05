// Kind builders for Waste Management: bin row, dirty-utensil trolley, storage cage, wash-down point,
// sorting table and floor drain.
import { bench, crate } from '../../../lib/kit';
import { BIN_COLORS, BRAND } from '../../../lib/palette';
import type { KindBuilder } from '../registry';
import { INK, tint } from './kindKit';
import {
  castor, CERAMIC_SOILED, floorPlate, stack, STEEL, STEEL_DARK, STEEL_MID, TROLLEY_TOPS, trolleyFrame, trays,
} from './supportKit';

const BIN_ORDER = ['yellow', 'green', 'teal', 'blue', 'grey', 'red'] as const;

/** Six wheelie bins against the east wall (local back = wall), each with a numbered colour tag on a rail above. */
const wasteBins: KindBuilder = (b, it) => {
  const pitch = it.w / BIN_ORDER.length;
  const wall = -it.d / 2;
  b.box({ m: 'matte', c: INK, y: 2.95, z: wall + 0.03, w: it.w - 0.1, h: 0.5, d: 0.05, shadow: false });
  BIN_ORDER.forEach((name, i) => {
    const x = -it.w / 2 + pitch * (i + 0.5);
    const c = BIN_COLORS[name];
    const bw = pitch - 0.14;
    b.box({ m: 'gloss', c, x, y: 0.2, z: wall + 0.55, w: bw, h: 2.15, d: 1.0 });
    b.box({ m: 'gloss', c: tint(c, 0.18), x, y: 2.35, z: wall + 0.55, w: bw + 0.06, h: 0.12, d: 1.08, shadow: false });
    b.box({ m: 'gloss', c: tint(c, -0.14), x, y: 0.7, z: wall + 1.06, w: bw - 0.3, h: 1.1, d: 0.03, shadow: false });
    b.box({ m: 'matte', c: INK, x, y: 2.18, z: wall + 0.07, w: bw - 0.25, h: 0.07, d: 0.09, shadow: false });
    for (const sx of [-1, 1]) {
      b.cyl({ m: 'matte', c: INK, x: x + sx * (bw / 2 - 0.08), y: 0.12, z: wall + 0.2, r: 0.17, h: 0.1, rz: 90, shadow: false });
    }
    b.box({ m: 'matte', c, x, y: 3.0, z: wall + 0.07, w: 0.8, h: 0.34, d: 0.04, shadow: false });
    b.sign({
      text: String(i + 1), x, y: 3.17, z: wall + 0.092, w: 0.34, h: 0.28,
      fg: name === 'yellow' ? INK : '#ffffff',
    });
  });
};

/** Three-tier steel trolley loaded with dirty pots, trays and plates; the orange grip is the Dirty-route colour. */
const wasteTrolley: KindBuilder = (b, it) => {
  trolleyFrame(b, { w: it.w, d: it.d, grip: BRAND.orange });
  const [low, mid, high] = TROLLEY_TOPS;
  // bottom: bus tub and trays
  b.box({ m: 'matte', c: '#77838d', x: -0.55, y: low, w: 1.0, h: 0.5, d: 0.95 });
  trays(b, { x: 0.6, z: 0, y: low, n: 3, w: 0.95, d: 0.8 });
  // middle: three pots with lids and handles
  [0.5, 0.42, 0.5].forEach((ph, i) => {
    const px = (i - 1) * 0.78;
    b.cyl({ m: 'steel', c: '#7d8890', x: px, y: mid, r: 0.34, h: ph });
    b.cyl({ m: 'steel', c: STEEL, x: px, y: mid + ph, r: 0.36, h: 0.04, shadow: false });
    for (const s of [-1, 1]) b.box({ m: 'matte', c: INK, x: px + s * 0.4, y: mid + ph - 0.12, w: 0.14, h: 0.05, d: 0.06, shadow: false });
  });
  // top: tray stack and plates
  trays(b, { x: -0.45, z: 0, y: high, n: 4, w: 1.2, d: 0.9, c: STEEL_MID });
  stack(b, { x: 0.65, z: -0.2, y: high, n: 9, r: 0.38, c: CERAMIC_SOILED });
  stack(b, { x: 0.65, z: 0.35, y: high, n: 5, r: 0.3, c: CERAMIC_SOILED });
};

/** Steel mesh storage cage on a castor base, loaded with crates and sacks. Front (+z) is the door. */
const wasteCage: KindBuilder = (b, it) => {
  const h = it.h ?? 5, hx = it.w / 2, hz = it.d / 2;
  b.box({ m: 'steel', c: STEEL_DARK, y: 0.16, w: it.w - 0.1, h: 0.2, d: it.d - 0.1 });
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      castor(b, sx * (hx - 0.25), sz * (hz - 0.25));
      b.box({ m: 'steel', c: STEEL_DARK, x: sx * (hx - 0.07), z: sz * (hz - 0.07), y: 0.36, w: 0.1, h: h - 0.36, d: 0.1 });
    }
  }
  for (const y of [h - 0.08, h * 0.5]) {
    for (const sz of [-1, 1]) b.box({ m: 'steel', c: STEEL_DARK, y, z: sz * (hz - 0.07), w: it.w - 0.1, h: 0.07, d: 0.07, shadow: false });
    for (const sx of [-1, 1]) b.box({ m: 'steel', c: STEEL_DARK, x: sx * (hx - 0.07), y, w: 0.07, h: 0.07, d: it.d - 0.1, shadow: false });
  }
  const nx = Math.round(it.w / 0.6), nz = Math.round(it.d / 0.55);
  for (let i = 1; i < nx; i++) {
    for (const sz of [-1, 1]) b.box({ m: 'gloss', c: '#8f9ba5', x: -hx + (i * it.w) / nx, z: sz * (hz - 0.07), y: 0.36, w: 0.04, h: h - 0.44, d: 0.04, shadow: false });
  }
  for (let i = 1; i < nz; i++) {
    for (const sx of [-1, 1]) b.box({ m: 'gloss', c: '#8f9ba5', x: sx * (hx - 0.07), z: -hz + (i * it.d) / nz, y: 0.36, w: 0.04, h: h - 0.44, d: 0.04, shadow: false });
  }
  b.box({ m: 'matte', c: BRAND.orange, x: 0.9, y: h * 0.5 - 0.1, z: hz - 0.02, w: 0.16, h: 0.26, d: 0.06, shadow: false });

  [0, 0.7, 1.4].forEach((y, i) => crate(b, { x: -1.05, z: -0.1, y: 0.36 + y, w: 1.5, d: 1.0, h: 0.7, c: i === 1 ? '#cba269' : '#b9854a' }));
  [0, 0.55, 1.1].forEach((y, i) => crate(b, { x: 1.2, z: 0, y: 0.36 + y, w: 1.15, d: 0.95, h: 0.55, c: i === 1 ? STEEL_DARK : '#77838d' }));
  for (const [x, z] of [[0.05, -0.35], [0.1, 0.45]]) {
    b.sph({ m: 'matte', c: '#cbb68c', x, y: 0.66, z, r: 0.42, sy: 0.72 });
  }
};

/** Wall-mounted wash-down point: steel splash panel, hose reel, spray gun and a valve manifold. */
const washDown: KindBuilder = (b, it) => {
  const wall = -it.d / 2;
  b.box({ m: 'gloss', c: '#c9d1d7', y: 1.7, z: wall + 0.03, w: it.w, h: 3.3, d: 0.06 });
  const rx = -0.7, ry = 3.55, rz = wall + 0.34;
  b.box({ m: 'steel', c: STEEL_DARK, x: rx, y: ry - 0.06, z: wall + 0.13, w: 0.14, h: 0.12, d: 0.22 });
  b.cyl({ m: 'matte', c: INK, x: rx, y: ry - 0.13, z: rz, r: 0.5, h: 0.26, rx: 90 });
  for (const s of [-1, 1]) b.cyl({ m: 'matte', c: BRAND.teal, x: rx, y: ry - 0.02, z: rz + s * 0.15, r: 0.62, h: 0.04, rx: 90 });
  b.pipe({ m: 'matte', c: INK, a: [rx + 0.4, ry - 0.3, rz + 0.1], b: [0.55, 2.75, wall + 0.28], r: 0.045 });
  b.box({ m: 'matte', c: BRAND.orange, x: 0.55, y: 2.3, z: wall + 0.28, w: 0.09, h: 0.45, d: 0.09, shadow: false });
  b.pipe({ m: 'brass', a: [0.2, 1.6, wall + 0.1], b: [1.3, 1.6, wall + 0.1], r: 0.05 });
  for (const x of [0.5, 0.9, 1.25]) {
    b.cyl({ m: 'matte', c: '#c93a32', x, y: 1.6 - 0.02, z: wall + 0.2, r: 0.1, h: 0.05, rx: 90, shadow: false });
  }
};

/** Stainless sorting table: three trays in the stream colours and a scrap hole. */
const sortTable: KindBuilder = (b, it) => {
  bench(b, { w: it.w, d: it.d, h: 3, splash: true });
  [BIN_COLORS.green, BIN_COLORS.blue, BIN_COLORS.grey].forEach((c, i) => {
    b.box({ m: 'gloss', c, x: -1.2 + i * 1.05, y: 3.0, z: 0.1, w: 0.9, h: 0.14, d: 1.1, shadow: false });
  });
  b.box({ m: 'matte', c: '#1d2326', x: 1.5, y: 3.0, z: 0.1, w: 0.7, h: 0.02, d: 0.7, shadow: false });
  b.box({ m: 'matte', c: '#77838d', x: -1.0, y: 0.67, w: 0.9, h: 0.45, d: 0.9 });
  b.box({ m: 'matte', c: '#77838d', x: 0.7, y: 0.67, w: 0.9, h: 0.45, d: 0.9 });
};

/** Slotted floor drain / channel (decal). */
const drain: KindBuilder = (b, it) => {
  floorPlate(b, { w: it.w, d: it.d, c: '#8a96a0', y: 0.03, h: 0.02 });
  floorPlate(b, { w: it.w - 0.12, d: it.d - 0.12, c: '#2e373c', y: 0.045, h: 0.01 });
  const alongX = it.w >= it.d, len = alongX ? it.w : it.d;
  const n = Math.max(2, Math.round(len / 0.3));
  for (let i = 0; i < n; i++) {
    const t = -len / 2 + (len * (i + 0.5)) / n;
    floorPlate(b, alongX
      ? { x: t, w: 0.07, d: it.d - 0.14, c: '#8a96a0', y: 0.055, h: 0.02 }
      : { z: t, w: it.w - 0.14, d: 0.07, c: '#8a96a0', y: 0.055, h: 0.02 });
  }
};

export const wasteKinds: Record<string, KindBuilder> = {
  'support.wasteBins': wasteBins,
  'support.wasteTrolley': wasteTrolley,
  'support.wasteCage': wasteCage,
  'support.washDown': washDown,
  'support.sortTable': sortTable,
  'support.drain': drain,
};
