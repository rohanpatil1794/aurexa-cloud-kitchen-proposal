// Bakery kinds: deck-oven stack, proofer, spiral mixer, flour-dusted work table and sheet-tray rolling racks.
import type { KindBuilder } from '../registry';
import { BRAND } from '../../../lib/palette';
import { STEEL, STEEL_DARK } from '../../../lib/kit';
import { pick, rng } from '../rng';
import { INK, SLATE } from './kindKit';
import { PANEL, TEAL_DEEP, rodX } from './productionParts';

const DOUGH = '#e2c58f';
const CRUST = ['#b8793e', '#c58a4a', '#a96a35'] as const;
const FLOUR = '#faf6ec';

/** Tall stack of three glass-fronted decks, lit amber, with a control band and a flue. */
const deckOven: KindBuilder = (b, it) => {
  const { w, d } = it;
  const h = it.h ?? 6.3;
  const plinth = 0.5, cap = 0.25, top = h - cap, f = d / 2;
  b.box({ m: 'matte', c: SLATE, w: w - 0.2, h: plinth, d: d - 0.2 });
  b.box({ m: 'gloss', c: PANEL, y: plinth, w, h: top - plinth, d });
  b.box({ m: 'steel', c: STEEL_DARK, y: top, w: w + 0.1, h: cap, d: d + 0.1 });

  const ctrl = top - 0.78;
  b.box({ m: 'matte', c: INK, y: ctrl, z: f + 0.02, w: w - 0.4, h: 0.64, d: 0.06 });
  for (const x of [-1, -0.45, 0.1]) {
    b.cyl({ m: 'matte', c: BRAND.orange, r: 0.13, h: 0.1, rx: 90, x, y: ctrl + 0.27, z: f + 0.1, shadow: false });
  }
  b.box({ m: 'emissive', c: '#ffa04a', x: 1.15, y: ctrl + 0.28, z: f + 0.06, w: 0.18, h: 0.08, d: 0.01 });
  b.box({ m: 'matte', c: BRAND.orange, y: ctrl - 0.1, z: f, w: w + 0.02, h: 0.06, d: 0.04, shadow: false });

  const dh = (ctrl - 0.12 - plinth) / 3;
  for (let i = 0; i < 3; i++) {
    const y0 = plinth + i * dh;
    b.box({ m: 'matte', c: '#2f373c', y: y0 + 0.14, z: f + 0.025, w: w - 0.5, h: dh - 0.28, d: 0.05 });
    b.box({ m: 'emissive', c: '#d9822f', y: y0 + 0.3, z: f + 0.058, w: w - 0.8, h: dh - 0.72, d: 0.01 });
    b.box({ m: 'matte', c: INK, y: y0 + 0.38, z: f + 0.068, w: w - 1.1, h: 0.03, d: 0.02, shadow: false });
    for (const x of [-0.8, 0, 0.8]) b.sph({ m: 'matte', c: '#7a4a22', r: 0.22, sx: 1.25, sy: 0.8, sz: 0.12, x, y: y0 + 0.53, z: f + 0.07, shadow: false });
    b.box({ m: 'glass', c: '#a9c4c4', y: y0 + 0.3, z: f + 0.085, w: w - 0.8, h: dh - 0.72, d: 0.03 });
    b.box({ m: 'steel', c: STEEL, y: y0 + dh - 0.33, z: f + 0.12, w: w - 1.1, h: 0.07, d: 0.08, shadow: false });
  }

  // Flue rises past the dollhouse wall height, kept clear of the ribbon window.
  b.cyl({ m: 'steel', c: STEEL_DARK, r: 0.42, y: h, h: 0.18, x: w / 2 - 0.7, z: -d / 2 + 0.9 });
  b.cyl({ m: 'steel', c: STEEL, r: 0.3, y: h + 0.18, h: 3.2, x: w / 2 - 0.7, z: -d / 2 + 0.9 });
};

/** Tall proofer cabinet: glass door over six shelves of resting dough, control head on top. */
const proofer: KindBuilder = (b, it) => {
  const { w, d } = it;
  const h = it.h ?? 6.2;
  const rear = 0.45; // depth left in front of the carcass for shelves behind the glass
  const f = d / 2;
  b.box({ m: 'matte', c: SLATE, w: w - 0.2, h: 0.3, d: d - 0.2 });
  b.box({ m: 'gloss', c: PANEL, y: 0.3, z: -rear / 2, w, h: h - 1.5, d: d - rear });
  b.box({ m: 'gloss', c: PANEL, y: h - 1.3, w, h: 1.1, d });
  b.box({ m: 'steel', c: STEEL_DARK, y: h - 0.2, w: w + 0.1, h: 0.2, d: d + 0.1 });

  b.box({ m: 'matte', c: INK, y: h - 1.1, z: f + 0.02, w: w - 0.4, h: 0.7, d: 0.05 });
  b.sign({ text: 'PROOF', x: -0.3, y: h - 0.75, z: f + 0.05, w: 1.2, h: 0.3, fg: BRAND.tealLight, bg: '#0e2a2b', emissive: true });
  for (const x of [0.55, 0.9]) b.cyl({ m: 'matte', c: BRAND.tealMid, r: 0.1, h: 0.08, rx: 90, x, y: h - 0.79, z: f + 0.08, shadow: false });

  const win = h - 1.7;
  const frontShelf = f - rear;
  const dw = w - 0.3;
  for (const sx of [-1, 1]) b.box({ m: 'steel', c: STEEL_DARK, x: sx * (dw / 2 - 0.075), y: 0.4, z: f - 0.03, w: 0.15, h: win, d: 0.05 });
  for (const y of [0.4, 0.4 + win - 0.12]) b.box({ m: 'steel', c: STEEL_DARK, y, z: f - 0.03, w: dw, h: 0.12, d: 0.05 });
  b.box({ m: 'matte', c: '#454e54', y: 0.52, z: frontShelf + 0.01, w: w - 0.6, h: win - 0.24, d: 0.02 });
  for (let i = 0; i < 6; i++) {
    const y = 0.7 + i * 0.7;
    b.box({ m: 'steel', c: STEEL_DARK, y, z: frontShelf + (rear - 0.1) / 2 + 0.02, w: w - 0.7, h: 0.04, d: rear - 0.1, shadow: false });
    b.box({ m: 'matte', c: i % 2 ? DOUGH : '#d6b67c', y: y + 0.04, x: i % 2 ? 0.15 : -0.15, z: frontShelf + 0.22, w: w - 1.3, h: 0.2, d: 0.26, shadow: false });
  }
  b.box({ m: 'glass', c: '#a9c4c4', y: 0.52, z: f - 0.03, w: w - 0.6, h: win - 0.24, d: 0.03 });
};

/** Floor-standing spiral mixer: teal column and head, stainless bowl of dough under a guard. */
const spiralMixer: KindBuilder = (b, it) => {
  const { w, d } = it;
  const cz = 0.35; // bowl centre, forward of the column
  b.box({ m: 'matte', c: SLATE, w: w - 0.2, h: 0.25, d: d - 0.2 });
  b.box({ m: 'matte', c: BRAND.teal, y: 0.25, z: -0.85, w: 1.5, h: 3.9, d: 0.8 });
  b.box({ m: 'matte', c: BRAND.teal, y: 3.65, z: -0.2, w: 1.5, h: 0.7, d: 1.9 });
  b.cyl({ m: 'matte', c: TEAL_DEEP, r: 0.5, y: 0.25, h: 1.15, z: cz });
  b.cyl({ m: 'steel', c: STEEL, r: 1.0, y: 1.4, h: 1.05, z: cz });
  b.cyl({ m: 'steel', c: STEEL_DARK, r: 1.05, y: 2.42, h: 0.08, z: cz });
  b.sph({ m: 'matte', c: DOUGH, r: 0.82, sy: 0.5, y: 2.45, z: cz });
  b.cyl({ m: 'glass', c: '#cfe0e0', r: 1.03, y: 2.5, h: 0.75, z: cz });
  b.cyl({ m: 'steel', c: STEEL_DARK, r: 0.08, y: 2.5, h: 1.15, z: cz });
  [0, 60, 120].forEach((ry, i) => b.box({ m: 'steel', c: STEEL, w: 0.6, h: 0.09, d: 0.09, y: 2.6 + i * 0.25, z: cz, ry, shadow: false }));
  b.box({ m: 'matte', c: INK, y: 0.5, z: -0.425, w: 0.8, h: 0.7, d: 0.05 });
  b.cyl({ m: 'matte', c: '#c93a32', r: 0.09, h: 0.08, rx: 90, x: -0.2, y: 0.82, z: -0.37, shadow: false });
  b.cyl({ m: 'matte', c: '#3f9a52', r: 0.09, h: 0.08, rx: 90, x: 0.2, y: 0.82, z: -0.37, shadow: false });
};

/** Wide stainless table under a dusting of flour, with dough, a rolling pin, sheet pans and flour stores below. */
const workTable: KindBuilder = (b, it) => {
  const { w, d } = it;
  const h = it.h ?? 3;
  const rnd = rng(it.id);
  b.box({ m: 'matte', c: '#e4d9c1', y: h - 0.14, w, h: 0.14, d });
  const lx = w / 2 - 0.12, lz = d / 2 - 0.12;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.box({ m: 'steel', c: STEEL_DARK, x: sx * lx, z: sz * lz, w: 0.1, h: h - 0.14, d: 0.1 });
  for (const sz of [-1, 1]) b.box({ m: 'steel', c: STEEL_DARK, y: h - 0.44, z: sz * lz, w: w - 0.2, h: 0.3, d: 0.05, shadow: false });
  b.box({ m: 'steel', c: STEEL_DARK, y: 0.6, w: w - 0.3, h: 0.06, d: d - 0.3 });

  b.box({ m: 'matte', c: '#d9c39a', x: -w / 2 + 0.9, y: 0.66, w: 1.0, h: 0.4, d: 0.6 });
  for (const x of [-0.4, 0.55]) {
    b.cyl({ m: 'matte', c: '#e9e3d3', r: 0.38, h: 0.55, x, y: 0.66 });
    b.cyl({ m: 'matte', c: '#d6cdb8', r: 0.4, h: 0.06, x, y: 1.2, shadow: false });
  }

  for (let i = 0; i < 6; i++) {
    const pw = 0.6 + rnd() * 0.5, pd = 0.45 + rnd() * 0.5;
    b.box({ m: 'matte', c: FLOUR, x: (rnd() - 0.5) * (w - 1.4), z: (rnd() - 0.5) * (d - 0.8), y: h, w: pw, h: 0.015, d: pd, ry: rnd() * 60 - 30, shadow: false });
  }
  for (const [x, z] of [[-1.2, 0.3], [-0.6, -0.4], [0.2, 0.2]]) b.cyl({ m: 'matte', c: DOUGH, r: 0.28, h: 0.17, x, z, y: h });
  rodX(b, { c: '#a9784c', r: 0.08, len: 1.1, x: 0.9, y: h + 0.1, z: -0.3 });
  b.box({ m: 'steel', c: STEEL, x: w / 2 - 0.7, y: h, z: 0.2, w: 0.9, h: 0.14, d: 0.65 });
};

const LOADS: Record<string, readonly string[]> = {
  baguette: ['#c58a4a', '#b8793e'],
  rolls: ['#c28a52', '#b27a45'],
  loaf: [...CRUST],
};

/**
 * Sheet-tray rolling rack on four castors. props.load: 'baguette' | 'loaf' | 'rolls' | 'dessert' (any other
 * value leaves the trays empty).
 */
const rollRack: KindBuilder = (b, it) => {
  const { w, d } = it;
  const h = it.h ?? 5.8;
  const load = String(it.props?.load ?? '');
  const rnd = rng(it.id);
  const px = w / 2 - 0.05, pz = d / 2 - 0.05;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    b.box({ m: 'steel', c: STEEL_DARK, x: sx * px, z: sz * pz, y: 0.3, w: 0.1, h: h - 0.3, d: 0.1 });
    b.cyl({ m: 'matte', c: INK, r: 0.2, h: 0.12, rz: 90, x: sx * (w / 2 - 0.2), z: sz * (d / 2 - 0.2), y: 0.14, shadow: false });
  }
  b.box({ m: 'steel', c: STEEL_DARK, y: 0.3, w, h: 0.06, d });
  for (let i = 0; i < 6; i++) {
    const y = 0.8 + i * 0.8;
    b.box({ m: 'steel', c: STEEL, y, w: w - 0.2, h: 0.04, d: d - 0.2 });
    if (!(i % 2)) continue;
    if (load === 'baguette') {
      for (const z of [-0.55, 0, 0.55]) rodX(b, { c: pick(rnd, LOADS.baguette), r: 0.1, len: w - 0.5, y: y + 0.14, z });
    } else if (load === 'loaf') {
      for (const x of [-0.4, 0.4]) b.box({ m: 'matte', c: pick(rnd, LOADS.loaf), x, y: y + 0.04, w: 0.7, h: 0.36, d: 0.55 });
    } else if (load === 'rolls') {
      for (const x of [-0.4, 0.4]) b.box({ m: 'matte', c: pick(rnd, LOADS.rolls), x, y: y + 0.04, w: 0.5, h: 0.2, d: d - 0.7 });
    } else if (load === 'dessert') {
      b.box({ m: 'matte', c: '#d98a98', x: -0.45, y: y + 0.04, w: 0.5, h: 0.3, d: 0.9 });
      b.box({ m: 'matte', c: '#e6d3a0', x: 0.1, y: y + 0.04, w: 0.5, h: 0.3, d: 0.9 });
      b.box({ m: 'matte', c: '#5b3a2a', x: 0.65, y: y + 0.04, w: 0.4, h: 0.3, d: 0.9 });
    }
  }
};

export const BAKERY_KINDS: Record<string, KindBuilder> = {
  'production.deckOven': deckOven,
  'production.proofer': proofer,
  'production.spiralMixer': spiralMixer,
  'production.workTable': workTable,
  'production.rollRack': rollRack,
};
