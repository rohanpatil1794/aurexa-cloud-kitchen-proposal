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

console.log(failed ? `\nFAILED: ${failed} problem(s)` : '\nAll layout checks passed.');
process.exit(failed ? 1 : 0);
