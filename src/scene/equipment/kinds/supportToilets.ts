// Kind builders for the Male/Female Toilets: cubicle bank, vanity with basins and mirrors, hand dryer.
import { BRAND } from '../../../lib/palette';
import type { KindBuilder } from '../registry';
import { CERAMIC, INK, STEEL, STEEL_DARK } from './supportKit';

const num = (v: unknown, d = 0) => (typeof v === 'number' ? v : d);
const PANEL = '#dfe3e2';

/**
 * A row of n cubicles sharing partitions; the first `split` are male (teal doors), the rest female (orange).
 * Local front (+z) is the door side, local back (-z) the wall.
 */
const toiletBank: KindBuilder = (b, it) => {
  const n = num(it.props?.n, 4), split = num(it.props?.split, 2);
  const p = it.w / n, h = it.h ?? 6.2, f = it.d / 2;
  for (let i = 0; i <= n; i++) {
    const nudge = i === 0 ? 0.03 : i === n ? -0.03 : 0;
    b.box({ m: 'matte', c: PANEL, x: -it.w / 2 + i * p + nudge, y: 0.7, z: -0.04, w: 0.05, h: h - 0.7, d: it.d - 0.08 });
  }
  b.box({ m: 'steel', c: STEEL_DARK, y: h - 0.08, z: f - 0.06, w: it.w, h: 0.08, d: 0.08 });
  for (let i = 0; i < n; i++) {
    const x = -it.w / 2 + p * (i + 0.5);
    const male = i < split;
    const c = male ? BRAND.teal : BRAND.orange;
    b.box({ m: 'matte', c, x, y: 0.7, z: f - 0.04, w: p - 0.14, h: 5.1, d: 0.05 });
    b.box({ m: 'steel', c: STEEL, x: x + p / 2 - 0.2, y: 3.0, z: f, w: 0.05, h: 0.22, d: 0.05, shadow: false });
    b.sign({ text: male ? 'M' : 'F', x, y: 4.75, z: f - 0.003, w: 0.5, h: 0.5, fg: c, bg: BRAND.cream });
    // close-coupled WC against the back wall
    b.box({ m: 'gloss', c: CERAMIC, x, z: -f + 0.78, w: 0.55, h: 0.85, d: 0.95 });
    b.box({ m: 'gloss', c: '#e4ded0', x, y: 0.85, z: -f + 0.78, w: 0.5, h: 0.05, d: 0.8, shadow: false });
    b.box({ m: 'gloss', c: CERAMIC, x, y: 0.85, z: -f + 0.25, w: 0.5, h: 0.95, d: 0.3 });
  }
  // MALE / FEMALE headers standing on the partitions
  const headers: [from: number, to: number, c: string, text: string][] = [
    [0, split, BRAND.teal, 'MALE'], [split, n, BRAND.orange, 'FEMALE'],
  ];
  for (const [from, to, c, text] of headers) {
    const x = -it.w / 2 + (p * (from + to)) / 2;
    const w = p * (to - from) - 0.2;
    b.box({ m: 'matte', c, x, y: h, z: f - 0.25, w, h: 0.46, d: 0.06 });
    b.sign({ text, x, y: h + 0.23, z: f - 0.25 + 0.034, w: w - 0.2, h: 0.3, fg: '#ffffff' });
  }
};

/** Vanity unit with two basins, gooseneck taps, soap dispenser and a mirror panel per basin. Local back (-z) = wall. */
const vanity: KindBuilder = (b, it) => {
  const wall = -it.d / 2;
  b.box({ m: 'matte', c: INK, w: it.w - 0.2, h: 0.15, d: it.d - 0.2, shadow: false });
  b.box({ m: 'matte', c: BRAND.teal, y: 0.15, w: it.w - 0.1, h: 2.6, d: it.d - 0.1 });
  b.box({ m: 'gloss', c: '#efe9dc', y: 2.75, w: it.w, h: 0.12, d: it.d });
  for (const x of [-0.5, 0.5]) {
    b.cyl({ m: 'gloss', c: CERAMIC, x, y: 2.87, z: 0.1, r: 0.38, h: 0.1 });
    b.cyl({ m: 'gloss', c: '#c9d1d4', x, y: 2.95, z: 0.1, r: 0.28, h: 0.02, shadow: false });
    b.pipe({ m: 'steel', c: STEEL, a: [x, 2.87, wall + 0.2], b: [x, 3.35, wall + 0.2], r: 0.035 });
    b.pipe({ m: 'steel', c: STEEL, a: [x, 3.35, wall + 0.2], b: [x, 3.35, wall + 0.45], r: 0.035 });
    b.pipe({ m: 'steel', c: STEEL, a: [x, 3.35, wall + 0.45], b: [x, 3.2, wall + 0.45], r: 0.035 });
    b.box({ m: 'gloss', c: '#c4dde0', x, y: 3.1, z: wall + 0.025, w: 0.85, h: 1.4, d: 0.04, shadow: false });
  }
  b.box({ m: 'matte', c: BRAND.cream, y: 3.0, z: wall + 0.07, w: 0.1, h: 0.22, d: 0.1, shadow: false });
};

/** Wall-mounted hand dryer (back against the wall at local -z). */
const dryer: KindBuilder = (b, it) => {
  const wall = -it.d / 2;
  b.box({ m: 'gloss', c: '#eef1f2', y: 2.75, z: wall + 0.14, w: 0.55, h: 0.7, d: 0.28 });
  b.cyl({ m: 'steel', c: STEEL, y: 2.62, z: wall + 0.2, r: 0.08, h: 0.14, shadow: false });
  b.box({ m: 'emissive', c: '#5fb8ff', y: 3.3, z: wall + 0.285, w: 0.06, h: 0.06, d: 0.02 });
};

export const toiletKinds: Record<string, KindBuilder> = {
  'support.toiletBank': toiletBank,
  'support.vanity': vanity,
  'support.dryer': dryer,
};
