// Receiving & Inspection and Goods Lift kinds: floor scale, pallet of crates, inspection table, bins, lift shaft.
import type { KindBuilder } from '../registry';
import { BRAND, BIN_COLORS } from '../../../lib/palette';
import { STEEL_DARK, bench, bin, crate } from '../../../lib/kit';
import { INK, PANEL, PANEL_LIGHT, pick, seeded } from './productionParts';

const AMBER = '#ffb35a';
const CRATE_TONES = ['#b9854a', '#a9753e', '#8f9a55', '#c47a35'] as const;
const PRODUCE = ['#5f9a4f', '#d98a2b', '#b53a3a'] as const;

/** Platform scale in a yellow frame, with a display post at the far end. Platform runs along local x. */
const floorScale: KindBuilder = (b, it) => {
  const { w, d } = it;
  const px = -w / 2 + 0.85;
  const post = w / 2 - 0.3;
  b.box({ m: 'matte', c: '#d9a81c', x: px, w: 1.7, h: 0.1, d });
  b.box({ m: 'steel', c: '#7d8a95', x: px, y: 0.1, w: 1.56, h: 0.14, d: d - 0.14 });
  b.box({ m: 'matte', c: INK, x: post, w: 0.4, h: 0.1, d: 0.4 });
  b.cyl({ m: 'steel', c: STEEL_DARK, r: 0.06, x: post, y: 0.1, h: 2.8 });
  b.box({ m: 'matte', c: INK, x: post, y: 2.85, z: 0.04, w: 0.64, h: 0.46, d: 0.14, rx: -15 });
  b.sign({ text: '0.0', x: post, y: 3.08, z: 0.125, w: 0.5, h: 0.3, rx: -15, fg: '#8cf0c8', bg: '#0d1e1f', emissive: true });
};

/** Half pallet carrying two layers of crates; the top layer is topped with produce. */
const palletCrates: KindBuilder = (b, it) => {
  const { w, d } = it;
  const rnd = seeded(it.id);
  for (const z of [-d / 2 + 0.11, 0, d / 2 - 0.11]) b.box({ m: 'matte', c: '#9c7142', z, w, h: 0.22, d: 0.22 });
  b.box({ m: 'matte', c: '#b88c55', y: 0.22, w, h: 0.08, d });
  const cw = (w - 0.1) / 2, cd = (d - 0.1) / 2;
  for (const layer of [0, 1]) for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const y = 0.3 + layer * 0.8;
    crate(b, { x: sx * (cw / 2 + 0.025), z: sz * (cd / 2 + 0.025), y, w: cw, d: cd, h: 0.8, c: pick(rnd, CRATE_TONES) });
    if (layer) b.box({ m: 'matte', c: pick(rnd, PRODUCE), x: sx * (cw / 2 + 0.025), z: sz * (cd / 2 + 0.025), y: y + 0.8, w: cw - 0.14, h: 0.1, d: cd - 0.14, shadow: false });
  }
};

/** Stainless table on the wall side, with a sample tray, clipboard and an articulated inspection lamp. */
const inspectTable: KindBuilder = (b, it) => {
  const { w, d } = it;
  bench(b, { w, d, h: 3, splash: true });
  b.box({ m: 'matte', c: '#e9e4d6', x: -0.55, z: 0.05, y: 3, w: 1.0, h: 0.025, d: 0.6, shadow: false });
  for (const [c, x] of [['#d9792b', -0.8], ['#5f9a4f', -0.55], ['#b53a3a', -0.3]] as const) {
    b.cyl({ m: 'matte', c, r: 0.13, h: 0.2, x, z: 0.05, y: 3.02 });
  }
  b.box({ m: 'matte', c: INK, x: 0.55, z: 0.08, y: 3, w: 0.5, h: 0.03, d: 0.62, shadow: false });
  b.box({ m: 'matte', c: '#f1ede4', x: 0.55, z: 0.08, y: 3.03, w: 0.42, h: 0.01, d: 0.52, shadow: false });

  const lx = w / 2 - 0.2, lz = -d / 2 + 0.25;
  b.cyl({ m: 'steel', c: INK, r: 0.16, x: lx, z: lz, y: 3, h: 0.06 });
  b.pipe({ m: 'steel', c: STEEL_DARK, a: [lx, 3.06, lz], b: [lx, 4.9, lz], r: 0.03 });
  b.pipe({ m: 'steel', c: STEEL_DARK, a: [lx, 4.9, lz], b: [0.1, 4.75, 0.05], r: 0.03 });
  b.cone({ m: 'matte', c: BRAND.teal, r: 0.3, h: 0.28, x: 0.1, z: 0.05, y: 4.47 });
  b.cyl({ m: 'emissive', c: '#fff0c4', r: 0.24, h: 0.03, x: 0.1, z: 0.05, y: 4.44 });
};

/** Colour-coded bin; props via the item: `color`, `label` (printed on the front). */
const wasteBin: KindBuilder = (b, it) => {
  const r = it.w / 2 - 0.05;
  const h = it.h ?? 2.4;
  bin(b, { c: it.color ?? BIN_COLORS.grey, r, h });
  if (it.label) b.sign({ text: it.label, y: h * 0.45, z: r + 0.02, w: r * 1.5, h: 0.2, fg: '#ffffff', tracking: 0.12 });
};

/** Goods-lift shaft along the north wall: steel cladding, sliding doors in a dark frame, indicator and call panel. */
const liftShaft: KindBuilder = (b, it) => {
  const { w, d } = it;
  const h = it.h ?? 9.4;
  const f = d / 2;
  const dw = 3.7, dh = 7;
  b.box({ m: 'gloss', c: PANEL, w, h, d });
  b.box({ m: 'matte', c: BRAND.teal, y: h, w: w + 0.04, h: 0.15, d: d + 0.04 });
  for (const y of [4.9, 9]) b.box({ m: 'matte', c: INK, y, w: w + 0.02, h: 0.04, d: d + 0.02, shadow: false });

  b.box({ m: 'matte', c: '#2f373c', z: f + 0.02, w: dw + 0.4, h: dh + 0.2, d: 0.05 });
  for (const s of [-1, 1]) {
    b.box({ m: 'gloss', c: PANEL_LIGHT, x: s * (dw / 4 + 0.01), y: 0.04, z: f + 0.06, w: dw / 2 - 0.03, h: dh - 0.04, d: 0.06 });
    b.box({ m: 'matte', c: INK, x: s * 0.07, y: 0.2, z: f + 0.095, w: 0.07, h: dh - 0.3, d: 0.03, shadow: false });
  }

  b.box({ m: 'matte', c: INK, y: 7.45, z: f + 0.045, w: 1.2, h: 0.55, d: 0.06 });
  b.sign({ text: 'G', y: 7.725, z: f + 0.08, w: 0.6, h: 0.4, fg: AMBER, bg: '#10171a', emissive: true });
  b.sign({ text: 'GOODS LIFT', y: 8.5, z: f + 0.03, w: 2.3, h: 0.4, fg: BRAND.cream, bg: BRAND.teal });

  const cx = dw / 2 + 0.5;
  b.box({ m: 'matte', c: '#3a4349', x: cx, y: 2.7, z: f + 0.03, w: 0.42, h: 1.1, d: 0.06 });
  for (const [y, up] of [[3.4, true], [2.95, false]] as const) {
    b.cyl({ m: 'matte', c: '#10171a', r: 0.13, h: 0.03, rx: 90, x: cx, y: y - 0.015, z: f + 0.075, shadow: false });
    b.cone({ m: 'emissive', c: up ? AMBER : BRAND.tealLight, r: 0.09, h: 0.17, rx: up ? 0 : 180, x: cx, y: y - 0.085, z: f + 0.1 });
  }
};

/** Yellow safety strip across the lift threshold (floor decal). */
const hazardStripe: KindBuilder = (b, it) => {
  const { w, d } = it;
  b.box({ m: 'matte', c: '#d9a81c', y: 0.03, w, h: 0.02, d, shadow: false });
  for (let x = -w / 2 + 0.25; x < w / 2 - 0.1; x += 0.5) {
    b.box({ m: 'matte', c: INK, x, y: 0.05, w: 0.14, h: 0.01, d: d * 1.1, ry: 45, shadow: false });
  }
};

/** Two stacked delivery crates and a third set a little askew. */
const crateStack: KindBuilder = (b, it) => {
  const w = it.w - 0.05, d = it.d - 0.05;
  crate(b, { w, d, h: 0.8, c: '#b9854a' });
  crate(b, { y: 0.8, w, d, h: 0.8, c: '#8f9a55' });
  crate(b, { y: 1.6, w: w - 0.1, d: d - 0.1, h: 0.8, c: '#a9753e', ry: 6 });
};

export const RECEIVING_KINDS: Record<string, KindBuilder> = {
  'production.floorScale': floorScale,
  'production.palletCrates': palletCrates,
  'production.inspectTable': inspectTable,
  'production.bin': wasteBin,
  'production.liftShaft': liftShaft,
  'production.hazardStripe': hazardStripe,
  'production.crateStack': crateStack,
};
