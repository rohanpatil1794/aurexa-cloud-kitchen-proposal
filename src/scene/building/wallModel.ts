// Wall geometry model. PURE data + maths (no three / react imports) so node scripts such as
// scripts/validate-layout.ts and the flow checks can import it.
//
// Everything is derived from src/data/layout.ts:
//   1. unit edges on the 0.5 ft lattice (room outlines + footprint perimeter; circulation makes none)
//   2. merged into runs (no doubled walls), thick rectangles centred on the edge lines
//   3. junction ownership: at every lattice node exactly one axis "owns" the node square, the other
//      axis is trimmed to its face, so the wall solid is a set of DISJOINT boxes with filled corners
//   4. openings are cut without CSG: segments beside + lintel above + sill below, with frames, glass
//      and door leaves added as separate (non-solid) pieces inside the void
//
// Coordinates: 1 unit = 1 ft, origin NW corner of the footprint, +x east, +z south, +y up.
import { FOOTPRINT, OPENINGS, ROOMS, WALL, ZONES } from '../../data/layout';
import type { Opening, RoomId, Side, Vec2, ZoneId } from '../../data/layout';

export const WALL_STYLE = {
  /** Teal cap height (rides the visible top of every solid piece). */
  cap: 0.15,
  /** Zone band thickness (sits just proud of the wall face). */
  bandT: 0.03,
  glassT: 0.04,
  /** Door frame: jamb width, head height, overhang beyond each wall face, leaf thickness. */
  jamb: 0.1,
  head: 0.14,
  proud: 0.04,
  leafT: 0.12,
  /** Ribbon window frame / mullion widths and target pane width. */
  winFrame: 0.1,
  winMullion: 0.08,
  winPane: 3.6,
  /** Glazed wall: solid sill upstand, end-post width, mullion width / depth, target pane width. */
  base: 1,
  post: 0.25,
  mullion: 0.14,
  mullionDepth: 0.3,
  pane: 4,
  /** Glazed door: centre stile width and bottom rail height. */
  stile: 0.12,
  kick: 0.25,
} as const;

export const WALL_COLORS = {
  /** Door / window frames: a darker, desaturated teal-steel so they read as subtle trim. */
  frame: '#4a7c7b',
  /** Glazing posts, mullions and rails. */
  glazing: '#1d6866',
  leaf: '#2e8b57',
} as const;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface Box { x0: number; x1: number; y0: number; y1: number; z0: number; z1: number }

/** wall = full-height run segment, lintel = above an opening, sill = below a window, base = glazed-wall upstand. */
export type SolidKind = 'wall' | 'lintel' | 'sill' | 'base';
export interface SolidBox extends Box {
  kind: SolidKind;
  run: number;
  opening?: string;
  /** Top is covered by the box stacked above it: no teal cap unless the animated wall height clips it here. */
  inner?: boolean;
}

export type FrameKind = 'jamb' | 'head' | 'rail' | 'stile' | 'post' | 'mullion';
export interface FrameBox extends Box {
  kind: FrameKind;
  color: string;
  run: number;
  opening?: string;
  /** Body stops one cap-height below the visible top (a teal entry in `caps` sits there). */
  trim?: boolean;
}
export interface GlassBox extends Box { run: number; opening?: string; trim?: boolean }
export interface LeafBox extends Box { run: number; opening: string; color: string }
export interface BandBox extends Box { zone: ZoneId; room: RoomId; side: Side; color: string }

export interface WallRun {
  id: number;
  axis: 'h' | 'v';
  /** Edge-line coordinate: z for 'h' runs, x for 'v' runs. */
  at: number;
  /** Nominal extent along the run (edge-line coordinates, node to node). */
  a: number;
  b: number;
  /** Solid extent after corner fill / junction trimming. */
  s0: number;
  s1: number;
  /** Thickness. */
  t: number;
  perimeter: boolean;
  glass: boolean;
}

export interface OpeningVoid { opening: Opening; run: number; box: Box }

export interface WallModel {
  runs: WallRun[];
  /** The wall solid: pairwise-disjoint boxes (white, capped). */
  solids: SolidBox[];
  /** Teal-only caps for glazing (posts + heads). y0..y1 is the host range the cap rides the top of. */
  caps: Box[];
  frames: FrameBox[];
  glass: GlassBox[];
  leaves: LeafBox[];
  bands: BandBox[];
  voids: OpeningVoid[];
}

// ---------------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------------
const STEP = 0.5;
const NX = Math.round(FOOTPRINT.w / STEP);
const NZ = Math.round(FOOTPRINT.d / STEP);
const EPS = 1e-6;
const H = WALL.height;
const S = WALL_STYLE;

interface Edge { perimeter: boolean; glass: boolean }
const thick = (e: Edge) => (e.perimeter ? WALL.outer : WALL.thickness);

function mkBox(axis: 'h' | 'v', at: number, depth: number, a: number, b: number, y0: number, y1: number): Box {
  const h = depth / 2;
  return axis === 'h'
    ? { x0: a, x1: b, y0, y1, z0: at - h, z1: at + h }
    : { x0: at - h, x1: at + h, y0, y1, z0: a, z1: b };
}

const spanOf = (o: Opening): [number, number] => [o.c - o.w / 2, o.c + o.w / 2];

/** Remove `cuts` from [a, b]; returns the remaining sub-spans (each longer than EPS). */
function subtract(a: number, b: number, cuts: [number, number][]): [number, number][] {
  const out: [number, number][] = [];
  let cur = a;
  for (const [c0, c1] of [...cuts].sort((p, q) => p[0] - q[0])) {
    if (c1 <= cur + EPS) continue;
    if (c0 > b - EPS) break;
    if (c0 - cur > EPS) out.push([cur, c0]);
    cur = Math.max(cur, c1);
  }
  if (b - cur > EPS) out.push([cur, b]);
  return out;
}

function buildModel(): WallModel {
  // ---- 1. which room owns each 0.5 ft cell -------------------------------------------------
  const cell: number[][] = Array.from({ length: NZ }, () => new Array<number>(NX).fill(-1));
  ROOMS.forEach((r, k) => {
    for (let i = Math.round(r.x / STEP); i < Math.round((r.x + r.w) / STEP); i++) {
      for (let j = Math.round(r.z / STEP); j < Math.round((r.z + r.d) / STEP); j++) cell[j][i] = k;
    }
  });
  const at = (i: number, j: number) => (i < 0 || j < 0 || i >= NX || j >= NZ ? -1 : cell[j][i]);
  const glassOf = (k: number, side: Side) => k >= 0 && !!ROOMS[k].glass?.includes(side);

  // ---- 2. unit edges: a wall wherever the room differs, plus the whole perimeter -------------
  // hE[j][i]: edge on line z = j·0.5 from x = i·0.5 to (i+1)·0.5.  vE[i][j]: edge on x = i·0.5, z = j·0.5 → (j+1)·0.5.
  const hE: (Edge | null)[][] = Array.from({ length: NZ + 1 }, () => new Array<Edge | null>(NX).fill(null));
  const vE: (Edge | null)[][] = Array.from({ length: NX + 1 }, () => new Array<Edge | null>(NZ).fill(null));
  for (let j = 0; j <= NZ; j++) {
    for (let i = 0; i < NX; i++) {
      const above = at(i, j - 1), below = at(i, j);
      const perimeter = j === 0 || j === NZ;
      if (perimeter || above !== below) hE[j][i] = { perimeter, glass: glassOf(above, 'S') || glassOf(below, 'N') };
    }
  }
  for (let i = 0; i <= NX; i++) {
    for (let j = 0; j < NZ; j++) {
      const west = at(i - 1, j), east = at(i, j);
      const perimeter = i === 0 || i === NX;
      if (perimeter || west !== east) vE[i][j] = { perimeter, glass: glassOf(west, 'E') || glassOf(east, 'W') };
    }
  }

  // ---- 3. node ownership --------------------------------------------------------------------
  const hasE = (i: number, j: number) => !!hE[j]?.[i];
  const hasW = (i: number, j: number) => i > 0 && !!hE[j]?.[i - 1];
  const hasS = (i: number, j: number) => !!vE[i]?.[j];
  const hasN = (i: number, j: number) => j > 0 && !!vE[i]?.[j - 1];
  /** Which axis owns the node square: the one that runs through it; an L-corner goes to 'h'. */
  const owner = (i: number, j: number): 'h' | 'v' | null => {
    const e = hasE(i, j), w = hasW(i, j), n = hasN(i, j), s = hasS(i, j);
    if (e && w) return 'h';
    if (n && s) return 'v';
    return (e || w) && (n || s) ? 'h' : null;
  };
  const tH = (i: number, j: number) => Math.max(hE[j]?.[i] ? thick(hE[j][i]!) : 0, i > 0 && hE[j]?.[i - 1] ? thick(hE[j][i - 1]!) : 0);
  const tV = (i: number, j: number) => Math.max(vE[i]?.[j] ? thick(vE[i][j]!) : 0, j > 0 && vE[i]?.[j - 1] ? thick(vE[i][j - 1]!) : 0);

  /** Signed shift of an h-run end at node (i, j): corner fill outward, or trim to the face of a passing v wall. */
  const hEnd = (i: number, j: number, start: boolean): number => {
    if (start ? hasW(i, j) : hasE(i, j)) return 0; // continued by another h run (attribute split)
    if (!hasN(i, j) && !hasS(i, j)) return 0;
    const tv = tV(i, j) / 2;
    const outward = start ? -1 : 1;
    return owner(i, j) === 'v' ? -outward * tv : outward * tv;
  };
  /** Signed shift of a v-run end at node (i, j): trim to the face of an h wall that owns the node. */
  const vEnd = (i: number, j: number, start: boolean): number => {
    if (start ? hasN(i, j) : hasS(i, j)) return 0;
    if (owner(i, j) !== 'h') return 0;
    return start ? tH(i, j) / 2 : -tH(i, j) / 2;
  };

  // ---- 4. merge unit edges into runs --------------------------------------------------------
  const runs: WallRun[] = [];
  for (const axis of ['h', 'v'] as const) {
    const lines = (axis === 'h' ? NZ : NX) + 1;
    const len = axis === 'h' ? NX : NZ;
    for (let l = 0; l < lines; l++) {
      const e = (k: number) => (axis === 'h' ? hE[l][k] : vE[l][k]);
      for (let k = 0; k < len;) {
        const first = e(k);
        if (!first) { k++; continue; }
        let m = k + 1;
        while (m < len && e(m) && e(m)!.perimeter === first.perimeter && e(m)!.glass === first.glass) m++;
        const a = k * STEP, b = m * STEP;
        const d0 = axis === 'h' ? hEnd(k, l, true) : vEnd(l, k, true);
        const d1 = axis === 'h' ? hEnd(m, l, false) : vEnd(l, m, false);
        runs.push({
          id: runs.length, axis, at: l * STEP, a, b, s0: a + d0, s1: b + d1,
          t: thick(first), perimeter: first.perimeter, glass: first.glass,
        });
        k = m;
      }
    }
  }

  // ---- 5. assign openings to runs -----------------------------------------------------------
  const opsByRun = new Map<number, Opening[]>();
  const runOfOpening = new Map<string, WallRun>();
  for (const o of OPENINGS) {
    const [a, b] = spanOf(o);
    const run = runs.find((r) => r.axis === o.wall && Math.abs(r.at - o.at) < EPS && r.a - EPS <= a && r.b + EPS >= b);
    if (!run) throw new Error(`walls: opening ${o.id} is not on any wall run`);
    runOfOpening.set(o.id, run);
    (opsByRun.get(run.id) ?? opsByRun.set(run.id, []).get(run.id)!).push(o);
  }

  // ---- 6. pieces ----------------------------------------------------------------------------
  const solids: SolidBox[] = [];
  const caps: Box[] = [];
  const frames: FrameBox[] = [];
  const glass: GlassBox[] = [];
  const leaves: LeafBox[] = [];
  const voids: OpeningVoid[] = [];

  for (const run of runs) {
    const { axis, t } = run;
    const ops = (opsByRun.get(run.id) ?? []).sort((p, q) => p.c - q.c);
    const B = (a: number, b: number, y0: number, y1: number, depth = t) => mkBox(axis, run.at, depth, a, b, y0, y1);
    const solid = (kind: SolidKind, a: number, b: number, y0: number, y1: number, opening?: string, inner = false) => {
      if (b - a > EPS && y1 - y0 > EPS) solids.push({ ...B(a, b, y0, y1), kind, run: run.id, ...(opening ? { opening } : {}), ...(inner ? { inner } : {}) });
    };
    /**
     * Full-height wall segment beside openings. It is stacked at the neighbouring openings' head / sill
     * heights so its vertical edges carry the same vertices as the lintel and sill boxes next to it
     * (no T-junction hairline cracks along the seam).
     */
    const wallSegment = (a: number, b: number, ...beside: (Opening | undefined)[]) => {
      const ys = new Set<number>([0, H]);
      for (const o of beside) {
        if (!o) continue;
        if (o.y0 > EPS) ys.add(o.y0);
        if (o.y1 < H - EPS) ys.add(o.y1);
      }
      const levels = [...ys].sort((p, q) => p - q);
      for (let k = 0; k + 1 < levels.length; k++) solid('wall', a, b, levels[k], levels[k + 1], undefined, k + 2 < levels.length);
    };
    const frame = (kind: FrameKind, color: string, a: number, b: number, y0: number, y1: number, depth: number, o?: string, trim = false) => {
      if (b - a > EPS && y1 - y0 > EPS) frames.push({ ...B(a, b, y0, y1, depth), kind, color, run: run.id, ...(o ? { opening: o } : {}), ...(trim ? { trim } : {}) });
    };
    const pane = (a: number, b: number, y0: number, y1: number, o?: string, trim = false) => {
      if (b - a > EPS && y1 - y0 > EPS) glass.push({ ...B(a, b, y0, y1, S.glassT), run: run.id, ...(o ? { opening: o } : {}), ...(trim ? { trim } : {}) });
    };
    const cap = (a: number, b: number, y0: number, depth = t) => {
      if (b - a > EPS) caps.push(B(a, b, y0, H, depth));
    };

    for (const o of ops) {
      const [a, b] = spanOf(o);
      voids.push({ opening: o, run: run.id, box: B(a, b, o.y0, o.y1) });
    }

    /** Slim door frame (jambs + head) sitting inside the opening, a touch proud of both wall faces. */
    const doorFrame = (o: Opening, d = t + 2 * S.proud) => {
      const [a, b] = spanOf(o);
      frame('jamb', WALL_COLORS.frame, a, a + S.jamb, o.y0, o.y1, d, o.id);
      frame('jamb', WALL_COLORS.frame, b - S.jamb, b, o.y0, o.y1, d, o.id);
      frame('head', WALL_COLORS.frame, a + S.jamb, b - S.jamb, o.y1 - S.head, o.y1, d, o.id);
    };
    /** Closed pair of glass leaves with a centre stile and a kick rail. */
    const glazedLeaves = (o: Opening, depth: number) => {
      const [a, b] = spanOf(o);
      const ya = o.y0 + S.kick, yb = o.y1 - S.head;
      frame('rail', WALL_COLORS.frame, a + S.jamb, b - S.jamb, o.y0, ya, depth, o.id);
      frame('stile', WALL_COLORS.frame, o.c - S.stile / 2, o.c + S.stile / 2, ya, yb, depth, o.id);
      pane(a + S.jamb, o.c - S.stile / 2, ya, yb, o.id);
      pane(o.c + S.stile / 2, b - S.jamb, ya, yb, o.id);
    };
    const leaf = (o: Opening) => {
      const [a, b] = spanOf(o);
      leaves.push({ ...B(a + S.jamb, b - S.jamb, o.y0, o.y1 - S.head, S.leafT), run: run.id, opening: o.id, color: WALL_COLORS.leaf });
    };

    // ---------- glazed run: sill upstand + posts + mullions + panes + teal head ----------
    if (run.glass) {
      const doors = ops.filter((o) => o.kind !== 'ribbon' && o.kind !== 'pass');
      const spans: [number, number][] = doors.map(spanOf);
      for (const [a, b] of subtract(run.s0, run.s1, spans)) solid('base', a, b, 0, S.base);

      // end posts: full wall thickness so the glazing closes flush against the neighbouring solid wall
      for (const [a, b] of [[run.s0, run.s0 + S.post], [run.s1 - S.post, run.s1]] as const) {
        frame('post', WALL_COLORS.glazing, a, b, S.base, H, t, undefined, true);
        cap(a, b, S.base);
      }
      const inner0 = run.s0 + S.post, inner1 = run.s1 - S.post;
      for (const [p, q] of subtract(inner0, inner1, spans)) {
        const n = Math.max(1, Math.round((q - p) / S.pane));
        const w = (q - p) / n;
        for (let k = 0; k < n; k++) {
          const pa = p + k * w + (k > 0 ? S.mullion / 2 : 0);
          const pb = p + (k + 1) * w - (k < n - 1 ? S.mullion / 2 : 0);
          pane(pa, pb, S.base, H, undefined, true);
          if (k > 0) frame('mullion', WALL_COLORS.glazing, p + k * w - S.mullion / 2, p + k * w + S.mullion / 2, S.base, H, S.mullionDepth, undefined, true);
        }
        cap(p, q, S.base, S.mullionDepth);
      }
      for (const o of doors) {
        const [a, b] = spanOf(o);
        doorFrame(o, S.mullionDepth);
        if (o.kind === 'glazed') glazedLeaves(o, S.mullionDepth);
        if (o.kind === 'emergency') leaf(o);
        pane(a, b, o.y1, H, o.id, true); // transom above the door head
        cap(a, b, o.y1, S.mullionDepth);
      }
      continue;
    }

    // ---------- solid run: segments beside the openings + lintels + sills ----------
    let cur = run.s0;
    let prev: Opening | undefined;
    for (const o of ops) {
      const [a, b] = spanOf(o);
      wallSegment(cur, a, prev, o);
      solid('sill', a, b, 0, o.y0, o.id);
      solid('lintel', a, b, o.y1, H, o.id);
      cur = b;
      prev = o;

      switch (o.kind) {
        case 'logo': // left completely open and frameless: LogoDoor draws it
          break;
        case 'ribbon': {
          const f = S.winFrame;
          const d = t + 2 * S.proud;
          frame('jamb', WALL_COLORS.frame, a, a + f, o.y0, o.y1, d, o.id);
          frame('jamb', WALL_COLORS.frame, b - f, b, o.y0, o.y1, d, o.id);
          frame('head', WALL_COLORS.frame, a + f, b - f, o.y1 - f, o.y1, d, o.id);
          frame('rail', WALL_COLORS.frame, a + f, b - f, o.y0, o.y0 + f, d, o.id);
          const n = Math.max(1, Math.round((o.w - 2 * f) / S.winPane));
          const w = (o.w - 2 * f) / n;
          for (let k = 0; k < n; k++) {
            const pa = a + f + k * w + (k > 0 ? S.winMullion / 2 : 0);
            const pb = a + f + (k + 1) * w - (k < n - 1 ? S.winMullion / 2 : 0);
            pane(pa, pb, o.y0 + f, o.y1 - f, o.id);
            if (k > 0) frame('mullion', WALL_COLORS.frame, a + f + k * w - S.winMullion / 2, a + f + k * w + S.winMullion / 2, o.y0 + f, o.y1 - f, t, o.id);
          }
          break;
        }
        case 'emergency':
          doorFrame(o);
          leaf(o);
          break;
        case 'glazed':
          doorFrame(o);
          glazedLeaves(o, t);
          break;
        default: // door, double, service, pass: frame only (clear opening)
          doorFrame(o);
      }
    }
    wallSegment(cur, run.s1, prev);
  }

  // ---- 7. zone bands on the INTERIOR face of every zone room's non-glass sides --------------
  const bands: BandBox[] = [];
  for (const r of ROOMS) {
    if (!r.zone) continue;
    const color = ZONES[r.zone].color;
    const onEdge = (side: Side) =>
      side === 'N' ? r.z === 0 : side === 'S' ? r.z + r.d === FOOTPRINT.d : side === 'W' ? r.x === 0 : r.x + r.w === FOOTPRINT.w;
    const half = (side: Side) => (onEdge(side) ? WALL.outer : WALL.thickness) / 2;
    const fN = r.z + half('N'), fS = r.z + r.d - half('S'), fW = r.x + half('W'), fE = r.x + r.w - half('E');
    const bt = S.bandT;
    const cutsFor = (axis: 'h' | 'v', line: number) =>
      OPENINGS.filter((o) => o.wall === axis && Math.abs(o.at - line) < EPS && o.y0 < WALL.band).map(spanOf);
    const add = (side: Side, a: number, b: number, depth0: number, depth1: number) => {
      const horizontal = side === 'N' || side === 'S';
      const line = side === 'N' ? r.z : side === 'S' ? r.z + r.d : side === 'W' ? r.x : r.x + r.w;
      for (const [s0, s1] of subtract(a, b, cutsFor(horizontal ? 'h' : 'v', line))) {
        const box = horizontal
          ? { x0: s0, x1: s1, y0: 0, y1: WALL.band, z0: depth0, z1: depth1 }
          : { x0: depth0, x1: depth1, y0: 0, y1: WALL.band, z0: s0, z1: s1 };
        bands.push({ ...box, zone: r.zone!, room: r.id, side, color });
      }
    };
    const glassSide = (s: Side) => !!r.glass?.includes(s);
    if (!glassSide('N')) add('N', fW, fE, fN, fN + bt);
    if (!glassSide('S')) add('S', fW, fE, fS - bt, fS);
    // W/E bands stop short of the N/S ones so the corner boxes never overlap
    if (!glassSide('W')) add('W', fN + bt, fS - bt, fW, fW + bt);
    if (!glassSide('E')) add('E', fN + bt, fS - bt, fE - bt, fE);
  }

  return { runs, solids, caps, frames, glass, leaves, bands, voids };
}

export const WALL_MODEL: WallModel = buildModel();

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------
/** Do two boxes share positive volume? (touching faces do not count) */
export function boxesOverlap(p: Box, q: Box, eps = 1e-6): boolean {
  return (
    p.x0 < q.x1 - eps && q.x0 < p.x1 - eps &&
    p.y0 < q.y1 - eps && q.y0 < p.y1 - eps &&
    p.z0 < q.z1 - eps && q.z0 < p.z1 - eps
  );
}

/** Does the plan segment p0→p1 (x, z) pass through the interior of `b` at height `y`? Touching or grazing a face is not a hit. */
export function segmentHitsBox(p0: Vec2, p1: Vec2, y: number, b: Box): boolean {
  if (y < b.y0 - 1e-9 || y >= b.y1 - 1e-9) return false;
  let t0 = 0, t1 = 1;
  const axes: [number, number, number, number][] = [
    [p0[0], p1[0] - p0[0], b.x0, b.x1],
    [p0[1], p1[1] - p0[1], b.z0, b.z1],
  ];
  for (const [p, d, lo, hi] of axes) {
    if (Math.abs(d) < 1e-12) {
      if (p <= lo + 1e-9 || p >= hi - 1e-9) return false;
    } else {
      let ta = (lo - p) / d, tb = (hi - p) / d;
      if (ta > tb) [ta, tb] = [tb, ta];
      t0 = Math.max(t0, ta);
      t1 = Math.min(t1, tb);
    }
  }
  return t1 - t0 > 1e-9;
}

/** Wall solids the plan segment p0→p1 crosses at height `y` (empty = the segment only passes through openings). */
export function wallBoxesIntersectSegment(p0: Vec2, p1: Vec2, y: number, boxes: readonly SolidBox[] = WALL_MODEL.solids): SolidBox[] {
  return boxes.filter((b) => segmentHitsBox(p0, p1, y, b));
}

/** Every wall crossing along a polyline at height `y`: which segment, which box. */
export function wallCrossings(path: readonly Vec2[], y: number): { segment: number; box: SolidBox }[] {
  const out: { segment: number; box: SolidBox }[] = [];
  for (let i = 0; i + 1 < path.length; i++) {
    for (const box of wallBoxesIntersectSegment(path[i], path[i + 1], y)) out.push({ segment: i, box });
  }
  return out;
}

/** Is the point (x, y, z) inside wall solid? */
export function solidAt(x: number, y: number, z: number): boolean {
  return WALL_MODEL.solids.some((b) => x > b.x0 && x < b.x1 && y >= b.y0 && y < b.y1 && z > b.z0 && z < b.z1);
}
