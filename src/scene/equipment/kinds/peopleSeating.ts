// Seating and small furniture used by more than one people-space (garden, creator corner, rider lounge).
import { BRAND } from '../../../lib/palette';
import { STEEL_DARK, plant, stool } from '../../../lib/kit';
import type { KindBuilder } from '../registry';
import { num } from './peopleShared';

const BENCH_WOOD = '#7a5233';
const BENCH_LEG = '#6d7882';

/**
 * Timber slat bench with steel legs. Front faces +z, the backrest (if any) stands at the -z edge.
 * w = length, d = depth. props: back (default true), cushions (teal + orange seat cushions).
 */
const slatBench: KindBuilder = (b, it) => {
  const { w, d } = it;
  const wood = it.color ?? BENCH_WOOD;
  const back = it.props?.back !== false;
  const seatH = 1.5;
  const backH = 2.9;
  const backZ = -d / 2 + 0.06;
  const frontZ = d / 2 - 0.12;

  const seatD = back ? d - 0.2 : d;
  const n = 4;
  const gap = 0.05;
  const slatD = (seatD - gap * (n - 1)) / n;
  for (let i = 0; i < n; i++) {
    b.box({ c: wood, y: seatH - 0.1, z: d / 2 - seatD + slatD / 2 + i * (slatD + gap), w: w - 0.04, h: 0.1, d: slatD });
  }

  const lx = w / 2 - 0.12;
  for (const x of w > 2.6 ? [-lx, 0, lx] : [-lx, lx]) {
    b.box({ m: 'steel', c: BENCH_LEG, x, z: frontZ, w: 0.08, h: seatH - 0.1, d: 0.08 });
    b.box({ m: 'steel', c: BENCH_LEG, x, z: backZ, w: 0.08, h: back ? backH : seatH - 0.1, d: 0.08 });
    b.box({ m: 'steel', c: BENCH_LEG, x, y: seatH - 0.2, z: (frontZ + backZ) / 2, w: 0.06, h: 0.08, d: frontZ - backZ });
  }
  if (back) {
    for (const y of [1.9, 2.25, 2.6]) b.box({ c: wood, y, z: backZ + 0.065, w: w - 0.04, h: 0.24, d: 0.05 });
  }
  if (it.props?.cushions) {
    b.box({ c: BRAND.teal, x: -w * 0.24, y: seatH, z: 0.08, w: 0.95, h: 0.16, d: 0.8, ry: 7 });
    b.box({ c: BRAND.orange, x: w * 0.24, y: seatH, z: 0.1, w: 0.95, h: 0.16, d: 0.8, ry: -9 });
  }
};

/** Tall bar-height stool (kit stool, seat colour from item.color). */
const seatStool: KindBuilder = (b, it) => {
  stool(b, { h: it.h ?? 2.1, c: it.color });
};

/** Small round side table with a mug and a tiny plant. */
const lowTable: KindBuilder = (b, it) => {
  const r = it.w / 2;
  const h = it.h ?? 1.5;
  b.cyl({ m: 'gloss', c: BRAND.cream, r, y: h - 0.1, h: 0.1 });
  b.cyl({ m: 'steel', c: STEEL_DARK, r: 0.07, h: h - 0.1 });
  b.cyl({ m: 'steel', c: STEEL_DARK, r: r * 0.62, h: 0.06 });
  b.cyl({ m: 'gloss', c: BRAND.orange, r: 0.1, h: 0.2, y: h, x: r * 0.35, z: r * 0.2 });
  b.cyl({ m: 'matte', c: BRAND.teal, r: 0.13, h: 0.2, y: h, x: -r * 0.3, z: -r * 0.1 });
  b.sph({ m: 'matte', c: '#5f8f4f', r: 0.17, x: -r * 0.3, y: h + 0.3, z: -r * 0.1, sy: 0.8 });
};

/** Potted plant (kit plant). props.s = scale; item.color = pot colour. */
const potPlant: KindBuilder = (b, it) => {
  plant(b, { s: num(it, 's', 1), pot: it.color });
};

export const SEATING_KINDS: Record<string, KindBuilder> = {
  'people.slatBench': slatBench,
  'people.stool': seatStool,
  'people.lowTable': lowTable,
  'people.potPlant': potPlant,
};
