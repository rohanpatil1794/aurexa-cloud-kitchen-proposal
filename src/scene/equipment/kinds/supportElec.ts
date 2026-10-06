// Kind builders for the Electrical & UPS Room: UPS cabinets, wall distribution boards, cable tray, rubber mat.
import type { KindBuilder } from '../registry';
import { INK, num } from './kindKit';
import { floorPlate, STEEL, STEEL_DARK, TRAY_Y } from './supportKit';

const LED_GREEN = '#35e58a';
const LED_AMBER = '#ffb23a';

/** UPS cabinet tones: a mid-slate body (a near-black albedo cannot be lit up), a darker toe, a light trim and a lighter door. */
const UPS_BODY = '#64717a';
const UPS_TOE = '#3a464c';
const UPS_TRIM = '#aab5bc';
const UPS_DOOR = '#77848c';
const UPS_VENT = '#34424a';

/** Slate UPS cabinet with a light top cap and door frame (the edges that make it read as a cabinet) and a green LED strip; a conduit rises from its top to the cable tray. */
const ups: KindBuilder = (b, it) => {
  const h = it.h ?? 6.2, f = it.d / 2;
  b.box({ m: 'matte', c: UPS_TOE, w: it.w - 0.06, h: 0.25, d: it.d - 0.1, shadow: false });
  b.box({ m: 'matte', c: UPS_BODY, y: 0.25, w: it.w, h: h - 0.25, d: it.d });
  b.box({ m: 'matte', c: UPS_TRIM, y: h - 0.1, w: it.w + 0.05, h: 0.12, d: it.d + 0.05 });
  b.box({ m: 'matte', c: UPS_TRIM, y: 0.45, z: f + 0.008, w: it.w - 0.12, h: 5.0, d: 0.03, shadow: false });
  b.box({ m: 'matte', c: UPS_DOOR, y: 0.52, z: f + 0.026, w: it.w - 0.24, h: 4.86, d: 0.03, shadow: false });
  for (let v = 0; v < 4; v++) {
    b.box({ m: 'matte', c: UPS_VENT, y: 5.0 + v * 0.14, z: f + 0.05, w: it.w - 0.7, h: 0.05, d: 0.02, shadow: false });
  }
  b.box({ m: 'emissive', c: LED_GREEN, y: 4.35, z: f + 0.05, w: it.w - 0.6, h: 0.1, d: 0.02 });
  b.sign({ text: 'UPS', y: 3.75, z: f + 0.056, w: 0.8, h: 0.24, fg: '#e6ecf0', bg: '#2a343a' });
  b.box({ m: 'steel', c: STEEL, x: it.w / 2 - 0.35, y: 2.2, z: f + 0.06, w: 0.06, h: 0.8, d: 0.05, shadow: false });
  b.box({ m: 'steel', c: STEEL_DARK, x: -0.55, y: h, z: -0.4, w: 0.2, h: TRAY_Y - h, d: 0.2, shadow: false });
};

/** Wall-mounted distribution board with a breaker window, status LEDs and a label. Local back (-z) = wall. */
const panel: KindBuilder = (b, it) => {
  const y0 = num(it, 'y0', 1.8), h = it.h ?? 3.6, wall = -it.d / 2;
  b.box({ m: 'matte', c: '#8a959e', y: y0, z: wall + 0.15, w: it.w, h, d: 0.3 });
  b.box({ m: 'matte', c: '#a6b0b8', y: y0 + 0.1, z: wall + 0.31, w: it.w - 0.14, h: h - 0.2, d: 0.03, shadow: false });
  b.sign({ text: String(it.props?.tag ?? ''), y: y0 + h - 0.35, z: wall + 0.33, w: 0.7, h: 0.2, fg: '#ffffff', bg: INK });
  [LED_GREEN, LED_GREEN, LED_AMBER, LED_GREEN, LED_GREEN].forEach((c, i) => {
    b.box({ m: 'emissive', c, x: (i - 2) * 0.22, y: y0 + h - 0.78, z: wall + 0.33, w: 0.07, h: 0.07, d: 0.02 });
  });
  b.box({ m: 'matte', c: '#3e4a51', y: y0 + 0.4, z: wall + 0.33, w: it.w - 0.45, h: 1.2, d: 0.02, shadow: false });
  for (let i = 0; i < 6; i++) {
    b.box({ m: 'matte', c: '#c7d0d8', x: (i - 2.5) * ((it.w - 0.7) / 5), y: y0 + 0.75, z: wall + 0.345, w: 0.07, h: 0.22, d: 0.02, shadow: false });
  }
  b.box({ m: 'steel', c: STEEL, x: it.w / 2 - 0.18, y: y0 + 1.75, z: wall + 0.34, w: 0.05, h: 0.45, d: 0.04, shadow: false });
  b.box({ m: 'steel', c: STEEL_DARK, y: y0 + h, z: wall + 0.15, w: 0.2, h: TRAY_Y - y0 - h, d: 0.2, shadow: false });
};

/** Overhead steel ladder tray carrying cables; props.wallEnd = the run ends in a wall penetration. */
const cableTray: KindBuilder = (b, it) => {
  for (const sz of [-1, 1]) b.box({ m: 'steel', c: STEEL, y: TRAY_Y, z: sz * (it.d / 2 - 0.035), w: it.w, h: 0.28, d: 0.07, shadow: false });
  const rungs = Math.floor(it.w / 0.5);
  for (let i = 0; i < rungs; i++) {
    b.box({ m: 'steel', c: STEEL_DARK, x: -it.w / 2 + 0.25 + i * ((it.w - 0.5) / Math.max(1, rungs - 1)), y: TRAY_Y + 0.02, w: 0.07, h: 0.05, d: it.d - 0.1, shadow: false });
  }
  [-0.25, 0, 0.25].forEach((z, i) => {
    b.box({ m: 'matte', c: i === 1 ? '#1d6866' : INK, y: TRAY_Y + 0.07, z, w: it.w - 0.2, h: 0.1, d: 0.14, shadow: false });
  });
  if (it.props?.wallEnd) b.box({ m: 'matte', c: INK, x: -it.w / 2 + 0.05, y: TRAY_Y - 0.12, w: 0.1, h: 0.55, d: it.d + 0.2, shadow: false });
};

/** Dark rubber safety mat with a yellow edge (decal) in front of the boards. */
const rubberMat: KindBuilder = (b, it) => {
  floorPlate(b, { w: it.w, d: it.d, c: '#e3b72c' });
  floorPlate(b, { w: it.w - 0.2, d: it.d - 0.2, c: '#46525a', y: 0.045, h: 0.01 });
};

export const elecKinds: Record<string, KindBuilder> = {
  'support.ups': ups,
  'support.panel': panel,
  'support.cableTray': cableTray,
  'support.rubberMat': rubberMat,
};
