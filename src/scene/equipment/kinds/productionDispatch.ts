// Dispatch kinds: hand-over counter, bagged-order racks, order-board screen, rider bench and a floor decal.
import type { KindBuilder } from '../registry';
import { BRAND, SCENE } from '../../../lib/palette';
import { CHARCOAL, STEEL, STEEL_DARK } from '../../../lib/kit';
import { INK, KRAFT, TEAL_DEEP, WOOD, bag, pick, seeded } from './productionParts';

/** Stainless hand-over counter with a teal front panel facing the riders; staged bags, a POS screen and a bell on top. */
const handoverCounter: KindBuilder = (b, it) => {
  const { w, d } = it;
  const h = it.h ?? 3.4;
  const body = d - 0.3;
  const face = -0.05 + body / 2; // front plane of the cabinet
  b.box({ m: 'steel', c: CHARCOAL, z: -0.05, w: w - 0.3, h: 0.25, d: body - 0.2 });
  b.box({ m: 'matte', c: '#3d474d', z: -0.05, y: 0.25, w: w - 0.1, h: h - 0.37, d: body });
  b.box({ m: 'matte', c: BRAND.teal, z: face + 0.03, y: 0.28, w: w - 0.1, h: h - 0.55, d: 0.06 });
  for (let k = 1; k < 5; k++) b.box({ m: 'matte', c: TEAL_DEEP, x: -w / 2 + (k * w) / 5, z: face + 0.065, y: 0.28, w: 0.03, h: h - 0.55, d: 0.01, shadow: false });
  b.box({ m: 'matte', c: BRAND.orange, z: face + 0.04, y: h - 0.32, w: w - 0.1, h: 0.1, d: 0.08, shadow: false });
  b.box({ m: 'steel', c: STEEL, y: h - 0.12, w, h: 0.12, d });
  b.sign({ text: 'ORDERS OUT', y: 1.5, z: face + 0.07, w: 3.2, h: 0.5, fg: BRAND.cream, weight: 800 });

  // staged orders, a POS terminal and a service bell
  [-3.2, -2.55, -1.9, -1.25].forEach((x, i) => bag(b, { x, y: h, z: -0.1, c: KRAFT[i % 3], tape: i % 2 === 0, ry: i * 5 - 6 }));
  [2.4, 3.0].forEach((x, i) => bag(b, { x, y: h, z: -0.05, c: KRAFT[(i + 1) % 3], tape: i === 0 }));
  b.box({ m: 'matte', c: INK, x: 0.9, z: -0.1, y: h, w: 0.5, h: 0.06, d: 0.4 });
  b.box({ m: 'matte', c: INK, x: 0.9, z: -0.2, y: h + 0.06, w: 0.7, h: 0.45, d: 0.05, rx: -20 });
  b.box({ m: 'emissive', c: '#9fe0d6', x: 0.9, z: -0.17, y: h + 0.1, w: 0.6, h: 0.35, d: 0.01, rx: -20 });
  b.cyl({ m: 'brass', c: SCENE.brass, r: 0.22, x: -0.4, z: 0.1, y: h, h: 0.04, shadow: false });
  b.sph({ m: 'brass', c: SCENE.brass, r: 0.2, sy: 0.75, x: -0.4, z: 0.1, y: h + 0.15 });
};

/**
 * Racks of bagged orders: bays about 1.9 ft wide, three shelves of kraft bags (some taped in teal) with a teal
 * label rail on each shelf edge. Front is local +z.
 */
const bagRack: KindBuilder = (b, it) => {
  const { w, d } = it;
  const h = it.h ?? 4.3;
  const bays = Math.max(1, Math.round(w / 1.9));
  const bw = w / bays;
  const rnd = seeded(it.id);
  for (let i = 0; i <= bays; i++) for (const sz of [-1, 1]) {
    b.box({ m: 'steel', c: STEEL_DARK, x: -w / 2 + 0.05 + (i * (w - 0.1)) / bays, z: sz * (d / 2 - 0.05), w: 0.1, h, d: 0.1 });
  }
  for (let l = 0; l < 3; l++) {
    const y = 0.4 + l * 1.3;
    b.box({ m: 'steel', c: STEEL, y, w: w - 0.06, h: 0.06, d: d - 0.06 });
    b.box({ m: 'matte', c: BRAND.teal, y, z: d / 2, w: w - 0.06, h: 0.07, d: 0.03, shadow: false });
    for (let i = 0; i < bays; i++) {
      const n = rnd() < 0.5 ? 2 : 3;
      for (let j = 0; j < n; j++) {
        if (rnd() < 0.12) continue;
        bag(b, {
          x: -w / 2 + i * bw + ((j + 0.5) * bw) / n, y: y + 0.06, z: (rnd() - 0.5) * 0.1,
          h: 0.7 + rnd() * 0.2, c: pick(rnd, KRAFT), tape: rnd() > 0.55, ry: (rnd() - 0.5) * 12,
        });
      }
    }
  }
};

/** Wall screen above the racks: dark panel, PREPARING / READY headers and abstract ticket rows. Mounted at y 4.9. */
const orderBoard: KindBuilder = (b, it) => {
  const { w } = it;
  const h = it.h ?? 2;
  const rnd = seeded(it.id);
  b.frame({ y: 4.9 }, () => {
    b.box({ m: 'matte', c: '#2a373c', w, h, d: 0.12 });
    b.box({ m: 'emissive', c: '#0b3a3a', y: 0.08, z: 0.065, w: w - 0.16, h: h - 0.16, d: 0.01 });
    b.box({ m: 'emissive', c: BRAND.teal, y: 0.15, z: 0.072, w: 0.03, h: h - 0.3, d: 0.01 });
    for (const [side, text, fg, chip] of [[-1, 'PREPARING', '#ffb454', '#ff9a3c'], [1, 'READY', '#7ee0a8', '#5fd68f']] as const) {
      const cx = (side * w) / 4;
      b.sign({ text, x: cx, y: h - 0.32, z: 0.075, w: w / 2 - 0.4, h: 0.3, fg, bg: null, emissive: true, tracking: 0.14 });
      for (let k = 0; k < 3; k++) {
        const y = h - 0.9 - k * 0.38;
        b.box({ m: 'emissive', c: chip, x: cx - w / 4 + 0.35, y, z: 0.075, w: 0.3, h: 0.2, d: 0.01 });
        const bar = 0.5 + rnd() * 0.5;
        b.box({ m: 'emissive', c: '#c9d3d6', x: cx - w / 4 + 0.7 + bar / 2, y: y + 0.07, z: 0.075, w: bar, h: 0.07, d: 0.01 });
      }
    }
  });
};

/** Slatted rider bench against the east wall: timber seat and back, teal cushion, steel frame, RIDERS plate. */
const riderBench: KindBuilder = (b, it) => {
  const { w, d } = it;
  for (const x of [-w / 2 + 0.15, 0, w / 2 - 0.15]) {
    b.box({ m: 'steel', c: STEEL_DARK, x, y: 0, z: 0.05, w: 0.08, h: 1.5, d: d - 0.3 });
    b.box({ m: 'steel', c: STEEL_DARK, x, y: 1.5, z: -d / 2 + 0.12, w: 0.08, h: 1.4, d: 0.08 });
  }
  for (const z of [-0.25, 0.05, 0.35]) b.box({ m: 'matte', c: WOOD, y: 1.5, z, w, h: 0.12, d: 0.26 });
  b.box({ m: 'matte', c: BRAND.teal, y: 1.62, z: 0.12, w: w - 0.4, h: 0.14, d: 0.6 });
  for (const y of [2.15, 2.6]) b.box({ m: 'matte', c: WOOD, y, z: -d / 2 + 0.14, w, h: 0.3, d: 0.1, rx: -10 });
  b.sign({ text: 'RIDERS', y: 3.4, z: -d / 2 + 0.02, w: 1.4, h: 0.28, fg: BRAND.cream, bg: BRAND.teal });
};

/** Floor markings in front of the counter: two teal rules around the hand-over label. */
const handoverDecal: KindBuilder = (b, it) => {
  const { w, d } = it;
  b.sign({ text: 'HAND-OVER', y: 0.05, w: w - 0.3, h: d - 0.2, rx: -90, fg: BRAND.orange, weight: 800 });
  for (const z of [-d / 2 + 0.04, d / 2 - 0.04]) b.box({ m: 'matte', c: BRAND.teal, y: 0.03, z, w, h: 0.015, d: 0.07, shadow: false });
};

export const DISPATCH_KINDS: Record<string, KindBuilder> = {
  'production.handoverCounter': handoverCounter,
  'production.bagRack': bagRack,
  'production.orderBoard': orderBoard,
  'production.riderBench': riderBench,
  'production.handoverDecal': handoverDecal,
};
