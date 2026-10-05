// Pure geometry for the flow ribbons (no three.js, so scripts/validate-layout.ts can use it):
// rounded corners, junction trimming and the triangle strips drawn by Flows.tsx.
import type { Vec2 } from '../../data/types';

const EPS = 1e-6;

/** Replace every interior vertex by a fillet of radius `radius` (quadratic Bezier, exact enough for 90 degree turns). */
export function roundPath(path: readonly Vec2[], radius: number, steps = 8): Vec2[] {
  const out: Vec2[] = [[path[0][0], path[0][1]]];
  const push = (x: number, z: number) => {
    const last = out[out.length - 1];
    if (Math.hypot(x - last[0], z - last[1]) > EPS) out.push([x, z]);
  };
  for (let i = 1; i < path.length - 1; i++) {
    const [px, pz] = path[i - 1], [cx, cz] = path[i], [nx, nz] = path[i + 1];
    const d1 = Math.hypot(cx - px, cz - pz), d2 = Math.hypot(nx - cx, nz - cz);
    const u1x = (cx - px) / d1, u1z = (cz - pz) / d1, u2x = (nx - cx) / d2, u2z = (nz - cz) / d2;
    const turn = Math.acos(Math.max(-1, Math.min(1, u1x * u2x + u1z * u2z)));
    if (turn < 1e-3) { push(cx, cz); continue; }
    // neighbouring corners may each use up to half of the segment between them
    const t = Math.min(radius * Math.tan(turn / 2), d1 / 2, d2 / 2);
    const ax = cx - u1x * t, az = cz - u1z * t, bx = cx + u2x * t, bz = cz + u2z * t;
    for (let k = 0; k <= steps; k++) {
      const s = k / steps, a = (1 - s) * (1 - s), b = 2 * (1 - s) * s, c = s * s;
      push(a * ax + b * cx + c * bx, a * az + b * cz + c * bz);
    }
  }
  push(path[path.length - 1][0], path[path.length - 1][1]);
  return out;
}

/** Distance from point (x, z) to the polyline. */
export function distanceToPath(x: number, z: number, path: readonly Vec2[]): number {
  let best = Infinity;
  for (let i = 1; i < path.length; i++) {
    const [ax, az] = path[i - 1], [bx, bz] = path[i];
    const dx = bx - ax, dz = bz - az;
    const len2 = dx * dx + dz * dz;
    const t = len2 < EPS ? 0 : Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / len2));
    best = Math.min(best, Math.hypot(x - (ax + t * dx), z - (az + t * dz)));
  }
  return best;
}

/** Cut `head` ft off the start and `tail` ft off the end of a polyline (empty when nothing is left). */
export function trimPath(path: readonly Vec2[], head: number, tail: number): Vec2[] {
  const cum = [0];
  for (let i = 1; i < path.length; i++) cum.push(cum[i - 1] + Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]));
  const total = cum[cum.length - 1];
  const from = head, to = total - tail;
  if (to - from < EPS) return [];
  const at = (s: number): Vec2 => {
    let i = 1;
    while (i < cum.length - 1 && cum[i] < s) i++;
    const k = (s - cum[i - 1]) / Math.max(EPS, cum[i] - cum[i - 1]);
    return [path[i - 1][0] + k * (path[i][0] - path[i - 1][0]), path[i - 1][1] + k * (path[i][1] - path[i - 1][1])];
  };
  const out: Vec2[] = [at(from)];
  for (let i = 0; i < path.length; i++) if (cum[i] > from + EPS && cum[i] < to - EPS) out.push([path[i][0], path[i][1]]);
  out.push(at(to));
  return out;
}

export interface Ribbon {
  /** Centre line after rounding and trimming. */
  points: Vec2[];
  /** Soft fade-in / fade-out lengths at the two ends, ft (0 = hard end, used where a branch joins another path). */
  fadeStart: number;
  fadeEnd: number;
}

export interface RibbonOptions {
  /** Ribbon width, ft. */
  width: number;
  /** Corner radius, ft. */
  radius: number;
  /** Fade length at free ends, ft. */
  fade: number;
}

/**
 * Ribbons of one flow. A branch that starts (or ends) exactly on another path of the same flow is trimmed back
 * to that path's edge so the ribbons butt together instead of overlapping, and is not faded there.
 */
export function flowRibbons(paths: readonly (readonly Vec2[])[], { width, radius, fade }: RibbonOptions): Ribbon[] {
  const joins = (p: Vec2, self: number) => paths.some((other, k) => k !== self && distanceToPath(p[0], p[1], other) < 0.05);
  return paths.map((path, i) => {
    const start = joins(path[0], i), end = joins(path[path.length - 1], i);
    const rounded = roundPath(path, radius);
    const trim = width / 2 - 0.02;
    return {
      points: trimPath(rounded, start ? trim : 0, end ? trim : 0),
      fadeStart: start ? 0 : fade,
      fadeEnd: end ? 0 : fade,
    };
  });
}

export interface RibbonBuffers {
  position: Float32Array;
  /** u = distance along the ribbon / repeat, v = 0 (left edge) .. 1 (right edge). */
  uv: Float32Array;
  /** RGBA vertex colour: white, alpha = the end fade. */
  color: Float32Array;
  index: Uint32Array;
}

const smooth = (t: number) => { const c = Math.max(0, Math.min(1, t)); return c * c * (3 - 2 * c); };

/** One triangle strip per ribbon, merged into a single indexed buffer set at height `y`. */
export function ribbonBuffers(ribbons: readonly Ribbon[], width: number, repeat: number, y: number): RibbonBuffers {
  const pos: number[] = [], uv: number[] = [], col: number[] = [], idx: number[] = [];
  const hw = width / 2;
  for (const { points: p, fadeStart, fadeEnd } of ribbons) {
    if (p.length < 2) continue;
    const cum = [0];
    const dirs: Vec2[] = [];
    for (let i = 1; i < p.length; i++) {
      const dx = p[i][0] - p[i - 1][0], dz = p[i][1] - p[i - 1][1], l = Math.hypot(dx, dz);
      cum.push(cum[i - 1] + l);
      dirs.push([dx / l, dz / l]);
    }
    const total = cum[cum.length - 1];
    const first = pos.length / 3;
    for (let i = 0; i < p.length; i++) {
      const a = dirs[Math.max(0, i - 1)], b = dirs[Math.min(dirs.length - 1, i)];
      let tx = a[0] + b[0], tz = a[1] + b[1];
      const tl = Math.hypot(tx, tz) || 1;
      tx /= tl; tz /= tl;
      // offset (z, -x) is the left of travel seen from above; scaled by the miter factor at corners
      const miter = Math.min(2, 1 / Math.max(0.5, tx * a[0] + tz * a[1]));
      const nx = tz * hw * miter, nz = -tx * hw * miter;
      const alpha = Math.min(fadeStart > 0 ? smooth(cum[i] / fadeStart) : 1, fadeEnd > 0 ? smooth((total - cum[i]) / fadeEnd) : 1);
      pos.push(p[i][0] + nx, y, p[i][1] + nz, p[i][0] - nx, y, p[i][1] - nz);
      uv.push(cum[i] / repeat, 0, cum[i] / repeat, 1);
      col.push(1, 1, 1, alpha, 1, 1, 1, alpha);
    }
    for (let i = 0; i + 1 < p.length; i++) {
      const l0 = first + i * 2, r0 = l0 + 1, l1 = l0 + 2, r1 = l0 + 3;
      idx.push(l0, r0, l1, r0, r1, l1); // counter-clockwise seen from above
    }
  }
  return { position: new Float32Array(pos), uv: new Float32Array(uv), color: new Float32Array(col), index: new Uint32Array(idx) };
}
