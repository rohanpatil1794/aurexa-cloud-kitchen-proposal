// Kind builders for Cold Storage (zone fridges, walk-in, trolley) and Dry Storage (racking, pallets, bay lines).
import type { PrimBuilder } from '../../../lib/prims';
import { BRAND, ZONE_COLORS } from '../../../lib/palette';
import { CHARCOAL, STEEL, STEEL_DARK } from '../../../lib/kit';
import type { KindBuilder } from '../registry';
import { rng } from '../rng';
import { SLATE, tint } from './kindKit';
import { SATIN_STEEL, tub } from './prepKit';

const LABEL_INK = '#12302f';

// ---------------------------------------------------------------------------
// Cold Storage
// ---------------------------------------------------------------------------

/** Tall two-door upright fridge: stainless cabinet, enamelled doors in the zone colour, cream name plate. */
const fridge: KindBuilder = (b, it) => {
  const { w, d } = it;
  const h = it.h ?? 6.5;
  const zone = it.color ?? BRAND.teal;
  const fz = d / 2;
  b.box({ m: 'gloss', c: SATIN_STEEL, w, h, d });
  b.box({ m: 'matte', c: CHARCOAL, w: w + 0.02, h: 0.3, d: d + 0.02, shadow: false });
  b.box({ m: 'gloss', c: zone, y: 0.4, z: fz + 0.03, w: w - 0.14, h: 4.3, d: 0.06 });
  b.box({ m: 'gloss', c: zone, y: 4.78, z: fz + 0.03, w: w - 0.14, h: 1.55, d: 0.06 });
  const hx = w / 2 - 0.28;
  b.box({ m: 'steel', c: STEEL_DARK, x: hx, y: 1.9, z: fz + 0.12, w: 0.07, h: 1.5, d: 0.06, shadow: false });
  b.box({ m: 'steel', c: STEEL_DARK, x: hx, y: 4.9, z: fz + 0.12, w: 0.07, h: 0.45, d: 0.06, shadow: false });
  b.box({ m: 'emissive', c: '#62f0a8', x: -w / 2 + 0.3, y: 4.45, z: fz + 0.07, w: 0.1, h: 0.1, d: 0.02 });
  if (it.props?.tag) {
    b.sign({ text: String(it.props.tag), x: 0, y: 5.55, z: fz + 0.07, w: w - 0.4, h: 0.34, bg: BRAND.cream, fg: LABEL_INK, tracking: 0.1 });
  }
};

/** Walk-in cold room: insulated panel box with a framed door, pull handle, status light and a roof condenser. */
const walkIn: KindBuilder = (b, it) => {
  const { w, d } = it;
  const h = it.h ?? 7;
  const fz = d / 2;
  const panel = '#dfe6e6';
  b.box({ m: 'matte', c: CHARCOAL, w, h: 0.35, d });
  b.box({ m: 'gloss', c: panel, y: 0.35, w: w - 0.02, h: h - 0.35, d: d - 0.02 });
  b.box({ m: 'gloss', c: SATIN_STEEL, y: h, w: w + 0.1, h: 0.1, d: d + 0.1 });
  b.box({ m: 'matte', c: BRAND.tealLight, y: 6.62, z: fz + 0.01, w, h: 0.05, d: 0.03, shadow: false });
  b.sign({ text: 'WALK-IN COLD ROOM', x: 0, y: h - 0.2, z: fz + 0.02, w: 3.3, h: 0.3, bg: BRAND.teal, fg: BRAND.cream, tracking: 0.12 });

  // door: steel frame, insulated leaf, kick plate, two hinges, pull handle and a status light
  b.box({ m: 'steel', c: STEEL_DARK, y: 0.05, z: fz + 0.04, w: 3.35, h: 6.55, d: 0.08 });
  b.box({ m: 'gloss', c: '#f1f5f5', y: 0.15, z: fz + 0.09, w: 3.0, h: 6.3, d: 0.1 });
  b.box({ m: 'steel', c: STEEL, y: 0.15, z: fz + 0.145, w: 2.9, h: 0.6, d: 0.02, shadow: false });
  for (const y of [1.4, 5.0]) b.box({ m: 'steel', c: STEEL_DARK, x: -1.62, y, z: fz + 0.14, w: 0.08, h: 0.35, d: 0.08, shadow: false });
  const hx = 1.1;
  b.pipe({ m: 'steel', c: STEEL, a: [hx, 2.5, fz + 0.32], b: [hx, 4.4, fz + 0.32], r: 0.06 });
  for (const y of [2.7, 4.2]) b.box({ m: 'steel', c: STEEL_DARK, x: hx, y, z: fz + 0.24, w: 0.08, h: 0.08, d: 0.16, shadow: false });
  b.box({ m: 'matte', c: '#2b3236', x: -1.0, y: 5.3, z: fz + 0.16, w: 0.34, h: 0.5, d: 0.04, shadow: false });
  b.box({ m: 'emissive', c: '#62f0a8', x: -1.0, y: 5.55, z: fz + 0.19, w: 0.14, h: 0.14, d: 0.02 });

  // left side (faces the entry aisle when the door looks west): name plate and temperature controller
  const sx = -w / 2;
  b.sign({ text: 'COLD ROOM', x: sx - 0.02, y: h - 0.2, z: 0, w: 2.0, h: 0.3, ry: -90, bg: BRAND.teal, fg: BRAND.cream, tracking: 0.14 });
  b.box({ m: 'matte', c: '#2b3236', x: sx - 0.03, y: 4.6, z: 0.5, w: 0.06, h: 0.7, d: 0.55, shadow: false });
  b.box({ m: 'emissive', c: '#7fe3ef', x: sx - 0.07, y: 5.0, z: 0.5, w: 0.02, h: 0.2, d: 0.4 });
  b.box({ m: 'emissive', c: '#62f0a8', x: sx - 0.07, y: 4.75, z: 0.3, w: 0.02, h: 0.08, d: 0.08 });

  // refrigeration condenser on the roof
  b.box({ m: 'gloss', c: SATIN_STEEL, x: 0.2, y: h + 0.1, w: 2.2, h: 0.6, d: Math.min(1.5, d - 0.4) });
  b.cyl({ m: 'matte', c: SLATE, x: 0.2, y: h + 0.7, r: 0.5, h: 0.04, shadow: false });
};

/** Rolling rack with one crate per dietary zone (the cold chain feeding the four prep rooms). */
const trolley: KindBuilder = (b, it) => {
  const { w, d } = it;
  const h = it.h ?? 4.6;
  const px = w / 2 - 0.05, pz = d / 2 - 0.05;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    b.box({ m: 'steel', c: STEEL_DARK, x: sx * px, z: sz * pz, y: 0.2, w: 0.08, h: h - 0.2, d: 0.08 });
    b.cyl({ m: 'matte', c: '#2b3236', x: sx * px, z: sz * pz, r: 0.18, h: 0.1, y: 0.13, rz: 90, shadow: false });
  }
  const zones = [ZONE_COLORS.veg, ZONE_COLORS.jain, ZONE_COLORS.vegan, ZONE_COLORS.nonveg];
  zones.forEach((c, i) => {
    const y = 0.5 + i * 1.2;
    b.box({ m: 'steel', c: STEEL, y, w: w - 0.04, h: 0.06, d: d - 0.04 });
    b.box({ m: 'matte', c, y: y + 0.06, w: w - 0.3, h: 0.55, d: d - 0.25 });
  });
};

// ---------------------------------------------------------------------------
// Dry Storage
// ---------------------------------------------------------------------------
type Goods = (b: PrimBuilder, o: { y: number; w: number; d: number; rnd: () => number }) => void;
type DryStyle = 'grain' | 'oil' | 'pack';

/** Evenly spaced `n` slots across `width`: yields each slot's centre x. */
function slots(width: number, n: number, fn: (x: number, pitch: number) => void): void {
  const pitch = width / n;
  for (let i = 0; i < n; i++) fn(-width / 2 + pitch * (i + 0.5), pitch);
}

const GOODS: Record<string, Goods> = {
  sacks: (b, { y, w, d, rnd }) =>
    slots(w, Math.max(2, Math.floor(w / 1.0)), (x, p) =>
      b.box({ m: 'matte', c: rnd() > 0.5 ? '#e8d3a2' : '#efe1bf', x, y, z: 0, w: p - 0.08, h: 0.5 + rnd() * 0.15, d: d - 0.2, ry: (rnd() - 0.5) * 6 })),
  crates: (b, { y, w, d, rnd }) =>
    slots(w, Math.max(2, Math.floor(w / 1.1)), (x, p) => {
      const h = 0.5 + rnd() * 0.28;
      b.box({ m: 'matte', c: rnd() > 0.5 ? '#b9854a' : '#cba269', x, y, z: 0, w: p - 0.1, h, d: Math.min(d - 0.2, 1.05) });
      b.box({ m: 'matte', c: '#8f6535', x, y: y + h * 0.45, z: 0, w: p - 0.08, h: 0.07, d: Math.min(d - 0.2, 1.05) + 0.02, shadow: false });
    }),
  tubs: (b, { y, w, d, rnd }) =>
    slots(w, Math.max(2, Math.floor(w / 0.9)), (x, p) =>
      tub(b, { x, y, z: 0, w: p - 0.12, d: Math.min(d - 0.3, 0.8), h: 0.55 + rnd() * 0.15, c: '#ece6d6', lid: rnd() > 0.5 ? BRAND.teal : BRAND.orange })),
  cans: (b, { y, w, d, rnd }) =>
    slots(w, Math.max(2, Math.floor(w / 0.75)), (x, p) =>
      b.box({ m: 'gloss', c: rnd() > 0.4 ? BRAND.orange : BRAND.olive, x, y, z: 0, w: p - 0.12, h: 0.7, d: Math.min(d - 0.3, 0.6) })),
  jars: (b, { y, w, d, rnd }) =>
    slots(w, Math.max(4, Math.floor(w / 0.5)), (x) => {
      const c = ['#cb622a', '#8f854a', '#edcb95', '#5f9392'][Math.floor(rnd() * 4)];
      for (const z of [-0.2, 0.2]) {
        if (Math.abs(z) < d / 2 - 0.2) b.cyl({ m: 'gloss', c, x, y, z, r: 0.17, h: 0.45 });
      }
    }),
  cartons: (b, { y, w, d, rnd }) =>
    slots(w, Math.max(2, Math.floor(w / 1.05)), (x, p) => {
      const h = 0.6 + rnd() * 0.2;
      b.box({ m: 'matte', c: '#c79a62', x, y, z: 0, w: p - 0.08, h, d: Math.min(d - 0.2, 1.0) });
      b.box({ m: 'matte', c: '#efe3c6', x, y: y + h - 0.005, z: 0, w: 0.16, h: 0.012, d: Math.min(d - 0.2, 1.0) + 0.01, shadow: false });
    }),
};

const GOODS_PLAN: Record<DryStyle, string[]> = {
  grain: ['sacks', 'crates', 'tubs', 'sacks'],
  oil: ['cans', 'tubs', 'jars', 'crates'],
  pack: ['cartons', 'crates', 'cartons'],
};

/** One steel racking bay, centred on x; shelves loaded per the row style. */
function rackBay(b: PrimBuilder, o: { x: number; w: number; d: number; h: number; levels: number; style: DryStyle; seed: number }) {
  const { w, d, h, levels } = o;
  const rnd = rng(o.seed);
  b.frame({ x: o.x }, () => {
    const px = w / 2 - 0.06, pz = d / 2 - 0.06;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.box({ m: 'steel', c: STEEL_DARK, x: sx * px, z: sz * pz, w: 0.12, h, d: 0.12 });
    for (let i = 0; i < levels; i++) {
      const y = 0.3 + (i * (h - 1.2)) / (levels - 1);
      b.box({ m: 'steel', c: STEEL, y, w: w - 0.04, h: 0.07, d: d - 0.04 });
      const kind = GOODS_PLAN[o.style][i % GOODS_PLAN[o.style].length];
      GOODS[kind](b, { y: y + 0.07, w: w - 0.34, d: d - 0.1, rnd });
    }
  });
}

/** A run of racking bays along local x with a teal header board carrying the row name. */
const rackRow: KindBuilder = (b, it) => {
  const { w, d } = it;
  const h = it.h ?? 6;
  const bays = Math.max(1, Math.round(w / 3));
  const bw = w / bays;
  const style = String(it.props?.style ?? 'grain') as DryStyle;
  const levels = Number(it.props?.levels ?? 4);
  for (let i = 0; i < bays; i++) {
    rackBay(b, { x: -w / 2 + bw * (i + 0.5), w: bw, d, h, levels, style, seed: it.x * 13 + it.z * 7 + i * 101 });
  }
  b.box({ m: 'matte', c: BRAND.teal, y: h - 0.42, z: d / 2 + 0.01, w: w - 0.1, h: 0.34, d: 0.06, shadow: false });
  if (it.label) {
    b.sign({ text: it.label.toUpperCase(), x: 0, y: h - 0.25, z: d / 2 + 0.045, w: Math.min(w - 0.3, 3.0), h: 0.26, fg: BRAND.cream, tracking: 0.16 });
  }
};

/** Half-size timber pallet with a stretch-wrapped load of cartons or sacks. */
const pallet: KindBuilder = (b, it) => {
  const { w, d } = it;
  const wood = '#c9a066', dark = '#a97f48';
  for (const x of [-w / 2 + 0.12, 0, w / 2 - 0.12]) b.box({ m: 'matte', c: dark, x, w: 0.22, h: 0.3, d });
  for (let k = 0; k < 5; k++) b.box({ m: 'matte', c: wood, y: 0.3, z: -d / 2 + 0.16 + (k * (d - 0.32)) / 4, w, h: 0.07, d: 0.26 });
  const sacks = it.props?.load === 'sacks';
  const layers = sacks ? 5 : 3;
  const lh = sacks ? 0.3 : 0.55;
  for (let l = 0; l < layers; l++) {
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const alt = l % 2 === 1;
      b.box({
        m: 'matte', c: sacks ? (alt ? '#efe1bf' : '#e8d3a2') : (alt ? '#b98a52' : '#c79a62'),
        x: sx * (w / 4 - 0.01), z: sz * (d / 4 - 0.01), y: 0.37 + l * lh, w: w / 2 - 0.04, h: lh - 0.01, d: d / 2 - 0.04,
      });
    }
  }
  b.box({ m: 'glass', c: '#dfeef0', y: 0.37, w: w + 0.03, h: layers * lh, d: d + 0.03 });
};

/** Painted floor lines marking a pallet staging bay (flat decal). */
const bayLines: KindBuilder = (b, it) => {
  const { w, d } = it;
  const t = 0.12;
  const line = (x: number, z: number, lw: number, ld: number) =>
    b.box({ m: 'matte', c: tint(BRAND.orange, -0.05), x, y: 0.035, z, w: lw, h: 0.01, d: ld, shadow: false });
  line(0, -d / 2 + t / 2, w, t);
  line(0, d / 2 - t / 2, w, t);
  line(-w / 2 + t / 2, 0, t, d - 2 * t);
  line(w / 2 - t / 2, 0, t, d - 2 * t);
};

export const prepStorageKinds: Record<string, KindBuilder> = {
  'prep.fridge': fridge,
  'prep.walkIn': walkIn,
  'prep.trolley': trolley,
  'prep.rackRow': rackRow,
  'prep.pallet': pallet,
  'prep.bayLines': bayLines,
};
