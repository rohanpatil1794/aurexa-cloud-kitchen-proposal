// Packing & QC kinds: 2 x 2 ft table modules, the QC lamp, packaging shelving, wall shelves and an order trolley.
import type { PrimBuilder } from '../../../lib/prims';
import type { KindBuilder } from '../registry';
import { BRAND } from '../../../lib/palette';
import { CHARCOAL, STEEL, STEEL_DARK } from '../../../lib/kit';
import { pick, rng } from '../rng';
import { INK } from './kindKit';
import { KRAFT, PANEL_LIGHT, bag, rodX } from './productionParts';

const WHITE_BOX = '#d9d2c0';
const STOCK = [...KRAFT, WHITE_BOX, BRAND.teal] as const;

/** Strapped bundle of flat paper bags: two kraft slabs and a teal strap. */
function bundle(b: PrimBuilder, o: { x: number; y: number; w: number; d: number }) {
  b.box({ m: 'matte', c: KRAFT[1], x: o.x, y: o.y, w: o.w, h: 0.3, d: o.d });
  b.box({ m: 'matte', c: KRAFT[0], x: o.x, y: o.y + 0.3, w: o.w - 0.04, h: 0.26, d: o.d - 0.04, ry: 4 });
  b.box({ m: 'matte', c: BRAND.teal, x: o.x, y: o.y, w: 0.1, h: 0.58, d: o.d + 0.02, shadow: false });
}

/**
 * One 2 x 2 module of the central packing table. props.tool: 'sealer' | 'scale' | 'printer' | 'boxes' picks what
 * sits on top; props.out lists the table-outer sides (N, S, E, W) that get a teal apron.
 */
const packModule: KindBuilder = (b, it) => {
  const { w, d } = it;
  const h = it.h ?? 3;
  const out = String(it.props?.out ?? '');
  b.box({ m: 'gloss', c: PANEL_LIGHT, y: h - 0.12, w: w - 0.05, h: 0.12, d: d - 0.05 });
  const lx = w / 2 - 0.1, lz = d / 2 - 0.1;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.box({ m: 'steel', c: STEEL_DARK, x: sx * lx, z: sz * lz, w: 0.1, h: h - 0.12, d: 0.1 });
  b.box({ m: 'steel', c: STEEL_DARK, y: 0.6, w: w - 0.2, h: 0.07, d: d - 0.2 });
  const apron = h - 0.42;
  if (out.includes('N')) b.box({ m: 'matte', c: BRAND.teal, y: apron, z: -d / 2 + 0.04, w, h: 0.3, d: 0.05 });
  if (out.includes('S')) b.box({ m: 'matte', c: BRAND.teal, y: apron, z: d / 2 - 0.04, w, h: 0.3, d: 0.05 });
  if (out.includes('W')) b.box({ m: 'matte', c: BRAND.teal, y: apron, x: -w / 2 + 0.04, w: 0.05, h: 0.3, d });
  if (out.includes('E')) b.box({ m: 'matte', c: BRAND.teal, y: apron, x: w / 2 - 0.04, w: 0.05, h: 0.3, d });

  switch (it.props?.tool) {
    case 'sealer':
      b.box({ m: 'matte', c: CHARCOAL, x: -0.2, z: 0.2, y: h, w: 0.9, h: 0.2, d: 0.5 });
      b.box({ m: 'matte', c: BRAND.orange, x: -0.2, z: 0.2, y: h + 0.22, w: 0.9, h: 0.1, d: 0.22, rx: -6 });
      b.box({ m: 'emissive', c: '#6ee0a0', x: 0.15, z: 0.47, y: h + 0.14, w: 0.1, h: 0.04, d: 0.01 });
      bag(b, { x: 0.6, y: h, z: -0.45, c: KRAFT[1], tape: true, ry: 10 });
      bag(b, { x: 0.65, y: h, z: 0.3, c: KRAFT[0], ry: -8 });
      break;
    case 'scale':
      b.box({ m: 'steel', c: '#7d8a95', x: -0.3, z: 0.25, y: h, w: 0.9, h: 0.1, d: 0.75 });
      b.box({ m: 'matte', c: INK, x: 0.5, z: -0.3, y: h, w: 0.34, h: 0.5, d: 0.14 });
      b.box({ m: 'emissive', c: '#8cf0c8', x: 0.5, z: -0.22, y: h + 0.3, w: 0.24, h: 0.12, d: 0.01 });
      bag(b, { x: -0.3, y: h + 0.1, z: 0.25, w: 0.5, h: 0.6, d: 0.4, c: KRAFT[2], tape: true });
      break;
    case 'printer':
      b.box({ m: 'matte', c: INK, x: -0.4, z: 0.1, y: h, w: 0.6, h: 0.3, d: 0.5 });
      b.cyl({ m: 'matte', c: '#f1ede4', r: 0.2, h: 0.12, rx: 90, x: -0.4, y: h + 0.4, z: -0.15, shadow: false });
      b.box({ m: 'matte', c: '#f1ede4', x: -0.4, z: 0.5, y: h, w: 0.3, h: 0.01, d: 0.35, shadow: false });
      b.box({ m: 'matte', c: WHITE_BOX, x: 0.6, z: -0.3, y: h, w: 0.8, h: 0.18, d: 0.65 });
      b.box({ m: 'matte', c: KRAFT[1], x: 0.6, z: -0.3, y: h + 0.18, w: 0.7, h: 0.18, d: 0.55, ry: 6 });
      break;
    case 'boxes':
      b.box({ m: 'matte', c: WHITE_BOX, x: -0.3, z: -0.2, y: h, w: 0.9, h: 0.18, d: 0.7 });
      b.box({ m: 'matte', c: WHITE_BOX, x: -0.3, z: -0.2, y: h + 0.18, w: 0.9, h: 0.18, d: 0.7, ry: 5 });
      b.box({ m: 'matte', c: KRAFT[1], x: 0.5, z: 0.35, y: h, w: 0.8, h: 0.3, d: 0.7, ry: -6 });
      b.box({ m: 'matte', c: BRAND.teal, x: 0.5, z: 0.35, y: h + 0.3, w: 0.82, h: 0.04, d: 0.12, ry: -6, shadow: false });
      bag(b, { x: -0.3, y: h + 0.36, z: -0.2, w: 0.5, h: 0.5, d: 0.35, c: KRAFT[0], tape: true });
      break;
  }
};

/** Articulated QC lamp clamped on the west edge of the table, its teal shade hanging over the middle. */
const qcLamp: KindBuilder = (b, it) => {
  const { w } = it;
  const bx = -w / 2 + 0.3, z = -0.1;
  b.cyl({ m: 'steel', c: INK, r: 0.25, x: bx, z, y: 3, h: 0.1 });
  b.pipe({ m: 'steel', c: STEEL_DARK, a: [bx, 3.1, z], b: [bx, 5.9, z], r: 0.05 });
  b.sph({ m: 'steel', c: INK, r: 0.1, x: bx, y: 5.9, z });
  b.pipe({ m: 'steel', c: STEEL_DARK, a: [bx, 5.9, z], b: [-0.9, 6.5, z], r: 0.045 });
  b.sph({ m: 'steel', c: INK, r: 0.09, x: -0.9, y: 6.5, z });
  b.pipe({ m: 'steel', c: STEEL_DARK, a: [-0.9, 6.5, z], b: [0, 5.75, z], r: 0.045 });
  b.cone({ m: 'matte', c: BRAND.teal, r: 0.6, h: 0.5, x: 0, z, y: 5.25 });
  b.cyl({ m: 'emissive', c: '#fff2cc', r: 0.48, h: 0.04, x: 0, z, y: 5.21 });
};

/**
 * East-wall packaging shelving: bays 3.4 ft wide, five levels of cartons, bag bundles and bag rolls.
 * Footprint w runs along the wall; front is local +z.
 */
const packShelf: KindBuilder = (b, it) => {
  const { w, d } = it;
  const h = it.h ?? 6.2;
  const bays = Math.max(1, Math.round(w / 3.4));
  const bw = w / bays;
  const rnd = rng(it.id);
  for (let i = 0; i <= bays; i++) for (const sz of [-1, 1]) {
    b.box({ m: 'steel', c: STEEL_DARK, x: -w / 2 + 0.06 + (i * (w - 0.12)) / bays, z: sz * (d / 2 - 0.06), w: 0.12, h, d: 0.12 });
  }
  for (let l = 0; l < 5; l++) {
    const y = 0.3 + l * 1.25;
    b.box({ m: 'steel', c: STEEL, y, w: w - 0.06, h: 0.07, d: d - 0.06 });
    for (let i = 0; i < bays; i++) {
      let x = -w / 2 + i * bw + 0.25;
      const end = -w / 2 + (i + 1) * bw - 0.25;
      while (x < end - 0.5) {
        const t = rnd();
        if (t < 0.55) {
          const bwid = 0.6 + rnd() * 0.4, bh = 0.5 + rnd() * 0.45;
          b.box({ m: 'matte', c: pick(rnd, STOCK), x: x + bwid / 2, y: y + 0.07, w: bwid, h: bh, d: 0.95 + rnd() * 0.15 });
          x += bwid + 0.12;
        } else {
          bundle(b, { x: x + 0.45, y: y + 0.07, w: 0.9, d: 0.85 });
          x += 1.02;
        }
      }
    }
  }
};

/** Wall-mounted double shelf (above bench height) holding rolls and cartons. Front is local +z. */
const packWallShelf: KindBuilder = (b, it) => {
  const { w, d } = it;
  const rnd = rng(it.id);
  for (const y of [4.3, 5.4]) {
    b.box({ m: 'steel', c: STEEL, y, w, h: 0.07, d });
    for (let j = 0; j < 4; j++) b.box({ m: 'steel', c: STEEL_DARK, x: -w / 2 + 0.3 + (j * (w - 0.6)) / 3, y: y - 0.4, z: -d / 2 + 0.04, w: 0.06, h: 0.4, d: 0.5, shadow: false });
    let x = -w / 2 + 0.2;
    while (x < w / 2 - 0.9) {
      if (rnd() < 0.6) {
        const bwid = 0.5 + rnd() * 0.5, bh = 0.4 + rnd() * 0.4;
        b.box({ m: 'matte', c: pick(rnd, STOCK), x: x + bwid / 2, y: y + 0.07, w: bwid, h: bh, d: 0.5 });
        x += bwid + 0.15;
      } else {
        bundle(b, { x: x + 0.35, y: y + 0.07, w: 0.7, d: 0.5 });
        x += 0.85;
      }
    }
  }
};

/** Two-tier order trolley with a push rail at the rear, loaded with bagged orders. */
const orderTrolley: KindBuilder = (b, it) => {
  const { w, d } = it;
  const px = w / 2 - 0.05;
  for (const sx of [-1, 1]) {
    b.box({ m: 'steel', c: STEEL_DARK, x: sx * px, z: d / 2 - 0.05, y: 0.3, w: 0.08, h: 1.9, d: 0.08 });
    b.box({ m: 'steel', c: STEEL_DARK, x: sx * px, z: -d / 2 + 0.05, y: 0.3, w: 0.08, h: 3.1, d: 0.08 });
    rodX(b, { m: 'matte', c: INK, r: 0.2, len: 0.12, x: sx * (w / 2 - 0.15), y: 0.2, z: d / 2 - 0.3 });
    rodX(b, { m: 'matte', c: INK, r: 0.2, len: 0.12, x: sx * (w / 2 - 0.15), y: 0.2, z: -d / 2 + 0.3 });
  }
  b.box({ m: 'steel', c: STEEL_DARK, y: 3.3, z: -d / 2 + 0.05, w, h: 0.07, d: 0.07 });
  for (const y of [0.5, 1.9]) b.box({ m: 'steel', c: STEEL, y, w: w - 0.1, h: 0.06, d: d - 0.1 });
  [-0.45, 0.45].forEach((x) => bag(b, { x, y: 0.56, z: 0.5, c: KRAFT[0], tape: x > 0 }));
  [-0.5, 0.05, 0.55].forEach((x, i) => bag(b, { x, y: 1.96, z: 0.45, c: KRAFT[i % 3], tape: i === 1, ry: i * 7 - 7 }));
};

export const PACK_KINDS: Record<string, KindBuilder> = {
  'production.packModule': packModule,
  'production.qcLamp': qcLamp,
  'production.packShelf': packShelf,
  'production.packWallShelf': packWallShelf,
  'production.orderTrolley': orderTrolley,
};
