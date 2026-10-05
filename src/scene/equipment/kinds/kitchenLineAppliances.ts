// Appliance kind builders for the back cooking line and the wok station. Each builder draws one item in
// its own frame (origin = footprint centre, +z = front where the cook stands).
import { COUNTER, KL, SHEET, burner, pan, pot, unit } from './kitchenLineParts';
import type { KindBuilder } from '../registry';

/** 6-burner range (2 rows of 3) with oven doors, a stock pot and a sauté pan on the fire. */
const range6: KindBuilder = (b, it) => {
  const { w, d } = it;
  unit(b, { w, d, doors: 2, knobs: 6, riser: 0.95, shelf: true });
  const gx = [-0.86, 0, 0.86];
  const gz = [-0.45, 0.62];
  gx.forEach((x, i) => gz.forEach((z, j) => burner(b, x, z, 0.74, i === 1 || (i === 0 && j === 0))));
  pot(b, gx[2], COUNTER + 0.1, gz[0], 0.4, 0.72);
  pan(b, gx[0], COUNTER + 0.1, gz[1], 0.4, '#c98a2c');
};

/** 4-burner range (2 x 2) with a sauce pan. */
const range4: KindBuilder = (b, it) => {
  const { w, d } = it;
  unit(b, { w, d, doors: 1, knobs: 4, riser: 0.95, shelf: true });
  const gx = [-0.43, 0.43];
  const gz = [-0.45, 0.62];
  gx.forEach((x, i) => gz.forEach((z, j) => burner(b, x, z, 0.72, i === 1 && j === 0)));
  pot(b, gx[0], COUNTER + 0.1, gz[1], 0.3, 0.42);
};

/** Steam-jacketed kettle on a cabinet pedestal: jacket, rolled rim, domed lid, draw-off tap, tilt wheel, gauge. */
const kettle: KindBuilder = (b, it) => {
  const { w, d } = it;
  const top = 2.15;
  const r = 0.72;
  const zc = -0.15;
  unit(b, { w, d, h: top, doors: 1, knobs: 2, riser: 0.9 });
  b.cyl({ m: 'steel', c: KL.top, y: top, z: zc, r, h: 0.78 });
  b.cyl({ m: 'steel', c: KL.handle, y: top + 0.75, z: zc, r: r + 0.05, h: 0.07 });
  b.sph({ m: 'steel', c: KL.handle, y: top + 0.82, z: zc, r: r - 0.04, sy: 0.32 });
  b.box({ m: 'matte', c: KL.iron, y: top + 1.09, z: zc, w: 0.4, h: 0.07, d: 0.09, shadow: false });
  // draw-off tap
  b.pipe({ m: 'brass', c: KL.brass, a: [0, top + 0.3, zc + r - 0.05], b: [0, top + 0.3, zc + r + 0.4], r: 0.05 });
  b.pipe({ m: 'brass', c: KL.brass, a: [0, top + 0.3, zc + r + 0.4], b: [0, top + 0.02, zc + r + 0.4], r: 0.05 });
  // tilt handwheel on the right
  b.pipe({ m: 'steel', c: KL.knob, a: [r - 0.05, top + 0.4, zc], b: [r + 0.2, top + 0.4, zc], r: 0.04 });
  b.cyl({ m: 'matte', c: KL.dark, x: r + 0.22, y: top + 0.4 - 0.03, z: zc, r: 0.17, h: 0.06, rz: 90, shadow: false });
  // steam pressure gauge
  b.cyl({ m: 'matte', c: KL.dark, x: -0.38, y: top + 0.45 - 0.02, z: zc + r + 0.01, r: 0.15, h: 0.05, rx: 90, shadow: false });
  b.cyl({ m: 'matte', c: '#f2f0e8', x: -0.38, y: top + 0.45 - 0.02, z: zc + r + 0.04, r: 0.12, h: 0.03, rx: 90, shadow: false });
};

/** Single-vat fryer with two baskets (fries in one), long handles, an orange drain handle and a back splash. */
const fryer: KindBuilder = (b, it) => {
  const { w, d } = it;
  unit(b, { w, d, doors: 1, knobs: 2, riser: 0.95 });
  const vw = w - 0.24;
  const vd = 1.7;
  const vz = -0.35;
  b.box({ m: 'gloss', c: '#d99a1c', z: vz, y: COUNTER, w: vw - 0.1, h: 0.02, d: vd - 0.1, shadow: false });
  for (const s of [-1, 1]) {
    b.box({ m: 'steel', c: KL.dark, y: COUNTER, z: vz + s * vd / 2, w: vw, h: 0.05, d: 0.07, shadow: false });
    b.box({ m: 'steel', c: KL.dark, y: COUNTER, x: s * (vw / 2 - 0.035), z: vz, w: 0.07, h: 0.05, d: vd, shadow: false });
  }
  [-0.22, 0.22].forEach((x, i) => {
    b.box({ m: 'steel', c: '#7b868e', x, y: COUNTER + 0.03, z: vz + 0.05, w: 0.4, h: 0.26, d: 0.7 });
    if (i === 0) b.box({ m: 'matte', c: '#e4b247', x, y: COUNTER + 0.2, z: vz + 0.05, w: 0.34, h: 0.18, d: 0.6, shadow: false });
    b.box({ m: 'matte', c: KL.iron, x, y: COUNTER + 0.24, z: vz + 0.85, w: 0.06, h: 0.05, d: 0.9, shadow: false });
  });
  const front = d / 2;
  b.cyl({ m: 'matte', c: KL.orange, y: 0.95 - 0.2, z: front + 0.2, r: 0.03, h: 0.4, rx: 90, shadow: false });
  b.sph({ m: 'matte', c: KL.orange, y: 0.95, z: front + 0.42, r: 0.07, shadow: false });
};

/** Flat griddle: thick polished plate with splash edges, grease trough, patties and onions. */
const griddle: KindBuilder = (b, it) => {
  const { w, d } = it;
  unit(b, { w, d, doors: 2, knobs: 3, riser: 0.7 });
  const pz = -0.15;
  const pd = 2.3;
  b.box({ m: 'steel', c: '#d2dae0', y: COUNTER, z: pz, w: w - 0.1, h: 0.12, d: pd });
  b.box({ m: 'steel', c: KL.top, y: COUNTER, z: pz - pd / 2 + 0.04, w: w - 0.1, h: 0.55, d: 0.08 });
  for (const s of [-1, 1]) b.box({ m: 'steel', c: KL.top, y: COUNTER, x: s * (w / 2 - 0.09), z: pz, w: 0.08, h: 0.4, d: pd });
  b.box({ m: 'matte', c: KL.dark, y: COUNTER, z: pz + pd / 2 + 0.1, w: w - 0.4, h: 0.07, d: 0.2, shadow: false });
  const y = COUNTER + 0.12;
  const patties: [number, number][] = [[-0.55, -0.55], [-0.15, -0.5], [0.3, -0.6], [-0.4, -0.05], [0.1, 0.0]];
  for (const [x, z] of patties) b.cyl({ m: 'matte', c: '#6e3d22', x, y, z, r: 0.16, h: 0.05, shadow: false });
  for (const [x, z] of [[0.55, 0.1], [0.62, 0.35], [0.4, 0.3]]) b.box({ m: 'matte', c: '#e7d49a', x, y, z, w: 0.2, h: 0.04, d: 0.16, ry: x * 90, shadow: false });
};

/** Charbroiler: glowing ember bed under parallel cast-iron grate bars, with a few skewered pieces. */
const charbroiler: KindBuilder = (b, it) => {
  const { w, d } = it;
  unit(b, { w, d, doors: 2, knobs: 3 });
  const gz = -0.1;
  const gd = 2.3;
  b.box({ m: 'matte', c: KL.ember, y: COUNTER, z: gz, w: w - 0.3, h: 0.05, d: gd - 0.1, shadow: false });
  for (const s of [-1, 1]) b.box({ m: 'matte', c: KL.dark, y: COUNTER, z: gz + s * (gd / 2 - 0.04), w: w - 0.1, h: 0.16, d: 0.08, shadow: false });
  for (const s of [-1, 1]) b.box({ m: 'matte', c: KL.dark, y: COUNTER, x: s * (w / 2 - 0.09), z: gz, w: 0.08, h: 0.16, d: gd });
  const n = 9;
  for (let i = 0; i < n; i++) {
    b.box({ m: 'matte', c: KL.iron, x: (i - (n - 1) / 2) * 0.18, y: COUNTER + 0.1, z: gz, w: 0.07, h: 0.08, d: gd - 0.1, shadow: false });
  }
  for (const [x, z] of [[-0.35, -0.3], [0.1, -0.35], [0.45, -0.1], [-0.2, 0.3]]) {
    b.box({ m: 'matte', c: '#b4521e', x, y: COUNTER + 0.18, z, w: 0.3, h: 0.1, d: 0.22, ry: x * 40, shadow: false });
  }
};

/** Salamander (overhead broiler) mounted on a wall plate above the charbroiler, glowing element inside. */
const salamander: KindBuilder = (b, it) => {
  const { w, d } = it;
  const y0 = 4.55;
  const h = 0.9;
  b.box({ m: SHEET, c: KL.front, y: COUNTER, z: -d / 2 + 0.05, w: w - 0.1, h: y0 + h - COUNTER, d: 0.1 });
  b.box({ m: 'steel', c: KL.top, y: y0 + h - 0.1, w, h: 0.1, d });
  b.box({ m: SHEET, c: KL.top, y: y0, w, h: 0.08, d });
  for (const s of [-1, 1]) b.box({ m: SHEET, c: KL.body, y: y0, x: s * (w / 2 - 0.04), w: 0.08, h, d });
  b.box({ m: 'matte', c: KL.dark, y: y0 + 0.08, z: -d / 2 + 0.12, w: w - 0.16, h: h - 0.18, d: 0.05, shadow: false });
  b.box({ m: 'emissive', c: '#ff6a2a', y: y0 + h - 0.16, z: -0.05, w: w - 0.3, h: 0.05, d: d - 0.45 });
  for (const z of [-0.12, 0.23]) b.box({ m: 'matte', c: KL.iron, y: y0 + 0.2, z, w: w - 0.2, h: 0.04, d: 0.05, shadow: false });
  // front control lip with two knobs
  b.box({ m: 'matte', c: KL.dark, y: y0 + h - 0.36, z: d / 2 - 0.04, w: w - 0.1, h: 0.26, d: 0.08 });
  for (const s of [-1, 1]) {
    b.cyl({ m: 'steel', c: KL.knob, x: s * 0.4, y: y0 + h - 0.23 - 0.06, z: d / 2 + 0.07, r: 0.07, h: 0.12, rx: 90, shadow: false });
  }
};

/** Pasta cooker: water tank with three lifted baskets on long handles and a swing-arm brass filler. */
const pasta: KindBuilder = (b, it) => {
  const { w, d } = it;
  unit(b, { w, d, doors: 1, knobs: 2, riser: 0.95 });
  const vz = -0.3;
  const vd = 1.8;
  b.box({ m: 'gloss', c: '#8fcfe0', y: COUNTER, z: vz, w: w - 0.34, h: 0.02, d: vd - 0.1, shadow: false });
  for (const s of [-1, 1]) {
    b.box({ m: 'steel', c: KL.dark, y: COUNTER, z: vz + s * vd / 2, w: w - 0.16, h: 0.05, d: 0.07, shadow: false });
    b.box({ m: 'steel', c: KL.dark, y: COUNTER, x: s * (w / 2 - 0.1), z: vz, w: 0.07, h: 0.05, d: vd, shadow: false });
  }
  for (const x of [-0.3, 0, 0.3]) {
    b.box({ m: 'steel', c: '#8a959d', x, y: COUNTER + 0.1, z: vz - 0.05, w: 0.24, h: 0.3, d: 0.5, shadow: false });
    b.box({ m: 'matte', c: KL.iron, x, y: COUNTER + 0.34, z: vz + 0.6, w: 0.05, h: 0.05, d: 0.8, shadow: false });
  }
  const bk = -d / 2 + 0.3;
  const ax = w / 2 - 0.15;
  b.pipe({ m: 'brass', c: KL.brass, a: [ax, COUNTER, bk], b: [ax, COUNTER + 1.5, bk], r: 0.04 });
  b.pipe({ m: 'brass', c: KL.brass, a: [ax, COUNTER + 1.5, bk], b: [-0.1, COUNTER + 1.5, bk + 0.6], r: 0.04 });
  b.pipe({ m: 'brass', c: KL.brass, a: [-0.1, COUNTER + 1.5, bk + 0.6], b: [-0.1, COUNTER + 1.3, bk + 0.6], r: 0.05 });
};

/** Two-zone induction range: black glass hob, one zone with a pot, the other glowing, touch controls. */
const induction: KindBuilder = (b, it) => {
  const { w, d } = it;
  unit(b, { w, d, doors: 1, riser: 0.9 });
  b.box({ m: 'gloss', c: '#0d1114', y: COUNTER, z: -0.1, w: w - 0.14, h: 0.04, d: d - 0.45, shadow: false });
  const zr = -0.6;
  const zf = 0.65;
  const y = COUNTER + 0.04;
  for (const z of [zr, zf]) {
    b.cyl({ m: 'matte', c: '#46565e', x: 0, y, z, r: 0.6, h: 0.015, shadow: false });
    b.cyl({ m: 'gloss', c: '#0d1114', x: 0, y, z, r: 0.55, h: 0.025, shadow: false });
  }
  b.cyl({ m: 'emissive', c: '#ff4a22', x: 0, y, z: zf, r: 0.5, h: 0.035 });
  b.cyl({ m: 'gloss', c: '#0d1114', x: 0, y, z: zf, r: 0.42, h: 0.045, shadow: false });
  pot(b, 0, y + 0.025, zr, 0.45, 0.65);
  for (let i = 0; i < 4; i++) b.box({ m: 'emissive', c: '#7fd7ff', x: (i - 1.5) * 0.3, y, z: d / 2 - 0.12, w: 0.1, h: 0.015, d: 0.06 });
};

/** Bain-marie: hot-holding counter with three food pans (dal, gravy, greens), ladles and a propped lid. */
const bainMarie: KindBuilder = (b, it) => {
  const { w, d } = it;
  unit(b, { w, d, doors: 1, knobs: 3, riser: 0.7 });
  const pans: [number, string][] = [[-0.95, '#e0a92c'], [0, '#b5481f'], [0.95, '#527d3a']];
  for (const [z, c] of pans) {
    b.box({ m: 'steel', c: KL.handle, y: COUNTER, z, w: w - 0.25, h: 0.04, d: 0.9, shadow: false });
    b.box({ m: 'gloss', c, y: COUNTER, z, w: w - 0.4, h: 0.06, d: 0.75, shadow: false });
    b.cyl({ m: 'steel', c: KL.handle, x: w / 2 - 0.4, y: COUNTER + 0.02, z: z - 0.08, r: 0.018, h: 0.75, rz: 18, shadow: false });
    b.cyl({ m: 'steel', c: KL.handle, x: w / 2 - 0.19, y: COUNTER + 0.58, z: z - 0.08, r: 0.075, h: 0.05, shadow: false });
  }
};

/** Mongolian wok station: round pedestal, dark hot-plate in a steel rim, gas flame ring, stir-fry in the wok. */
const wok: KindBuilder = (b, it) => {
  const r = it.w / 2;
  const plate = 3.12;
  b.cyl({ m: 'matte', c: KL.dark, r: r - 0.2, h: 0.3 });
  b.cyl({ m: SHEET, c: KL.body, r: r - 0.3, y: 0.3, h: 2.5 });
  b.cyl({ m: 'steel', c: KL.top, r, y: 2.8, h: plate - 2.8 });
  b.cyl({ m: 'steel', c: KL.dark, r: r - 0.1, y: plate, h: 0.02, shadow: false });
  b.cyl({ m: 'emissive', c: KL.flame, r: 1.12, y: plate + 0.02, h: 0.02 });
  b.cyl({ m: 'steel', c: KL.dark, r: 1.04, y: plate + 0.02, h: 0.03, shadow: false });
  // wok bowl: inverted cone under a steel rim, dark interior
  b.cone({ m: 'steel', c: KL.dark, r: 0.95, y: plate + 0.05, h: 0.3, rx: 180 });
  b.cyl({ m: 'steel', c: KL.handle, r: 0.98, y: plate + 0.32, h: 0.06 });
  b.cyl({ m: 'matte', c: '#15191b', r: 0.9, y: plate + 0.32, h: 0.08, shadow: false });
  const food: [number, number, number, string][] = [
    [-0.35, -0.2, 0.2, '#c93a32'], [0.2, -0.4, 0.18, '#4f9a45'], [0.45, 0.1, 0.2, '#e8b83a'], [-0.1, 0.25, 0.22, '#f0e2bd'],
    [-0.5, 0.2, 0.17, '#d9742a'], [0.05, -0.05, 0.19, '#4f9a45'], [0.3, 0.45, 0.16, '#c93a32'], [-0.3, -0.55, 0.15, '#e8b83a'],
    [0.55, -0.3, 0.15, '#f0e2bd'], [-0.05, 0.55, 0.15, '#d9742a'],
  ];
  food.forEach(([x, z, s, c], i) => b.box({ m: 'matte', c, x, y: plate + 0.4, z, w: s, h: s * 0.7, d: s * 0.85, ry: i * 37, shadow: false }));
  // long wok handle and ladle resting in the bowl
  b.box({ m: 'matte', c: KL.iron, x: 0, y: plate + 0.37, z: 1.35, w: 0.09, h: 0.06, d: 0.75, shadow: false });
  b.pipe({ m: 'steel', c: KL.handle, a: [0.4, plate + 0.45, 0.2], b: [-0.2, plate + 1.0, 0.95], r: 0.025 });
  // control rail on the front of the pedestal
  const fz = r - 0.3;
  b.box({ m: 'matte', c: KL.dark, y: 1.7, z: fz - 0.02, w: 0.95, h: 0.4, d: 0.12 });
  for (let i = 0; i < 3; i++) b.cyl({ m: 'steel', c: KL.knob, x: (i - 1) * 0.3, y: 1.9 - 0.075, z: fz + 0.06, r: 0.085, h: 0.15, rx: 90, shadow: false });
  // swing-arm water tap over the back of the plate
  b.pipe({ m: 'brass', c: KL.brass, a: [0.85, plate, -0.85], b: [0.85, plate + 1.3, -0.85], r: 0.04 });
  b.pipe({ m: 'brass', c: KL.brass, a: [0.85, plate + 1.3, -0.85], b: [0.3, plate + 1.3, -0.45], r: 0.04 });
  b.pipe({ m: 'brass', c: KL.brass, a: [0.3, plate + 1.3, -0.45], b: [0.3, plate + 1.1, -0.45], r: 0.05 });
};

/** Stainless wall cladding behind the line (hygienic splash zone up to the hood). */
const cladding: KindBuilder = (b, it) => {
  b.box({ m: SHEET, c: KL.front, w: it.w, h: it.h ?? 6.5, d: it.d });
};

/** Anti-fatigue rubber mat in front of a line section (floor decal). */
const mat: KindBuilder = (b, it) => {
  b.box({ m: 'matte', c: '#343c41', y: 0.02, w: it.w, h: 0.03, d: it.d, shadow: false });
};

export const APPLIANCE_KINDS: Record<string, KindBuilder> = {
  'kitchenLine.range6': range6,
  'kitchenLine.range4': range4,
  'kitchenLine.kettle': kettle,
  'kitchenLine.fryer': fryer,
  'kitchenLine.griddle': griddle,
  'kitchenLine.charbroiler': charbroiler,
  'kitchenLine.salamander': salamander,
  'kitchenLine.pasta': pasta,
  'kitchenLine.induction': induction,
  'kitchenLine.bainMarie': bainMarie,
  'kitchenLine.wok': wok,
  'kitchenLine.cladding': cladding,
  'kitchenLine.mat': mat,
};
