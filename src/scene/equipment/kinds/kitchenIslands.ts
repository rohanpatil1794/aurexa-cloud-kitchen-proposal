// Kind builders for the Main Hot Kitchen's four cuisine islands, the pass counter and the small
// working-kitchen touches (racks, hand-wash, drains). Data: src/data/equipment/kitchenIslands.ts.
//
// Island anatomy (all four): a closed stainless cabinet on the north 4 ft carrying the signature
// equipment, an open prep bench with undershelf on the south 2 ft, a coloured kick plinth, a floor
// decal (accent pad + cuisine name) and a hanging name sign at 7 ft. Accent colours are brand, never zone.
import * as THREE from 'three';
import { BRAND } from '../../../lib/palette';
import type { PrimBuilder } from '../../../lib/prims';
import { CHARCOAL, STEEL, STEEL_DARK } from '../../../lib/kit';
import type { EquipItem } from '../../../data/types';
import { registerKinds } from '../registry';
import { COPPER, IRON, TOP, WOK_STEEL, WOOD, cabinet, cloche, openBench, pan, pot } from './kitchenIslandsParts';

const CLAY = '#a8501f';
const TILE = '#7c3a1c';
const BAMBOO = '#b08040';
const BAMBOO_DARK = '#8a5f2a';
const PAPER = '#f6f1e4';
/** Turmeric, chilli, coriander, cumin, garam masala, fenugreek, paprika, cardamom, salt. */
const SPICES = ['#d9a441', '#b23a1c', '#8f854a', '#8a5a2a', '#5a2a14', '#c8923a', '#cb622a', '#7d8a4a', '#efe3c8'];
/** Unlit glow colours (> 1 so they bloom against the tone mapper). */
const GLOW_FLAME = new THREE.Color(1.6, 0.55, 0.15);
const GLOW_GAS = new THREE.Color(0.08, 0.3, 1.2);
const GLOW_LAMP = new THREE.Color(1.5, 0.78, 0.35);
/** Ticket stripe colours = the four island accents. */
const TICKET_STRIPES = [BRAND.orange, BRAND.teal, BRAND.olive, BRAND.sand];
/** Underside of the ceiling slab: hanging rods stop here. */
const CEILING = 10;

/** Unit vectors (x, z) to the three pot rests around a wok burner. */
const WOK_RESTS: [number, number][] = [[0, 1], [-0.866, -0.5], [0.866, -0.5]];

const _tint = new THREE.Color();
/** An accent darkened for lit floor surfaces (the key light washes pale tones out). */
const deepen = (hex: string, factor: number) => `#${_tint.set(hex).multiplyScalar(factor).getHexString()}`;

const num = (it: EquipItem, key: string, fallback: number) => {
  const v = it.props?.[key];
  return typeof v === 'number' ? v : fallback;
};
const str = (it: EquipItem, key: string, fallback: string) => {
  const v = it.props?.[key];
  return typeof v === 'string' ? v : fallback;
};

/** Closed cabinet (north) + open prep bench with undershelf (south 2 ft) for a 6 ft deep island. */
function islandBase(b: PrimBuilder, it: EquipItem, seed: number) {
  const accent = it.color ?? BRAND.teal;
  const benchD = 2;
  const cabD = it.d - benchD;
  cabinet(b, { x: 0, z: -it.d / 2 + cabD / 2, w: it.w, d: cabD, accent, doors: { n: 3, e: 1, w: 1 } });
  openBench(b, { x: 0, z: it.d / 2 - benchD / 2, w: it.w, d: benchD, seed });
}

/**
 * Round pan hanging from a rail by its hook. The convex back faces away from `open` (+1 = +z, -1 = -z),
 * where a darker interior shows, so the pan reads as a pan and not as a disc.
 */
function hangingPan(b: PrimBuilder, o: { x: number; z: number; railY: number; drop: number; r: number; copper: boolean; open: 1 | -1 }) {
  const { x, z, r } = o;
  const cy = o.railY - o.drop - r + 0.12;
  b.pipe({ m: 'steel', c: STEEL_DARK, a: [x, o.railY, z], b: [x, cy + r, z], r: 0.02 });
  b.cyl({ m: o.copper ? 'gloss' : 'matte', c: o.copper ? COPPER : IRON, x, y: cy - 0.07, z, r, h: 0.14, rx: 90 });
  b.cyl({ m: 'matte', c: o.copper ? '#6e3213' : '#3c454a', x, y: cy - 0.01, z: z + o.open * 0.071, r: r * 0.74, h: 0.02, rx: 90, shadow: false });
}

registerKinds({
  // ---------------------------------------------------------------- INDIAN
  'kitchenIslands.indian': (b, it) => {
    islandBase(b, it, 0);
    const z = -it.d / 2 + 0.3;
    // masala shelf along the north edge: a row of spice jars
    for (const sx of [-1, 1]) b.box({ m: 'steel', c: STEEL_DARK, x: sx * 2.4, y: TOP, z, w: 0.07, h: 1.3, d: 0.07 });
    b.box({ m: 'steel', c: STEEL, y: 4.3, z, w: 4.9, h: 0.07, d: 0.5 });
    SPICES.forEach((c, i) => b.cyl({ m: 'gloss', c, x: -2 + i * 0.5, y: 4.37, z, r: 0.13, h: 0.32 }));
    // west flank: two pots
    pot(b, { x: -2, y: TOP, z: -1.8, r: 0.3, h: 0.5 });
    pot(b, { x: -2, y: TOP, z: -0.6, r: 0.3, h: 0.4, copper: true });
    // east flank: tawa and a stack of naan
    b.cyl({ m: 'matte', c: IRON, x: 2, y: TOP, z: -1.2, r: 0.5, h: 0.05 });
    b.pipe({ m: 'matte', c: WOOD, a: [2, 3.07, -0.72], b: [2, 3.1, 0], r: 0.04 });
    b.cyl({ m: 'matte', c: '#e0c48a', x: 2, y: TOP, z: 0.55, r: 0.4, h: 0.14 });
    // serving tray on the prep bench
    b.box({ m: 'steel', c: STEEL, y: TOP, z: 2, w: 1, h: 0.05, d: 0.8 });
    ['#d9a441', '#b04a22', BRAND.olive].forEach((c, i) => b.cyl({ m: 'gloss', c, x: (i - 1) * 0.33, y: TOP + 0.05, z: 2, r: 0.15, h: 0.15 }));
  },

  // Clay pot oven set into a tiled collar: bulging belly, copper band, narrow neck with a glowing mouth.
  'kitchenIslands.tandoor': (b, it) => {
    const r = it.w / 2 - 0.25;
    b.cyl({ m: 'matte', c: TILE, y: TOP, r: it.w / 2, h: 0.32 });
    b.sph({ m: 'matte', c: CLAY, y: TOP + 0.9, r, sy: 0.8 });
    b.cyl({ m: 'gloss', c: COPPER, y: TOP + 0.86, r: r + 0.02, h: 0.08 });
    b.cyl({ m: 'matte', c: CLAY, y: TOP + 1.7, r: 0.62, h: 0.2 });
    b.cyl({ m: 'gloss', c: COPPER, y: TOP + 1.86, r: 0.68, h: 0.07 });
    b.cyl({ m: 'emissive', c: GLOW_FLAME, y: TOP + 1.93, r: 0.5, h: 0.02 });
  },

  'kitchenIslands.gasRing': (b, it) => {
    b.cyl({ m: 'steel', c: STEEL_DARK, y: TOP, r: 0.6, h: 0.42 });
    b.cyl({ m: 'matte', c: IRON, y: TOP + 0.42, r: 0.5, h: 0.07 });
    b.cyl({ m: 'steel', c: STEEL, y: TOP + 0.49, r: 0.2, h: 0.04 });
    if (str(it, 'pot', 'steel') === 'copper') {
      b.sph({ m: 'gloss', c: COPPER, y: TOP + 0.9, r: 0.52, sy: 0.75 });
      b.cyl({ m: 'gloss', c: '#8f4a22', y: TOP + 1.24, r: 0.3, h: 0.07 });
      b.sph({ m: 'gloss', c: '#8f4a22', y: TOP + 1.34, r: 0.07 });
    } else {
      pot(b, { x: 0, y: TOP + 0.49, z: 0, r: 0.45, h: 0.9 });
    }
  },

  // --------------------------------------------------------------- CHINESE
  'kitchenIslands.chinese': (b, it) => {
    islandBase(b, it, 1);
    // ladle rail behind the wok line (burners are centred on z 26.5, local -0.5)
    const z = -1.75;
    for (const sx of [-1, 1]) b.box({ m: 'steel', c: STEEL_DARK, x: sx * 2.8, y: TOP, z, w: 0.07, h: 1.4, d: 0.07 });
    b.pipe({ m: 'steel', c: STEEL, a: [-2.85, 4.4, z], b: [2.85, 4.4, z], r: 0.035 });
    for (const x of [-2.6, -0.85, 1.25, 2.7]) {
      b.pipe({ m: 'steel', c: STEEL, a: [x, 4.4, z], b: [x, 3.6, z], r: 0.025 });
      b.sph({ m: 'steel', c: STEEL, x, y: 3.56, z, r: 0.15, sy: 0.55 });
    }
    // steamer stacks and a stock pot on the north strip
    for (const x of [-2.2, 2.3]) {
      for (let k = 0; k < 3; k++) b.cyl({ m: 'matte', c: k % 2 ? BAMBOO_DARK : BAMBOO, x, y: TOP + k * 0.3, z: -2.35, r: 0.5, h: 0.3 });
      b.cone({ m: 'matte', c: '#8a5a2a', x, y: TOP + 0.9, z: -2.35, r: 0.55, h: 0.22 });
    }
    pot(b, { x: 0.2, y: TOP, z: -2.35, r: 0.55, h: 0.9 });
    // sauce rack and a board on the bench
    b.box({ m: 'steel', c: STEEL, y: TOP, z: 1.9, w: 3.2, h: 0.05, d: 0.5 });
    ['#5a2a14', '#b23a1c', '#e8d9b0', BRAND.olive, BRAND.orange, '#3b2a1a', '#d9a441'].forEach((c, i) =>
      b.cyl({ m: 'gloss', c, x: -1.5 + i * 0.5, y: TOP + 0.05, z: 1.9, r: 0.15, h: 0.16 }));
    b.box({ m: 'matte', c: WOOD, x: 2.2, y: TOP, z: 1.8, w: 1.1, h: 0.07, d: 0.8 });
  },

  'kitchenIslands.wok': (b) => {
    b.cyl({ m: 'steel', c: STEEL_DARK, y: TOP, r: 0.64, h: 0.45 });
    b.cyl({ m: 'emissive', c: GLOW_GAS, y: TOP + 0.45, r: 0.38, h: 0.03 });
    for (const [ux, uz] of WOK_RESTS) b.box({ m: 'matte', c: IRON, x: 0.44 * ux, y: TOP + 0.45, z: 0.44 * uz, w: 0.12, h: 0.42, d: 0.12, shadow: false });
    // wok = flared bowl (flipped cone), steel rim and dark interior
    b.cone({ m: 'steel', c: WOK_STEEL, y: TOP + 0.58, r: 0.66, h: 0.42, rx: 180 });
    b.cyl({ m: 'steel', c: STEEL, y: TOP + 0.97, r: 0.69, h: 0.05 });
    b.cyl({ m: 'matte', c: '#171c1e', y: TOP + 1.02, r: 0.6, h: 0.01, shadow: false });
    b.pipe({ m: 'steel', c: STEEL_DARK, a: [0, TOP + 0.99, 0.62], b: [0, TOP + 1.1, 1.25], r: 0.04 });
    b.pipe({ m: 'matte', c: WOOD, a: [0, TOP + 1.1, 1.0], b: [0, TOP + 1.12, 1.25], r: 0.06 });
    // gooseneck water tap behind the wok
    b.pipe({ a: [0, TOP + 0.5, -0.66], b: [0, TOP + 1.2, -0.66], r: 0.04 });
    b.pipe({ a: [0, TOP + 1.2, -0.66], b: [0, TOP + 1.2, -0.05], r: 0.04 });
    b.pipe({ a: [0, TOP + 1.2, -0.05], b: [0, TOP + 0.98, -0.05], r: 0.04 });
  },

  // ----------------------------------------------------------- CONTINENTAL
  'kitchenIslands.continental': (b, it) => {
    islandBase(b, it, 2);
    // overshelf along the north edge with plates and containers
    const z = -it.d / 2 + 0.3;
    for (const sx of [-1, 1]) b.box({ m: 'steel', c: STEEL_DARK, x: sx * 2.2, y: TOP, z, w: 0.07, h: 1.55, d: 0.07 });
    b.box({ m: 'steel', c: STEEL, y: 4.55, z, w: 4.6, h: 0.07, d: 0.6 });
    for (const x of [-1.5, -0.6, 0.3]) b.cyl({ m: 'gloss', c: '#f4f1ea', x, y: 4.62, z, r: 0.4, h: 0.22 });
    for (const x of [1.2, 1.9]) b.cyl({ m: 'steel', c: STEEL, x, y: 4.62, z, r: 0.3, h: 0.4 });
    // boards and mise-en-place on the bench
    b.box({ m: 'matte', c: '#ece3cf', x: -1.7, y: TOP, z: 2, w: 0.9, h: 0.06, d: 0.65 });
    b.box({ m: 'matte', c: '#c19a6b', x: -0.55, y: TOP, z: 2, w: 0.9, h: 0.06, d: 0.65 });
    pan(b, { x: 0.7, y: TOP, z: 1.85, w: 0.9, d: 0.6, food: '#c8452c' });
    pan(b, { x: 1.7, y: TOP, z: 1.85, w: 0.9, d: 0.6, food: '#9aae5a' });
    pan(b, { x: 0.7, y: TOP, z: 2.5, w: 0.9, d: 0.5, food: '#efe3c8' });
    pan(b, { x: 1.7, y: TOP, z: 2.5, w: 0.9, d: 0.5, food: '#d9a441' });
  },

  'kitchenIslands.griddle': (b, it) => {
    const { w, d } = it;
    const trough = 0.25;
    b.box({ m: 'steel', c: '#59646b', y: TOP, z: -trough / 2, w, h: 0.14, d: d - trough });
    b.box({ m: 'steel', c: STEEL, y: TOP, z: -d / 2 + 0.06, w, h: 0.5, d: 0.12 });
    for (const sx of [-1, 1]) b.box({ m: 'steel', c: STEEL, x: sx * (w / 2 - 0.05), y: TOP, z: -trough / 2, w: 0.1, h: 0.26, d: d - trough });
    b.box({ m: 'matte', c: '#2b3236', y: TOP, z: d / 2 - trough / 2, w: w - 0.2, h: 0.12, d: trough });
    // burgers, onions and a spatula
    for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) {
      b.cyl({ m: 'matte', c: '#6d3b22', x: -1.6 + i * 0.7, y: TOP + 0.14, z: -0.5 + j * 0.8, r: 0.26, h: 0.07, shadow: false });
    }
    b.cyl({ m: 'matte', c: '#e9d8a6', x: 1.15, y: TOP + 0.14, z: -0.3, r: 0.3, h: 0.06, shadow: false });
    b.cyl({ m: 'matte', c: '#e9d8a6', x: 1.6, y: TOP + 0.14, z: 0.35, r: 0.26, h: 0.06, shadow: false });
    b.box({ m: 'steel', c: STEEL, x: 0.55, y: TOP + 0.14, z: 0.2, w: 0.2, h: 0.02, d: 0.4, ry: 20, shadow: false });
    b.box({ m: 'matte', c: WOOD, x: 0.43, y: TOP + 0.15, z: 0.52, w: 0.07, h: 0.07, d: 0.45, ry: 20, shadow: false });
  },

  // -------------------------------------------------------------- EUROPEAN
  // One 4-burner range with oven; faces +z (south). The data rotates it 90 degrees so cooks work from the east.
  'kitchenIslands.range': (b, it) => {
    const accent = it.color ?? BRAND.sand;
    const { w } = it;
    b.box({ m: 'matte', c: accent, z: 0.15, w: w - 0.1, h: 0.3, d: 2.5 });
    b.box({ m: 'steel', c: '#b3bec8', y: 0.3, z: 0.15, w: w - 0.06, h: TOP - 0.42, d: 2.7 });
    b.box({ m: 'steel', c: STEEL, y: TOP - 0.12, z: 0.15, w, h: 0.12, d: 2.76 });
    b.box({ m: 'steel', c: STEEL, y: TOP, z: -1.35, w, h: 0.8, d: 0.3 });
    // oven door, window, handle and control strip with four knobs
    b.box({ m: 'steel', c: STEEL, x: 0, y: 0.45, z: 1.52, w: w - 0.4, h: 1.4, d: 0.05 });
    b.box({ m: 'matte', c: '#20272a', y: 0.75, z: 1.56, w: w - 1.2, h: 0.7, d: 0.02, shadow: false });
    b.box({ m: 'matte', c: CHARCOAL, y: 1.78, z: 1.6, w: w - 0.9, h: 0.07, d: 0.08, shadow: false });
    b.box({ m: 'steel', c: STEEL_DARK, y: 2.15, z: 1.5, w: w - 0.1, h: 0.55, d: 0.06 });
    for (let i = 0; i < 4; i++) b.cyl({ m: 'matte', c: CHARCOAL, x: -1.05 + i * 0.7, y: 2.37, z: 1.58, r: 0.09, h: 0.1, rx: 90, shadow: false });
    // four burners: iron grate disc, cross bars and a cap that glows blue where no pot stands
    const setA = str(it, 'set', 'a') === 'a';
    const potted = setA ? [[0.72, -0.45], [-0.72, 0.6]] : [[-0.72, -0.45], [0.72, 0.6]];
    for (const gx of [-0.72, 0.72]) for (const gz of [-0.45, 0.6]) {
      const lit = !potted.some(([px, pz]) => px === gx && pz === gz);
      b.cyl({ m: 'matte', c: IRON, x: gx, y: TOP, z: gz, r: 0.44, h: 0.05 });
      b.box({ m: 'matte', c: IRON, x: gx, y: TOP + 0.05, z: gz, w: 1, h: 0.05, d: 0.07, shadow: false });
      b.box({ m: 'matte', c: IRON, x: gx, y: TOP + 0.05, z: gz, w: 0.07, h: 0.05, d: 1, shadow: false });
      b.cyl({ m: lit ? 'emissive' : 'steel', c: lit ? GLOW_GAS : STEEL, x: gx, y: TOP + 0.05, z: gz, r: 0.18, h: 0.04, shadow: false });
    }
    // cookware: a different pair on each range
    if (setA) {
      pot(b, { x: 0.72, y: TOP + 0.05, z: -0.45, r: 0.5, h: 0.95 });
      b.cyl({ m: 'matte', c: IRON, x: -0.72, y: TOP + 0.05, z: 0.6, r: 0.5, h: 0.1 });
      b.pipe({ m: 'steel', c: STEEL_DARK, a: [-0.72, TOP + 0.15, 1.05], b: [-0.72, TOP + 0.15, 1.8], r: 0.04 });
    } else {
      pot(b, { x: -0.72, y: TOP + 0.05, z: -0.45, r: 0.4, h: 0.55, copper: true });
      b.cyl({ m: 'steel', c: STEEL, x: 0.72, y: TOP + 0.05, z: 0.6, r: 0.46, h: 0.16 });
      b.pipe({ m: 'steel', c: STEEL_DARK, a: [0.72, TOP + 0.2, 1.05], b: [0.72, TOP + 0.2, 1.8], r: 0.04 });
    }
  },

  // Overhead pot rail over the ranges' backguards. Rotated 90 degrees in the data, so the rail runs north-south.
  'kitchenIslands.potRack': (b, it) => {
    const half = it.w / 2 - 0.15;
    for (const sx of [-1, 1]) b.box({ m: 'steel', c: STEEL_DARK, x: sx * half, y: TOP + 0.8, w: 0.07, h: 1.25, d: 0.07 });
    b.pipe({ m: 'steel', c: STEEL, a: [-half, 5, 0], b: [half, 5, 0], r: 0.035 });
    [-2, -1, 0, 1, 2].forEach((x, i) => hangingPan(b, { x, z: 0, railY: 5, drop: 0.4, r: 0.42, copper: i % 2 === 0, open: 1 }));
  },

  // ------------------------------------------------------- DECAL + NAME SIGN
  // Floor decal: accent pad under the island, plus a text strip along its south edge.
  // props.strip = strip depth (ft), props.padW = island pad width when the strip is wider, props.fg = text colour.
  'kitchenIslands.decal': (b, it) => {
    const { w, d } = it;
    const strip = num(it, 'strip', 1.5);
    const padW = num(it, 'padW', w);
    const accent = deepen(it.color ?? BRAND.teal, 0.6);
    const fg = str(it, 'fg', BRAND.cream);
    b.box({ m: 'matte', c: accent, x: -w / 2 + padW / 2, y: 0.03, z: -strip / 2, w: padW, h: 0.025, d: d - strip, shadow: false });
    b.box({ m: 'matte', c: accent, y: 0.03, z: d / 2 - strip / 2, w, h: 0.025, d: strip, shadow: false });
    // thin inset outline around the strip
    const x0 = -w / 2 + 0.12, x1 = w / 2 - 0.12, z0 = d / 2 - strip + 0.12, z1 = d / 2 - 0.12;
    const t = 0.05;
    for (const z of [z0, z1]) b.box({ m: 'matte', c: fg, y: 0.055, z, w: x1 - x0, h: 0.015, d: t, shadow: false });
    for (const x of [x0, x1]) b.box({ m: 'matte', c: fg, x, y: 0.055, z: (z0 + z1) / 2, w: t, h: 0.015, d: z1 - z0, shadow: false });
    b.sign({
      text: it.label ?? '', x: 0, y: 0.08, z: d / 2 - strip / 2, w: w - 0.5, h: strip - 0.4, rx: -90, fg, tracking: 0.1, weight: 800,
    });
  },

  // Hanging name sign: framed board at 7 ft on two rods to the ceiling, readable from both sides.
  'kitchenIslands.sign': (b, it) => {
    const { w } = it;
    const accent = it.color ?? BRAND.teal;
    const fg = str(it, 'fg', BRAND.cream);
    const h = 1;
    const y = 7;
    b.box({ m: 'matte', c: CHARCOAL, y: y - h / 2 - 0.06, w: w + 0.12, h: h + 0.12, d: 0.1, shadow: false });
    const face = { text: it.label ?? '', y, w, h, fg, bg: accent, emissive: true, tracking: 0.1, weight: 800 };
    b.sign({ ...face, z: 0.052 });
    b.sign({ ...face, z: -0.052, ry: 180 });
    for (const sx of [-1, 1]) {
      const x = sx * (w / 2 - 0.45);
      b.pipe({ m: 'steel', c: STEEL_DARK, a: [x, y + h / 2 + 0.06, 0], b: [x, CEILING - 0.04, 0], r: 0.03 });
      b.cyl({ m: 'matte', c: CHARCOAL, x, y: CEILING - 0.05, r: 0.14, h: 0.05, shadow: false });
    }
  },

  // ------------------------------------------------------------------ PASS
  'kitchenIslands.pass': (b, it) => {
    cabinet(b, { x: 0, z: 0, w: it.w, d: it.d, accent: it.color ?? BRAND.teal, doors: { n: 6 } });
    // plaque on the first door, seen from the cooks' side (north)
    b.frame({ ry: 180 }, () =>
      b.sign({ text: 'PASS', x: 7, y: 2.2, z: it.d / 2 + 0.06, w: 1.4, h: 0.36, bg: CHARCOAL, fg: BRAND.cream, emissive: true, tracking: 0.2 }));
    // plated dishes under cloches
    for (const x of [-5.8, -4.2, 0.2, 4.9, 6.7]) cloche(b, { x, z: 0.25 });
    // plate stacks, service bell and the ticket printer between the gantry posts
    for (const x of [-7.4, 7.9]) for (let k = 0; k < 6; k++) b.cyl({ m: 'gloss', c: '#f4f1ea', x, y: TOP + k * 0.06, z: 0.3, r: 0.4, h: 0.05 });
    b.cyl({ m: 'steel', c: STEEL, x: -1.4, y: TOP, z: 0.3, r: 0.17, h: 0.05 });
    b.sph({ m: 'steel', c: STEEL, x: -1.4, y: TOP + 0.05, z: 0.3, r: 0.13, sy: 0.7 });
    b.box({ m: 'matte', c: CHARCOAL, x: 1.7, y: TOP, z: 0.2, w: 0.42, h: 0.22, d: 0.4 });
    b.box({ m: 'matte', c: PAPER, x: 1.7, y: TOP + 0.22, z: 0.12, w: 0.18, h: 0.12, d: 0.02, shadow: false });
  },

  'kitchenIslands.hotHold': (b, it) => {
    cabinet(b, { x: 0, z: 0, w: it.w, d: it.d, accent: it.color ?? BRAND.teal, doors: { n: 4 } });
    b.box({ m: 'steel', c: STEEL, y: TOP, z: -0.1, w: it.w - 0.2, h: 0.1, d: 1.6 });
    ['#efe3c8', '#d9a441', BRAND.orange, BRAND.olive].forEach((food, i) =>
      pan(b, { x: -1.95 + i * 1.3, y: TOP + 0.1, z: -0.1, w: 1.2, d: 1.35, food }));
    // sneeze guard on the window side
    for (const sx of [-1, 1]) b.box({ m: 'steel', c: STEEL_DARK, x: sx * (it.w / 2 - 0.12), y: TOP, z: 0.7, w: 0.05, h: 1.4, d: 0.05 });
    b.box({ m: 'glass', c: '#bfe0e2', y: 3.45, z: 0.7, w: it.w - 0.3, h: 0.95, d: 0.03 });
    b.pipe({ m: 'steel', c: STEEL, a: [-(it.w / 2 - 0.12), 4.4, 0.7], b: [it.w / 2 - 0.12, 4.4, 0.7], r: 0.03 });
  },

  // Gantry over the pass: heat lamps (warm glowing bar + shades) and an order-ticket rail. Overhead.
  // Lamp and ticket x positions are relative to the gantry centre and sit between its five posts.
  'kitchenIslands.heatLamp': (b, it) => {
    const half = it.w / 2 - 0.2;
    for (const x of [-half, -half / 2, 0, half / 2, half]) b.box({ m: 'steel', c: STEEL_DARK, x, y: TOP, w: 0.1, h: 2.95, d: 0.1 });
    b.pipe({ m: 'steel', c: STEEL, a: [-half, 5.95, 0], b: [half, 5.95, 0], r: 0.04 });
    b.box({ m: 'emissive', c: GLOW_LAMP, x: 0, y: 5.6, w: it.w - 0.9, h: 0.12, d: 0.45 });
    for (const x of [-9.6, -6.9, -4.1, -1.4, 1.4, 4.1, 6.9, 9.6]) {
      b.cone({ m: 'gloss', c: '#c9c2b2', x, y: 5.3, z: 0, r: 0.2, h: 0.28, rx: 180, shadow: false });
      b.cyl({ m: 'emissive', c: GLOW_LAMP, x, y: 5.28, r: 0.14, h: 0.02 });
    }
    // ticket rail with clipped tickets, stripes in the four station colours
    b.pipe({ m: 'steel', c: STEEL, a: [-half, 4.9, -0.14], b: [half, 4.9, -0.14], r: 0.025 });
    [-9, -7.7, -6.2, -3.9, 2.3, 4.4, 7, 8.4].forEach((x, i) => {
      b.box({ m: 'matte', c: PAPER, x, y: 4.33, z: -0.16, w: 0.32, h: 0.55, d: 0.015, shadow: false });
      b.box({ m: 'matte', c: TICKET_STRIPES[i % TICKET_STRIPES.length], x, y: 4.78, z: -0.16, w: 0.32, h: 0.1, d: 0.02, shadow: false });
    });
  },

  // Kitchen screen (KSS) on a pole. Faces +z; the data turns it to face west, down the line. Ticket cards carry the station colours.
  'kitchenIslands.kss': (b) => {
    b.cyl({ m: 'matte', c: CHARCOAL, r: 0.35, h: 0.06 });
    b.cyl({ m: 'steel', c: STEEL_DARK, y: 0.06, r: 0.05, h: 4.3 });
    b.box({ m: 'matte', c: CHARCOAL, y: 4.3, w: 0.76, h: 1.5, d: 0.12 });
    const z = 0.065;
    b.sign({ text: 'KSS', x: 0, y: 5.58, z, w: 0.64, h: 0.3, fg: BRAND.cream, bg: '#10282a', emissive: true, tracking: 0.3 });
    for (let i = 0; i < 3; i++) {
      const y = 4.4 + i * 0.35;
      b.box({ m: 'emissive', c: PAPER, y, z, w: 0.56, h: 0.3, d: 0.01 });
      b.box({ m: 'emissive', c: TICKET_STRIPES[i], y: y + 0.22, z: z + 0.006, w: 0.56, h: 0.08, d: 0.01 });
    }
  },

  // ----------------------------------------------------- WORKING-KITCHEN TOUCHES
  // Mobile rack on castors. props.tubs = loaded with grey bus tubs (dirty ware), otherwise trays of bakes.
  'kitchenIslands.rack': (b, it) => {
    const { w, d } = it;
    const h = it.h ?? 5.4;
    const px = w / 2 - 0.05, pz = d / 2 - 0.05;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      b.box({ m: 'steel', c: STEEL_DARK, x: sx * px, y: 0.2, z: sz * pz, w: 0.07, h: h - 0.2, d: 0.07 });
      b.cyl({ m: 'matte', c: CHARCOAL, x: sx * px, z: sz * pz, r: 0.09, h: 0.2, shadow: false });
    }
    const tubs = it.props?.tubs === true;
    for (let i = 0; i < 5; i++) {
      const y = 0.45 + i * 1.0;
      b.box({ m: 'steel', c: STEEL, y, w: w - 0.06, h: 0.04, d: d - 0.06 });
      if (i === 4) continue;
      if (tubs) b.box({ m: 'matte', c: '#5d6a71', y: y + 0.04, w: w - 0.35, h: 0.5, d: d - 0.45 });
      else b.box({ m: 'matte', c: i % 2 ? '#c8a06a' : '#e0c48a', y: y + 0.04, w: w - 0.3, h: 0.3, d: d - 0.4 });
    }
  },

  // Wall-hung steel hand-wash basin. Front faces +z; the data rotates it so its back is on the west wall.
  'kitchenIslands.handwash': (b, it) => {
    const { w, d } = it;
    b.box({ m: 'steel', c: STEEL, y: 3.1, z: -d / 2 + 0.03, w, h: 1.15, d: 0.05 });
    b.box({ m: 'steel', c: STEEL_DARK, y: 2.35, z: -d / 2 + 0.15, w: 0.3, h: 0.5, d: 0.2 });
    b.box({ m: 'steel', c: STEEL, x: -0.2, y: 2.8, z: -d / 2 + 0.45, w: 1.05, h: 0.3, d: 0.8 });
    b.box({ m: 'matte', c: '#1f2629', x: -0.2, y: 3.06, z: -d / 2 + 0.45, w: 0.9, h: 0.02, d: 0.65, shadow: false });
    const tz = -d / 2 + 0.16;
    b.pipe({ a: [-0.2, 3.1, tz], b: [-0.2, 3.7, tz], r: 0.035 });
    b.pipe({ a: [-0.2, 3.7, tz], b: [-0.2, 3.7, tz + 0.4], r: 0.035 });
    b.box({ m: 'gloss', c: '#f4f1ea', x: 0.5, y: 3.5, z: -d / 2 + 0.12, w: 0.14, h: 0.3, d: 0.12, shadow: false });
    b.box({ m: 'gloss', c: '#f4f1ea', x: -0.75, y: 3.5, z: -d / 2 + 0.14, w: 0.4, h: 0.55, d: 0.16, shadow: false });
    b.sign({ text: 'WASH HANDS', x: 0, y: 4.5, z: -d / 2 + 0.07, w: 1.2, h: 0.3, bg: BRAND.teal, fg: BRAND.cream, emissive: true, tracking: 0.1 });
  },

  // Round floor drain (dark flat decal with a grate).
  'kitchenIslands.drain': (b, it) => {
    b.cyl({ m: 'matte', c: '#2c3438', y: 0.03, r: it.w / 2 - 0.05, h: 0.02, shadow: false });
    b.box({ m: 'steel', c: '#6d7a82', y: 0.05, w: it.w - 0.25, h: 0.012, d: 0.05, shadow: false });
    b.box({ m: 'steel', c: '#6d7a82', y: 0.05, w: 0.05, h: 0.012, d: it.w - 0.25, shadow: false });
  },

  // Linear drain channel with grating, along the front of the pass.
  'kitchenIslands.channel': (b, it) => {
    b.box({ m: 'matte', c: '#2c3438', y: 0.03, w: it.w, h: 0.02, d: it.d, shadow: false });
    b.box({ m: 'steel', c: '#7d8a92', y: 0.05, w: it.w - 0.14, h: 0.012, d: it.d - 0.14, shadow: false });
  },
});
