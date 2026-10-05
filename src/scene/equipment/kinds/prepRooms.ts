// Kind builders for the four zone prep rooms (Veg, Jain, Vegan, Non-Veg): sink, bench with
// colour-coded boards, wall shelf, bin, blast chiller and hand-wash basin.
// Every builder reads the zone colour from item.color (data/equipment/prep.ts).
import type { EquipItem } from '../../../data/types';
import type { PrimBuilder } from '../../../lib/prims';
import { BRAND } from '../../../lib/palette';
import { CHARCOAL, STEEL_DARK, bin as zoneBin, plant, wallShelf } from '../../../lib/kit';
import type { KindBuilder } from '../registry';
import { rng } from '../rng';
import { tint } from './kindKit';
import { SATIN_STEEL, tub } from './prepKit';

const zoneOf = (it: EquipItem) => it.color ?? BRAND.teal;
const TOP = 3; // work-surface height, ft
const TUB_BODY = '#e6e9e6';

// ---------------------------------------------------------------------------
// Three-compartment sink on the north wall
// ---------------------------------------------------------------------------
const sink: KindBuilder = (b, it) => {
  const { w, d } = it;
  const zone = zoneOf(it);
  const well = 0.6, back = 0.45, lip = 0.15, rim = 0.12, div = 0.1;
  const zb = -d / 2, zf = d / 2;
  const bw = (w - 2 * rim - 2 * div) / 3;

  // bowl block: back deck, front lip, outer rims and two dividers (the walls of the three wells)
  b.box({ m: 'gloss', c: SATIN_STEEL, y: TOP - well, z: zb + back / 2, w, h: well, d: back });
  b.box({ m: 'gloss', c: SATIN_STEEL, y: TOP - well, z: zf - lip / 2, w, h: well, d: lip });
  const wellLen = d - back - lip, wellZ = zb + back + wellLen / 2;
  const edges = [-w / 2 + rim / 2, -w / 2 + rim + bw + div / 2, -w / 2 + rim + 2 * bw + 1.5 * div, w / 2 - rim / 2];
  edges.forEach((x, i) => b.box({ m: 'gloss', c: SATIN_STEEL, x, y: TOP - well, z: wellZ, w: i === 0 || i === 3 ? rim : div, h: well, d: wellLen }));
  for (let k = 0; k < 3; k++) {
    const x = -w / 2 + rim + bw / 2 + k * (bw + div);
    b.box({ m: 'steel', c: '#7f8c96', x, y: TOP - well, z: wellZ, w: bw, h: 0.05, d: wellLen });
    b.cyl({ m: 'matte', c: '#2b3236', r: 0.08, x, y: TOP - well + 0.05, z: wellZ, h: 0.01, shadow: false });
  }

  // stand: four legs and an undershelf
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    b.box({ m: 'steel', c: STEEL_DARK, x: sx * (w / 2 - 0.1), z: sz * (d / 2 - 0.1), w: 0.1, h: TOP - well, d: 0.1 });
  }
  b.box({ m: 'steel', c: STEEL_DARK, y: 0.55, w: w - 0.2, h: 0.07, d: d - 0.3 });

  // splashback with the zone rail, and two swan-neck taps over the dividers
  b.box({ m: 'gloss', c: SATIN_STEEL, y: TOP, z: zb + 0.05, w, h: 0.9, d: 0.1 });
  b.box({ m: 'matte', c: zone, y: TOP + 0.82, z: zb + 0.05, w, h: 0.1, d: 0.14, shadow: false });
  for (const x of [edges[1], edges[2]]) {
    const z = zb + back * 0.62;
    b.cyl({ m: 'steel', c: '#e8eef2', r: 0.055, x, y: TOP, z, h: 0.72 });
    b.pipe({ m: 'steel', c: '#e8eef2', a: [x, TOP + 0.72, z], b: [x, TOP + 0.66, z + 0.55], r: 0.05 });
  }
};

// ---------------------------------------------------------------------------
// Stainless bench with colour-coded boards, produce and trays
// ---------------------------------------------------------------------------
type Produce = (b: PrimBuilder, x: number, y: number, z: number, odd: boolean) => void;

/** Carrot-like cone lying along the bench. */
const lyingCone = (b: PrimBuilder, c: string, x: number, y: number, z: number, r: number, h: number) =>
  b.cone({ m: 'matte', c, r, h, x, y: y + r - h / 2, z, rz: 90, shadow: false });
const lyingBar = (b: PrimBuilder, c: string, x: number, y: number, z: number, r: number, h: number) =>
  b.cyl({ m: 'matte', c, r, h, x, y: y + r - h / 2, z, rz: 90, shadow: false });

const PRODUCE: Record<string, Produce> = {
  veg: (b, x, y, z, odd) => {
    if (!odd) {
      b.sph({ m: 'matte', c: '#86bf6a', r: 0.27, x, y: y + 0.25, z, sy: 0.9 });
      b.sph({ m: 'gloss', c: '#d9482b', r: 0.13, x: x + 0.45, y: y + 0.13, z: z + 0.15 });
    } else {
      for (let k = 0; k < 3; k++) lyingCone(b, '#e8892e', x - 0.1 + k * 0.05, y, z - 0.2 + k * 0.2, 0.07, 0.62);
    }
  },
  // Jain kitchens leave out root vegetables: gourds, beans and peppers only.
  jain: (b, x, y, z, odd) => {
    if (!odd) {
      b.sph({ m: 'matte', c: '#a8cf7b', r: 0.2, x: x - 0.1, y: y + 0.19, z, sx: 2.2, sy: 0.95 });
      b.sph({ m: 'gloss', c: '#d8542b', r: 0.14, x: x + 0.5, y: y + 0.14, z: z + 0.12 });
    } else {
      for (let k = 0; k < 3; k++) lyingBar(b, '#4f9a45', x - 0.1, y, z - 0.18 + k * 0.17, 0.03, 0.55);
    }
  },
  vegan: (b, x, y, z, odd) => {
    if (!odd) {
      b.box({ m: 'matte', c: '#f4ead2', x, y, z, w: 0.52, h: 0.2, d: 0.36 });
      b.box({ m: 'matte', c: '#efe3c6', x: x + 0.03, y: y + 0.2, z: z + 0.02, w: 0.5, h: 0.2, d: 0.34 });
    } else {
      b.sph({ m: 'gloss', c: '#4b2a6b', r: 0.16, x: x - 0.25, y: y + 0.15, z, sx: 1.9, sy: 0.9 });
      b.sph({ m: 'matte', c: '#4f9a45', r: 0.27, x: x + 0.4, y: y + 0.12, z: z + 0.1, sy: 0.45 });
    }
  },
  nonveg: (b, x, y, z, odd) => {
    if (!odd) {
      for (const k of [-1, 1]) b.sph({ m: 'gloss', c: '#e9bfa6', r: 0.2, x: x + k * 0.3, y: y + 0.11, z: z + k * 0.05, sx: 1.3, sy: 0.55 });
    } else {
      b.sph({ m: 'gloss', c: '#97aab4', r: 0.17, x: x - 0.1, y: y + 0.09, z, sx: 2.4, sy: 0.5 });
      b.box({ m: 'matte', c: '#97aab4', x: x + 0.42, y, z, w: 0.16, h: 0.05, d: 0.22, ry: 35, shadow: false });
    }
  },
};

const bench: KindBuilder = (b, it) => {
  const { w, d } = it;
  const zone = zoneOf(it);
  const t = 0.12;
  b.box({ m: 'gloss', c: SATIN_STEEL, y: TOP - t, w, h: t, d });
  b.box({ m: 'steel', c: STEEL_DARK, y: TOP - t - 0.35, z: d / 2 - 0.1, w: w - 0.1, h: 0.35, d: 0.06 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    b.box({ m: 'steel', c: STEEL_DARK, x: sx * (w / 2 - 0.1), z: sz * (d / 2 - 0.1), w: 0.1, h: TOP - t, d: 0.1 });
  }
  b.box({ m: 'steel', c: STEEL_DARK, y: 0.6, w: w - 0.2, h: 0.07, d: d - 0.2 });
  b.box({ m: 'gloss', c: SATIN_STEEL, y: TOP, z: -d / 2 + 0.05, w, h: 0.55, d: 0.1 });
  // zone colour on the front edge of the top and as a rail along the splashback
  b.box({ m: 'matte', c: zone, y: TOP - 0.12, z: d / 2 + 0.025, w, h: 0.12, d: 0.05, shadow: false });
  b.box({ m: 'matte', c: zone, y: TOP + 0.5, z: -d / 2 + 0.05, w, h: 0.1, d: 0.13, shadow: false });

  const rnd = rng(it.x * 31 + it.z * 17 + 1);
  // the key light bleaches upward faces, so the boards are a shade deeper than the zone colour
  const boardColor = tint(zone, -0.16);
  const produce = PRODUCE[String(it.props?.produce ?? '')];
  const n = Math.max(2, Math.round((w - 0.2) / 1.5));
  const pitch = (w - 0.3) / n;
  let boards = 0;
  for (let i = 0; i < n; i++) {
    const x = -w / 2 + 0.15 + pitch * (i + 0.5);
    if (i % 3 === 1) {
      // steel gastronorm tray with the zone's prepped food
      const tw = pitch - 0.25, td = Math.min(0.75, d - 0.5);
      b.box({ m: 'gloss', c: tint(SATIN_STEEL, -0.18), x, y: TOP, z: 0.05, w: tw, h: 0.2, d: td });
      b.box({ m: 'matte', c: tint(zone, -0.12), x, y: TOP + 0.12, z: 0.05, w: tw - 0.12, h: 0.1, d: td - 0.12, shadow: false });
      continue;
    }
    const z = 0.05;
    b.box({ m: 'matte', c: boardColor, x, y: TOP, z, w: Math.min(1.45, pitch - 0.1), h: 0.08, d: Math.min(0.95, d - 0.45), ry: (rnd() - 0.5) * 8 });
    if (produce && boards < 2) produce(b, x, TOP + 0.08, z, boards % 2 === 1);
    boards++;
  }
};

// ---------------------------------------------------------------------------
// Wall shelf with zone-coloured lidded tubs (herbs for the Vegan room)
// ---------------------------------------------------------------------------
const shelf: KindBuilder = (b, it) => {
  const { w, d } = it;
  const zone = zoneOf(it);
  const y = it.h ?? 4.5;
  wallShelf(b, { w, d, h: y });
  b.box({ m: 'gloss', c: SATIN_STEEL, y: y + 0.08, z: -d / 2 + 0.03, w, h: 0.5, d: 0.06 });
  b.box({ m: 'matte', c: zone, y: y - 0.08, z: d / 2 - 0.01, w, h: 0.1, d: 0.04, shadow: false });
  const n = Math.max(2, Math.floor((w - 0.2) / 1.05));
  const pitch = w / n;
  const heights = [0.5, 0.66, 0.42];
  for (let i = 0; i < n; i++) {
    const x = -w / 2 + pitch * (i + 0.5);
    if (it.props?.herbs && i === n - 1) {
      plant(b, { x, y: y + 0.08, z: 0, s: 0.55 });
      continue;
    }
    const h = heights[i % heights.length];
    tub(b, { x, y: y + 0.08, z: 0.02, w: 0.8, d: d - 0.22, h, c: TUB_BODY, lid: zone });
    if (i === 0) tub(b, { x, y: y + 0.08 + h, z: 0.02, w: 0.8, d: d - 0.22, h: 0.4, c: TUB_BODY, lid: zone });
  }
};

// ---------------------------------------------------------------------------
// Zone-coloured step bin
// ---------------------------------------------------------------------------
const bin: KindBuilder = (b, it) => {
  const zone = zoneOf(it);
  const r = Math.min(it.w, it.d) / 2;
  zoneBin(b, { r, h: it.h ?? 2.3, c: zone, lid: tint(zone, 0.22) });
  b.box({ m: 'steel', c: STEEL_DARK, y: 0.05, z: r + 0.08, w: 0.36, h: 0.06, d: 0.16, shadow: false });
};

// ---------------------------------------------------------------------------
// Blast chiller (Non-Veg): tall stainless cabinet with a window, handle and control panel
// ---------------------------------------------------------------------------
const chiller: KindBuilder = (b, it) => {
  const { w, d } = it;
  const h = it.h ?? 6;
  const fz = d / 2;
  b.box({ m: 'gloss', c: SATIN_STEEL, w, h, d });
  b.box({ m: 'matte', c: CHARCOAL, w: w + 0.02, h: 0.3, d: d + 0.02, shadow: false });
  b.box({ m: 'gloss', c: tint(SATIN_STEEL, 0.25), y: 0.45, z: fz + 0.03, w: w - 0.2, h: 4.3, d: 0.06 });
  // viewing window and handle
  b.box({ m: 'matte', c: '#27363b', x: -0.12, y: 1.15, z: fz + 0.065, w: w * 0.5, h: 2.3, d: 0.02, shadow: false });
  b.box({ m: 'glass', c: '#bfe3e8', x: -0.12, y: 1.15, z: fz + 0.09, w: w * 0.5, h: 2.3, d: 0.02 });
  const hx = w / 2 - 0.3;
  b.pipe({ m: 'steel', c: STEEL_DARK, a: [hx, 1.4, fz + 0.2], b: [hx, 3.5, fz + 0.2], r: 0.05 });
  for (const y of [1.55, 3.35]) b.box({ m: 'steel', c: STEEL_DARK, x: hx, y, z: fz + 0.12, w: 0.07, h: 0.07, d: 0.14, shadow: false });
  // name plate, then the control panel with display and status lights
  b.sign({ text: 'BLAST CHILLER', x: 0, y: 4.3, z: fz + 0.07, w: w - 0.5, h: 0.3, bg: BRAND.teal, fg: BRAND.cream, tracking: 0.1 });
  b.box({ m: 'matte', c: '#2b3236', y: 4.9, z: fz + 0.03, w: w - 0.2, h: 0.95, d: 0.08 });
  b.box({ m: 'emissive', c: '#7fe3ef', x: -0.3, y: 5.3, z: fz + 0.075, w: 0.75, h: 0.28, d: 0.02 });
  b.box({ m: 'emissive', c: '#62f0a8', x: 0.55, y: 5.4, z: fz + 0.075, w: 0.1, h: 0.1, d: 0.02 });
  b.box({ m: 'emissive', c: '#ff9a4d', x: 0.8, y: 5.4, z: fz + 0.075, w: 0.1, h: 0.1, d: 0.02 });
  b.box({ m: 'matte', c: CHARCOAL, x: 0, y: h, z: -0.2, w: w * 0.5, h: 0.14, d: d * 0.4, shadow: false });
};

// ---------------------------------------------------------------------------
// Wall-hung hand-wash basin with soap and towel dispensers
// ---------------------------------------------------------------------------
const handBasin: KindBuilder = (b, it) => {
  const { w, d } = it;
  const zone = zoneOf(it);
  b.box({ m: 'steel', c: STEEL_DARK, y: 2.5, z: -d / 2 + 0.1, w: w - 0.2, h: 0.35, d: 0.2 });
  b.box({ m: 'gloss', c: '#f1f4f4', y: 2.8, w, h: 0.4, d });
  b.box({ m: 'gloss', c: '#b4bec4', y: 3.19, w: w - 0.3, h: 0.02, d: d - 0.3, shadow: false });
  b.cyl({ m: 'steel', c: '#e8eef2', r: 0.04, y: 3.2, z: -d / 2 + 0.15, h: 0.45 });
  b.pipe({ m: 'steel', c: '#e8eef2', a: [0, 3.65, -d / 2 + 0.15], b: [0, 3.6, -d / 2 + 0.5], r: 0.04 });
  b.box({ m: 'matte', c: zone, x: 0.4, y: 3.75, z: -d / 2 + 0.1, w: 0.24, h: 0.4, d: 0.18 });
  b.box({ m: 'matte', c: '#e6e3da', x: -0.35, y: 3.65, z: -d / 2 + 0.11, w: 0.5, h: 0.5, d: 0.2 });
};

export const prepRoomKinds: Record<string, KindBuilder> = {
  'prep.sink': sink,
  'prep.bench': bench,
  'prep.shelf': shelf,
  'prep.bin': bin,
  'prep.chiller': chiller,
  'prep.handBasin': handBasin,
};
