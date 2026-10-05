// Kind builders for the Fire Staircase and the Passenger Lift.
import { BRAND } from '../../../lib/palette';
import type { PrimBuilder } from '../../../lib/prims';
import type { KindBuilder } from '../registry';
import { INK } from './kindKit';
import { STEEL, STEEL_DARK } from './supportKit';

// Stair geometry (ft): riser, tread run, flight width, and the rail / stringer sizes.
const RISE = 0.5;
const RUN = 0.9;
const FLIGHT_W = 2.7;
const RAIL_H = 3;
const STAIR_STEEL = '#2d3a40';
const CONCRETE = '#bfb9ab';
const ANGLE = (Math.atan2(RISE, RUN) * 180) / Math.PI;

interface Flight {
  /** x of the flight centre, z of the start edge, travel direction along z (+1 / -1), floor level, tread count. */
  cx: number; z0: number; dir: 1 | -1; y0: number; n: number;
  /** Side (-1 west / +1 east) that carries the rail, next to the stairwell gap. */
  rail: 1 | -1;
}

/** Open-riser steel flight: treads with orange nosings, two stringers, and a two-rail handrail on the gap side. */
function flight(b: PrimBuilder, f: Flight): void {
  for (let k = 1; k <= f.n; k++) {
    const near = f.z0 + f.dir * RUN * (k - 1);
    const y = f.y0 + RISE * k;
    b.box({ m: 'steel', c: STEEL_DARK, x: f.cx, y: y - 0.1, z: near + f.dir * (RUN / 2 - 0.025), w: FLIGHT_W, h: 0.1, d: RUN + 0.05 });
    b.box({ m: 'matte', c: BRAND.orange, x: f.cx, y, z: near + f.dir * 0.07, w: FLIGHT_W, h: 0.03, d: 0.1, shadow: false });
  }
  const run = RUN * f.n, rise = RISE * f.n;
  const zEnd = f.z0 + f.dir * run;
  for (const s of [-1, 1]) {
    b.box({
      m: 'matte', c: STAIR_STEEL, x: f.cx + s * (FLIGHT_W / 2 - 0.05), y: f.y0 + RISE + rise / 2 - 0.3 - 0.21, z: (f.z0 + zEnd) / 2,
      w: 0.1, h: 0.42, d: Math.hypot(run, rise), rx: -f.dir * ANGLE,
    });
  }
  const x = f.cx + f.rail * (FLIGHT_W / 2 - 0.05);
  const level = (z: number) => f.y0 + RISE + (RISE / RUN) * Math.abs(z - f.z0);
  for (const up of [RAIL_H, RAIL_H / 2]) {
    b.pipe({ m: 'matte', c: BRAND.teal, a: [x, level(f.z0) + up, f.z0], b: [x, level(zEnd) + up, zEnd], r: 0.045, shadow: true });
  }
  const posts = [...Array.from({ length: Math.ceil(f.n / 2) }, (_, i) => f.z0 + f.dir * RUN * 2 * i), zEnd];
  for (const z of posts) {
    b.pipe({ m: 'matte', c: BRAND.teal, a: [x, level(z), z], b: [x, level(z) + RAIL_H, z], r: 0.04, shadow: true });
  }
}

/** A slab on posts: landing or top platform. Spans x0..x1, z0..z1, top at y. */
function platform(b: PrimBuilder, o: { x0: number; x1: number; z0: number; z1: number; y: number; posts: [number, number][] }): void {
  const cx = (o.x0 + o.x1) / 2, cz = (o.z0 + o.z1) / 2, w = o.x1 - o.x0, d = o.z1 - o.z0;
  b.box({ m: 'matte', c: CONCRETE, x: cx, y: o.y - 0.12, z: cz, w, h: 0.12, d });
  b.box({ m: 'matte', c: '#8d97a0', x: cx, y: o.y - 0.45, z: cz, w: w - 0.1, h: 0.33, d: d - 0.1, shadow: false });
  for (const [x, z] of o.posts) b.cyl({ m: 'matte', c: STAIR_STEEL, x, y: 0, z, r: 0.1, h: o.y - 0.45 });
}

/** Rail between two points at guard height (top rail + mid rail) with posts at both ends. */
function guard(b: PrimBuilder, a: [number, number], c: [number, number], y: number): void {
  for (const up of [RAIL_H, RAIL_H / 2]) {
    b.pipe({ m: 'matte', c: BRAND.teal, a: [a[0], y + up, a[1]], b: [c[0], y + up, c[1]], r: 0.045, shadow: true });
  }
  for (const [x, z] of [a, c]) b.pipe({ m: 'matte', c: BRAND.teal, a: [x, y, z], b: [x, y + RAIL_H, z], r: 0.04, shadow: true });
}

/**
 * Dog-leg fire stair: the west flight climbs north to a half-landing (y 4), the east flight climbs back south to a
 * top platform (y 6.5). Open treads keep the shaft see-through from the aerial camera; rails stay under the ceiling.
 */
const stair: KindBuilder = (b, it) => {
  const hx = it.w / 2, hz = it.d / 2;
  const ax = -hx + FLIGHT_W / 2, bx = hx - FLIGHT_W / 2;
  const landZ = hz - 7 * RUN, landY = 8 * RISE;
  flight(b, { cx: ax, z0: hz, dir: -1, y0: 0, n: 7, rail: 1 });
  flight(b, { cx: bx, z0: landZ, dir: 1, y0: landY, n: 4, rail: -1 });
  platform(b, { x0: -hx, x1: hx, z0: -hz, z1: landZ, y: landY, posts: [[-hx + 0.25, landZ - 0.2], [hx - 0.25, landZ - 0.2]] });
  const topZ = landZ + 4 * RUN, topY = landY + 5 * RISE;
  platform(b, { x0: bx - FLIGHT_W / 2, x1: hx, z0: topZ, z1: hz, y: topY, posts: [[bx - 1, hz - 0.2], [bx + 1, hz - 0.2]] });
  const gap = FLIGHT_W / 2 - 0.05;
  guard(b, [ax + gap, landZ], [bx - gap, landZ], landY);
  guard(b, [bx - gap, topZ], [bx - gap, hz - 0.05], topY);
  guard(b, [bx - gap, hz - 0.05], [hx - 0.05, hz - 0.05], topY);
};

/** Passenger lift shaft: cream cladding, teal frame, brushed-steel doors, indicator and call panel. Doors face +z. */
const lift: KindBuilder = (b, it) => {
  const h = it.h ?? 8.4, f = it.d / 2 - 0.1;
  b.box({ m: 'matte', c: '#4a5358', w: it.w - 0.05, h: 0.3, d: it.d - 0.15, shadow: false });
  b.box({ m: 'matte', c: '#e9e3d4', y: 0.3, z: -0.025, w: it.w - 0.1, h: h - 0.45, d: it.d - 0.15 });
  b.box({ m: 'matte', c: BRAND.teal, y: h - 0.15, z: -0.025, w: it.w - 0.05, h: 0.15, d: it.d - 0.15 });
  for (const s of [-1, 1]) {
    b.box({ m: 'matte', c: BRAND.teal, x: s * 0.8, y: 0.3, z: f + 0.04, w: 0.12, h: 7.1, d: 0.08 });
    b.box({ m: 'gloss', c: '#c9d2d8', x: s * 0.36, y: 0.3, z: f + 0.03, w: 0.68, h: 7.0, d: 0.05 });
  }
  b.box({ m: 'matte', c: BRAND.teal, y: 7.3, z: f + 0.04, w: 1.72, h: 0.14, d: 0.08 });
  b.box({ m: 'matte', c: INK, y: 0.3, z: f + 0.02, w: 0.05, h: 7.0, d: 0.04, shadow: false });
  b.box({ m: 'matte', c: INK, y: 7.55, z: f + 0.04, w: 0.9, h: 0.3, d: 0.06 });
  b.sign({ text: 'G', y: 7.7, z: f + 0.075, w: 0.32, h: 0.22, fg: '#ffb23a', bg: '#0b0d0e', emissive: true });
  b.box({ m: 'steel', c: STEEL, x: 1.12, y: 3.3, z: f + 0.02, w: 0.26, h: 0.8, d: 0.04, shadow: false });
  b.box({ m: 'emissive', c: '#ff8a3d', x: 1.12, y: 3.8, z: f + 0.045, w: 0.1, h: 0.1, d: 0.02 });
  b.box({ m: 'matte', c: '#c7d0d8', x: 1.12, y: 3.5, z: f + 0.045, w: 0.1, h: 0.1, d: 0.02, shadow: false });
};

export const circulationKinds: Record<string, KindBuilder> = {
  'support.stair': stair,
  'support.lift': lift,
};
