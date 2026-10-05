// Layout validator:  npm run validate
// Checks the data in src/data/layout.ts. Exits 1 on any failure.
//   1. rooms snap to 0.5 ft and sit inside the 60 × 50 footprint
//   2. rooms + circulation tile the footprint exactly (no gap, no overlap) at 0.5 ft resolution
//   3. every opening lies on a real wall between the two spaces it declares
//   4. every door clears the wall junctions on its wall line (so a leaf never cuts into a T-junction)
//   5. no two openings on a wall overlap
//   6. every room has a door and is reachable from outside by walking through doors
// Other agents extend this file with their own checks (wall geometry, flows, safety) in new sections.
import {
  CIRCULATION, FOOTPRINT, OPENINGS, ROOMS, TOTAL_AREA, WALL,
  type Opening, type SpaceId,
} from '../src/data/layout';

let failed = 0;
const fail = (msg: string) => { failed++; console.log(`  ✗ ${msg}`); };
const ok = (msg: string) => console.log(`  ✓ ${msg}`);
const section = (t: string) => console.log(`\n${t}`);

const STEP = 0.5;
const nx = FOOTPRINT.w / STEP;
const nz = FOOTPRINT.d / STEP;
const EPS = 1e-6;

// ---- 1. snapping / bounds ---------------------------------------------------
section('1. Rooms: snap + bounds');
for (const r of ROOMS) {
  for (const [k, v] of Object.entries({ x: r.x, z: r.z, w: r.w, d: r.d })) {
    if (Math.abs(v / STEP - Math.round(v / STEP)) > EPS) fail(`${r.id}.${k} = ${v} is not on the 0.5 ft grid`);
  }
  if (r.x < 0 || r.z < 0 || r.x + r.w > FOOTPRINT.w + EPS || r.z + r.d > FOOTPRINT.d + EPS) fail(`${r.id} is outside the footprint`);
}
if (!failed) ok(`${ROOMS.length} rooms snapped and inside ${FOOTPRINT.w} × ${FOOTPRINT.d}`);

// ---- 2. tiling ---------------------------------------------------------------
section('2. Footprint tiling (rooms + circulation)');
const grid: string[][][] = Array.from({ length: nz }, () => Array.from({ length: nx }, () => [] as string[]));
for (const s of [...ROOMS, ...CIRCULATION]) {
  for (let i = Math.round(s.x / STEP); i < Math.round((s.x + s.w) / STEP); i++) {
    for (let j = Math.round(s.z / STEP); j < Math.round((s.z + s.d) / STEP); j++) {
      if (i >= 0 && i < nx && j >= 0 && j < nz) grid[j][i].push(s.id);
    }
  }
}
let gaps = 0, overlaps = 0;
const sample: string[] = [];
for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
  const n = grid[j][i].length;
  if (n === 0) { gaps++; if (sample.length < 6) sample.push(`gap @ (${i * STEP}, ${j * STEP})`); }
  if (n > 1) { overlaps++; if (sample.length < 6) sample.push(`overlap @ (${i * STEP}, ${j * STEP}): ${grid[j][i].join(' + ')}`); }
}
if (gaps || overlaps) { fail(`${gaps} uncovered cells, ${overlaps} overlapping cells`); sample.forEach((s) => console.log(`      ${s}`)); }
else ok('every 0.5 ft cell is covered exactly once');
const areaSum = [...ROOMS, ...CIRCULATION].reduce((a, s) => a + s.w * s.d, 0);
if (Math.abs(areaSum - TOTAL_AREA) > EPS) fail(`areas sum to ${areaSum}, footprint is ${TOTAL_AREA}`);
else ok(`areas sum to ${areaSum} sq ft = footprint (rooms ${ROOMS.reduce((a, r) => a + r.w * r.d, 0)}, circulation ${CIRCULATION.reduce((a, c) => a + c.w * c.d, 0)})`);

// ---- helpers -----------------------------------------------------------------
const isRoom = (id: string) => ROOMS.some((r) => r.id === id);
function spaceAt(x: number, z: number): SpaceId {
  if (x < 0 || z < 0 || x >= FOOTPRINT.w || z >= FOOTPRINT.d) return 'outside';
  const i = Math.floor(x / STEP + EPS), j = Math.floor(z / STEP + EPS);
  return (grid[j]?.[i]?.[0] as SpaceId) ?? 'outside';
}
/** The two spaces on either side of a wall line at parameter t along it. */
function sides(o: Pick<Opening, 'wall' | 'at'>, t: number): [SpaceId, SpaceId] {
  const e = 0.25;
  return o.wall === 'h' ? [spaceAt(t, o.at - e), spaceAt(t, o.at + e)] : [spaceAt(o.at - e, t), spaceAt(o.at + e, t)];
}
const same = (a: [SpaceId, SpaceId], b: [SpaceId, SpaceId]) => (a[0] === b[0] && a[1] === b[1]) || (a[0] === b[1] && a[1] === b[0]);

// ---- 3. openings on real walls -------------------------------------------------
section('3. Openings sit on real walls');
const spanOf = (o: Opening): [number, number] => [o.c - o.w / 2, o.c + o.w / 2];
for (const o of OPENINGS) {
  const [a, b] = spanOf(o);
  if (o.kind === 'ribbon') {
    // ribbon windows must be on an exterior wall (outside on one side)
    const s0 = sides(o, o.c);
    if (!s0.includes('outside')) fail(`${o.id}: ribbon window is not on an exterior wall`);
    continue;
  }
  if (!o.rooms) { fail(`${o.id}: door without rooms[]`); continue; }
  let good = true;
  for (let t = a + 0.25; t <= b - 0.25 + EPS; t += 0.25) {
    const s = sides(o, t);
    if (!same(s, o.rooms)) { good = false; fail(`${o.id}: at ${o.wall === 'h' ? 'x' : 'z'}=${t.toFixed(2)} the wall separates ${s[0]} | ${s[1]}, declared ${o.rooms.join(' | ')}`); break; }
  }
  if (good) ok(`${o.id}  (${o.rooms.join(' ↔ ')})`);
}

// ---- 4. junction clearance -------------------------------------------------------
section('4. Door clearance from wall junctions');
function junctions(o: Opening): number[] {
  const out: number[] = [];
  const len = o.wall === 'h' ? FOOTPRINT.w : FOOTPRINT.d;
  const half = WALL.thickness / 2;
  // end of the wall run along the footprint edges
  out.push(0 - (WALL.outer / 2 - 0) + WALL.outer / 2); // 0
  out.push(len);
  for (let t = STEP; t < len; t += STEP) {
    const p = sides(o, t - STEP / 2), q = sides(o, t + STEP / 2);
    const changed = p[0] !== q[0] || p[1] !== q[1];
    if (!changed) continue;
    // a perpendicular wall exists if either side changed and at least one of the changing spaces is a room
    const sideChange = (a: SpaceId, b: SpaceId) => a !== b && (isRoom(a) || isRoom(b) || a === 'outside' || b === 'outside') && !(a === 'outside' && b === 'outside');
    if (sideChange(p[0], q[0]) || sideChange(p[1], q[1])) out.push(t);
  }
  void half;
  return out;
}
for (const o of OPENINGS) {
  if (o.kind === 'ribbon' || o.kind === 'pass') {
    // windows only need to stay inside the wall run between junctions too
  }
  const [a, b] = spanOf(o);
  const js = junctions(o);
  const isExterior = sides(o, o.c).includes('outside');
  const wallHalf = (isExterior ? WALL.outer : WALL.thickness) / 2;
  let bad = false;
  for (const j of js) {
    // perpendicular wall at j occupies [j - 0.25, j + 0.25] (outer corners use 0.375)
    const reach = j <= EPS || j >= (o.wall === 'h' ? FOOTPRINT.w : FOOTPRINT.d) - EPS ? WALL.outer / 2 : WALL.thickness / 2;
    const lo = j - reach, hi = j + reach;
    if (a < hi - EPS && b > lo + EPS) { bad = true; fail(`${o.id}: span ${a.toFixed(2)}–${b.toFixed(2)} cuts the junction wall at ${j} (${lo.toFixed(2)}–${hi.toFixed(2)})`); }
  }
  void wallHalf;
  if (!bad) ok(`${o.id}  clear (span ${a.toFixed(2)}–${b.toFixed(2)})`);
}

// ---- 5. openings don't overlap ------------------------------------------------------
section('5. Openings do not overlap on a wall');
let overlapFound = false;
for (let i = 0; i < OPENINGS.length; i++) for (let k = i + 1; k < OPENINGS.length; k++) {
  const p = OPENINGS[i], q = OPENINGS[k];
  if (p.wall !== q.wall || p.at !== q.at) continue;
  const [a0, a1] = spanOf(p), [b0, b1] = spanOf(q);
  // a ribbon window sits high on the wall; it may share a wall line with a door only if y ranges differ
  if (p.y1 <= q.y0 || q.y1 <= p.y0) continue;
  if (a0 < b1 + 0.25 - EPS && b0 < a1 + 0.25 - EPS) { overlapFound = true; fail(`${p.id} and ${q.id} overlap (or are < 0.25 ft apart)`); }
}
if (!overlapFound) ok('no overlapping openings');

// ---- 6. connectivity -------------------------------------------------------------------
section('6. Every room has a door and is reachable from outside');
const adj = new Map<string, Set<string>>();
const link = (a: string, b: string) => { (adj.get(a) ?? adj.set(a, new Set()).get(a)!).add(b); (adj.get(b) ?? adj.set(b, new Set()).get(b)!).add(a); };
for (const o of OPENINGS) if (o.rooms && o.kind !== 'pass') link(o.rooms[0], o.rooms[1]);
// circulation rectangles that touch with no wall between them are open to each other
for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
  const here = grid[j][i][0];
  for (const [di, dj] of [[1, 0], [0, 1]]) {
    const there = grid[j + dj]?.[i + di]?.[0];
    if (!there || there === here) continue;
    if (!isRoom(here) && !isRoom(there)) link(here, there);
  }
}
const seen = new Set<string>(['outside']);
const queue = ['outside'];
while (queue.length) {
  const cur = queue.shift()!;
  for (const n of adj.get(cur) ?? []) if (!seen.has(n)) { seen.add(n); queue.push(n); }
}
for (const r of ROOMS) {
  const doors = OPENINGS.filter((o) => o.rooms?.includes(r.id) && o.kind !== 'pass');
  if (!doors.length) fail(`${r.id} has no door`);
  else if (!seen.has(r.id)) fail(`${r.id} is NOT reachable from outside`);
}
for (const c of CIRCULATION) if (!seen.has(c.id)) fail(`circulation ${c.id} is not connected to the rest`);
if (!failed) ok(`all ${ROOMS.length} rooms + ${CIRCULATION.length} circulation spaces reachable from outside`);

// ---- 7. wall geometry (src/scene/building/wallModel.ts) -------------------------------------------------
import { WALL_MODEL, WALL_STYLE, boxesOverlap, wallBoxesIntersectSegment, type Box } from '../src/scene/building/wallModel';

section('7. Wall geometry');
{
  const M = WALL_MODEL;
  const before = failed;
  const OUT = WALL.outer / 2 + WALL_STYLE.proud; // frames overhang the wall faces by a hair

  // 7a. every box is sane and nothing overlaps: wall solid, frames, glass, leaves and bands are one disjoint set
  const groups: [string, Box[]][] = [['solid', M.solids], ['frame', M.frames], ['glass', M.glass], ['leaf', M.leaves], ['band', M.bands]];
  const all = groups.flatMap(([name, list]) => list.map((box, i) => ({ name, i, box })));
  let degenerate = 0;
  for (const { name, i, box: b } of all) {
    if (!(b.x1 > b.x0 && b.y1 > b.y0 && b.z1 > b.z0) || b.x0 < -OUT - EPS || b.z0 < -OUT - EPS || b.x1 > FOOTPRINT.w + OUT + EPS || b.z1 > FOOTPRINT.d + OUT + EPS || b.y0 < -EPS || b.y1 > WALL.height + EPS) {
      degenerate++; fail(`${name}[${i}] is degenerate or outside the footprint: ${JSON.stringify(b)}`);
    }
  }
  let overlaps = 0;
  for (let i = 0; i < all.length; i++) for (let k = i + 1; k < all.length; k++) {
    if (boxesOverlap(all[i].box, all[k].box)) {
      overlaps++;
      if (overlaps <= 5) fail(`${all[i].name}[${all[i].i}] overlaps ${all[k].name}[${all[k].i}]`);
    }
  }
  if (!degenerate && !overlaps) ok(`${M.solids.length} wall solids + ${M.frames.length} frames + ${M.glass.length} glass + ${M.leaves.length} leaves + ${M.bands.length} bands: all sane and pairwise disjoint`);
  else if (overlaps > 5) fail(`... ${overlaps} overlapping pairs in total`);

  // 7b. every opening's void is empty of wall solid; every opening has a head above it
  let voidBad = 0, headBad = 0;
  const byId = new Map(M.runs.map((r) => [r.id, r]));
  for (const v of M.voids) {
    const o = v.opening;
    if (M.solids.some((b) => boxesOverlap(b, v.box))) { voidBad++; fail(`${o.id}: void y ${o.y0}-${o.y1} is not clear of wall solid`); }
    if (o.y1 < WALL.height - EPS) {
      const run = byId.get(v.run)!;
      const covers = (list: Box[], y: number, x: number, z: number) => list.some((b) => x > b.x0 && x < b.x1 && z > b.z0 && z < b.z1 && y > b.y0 && y < b.y1);
      const [a, b] = [o.c - o.w / 2, o.c + o.w / 2];
      for (let t = a + 0.05; t < b; t += 0.25) {
        const [x, z] = o.wall === 'h' ? [t, o.at] : [o.at, t];
        for (const y of [o.y1 + 0.01, WALL.height - 0.01]) {
          // a glazed wall closes its door with a glass transom, every other wall with a solid lintel
          if (!covers(run.glass ? M.glass : M.solids, y, x, z)) { headBad++; fail(`${o.id}: nothing above the opening at ${o.wall === 'h' ? 'x' : 'z'}=${t.toFixed(2)}, y=${y.toFixed(2)}`); break; }
        }
      }
    }
  }
  if (!voidBad) ok(`all ${M.voids.length} opening voids are clear from y0 to y1`);
  if (!headBad) ok('every opening with y1 < 10 has a lintel (or glass transom) above it');

  // 7c. corners and T-junctions: the plan footprint of the wall solid equals the independent
  //     "every unit edge, thickened and square-capped" union, at 1/8 ft resolution
  const R = 8, PAD = 8;
  const RW = Math.round(FOOTPRINT.w * R) + 2 * PAD, RD = Math.round(FOOTPRINT.d * R) + 2 * PAD;
  const expectG = new Uint8Array(RW * RD), actualG = new Uint8Array(RW * RD);
  const fillRect = (g: Uint8Array, x0: number, x1: number, z0: number, z1: number) => {
    for (let k = Math.round(z0 * R) + PAD; k < Math.round(z1 * R) + PAD; k++) for (let i = Math.round(x0 * R) + PAD; i < Math.round(x1 * R) + PAD; i++) g[k * RW + i] = 1;
  };
  const key = (i: number, j: number) => {
    if (i < 0 || j < 0 || i >= nx || j >= nz) return '';
    const id = grid[j][i][0];
    return isRoom(id) ? id : '';
  };
  for (let j = 0; j <= nz; j++) for (let i = 0; i < nx; i++) {
    const per = j === 0 || j === nz;
    if (!per && key(i, j - 1) === key(i, j)) continue;
    const t = (per ? WALL.outer : WALL.thickness) / 2;
    fillRect(expectG, i * STEP - t, (i + 1) * STEP + t, j * STEP - t, j * STEP + t);
  }
  for (let i = 0; i <= nx; i++) for (let j = 0; j < nz; j++) {
    const per = i === 0 || i === nx;
    if (!per && key(i - 1, j) === key(i, j)) continue;
    const t = (per ? WALL.outer : WALL.thickness) / 2;
    fillRect(expectG, i * STEP - t, i * STEP + t, j * STEP - t, (j + 1) * STEP + t);
  }
  for (const b of M.solids) fillRect(actualG, b.x0, b.x1, b.z0, b.z1);
  for (const v of M.voids) fillRect(actualG, v.box.x0, v.box.x1, v.box.z0, v.box.z1);
  let mismatch = 0, expectedCells = 0;
  const bad: string[] = [];
  for (let k = 0; k < RD; k++) for (let i = 0; i < RW; i++) {
    const e = expectG[k * RW + i], a = actualG[k * RW + i];
    expectedCells += e;
    if (e !== a) {
      mismatch++;
      if (bad.length < 5) bad.push(`${e ? 'notch' : 'extra wall'} @ (${((i - PAD) / R).toFixed(3)}, ${((k - PAD) / R).toFixed(3)})`);
    }
  }
  const wallArea = expectedCells / (R * R);
  if (mismatch) { fail(`${mismatch} plan cells differ from the thickened-edge union`); bad.forEach((s) => console.log(`      ${s}`)); }
  else ok(`wall footprint = thickened-edge union, no notches / doubled walls (${wallArea.toFixed(1)} sq ft = ${(100 * wallArea / TOTAL_AREA).toFixed(1)}% of the footprint)`);
  if (wallArea < 0.02 * TOTAL_AREA || wallArea > 0.2 * TOTAL_AREA) fail(`wall area ${wallArea.toFixed(1)} sq ft is outside 2–20% of the footprint`);

  // 7d. every run lies on a room / perimeter edge
  let offEdge = 0;
  for (const r of M.runs) {
    for (let t = r.a + 0.25; t < r.b; t += 0.5) {
      const [p, q] = sides({ wall: r.axis, at: r.at }, t);
      const onPerimeter = r.at <= EPS || r.at >= (r.axis === 'h' ? FOOTPRINT.d : FOOTPRINT.w) - EPS;
      if (!onPerimeter && !(p !== q && (isRoom(p) || isRoom(q)))) { offEdge++; fail(`run ${r.id} (${r.axis} @ ${r.at}) is not on a room edge at ${t}`); break; }
    }
  }
  if (!offEdge) ok(`all ${M.runs.length} wall runs lie on a room or perimeter edge`);

  // 7e. wallBoxesIntersectSegment: a path through each opening is clear, a path beside it is blocked
  let segBad = 0;
  for (const v of M.voids) {
    const o = v.opening, run = byId.get(v.run)!;
    const yMid = (o.y0 + o.y1) / 2;
    const across = (c: number): [[number, number], [number, number]] =>
      o.wall === 'h' ? [[c, o.at - 1.2], [c, o.at + 1.2]] : [[o.at - 1.2, c], [o.at + 1.2, c]];
    const [p0, p1] = across(o.c);
    if (wallBoxesIntersectSegment(p0, p1, yMid).length) { segBad++; fail(`${o.id}: a path through the opening hits a wall`); }
    const yBeside = run.glass ? 0.5 : 3;
    const side = across(o.c - o.w / 2 - 0.1);
    if (!wallBoxesIntersectSegment(side[0], side[1], yBeside).length) { segBad++; fail(`${o.id}: a path beside the opening does not hit the wall`); }
  }
  if (!segBad) ok('wallBoxesIntersectSegment: clear through every opening, blocked beside it');

  if (failed === before) ok('wall geometry checks passed');
}

// ---- 8. workflow flows (src/data/flows.ts) -----------------------------------------------------------------
import { segmentHitsBox, wallCrossings } from '../src/scene/building/wallModel';
import { FLOWS, FLOW_RIBBON, pathLength } from '../src/data/flows';
import { roundPath } from '../src/scene/layers/flowsGeometry';
import { DISH_STAGES, PICKUP_ZONE } from '../src/data/layout';

section('8. Flow paths');
{
  const before = failed;
  const Y = 0.2; // ribbons lie at 0.2 ft: a floor route cannot pass a sill or the counter-height pass window
  const hw = FLOW_RIBBON.width / 2;
  const fmt = (p: readonly number[]) => `(${p[0]}, ${p[1]})`;

  // 8a. centre lines pass walls only through openings
  for (const f of FLOWS) {
    let segments = 0, hits = 0;
    f.paths.forEach((path, k) => {
      segments += path.length - 1;
      for (const { segment, box } of wallCrossings(path, Y)) {
        hits++;
        fail(`${f.id} path ${k}: ${fmt(path[segment])} -> ${fmt(path[segment + 1])} runs into a ${box.kind} at x ${box.x0}-${box.x1}, z ${box.z0}-${box.z1}`);
      }
    });
    if (!hits) ok(`${f.id}: ${f.paths.length} paths, ${segments} segments, ${f.paths.reduce((a, p) => a + pathLength(p), 0).toFixed(0)} ft: walls are crossed only through openings`);
  }

  // 8b. the drawn ribbon (rounded corners, full width) also clears every wall solid and door jamb
  const jambs = WALL_MODEL.frames.filter((fr) => fr.kind === 'jamb' || fr.kind === 'post');
  for (const f of FLOWS) {
    let hits = 0;
    f.paths.forEach((path, k) => {
      const pts = roundPath(path, FLOW_RIBBON.radius);
      for (let i = 0; i + 1 < pts.length && hits < 3; i++) {
        const [ax, az] = pts[i], [bx, bz] = pts[i + 1];
        const l = Math.hypot(bx - ax, bz - az);
        const nx = ((bz - az) / l) * hw, nz = (-(bx - ax) / l) * hw;
        for (const side of [-1, 0, 1]) {
          const p0: [number, number] = [ax + side * nx, az + side * nz], p1: [number, number] = [bx + side * nx, bz + side * nz];
          const hit = wallBoxesIntersectSegment(p0, p1, Y).length > 0 || jambs.some((b) => segmentHitsBox(p0, p1, Y, b));
          if (hit) { hits++; fail(`${f.id} path ${k}: the ${FLOW_RIBBON.width} ft ribbon touches a wall or jamb near ${fmt(pts[i].map((v) => +v.toFixed(2)))}`); break; }
        }
      }
    });
    if (!hits) ok(`${f.id}: ribbon edges and rounded corners clear all walls and door jambs`);
  }

  // 8c. no two flows share a lane: parallel stretches of different paths are at least one lane apart
  {
    const segs = FLOWS.flatMap((f) => f.paths.flatMap((path, k) => path.slice(1).map((q, i) => ({ id: `${f.id}#${k}`, a: path[i], b: q }))));
    let clashes = 0;
    for (let i = 0; i < segs.length; i++) for (let j = i + 1; j < segs.length; j++) {
      const p = segs[i], q = segs[j];
      if (p.id === q.id) continue;
      const pl = Math.hypot(p.b[0] - p.a[0], p.b[1] - p.a[1]), ux = (p.b[0] - p.a[0]) / pl, uz = (p.b[1] - p.a[1]) / pl;
      const ql = Math.hypot(q.b[0] - q.a[0], q.b[1] - q.a[1]);
      if (Math.abs(ux * (q.b[1] - q.a[1]) - uz * (q.b[0] - q.a[0])) / ql > 1e-6) continue; // not parallel: a crossing or a junction
      const gap = Math.abs((q.a[0] - p.a[0]) * -uz + (q.a[1] - p.a[1]) * ux);
      const t = (pt: readonly number[]) => (pt[0] - p.a[0]) * ux + (pt[1] - p.a[1]) * uz;
      const overlap = Math.min(pl, Math.max(t(q.a), t(q.b))) - Math.max(0, Math.min(t(q.a), t(q.b)));
      if (overlap > 0.3 && gap < FLOW_RIBBON.pitch - 0.02) {
        clashes++;
        fail(`${p.id} and ${q.id} run ${gap.toFixed(2)} ft apart for ${overlap.toFixed(1)} ft (lane pitch ${FLOW_RIBBON.pitch})`);
      }
    }
    if (!clashes) ok(`${segs.length} segments: parallel flows keep a ${FLOW_RIBBON.pitch} ft lane pitch`);
  }

  // 8d. each route is walked space by space: every change of space is a declared door or open circulation
  for (const f of FLOWS) {
    let bad = 0;
    f.paths.forEach((path, k) => {
      const seq: SpaceId[] = [];
      for (let i = 0; i + 1 < path.length; i++) {
        const [ax, az] = path[i], [bx, bz] = path[i + 1];
        const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / 0.1));
        for (let s = i === 0 ? 0 : 1; s <= n; s++) {
          const sp = spaceAt(ax + ((bx - ax) * s) / n, az + ((bz - az) * s) / n);
          if (seq[seq.length - 1] !== sp) seq.push(sp);
        }
      }
      for (let i = 0; i + 1 < seq.length; i++) {
        if (!adj.get(seq[i])?.has(seq[i + 1])) { bad++; fail(`${f.id} path ${k}: ${seq[i]} -> ${seq[i + 1]} is not a door or open passage`); }
      }
      if (k === 0 && !bad) console.log(`      ${f.id}: ${seq.join(' > ')}`);
    });
    if (!bad) ok(`${f.id}: every transition between spaces is a real opening`);
  }

  // 8e. the dirty main route visits the five wash stages in order, and everything stays on the plinth
  {
    const path = FLOWS.find((f) => f.id === 'dirty')!.paths[0];
    const alongAt = (pt: readonly number[]): { d: number; s: number } => {
      let best = { d: Infinity, s: 0 }, acc = 0;
      for (let i = 1; i < path.length; i++) {
        const [ax, az] = path[i - 1], [bx, bz] = path[i];
        const l = Math.hypot(bx - ax, bz - az);
        const t = Math.max(0, Math.min(1, ((pt[0] - ax) * (bx - ax) + (pt[1] - az) * (bz - az)) / (l * l)));
        const d = Math.hypot(pt[0] - (ax + t * (bx - ax)), pt[1] - (az + t * (bz - az)));
        if (d < best.d) best = { d, s: acc + t * l };
        acc += l;
      }
      return best;
    };
    let last = -1, stageBad = 0;
    for (const st of DISH_STAGES) {
      const { d, s } = alongAt(st.at);
      if (d > 0.05 || s <= last) { stageBad++; fail(`dirty route misses stage ${st.n} (${st.label}) at ${fmt(st.at)}: off by ${d.toFixed(2)} ft, order ${s <= last ? 'wrong' : 'ok'}`); }
      last = s;
    }
    if (!stageBad) ok(`dirty route runs through all ${DISH_STAGES.length} wash stages in order`);

    let outside = 0;
    for (const f of FLOWS) for (const p of f.paths) for (const [x, z] of p) {
      if (x < 0 || x > FOOTPRINT.w || z < 0 || z > PICKUP_ZONE.z + PICKUP_ZONE.d) { outside++; fail(`${f.id}: point ${fmt([x, z])} is off the plinth`); }
    }
    if (!outside) ok('every waypoint is inside the footprint or the pickup apron');
  }

  // 8f. no ribbon runs under floor-standing equipment (it would hide from above); overhead items and floor decals are fine
  try {
    const { EQUIPMENT } = await import('../src/data/equipment');
    let hidden = 0;
    const footprint = (it: (typeof EQUIPMENT)[number]) => {
      const rot = (((it.rot ?? 0) % 180) + 180) % 180;
      const cx = it.x + it.w / 2, cz = it.z + it.d / 2;
      const [w, d] = rot === 90 ? [it.d, it.w] : [it.w, it.d];
      return { x0: cx - w / 2, x1: cx + w / 2, z0: cz - d / 2, z1: cz + d / 2 };
    };
    const standing = EQUIPMENT.filter((it) => !it.props?.overhead && !it.props?.flat && !it.props?.outside);
    for (const f of FLOWS) f.paths.forEach((path, k) => {
      for (let i = 0; i + 1 < path.length; i++) {
        const r = {
          x0: Math.min(path[i][0], path[i + 1][0]) - hw, x1: Math.max(path[i][0], path[i + 1][0]) + hw,
          z0: Math.min(path[i][1], path[i + 1][1]) - hw, z1: Math.max(path[i][1], path[i + 1][1]) + hw,
        };
        for (const it of standing) {
          const b = footprint(it);
          if (r.x0 < b.x1 - 0.02 && b.x0 < r.x1 - 0.02 && r.z0 < b.z1 - 0.02 && b.z0 < r.z1 - 0.02) {
            hidden++;
            fail(`${f.id} path ${k}: ${fmt(path[i])} -> ${fmt(path[i + 1])} runs under ${it.id} (${it.kind}) in ${it.room}`);
          }
        }
      }
    });
    if (!hidden) ok(`no flow runs under any of ${standing.length} floor-standing equipment items`);
  } catch (e) {
    console.log(`  ! equipment check skipped: ${e instanceof Error ? e.message : e}`);
  }

  if (failed === before) ok('flow checks passed');
}

console.log(failed ? `\nFAILED: ${failed} problem(s)` : '\nAll layout checks passed.');
process.exit(failed ? 1 : 0);
