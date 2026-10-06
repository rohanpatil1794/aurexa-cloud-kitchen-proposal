// Dessert Production kinds: upright freezer, marble-topped counter with pastry dressing, tray shelving.
// (The tray trolley is production.rollRack with props.load = 'dessert', in productionBakery.ts.)
import type { KindBuilder } from '../registry';
import { BRAND, SCENE } from '../../../lib/palette';
import { STEEL, STEEL_DARK, STEEL_MID } from '../../../lib/kit';
import { pick, rng } from '../rng';
import { INK, SLATE } from './kindKit';
import { PANEL, PANEL_LIGHT, rodX } from './productionParts';

const PASTRY = ['#d98a98', '#e6d3a0', '#5b3a2a', '#c98a3d', '#a9c279'] as const;
const CHOCOLATE = '#5b3a2a';
const BERRY = '#b3343f';

/** Upright steel freezer with a teal name band, one door and a digital display. */
const freezer: KindBuilder = (b, it) => {
  const { w, d } = it;
  const h = it.h ?? 6.4;
  const f = d / 2;
  b.box({ m: 'matte', c: SLATE, w: w - 0.1, h: 0.3, d: d - 0.1 });
  b.box({ m: 'gloss', c: PANEL, y: 0.3, w, h: h - 0.3, d });
  b.box({ m: 'gloss', c: PANEL_LIGHT, y: 0.5, z: f + 0.03, w: w - 0.2, h: h - 1.5, d: 0.06 });
  b.box({ m: 'matte', c: BRAND.teal, y: h - 0.85, z: f + 0.03, w: w - 0.2, h: 0.55, d: 0.06 });
  b.sign({ text: 'FREEZER', y: h - 0.575, z: f + 0.065, w: w - 0.6, h: 0.3, fg: '#ffffff' });
  b.box({ m: 'matte', c: INK, x: -w / 2 + 0.55, y: h - 1.75, z: f + 0.07, w: 0.5, h: 0.25, d: 0.03 });
  b.box({ m: 'emissive', c: '#9be8ff', x: -w / 2 + 0.55, y: h - 1.69, z: f + 0.09, w: 0.34, h: 0.12, d: 0.01 });
  b.box({ m: 'steel', c: STEEL_DARK, x: w / 2 - 0.35, y: 2.2, z: f + 0.1, w: 0.08, h: 2.2, d: 0.08, shadow: false });
};

/** Veined white marble slab on a steel cabinet, dressed with a cake, a cloche, a tray of tarts and chocolate. */
const marbleCounter: KindBuilder = (b, it) => {
  const { w, d } = it;
  const h = it.h ?? 3;
  const rnd = rng(it.id);
  const slab = 0.2, dc = d - 0.3, f = dc / 2, fw = (w - 0.2) / 3;
  b.box({ m: 'matte', c: SLATE, w: w - 0.4, h: 0.3, d: dc - 0.2 });
  b.box({ m: 'gloss', c: PANEL, y: 0.3, w: w - 0.2, h: h - slab - 0.3, d: dc });
  for (let i = 0; i < 3; i++) {
    const x = -w / 2 + 0.1 + fw * (i + 0.5);
    b.box({ m: 'gloss', c: PANEL_LIGHT, x, y: 0.4, z: f + 0.025, w: fw - 0.1, h: h - slab - 0.5, d: 0.05 });
    b.box({ m: 'brass', c: SCENE.brass, x, y: h - slab - 0.35, z: f + 0.075, w: 0.6, h: 0.05, d: 0.05, shadow: false });
  }
  b.box({ m: 'gloss', c: '#dedad2', y: h - slab, w, h: slab, d });
  // Veining: soft grey clouds, then meandering chains of short dark segments.
  for (let i = 0; i < 3; i++) {
    b.box({ m: 'gloss', c: '#cdcac4', x: (rnd() - 0.5) * (w - 1.6), z: (rnd() - 0.5) * (d - 1), y: h, w: 0.9 + rnd() * 0.8, h: 0.008, d: 0.5 + rnd() * 0.4, ry: rnd() * 90, shadow: false });
  }
  for (let v = 0; v < 5; v++) {
    let x = (rnd() - 0.5) * (w - 1.6), z = (rnd() - 0.5) * (d - 1), heading = rnd() * 180;
    for (let s = 0; s < 4; s++) {
      const len = 0.3 + rnd() * 0.3, a = (heading * Math.PI) / 180;
      const dx = Math.cos(a), dz = -Math.sin(a);
      if (Math.abs(x + dx * len) > w / 2 - 0.1 || Math.abs(z + dz * len) > d / 2 - 0.1) break;
      b.box({ m: 'gloss', c: v % 2 ? '#6f787e' : '#8b9399', x: x + (dx * len) / 2, z: z + (dz * len) / 2, y: h, w: len, h: 0.012, d: 0.03 + rnd() * 0.03, ry: heading, shadow: false });
      x += dx * len;
      z += dz * len;
      heading += (rnd() - 0.5) * 70;
    }
  }

  // cake on a stand
  const cx = -w / 2 + 0.9;
  b.cyl({ m: 'gloss', c: '#e9e4d6', r: 0.42, x: cx, y: h, h: 0.05 });
  b.cyl({ m: 'gloss', c: '#e9e4d6', r: 0.06, x: cx, y: h + 0.05, h: 0.28 });
  b.cyl({ m: 'gloss', c: '#e9e4d6', r: 0.52, x: cx, y: h + 0.33, h: 0.05 });
  b.cyl({ m: 'matte', c: '#e3a79b', r: 0.43, x: cx, y: h + 0.38, h: 0.42 });
  b.cyl({ m: 'matte', c: '#f7ecd6', r: 0.44, x: cx, y: h + 0.8, h: 0.05 });
  for (const [x, z] of [[-0.18, 0.05], [0.12, -0.14], [0.14, 0.16]]) b.cyl({ m: 'matte', c: BERRY, r: 0.07, x: cx + x, z, y: h + 0.85, h: 0.1, shadow: false });

  // glass cloche over a single tart
  const gx = cx + 1.3;
  b.cyl({ m: 'steel', c: STEEL, r: 0.5, x: gx, y: h, h: 0.04 });
  b.cyl({ m: 'matte', c: '#c98a3d', r: 0.3, x: gx, y: h + 0.04, h: 0.18 });
  b.cyl({ m: 'glass', c: '#dfeeee', r: 0.46, x: gx, y: h + 0.04, h: 0.62 });

  // tray of tarts
  const tx = gx + 1.2;
  b.box({ m: 'steel', c: STEEL, x: tx, y: h, w: 1.0, h: 0.04, d: 0.6 });
  for (const [x, z, c] of [[-0.3, -0.15, PASTRY[3]], [0.3, -0.15, PASTRY[2]], [-0.3, 0.15, PASTRY[0]], [0.3, 0.15, PASTRY[3]]] as const) {
    b.cyl({ m: 'matte', c, r: 0.11, x: tx + x, z, y: h + 0.04, h: 0.1 });
  }

  b.box({ m: 'matte', c: CHOCOLATE, x: w / 2 - 0.3, z: -0.4, y: h, w: 0.55, h: 0.1, d: 0.45, ry: 8 });
  rodX(b, { m: 'gloss', c: '#d8d4cb', r: 0.07, len: 1.0, x: w / 2 - 0.6, y: h + 0.07, z: 0.5 });
};

/** Open steel shelving, four levels of sheet trays carrying pastries. */
const trayShelf: KindBuilder = (b, it) => {
  const { w, d } = it;
  const h = it.h ?? 5.5;
  const rnd = rng(it.id);
  const px = w / 2 - 0.06, pz = d / 2 - 0.06;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.box({ m: 'steel', c: STEEL_DARK, x: sx * px, z: sz * pz, w: 0.12, h, d: 0.12 });
  for (let l = 0; l < 4; l++) {
    const y = 0.4 + l * 1.5;
    b.box({ m: 'steel', c: STEEL, y, w: w - 0.08, h: 0.07, d: d - 0.08 });
    b.box({ m: 'steel', c: STEEL_MID, y: y + 0.07, w: w - 0.3, h: 0.04, d: d - 0.3 });
    for (let j = 0; j < 3; j++) {
      const x = -w / 2 + 0.4 + (j * (w - 0.8)) / 2;
      const c = pick(rnd, PASTRY);
      if (rnd() < 0.5) b.cyl({ m: 'matte', c, r: 0.26, x, y: y + 0.11, h: 0.26 });
      else b.box({ m: 'matte', c, x, y: y + 0.11, w: 0.5, h: 0.28, d: 0.5 });
    }
  }
};

export const DESSERT_KINDS: Record<string, KindBuilder> = {
  'production.freezer': freezer,
  'production.marbleCounter': marbleCounter,
  'production.trayShelf': trayShelf,
};
