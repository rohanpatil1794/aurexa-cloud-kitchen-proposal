// Kind builders for the Dishwashing Area: stage markers, three-compartment sink bank, pass-through
// dishwasher with its rack tables, soiled table, ware racks, recycle bins and the pot rail.
import type { EquipItem } from '../../../data/types';
import { bench, bin } from '../../../lib/kit';
import { BIN_COLORS, BRAND } from '../../../lib/palette';
import type { PrimBuilder } from '../../../lib/prims';
import type { KindBuilder } from '../registry';
import { INK, num } from './kindKit';
import {
  CERAMIC, CERAMIC_SOILED, plateRow, stack, STEEL, STEEL_DARK, STEEL_MID, TROLLEY_TOPS, trays, trolleyFrame,
} from './supportKit';

/** Flat numbered floor disc (1-5) with a name plate beside it; sits on the Dirty-route point of each stage. */
const dishStage: KindBuilder = (b, it) => {
  b.cyl({ m: 'matte', c: '#16403f', y: 0.03, r: 0.68, h: 0.02, shadow: false });
  b.cyl({ m: 'matte', c: BRAND.orange, y: 0.045, r: 0.58, h: 0.02, shadow: false });
  b.sign({ text: String(num(it, 'n', 0)), y: 0.075, rx: -90, w: 0.95, h: 0.95, fg: '#ffffff' });
  b.sign({
    text: (it.label ?? '').toUpperCase(), x: num(it, 'lx', 0), z: num(it, 'lz', 0), y: 0.07, rx: -90,
    w: num(it, 'lw', 2), h: 0.42, fg: BRAND.cream, bg: '#12403f', tracking: 0.12,
  });
};

/** Bank of three deep sinks (wash, rinse, sanitize) against the south wall, with gooseneck taps and a dosing unit. */
const sinkBank: KindBuilder = (b, it) => {
  const h = 3, back = -it.d / 2;
  bench(b, { w: it.w, d: it.d, h, shelf: true });
  b.box({ m: 'steel', c: STEEL, y: h, z: back + 0.05, w: it.w, h: 1.25, d: 0.1 });
  const pitch = (it.w - 0.2) / 3;
  ['WASH', 'RINSE', 'SANITIZE'].forEach((label, i) => {
    const x = -it.w / 2 + 0.1 + pitch * (i + 0.5);
    b.box({ m: 'steel', c: STEEL, x, y: h, z: 0.12, w: pitch - 0.06, h: 0.04, d: it.d - 0.5 });
    b.box({ m: 'matte', c: '#46525a', x, y: h + 0.04, z: 0.12, w: pitch - 0.24, h: 0.01, d: it.d - 0.68, shadow: false });
    b.cyl({ m: 'steel', c: STEEL, x, y: h + 0.05, z: 0.12, r: 0.08, h: 0.01, shadow: false });
    b.pipe({ m: 'steel', c: STEEL, a: [x, h, back + 0.25], b: [x, 3.95, back + 0.25], r: 0.04 });
    b.pipe({ m: 'steel', c: STEEL, a: [x, 3.95, back + 0.25], b: [x, 3.95, back + 0.7], r: 0.04 });
    b.pipe({ m: 'steel', c: STEEL, a: [x, 3.95, back + 0.7], b: [x, 3.7, back + 0.7], r: 0.04 });
    b.sign({ text: label, x, y: 4.1, z: back + 0.106, w: 0.9, h: 0.2, fg: BRAND.cream, bg: BRAND.teal, tracking: 0.1 });
  });
  b.box({ m: 'matte', c: BRAND.teal, x: it.w / 2 - 0.2, y: 3.3, z: back + 0.22, w: 0.34, h: 0.55, d: 0.22 });
};

/** Rack-conveyor table beside the dishwasher: soiled = dirty rack + pre-rinse spray, otherwise clean racks and stacked ware. */
function rackTable(b: PrimBuilder, it: EquipItem, soiled: boolean) {
  const back = -it.d / 2;
  bench(b, { w: it.w, d: it.d, h: 3, shelf: true, splash: true });
  const bedW = soiled ? it.w - 0.2 : 1.2;
  const bx = soiled ? 0 : -it.w / 2 + 0.1 + bedW / 2;
  const n = Math.round(bedW / 0.32);
  for (let i = 0; i < n; i++) {
    b.cyl({
      m: 'steel', c: STEEL, x: bx + (i - (n - 1) / 2) * (bedW / n), y: 3.08 - (it.d - 0.5) / 2, z: 0,
      r: 0.08, h: it.d - 0.5, rx: 90, shadow: false,
    });
  }
  for (const sz of [-1, 1]) {
    b.box({ m: 'steel', c: STEEL_MID, x: bx, y: 3.0, z: sz * (it.d / 2 - 0.3), w: bedW, h: 0.22, d: 0.05, shadow: false });
  }
  if (soiled) {
    b.box({ m: 'matte', c: '#77838d', x: -0.05, y: 3.1, w: 1.5, h: 0.3, d: 1.5 });
    plateRow(b, { x: -0.05, z: 0, y: 3.4, n: 6, r: 0.38, pitch: 0.22, c: CERAMIC_SOILED });
    // pre-rinse spray on a swan-neck pipe at the back
    b.pipe({ m: 'steel', c: STEEL, a: [-0.75, 3.0, back + 0.2], b: [-0.75, 4.9, back + 0.2], r: 0.04 });
    b.pipe({ m: 'steel', c: STEEL, a: [-0.75, 4.9, back + 0.2], b: [-0.3, 4.9, back + 0.45], r: 0.04 });
    b.pipe({ m: 'matte', c: INK, a: [-0.3, 4.9, back + 0.45], b: [-0.3, 4.0, back + 0.6], r: 0.035 });
    b.cyl({ m: 'steel', c: STEEL_DARK, x: -0.3, y: 3.82, z: back + 0.6, r: 0.07, h: 0.2 });
    b.box({ m: 'matte', c: '#77838d', x: -0.1, y: 0.67, w: 0.95, h: 0.45, d: 0.95 });
  } else {
    b.box({ m: 'matte', c: '#77838d', x: bx, y: 3.1, w: 1.0, h: 0.3, d: 1.5 });
    plateRow(b, { x: bx, z: 0, y: 3.4, n: 4, r: 0.38, pitch: 0.22, c: CERAMIC });
    const sx = it.w / 2 - 0.65;
    stack(b, { x: sx, z: -0.45, y: 3.0, n: 11, r: 0.42, c: CERAMIC });
    stack(b, { x: sx + 0.1, z: 0.5, y: 3.0, n: 8, r: 0.3, c: CERAMIC });
    trays(b, { x: sx - 0.1, z: 0.05, y: 3.0, n: 3, w: 0.9, d: 0.7 });
    b.sign({ text: 'CLEAN', x: 0, y: 3.28, z: back + 0.11, w: 0.9, h: 0.24, fg: '#ffffff', bg: BRAND.teal, tracking: 0.14 });
  }
}

/** Loading table with the dirty rack and pre-rinse spray. */
const dishRackIn: KindBuilder = (b, it) => rackTable(b, it, true);
/** Unloading table: clean racks and stacked clean ware. */
const dishCleanTable: KindBuilder = (b, it) => rackTable(b, it, false);

/** Pass-through hood dishwasher: rack enters at the west opening and leaves at the east one. */
const dishMachine: KindBuilder = (b, it) => {
  const hx = it.w / 2 - 0.15, hz = it.d / 2;
  b.box({ m: 'matte', c: INK, w: it.w - 0.2, h: 0.25, d: it.d - 0.2, shadow: false });
  b.box({ m: 'gloss', c: '#aab5bf', y: 0.25, w: it.w - 0.1, h: 2.65, d: it.d - 0.1 });
  b.box({ m: 'gloss', c: '#cdd6dc', y: 2.9, w: hx * 2, h: 3.0, d: it.d - 0.2 });
  b.box({ m: 'matte', c: BRAND.teal, y: 2.9, w: hx * 2 + 0.04, h: 0.2, d: it.d - 0.16 });
  b.box({ m: 'steel', c: STEEL_DARK, y: 5.9, w: it.w - 0.2, h: 0.12, d: it.d - 0.1 });
  b.cyl({ m: 'steel', c: STEEL_DARK, x: 0.55, y: 6.02, z: -0.5, r: 0.32, h: 0.28 });
  for (const s of [-1, 1]) {
    b.box({ m: 'matte', c: '#44515a', x: s * (hx + 0.012), y: 3.05, w: 0.04, h: 1.6, d: 1.75, shadow: false });
  }
  const front = hz - 0.1;
  b.box({ m: 'matte', c: INK, x: -0.1, y: 3.15, z: front + 0.012, w: 1.62, h: 1.52, d: 0.03, shadow: false });
  b.box({ m: 'glass', c: '#a8d6d5', x: -0.1, y: 3.2, z: front + 0.02, w: 1.5, h: 1.4, d: 0.04 });
  b.box({ m: 'steel', c: STEEL_DARK, x: -0.1, y: 5.15, z: front + 0.1, w: 1.3, h: 0.09, d: 0.1 });
  for (const s of [-1, 1]) b.box({ m: 'steel', c: STEEL_DARK, x: -0.1 + s * 0.6, y: 5.15, z: front + 0.04, w: 0.08, h: 0.09, d: 0.1, shadow: false });
  b.box({ m: 'matte', c: BRAND.teal, x: 0.75, y: 1.65, z: front + 0.1, w: 1.0, h: 0.7, d: 0.06 });
  b.sign({ text: 'READY', x: 0.75, y: 2.1, z: front + 0.135, w: 0.7, h: 0.2, fg: '#6dffb0', bg: '#0b1a14', emissive: true });
  for (const x of [0.5, 1.0]) b.cyl({ m: 'steel', c: STEEL, x, y: 1.78, z: front + 0.15, r: 0.08, h: 0.05, rx: 90, shadow: false });
  b.box({ m: 'emissive', c: '#35e58a', x: 0.55, y: 1.9, z: front + 0.14, w: 0.07, h: 0.07, d: 0.02 });
  b.box({ m: 'emissive', c: '#ffb23a', x: 0.95, y: 1.9, z: front + 0.14, w: 0.07, h: 0.07, d: 0.02 });
};

/** Island table where used ware lands (stage 1): plates, trays, a bus tub and the scrap hole. Faces the west lane. */
const dishSoiledTable: KindBuilder = (b, it) => {
  const back = -it.d / 2;
  bench(b, { w: it.w, d: it.d, h: 3, shelf: true, splash: true });
  b.box({ m: 'matte', c: '#3b464c', x: -1.05, y: 3.0, z: 0.15, w: 0.7, h: 0.02, d: 0.6, shadow: false });
  stack(b, { x: -0.15, z: 0.15, y: 3.0, n: 9, r: 0.4, c: CERAMIC_SOILED });
  stack(b, { x: 0.45, z: -0.1, y: 3.0, n: 6, r: 0.4, c: CERAMIC_SOILED });
  trays(b, { x: 1.1, z: 0.1, y: 3.0, n: 3, w: 0.95, d: 0.7 });
  b.box({ m: 'matte', c: '#77838d', x: -0.9, y: 0.67, w: 0.9, h: 0.45, d: 0.95 });
  b.box({ m: 'matte', c: '#77838d', x: 0.6, y: 0.67, w: 0.9, h: 0.45, d: 0.95 });
  b.sign({ text: 'SOILED', x: 0, y: 3.28, z: back + 0.11, w: 0.9, h: 0.24, fg: '#ffffff', bg: BRAND.orange, tracking: 0.14 });
};

/** Open ware racking along the east wall. mode 'store' = stacks of clean ware, 'dry' = plates draining in racks. */
const dishRack: KindBuilder = (b, it) => {
  const dry = it.props?.mode === 'dry';
  const h = it.h ?? 5.1, hx = it.w / 2 - 0.06, hz = it.d / 2 - 0.06;
  for (const x of [-hx, 0, hx]) {
    for (const sz of [-1, 1]) b.box({ m: 'steel', c: STEEL_DARK, x, z: sz * hz, w: 0.1, h, d: 0.1 });
  }
  const slots = Math.round(it.w / 1.1);
  [0.3, 1.75, 3.2].forEach((y, i) => {
    const top = y + 0.06;
    for (let j = 0; j < slots; j++) {
      const x = -it.w / 2 + ((j + 0.5) * it.w) / slots;
      const k = (i + j) % 3;
      if (dry) {
        if (j % 2) continue;
        b.box({ m: 'matte', c: '#77838d', x: x + 0.55, y: top, w: 1.5, h: 0.25, d: 0.85, shadow: false });
        plateRow(b, { x: x + 0.55, z: 0, y: top + 0.1, n: 4, r: 0.32, pitch: 0.3 });
      } else if (k === 0) {
        stack(b, { x, z: 0, y: top, n: 10, r: 0.4 });
      } else if (k === 1) {
        stack(b, { x: x - 0.2, z: 0, y: top, n: 7, r: 0.28 });
        stack(b, { x: x + 0.3, z: 0, y: top, n: 5, r: 0.22, c: BRAND.cream });
      } else {
        trays(b, { x, z: 0, y: top, n: 3, w: 0.85, d: 0.7 });
      }
    }
  });
  for (const y of [0.3, 1.75, 3.2, 4.65]) b.box({ m: 'steel', c: STEEL, y, w: it.w - 0.04, h: 0.06, d: it.d });
  b.box({ m: 'matte', c: BRAND.teal, y: h, w: it.w, h: 0.12, d: it.d });
};

/** Mobile ware trolley parked by the machine: clean plate racks, plate stacks, bowls and trays. */
const dishTrolley: KindBuilder = (b, it) => {
  trolleyFrame(b, { w: it.w, d: it.d, grip: BRAND.teal });
  const [low, mid, high] = TROLLEY_TOPS;
  for (const x of [-0.7, 0.7]) {
    b.box({ m: 'matte', c: '#77838d', x, y: low, w: 1.2, h: 0.25, d: 1.0, shadow: false });
    plateRow(b, { x, z: 0, y: low + 0.1, n: 4, r: 0.32, pitch: 0.26 });
  }
  [-0.9, 0, 0.9].forEach((x, i) => stack(b, { x, z: 0, y: mid, n: 10 - i * 2, r: 0.4 }));
  stack(b, { x: -0.75, z: 0, y: high, n: 8, r: 0.3 });
  stack(b, { x: -0.1, z: 0, y: high, n: 6, r: 0.24, c: BRAND.cream });
  trays(b, { x: 0.8, z: 0, y: high, n: 4, w: 1.0, d: 0.8 });
};

/** Two recycle bins (blue + green) in the south-east corner. */
const recycleBins: KindBuilder = (b) => {
  bin(b, { x: -0.55, r: 0.5, h: 2.3, c: BIN_COLORS.blue });
  bin(b, { x: 0.55, r: 0.5, h: 2.3, c: BIN_COLORS.green });
};

/** Wall-hung pot rail above the west lane: pans and ladles on a steel rail. Overhead (props.overhead). */
const potRail: KindBuilder = (b, it) => {
  const wall = -it.d / 2;
  b.pipe({ m: 'steel', c: STEEL, a: [-it.w / 2 + 0.1, 5.4, wall + 0.2], b: [it.w / 2 - 0.1, 5.4, wall + 0.2], r: 0.05, shadow: true });
  for (const x of [-it.w / 2 + 0.5, it.w / 2 - 0.5]) b.box({ m: 'steel', c: STEEL_DARK, x, y: 5.37, z: wall + 0.1, w: 0.06, h: 0.06, d: 0.2, shadow: false });
  const step = (it.w - 0.8) / 4;
  for (let i = 0; i < 5; i++) {
    const x = -it.w / 2 + 0.4 + i * step;
    if (i % 2 === 0) {
      b.cyl({ m: 'gloss', c: i === 2 ? '#c4784a' : '#aab4bb', x, y: 4.2, z: wall + 0.3, r: 0.38, h: 0.08, rx: 90 });
      b.pipe({ m: 'steel', c: STEEL_DARK, a: [x, 4.98, wall + 0.3], b: [x, 5.38, wall + 0.2], r: 0.03 });
    } else {
      b.pipe({ m: 'steel', c: STEEL_DARK, a: [x, 4.3, wall + 0.25], b: [x, 5.38, wall + 0.2], r: 0.025 });
      b.sph({ m: 'steel', c: STEEL, x, y: 4.22, z: wall + 0.27, r: 0.14, sy: 0.6 });
    }
  }
};

export const dishKinds: Record<string, KindBuilder> = {
  'support.dishStage': dishStage,
  'support.sinkBank': sinkBank,
  'support.dishRackIn': dishRackIn,
  'support.dishClean': dishCleanTable,
  'support.dishMachine': dishMachine,
  'support.dishSoiled': dishSoiledTable,
  'support.dishRack': dishRack,
  'support.dishTrolley': dishTrolley,
  'support.recycleBins': recycleBins,
  'support.potRail': potRail,
};
