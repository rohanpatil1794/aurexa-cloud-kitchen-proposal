// Floor plan generator:  npx tsx scripts/make-floorplan.mjs   (wired as part of `npm run assets`)
//
// Renders public/assets/floorplan.png (2400 x 2000, north up) from src/data/layout.ts, so the plan can
// never drift from the 3D model. All text is converted to outlines (scripts/lib/text-path.mjs), so it
// renders identically everywhere.
//
// floorplan.png is the CANONICAL plan for the site (download link + WebGL fallback). It is always
// regenerated from the layout data. The client's original AI-drawn plan (floorplan-original.png) is
// reference only: this script never reads, writes or overwrites it.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { loadPublicSans, measureText, textPath } from './lib/text-path.mjs';
import {
  CIRCULATION, FOOTPRINT, OPENINGS, PASSENGER_LIFT, PICKUP_ZONE, ROOMS, ROOM_BY_ID, STAFF_ENTRANCE, TOTAL_AREA, WALL, ZONES,
} from '../src/data/layout.ts';
import { KITCHEN_NAME } from '../src/config.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'public', 'assets', 'floorplan.png');
const LOCKUP = path.join(ROOT, 'public', 'brand', 'lockup-light.png');


// ---- sheet + scale -------------------------------------------------------------------------------
const W = 2400;
const H = 2000;
const S = 28; // px per ft
const OX = 250;
const OY = 252;
const PANEL_X = 2010;
const PANEL_W = W - 36 - 28 - PANEL_X;
const X = (x) => OX + x * S;
const Z = (z) => OY + z * S;
const r2 = (n) => Math.round(n * 100) / 100;

const C = {
  paper: '#fbfaf6',
  teal: '#1d6866',
  tealMid: '#5f9392',
  tealLight: '#8cc1c0',
  orange: '#cb622a',
  cream: '#f6e3c2',
  ink: '#12302f',
  slate: '#77838d',
  muted: '#7a6a45',
};

const NEUTRAL = {
  quarry: '#ebe6dc', steel: '#e3e9ec', concrete: '#e8e8e4', cream: '#f1ebdd', timber: '#ebe2d1', garden: '#e2e8d4',
};

function mix(a, b, t) {
  const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [pa, pb] = [p(a), p(b)];
  return `#${pa.map((v, i) => Math.round(v + (pb[i] - v) * t).toString(16).padStart(2, '0')).join('')}`;
}

const f500 = loadPublicSans(500);
const f600 = loadPublicSans(600);
const f700 = loadPublicSans(700);
const capOf = (font, size) => (font.capHeight / font.unitsPerEm) * size;

// ---- svg builder ---------------------------------------------------------------------------------
const layers = [];
const add = (s) => layers.push(s);
const rect = (x, y, w, h, attrs = '') => add(`<rect x="${r2(x)}" y="${r2(y)}" width="${r2(w)}" height="${r2(h)}" ${attrs}/>`);
const line = (x1, y1, x2, y2, attrs = '') => add(`<line x1="${r2(x1)}" y1="${r2(y1)}" x2="${r2(x2)}" y2="${r2(y2)}" ${attrs}/>`);

/** Text at a baseline, optionally rotated about its anchor. Returns the advance width. */
function text(str, { x, y, size, font = f600, tracking = 0.12, anchor = 'start', fill = C.ink, opacity = 1, rotate = 0 }) {
  const { d, width } = textPath(font, str, { x, y, size, tracking, anchor });
  const tf = rotate ? ` transform="rotate(${rotate} ${r2(x)} ${r2(y)})"` : '';
  add(`<path d="${d}" fill="${fill}"${opacity < 1 ? ` fill-opacity="${opacity}"` : ''}${tf}/>`);
  return width;
}

/** Block of centred lines around (cx, cy). Each line: { s, size, font, tracking, fill, opacity }. */
function centeredLines(lines, cx, cy, { rotate = 0, leading = 1.38 } = {}) {
  const caps = lines.map((l) => capOf(l.font ?? f600, l.size));
  const pitch = lines.map((l) => l.size * leading);
  const total = pitch.slice(0, -1).reduce((a, b) => a + b, 0) + caps[caps.length - 1];
  let y = cy - total / 2 + caps[0];
  lines.forEach((l, i) => {
    const { d } = textPath(l.font ?? f600, l.s, { x: cx, y, size: l.size, tracking: l.tracking ?? 0.12, anchor: 'middle' });
    const tf = rotate ? ` transform="rotate(${rotate} ${r2(cx)} ${r2(cy)})"` : '';
    add(`<path d="${d}" fill="${l.fill ?? C.ink}"${l.opacity ? ` fill-opacity="${l.opacity}"` : ''}${tf}/>`);
    y += pitch[i];
  });
}

/** Greedy word wrap at a fixed size ("&" stays with the word before it). Null if a word is wider than maxW. */
function wrapLabel(name, maxW, size, tracking, oneUnitPerLine = false) {
  const words = [];
  for (const w of name.toUpperCase().split(' ')) {
    if (w === '&' && words.length) words[words.length - 1] += ' &'; else words.push(w);
  }
  const width = (str) => measureText(f600, str, { size, tracking });
  if (oneUnitPerLine) return words;
  if (words.some((w) => width(w) > maxW)) return null;
  const lines = [];
  let cur = '';
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (cur && width(next) > maxW) { lines.push(cur); cur = w; } else cur = next;
  }
  lines.push(cur);
  return lines;
}

/** Distinct line breaks of a name at one size: full width, then tighter widths down to the longest word. */
function wrapVariants(name, maxW, size, tracking) {
  const tight = wrapLabel(name, 0, size, tracking, true);
  if (!tight) return [];
  const longest = Math.max(...tight.map((l) => measureText(f600, l, { size, tracking })));
  if (longest > maxW) return [];
  const seen = new Set();
  const out = [];
  for (const w of [maxW, (maxW + longest) / 2, longest + 1]) {
    const lines = wrapLabel(name, w, size, tracking);
    if (lines && !seen.has(lines.join('|'))) { seen.add(lines.join('|')); out.push(lines); }
  }
  return out;
}

/** Width and height (px) of a centeredLines block. */
function blockSize(lines, leading = 1.38) {
  const caps = lines.map((l) => capOf(l.font ?? f600, l.size));
  const height = lines.slice(0, -1).reduce((a, l) => a + l.size * leading, 0) + caps[caps.length - 1];
  const width = Math.max(...lines.map((l) => measureText(l.font ?? f600, l.s, { size: l.size, tracking: l.tracking ?? 0.12 })));
  return { width, height };
}

// ---- geometry: walls from room edges, minus openings ---------------------------------------------
const OUTER = WALL.outer * S;
const INNER = WALL.thickness * S;
const lineKey = (orient, coord) => `${orient}:${coord.toFixed(3)}`;
const wallLines = new Map();
const addEdge = (orient, coord, a, b, kind) => {
  const k = lineKey(orient, coord);
  if (!wallLines.has(k)) wallLines.set(k, { orient, coord, solid: [], glass: [] });
  wallLines.get(k)[kind].push([a, b]);
};
for (const r of ROOMS) {
  const g = r.glass ?? [];
  addEdge('h', r.z, r.x, r.x + r.w, g.includes('N') ? 'glass' : 'solid');
  addEdge('h', r.z + r.d, r.x, r.x + r.w, g.includes('S') ? 'glass' : 'solid');
  addEdge('v', r.x, r.z, r.z + r.d, g.includes('W') ? 'glass' : 'solid');
  addEdge('v', r.x + r.w, r.z, r.z + r.d, g.includes('E') ? 'glass' : 'solid');
}
for (const c of CIRCULATION) { // circulation has no walls of its own, except where it touches the perimeter
  if (c.z === 0) addEdge('h', 0, c.x, c.x + c.w, 'solid');
  if (c.z + c.d === FOOTPRINT.d) addEdge('h', FOOTPRINT.d, c.x, c.x + c.w, 'solid');
  if (c.x === 0) addEdge('v', 0, c.z, c.z + c.d, 'solid');
  if (c.x + c.w === FOOTPRINT.w) addEdge('v', FOOTPRINT.w, c.z, c.z + c.d, 'solid');
}

const EPS = 1e-6;
function union(iv) {
  const sorted = iv.map((p) => [...p]).sort((p, q) => p[0] - q[0]);
  const out = [];
  for (const [a, b] of sorted) {
    const last = out[out.length - 1];
    if (last && a <= last[1] + EPS) last[1] = Math.max(last[1], b); else out.push([a, b]);
  }
  return out;
}
function subtract(iv, cuts) {
  let res = iv;
  for (const [ca, cb] of cuts) {
    const next = [];
    for (const [a, b] of res) {
      if (cb <= a + EPS || ca >= b - EPS) next.push([a, b]);
      else {
        if (ca > a + EPS) next.push([a, ca]);
        if (cb < b - EPS) next.push([cb, b]);
      }
    }
    res = next;
  }
  return res;
}
const isPerimeter = (orient, coord) => (orient === 'h' ? coord === 0 || coord === FOOTPRINT.d : coord === 0 || coord === FOOTPRINT.w);
const wallPx = (orient, coord) => (isPerimeter(orient, coord) ? OUTER : INNER);

const wallSegments = []; // { orient, coord, a, b, kind, t }
for (const { orient, coord, solid, glass } of wallLines.values()) {
  const cuts = OPENINGS.filter((o) => o.wall === orient && Math.abs(o.at - coord) < EPS).map((o) => [o.c - o.w / 2, o.c + o.w / 2]);
  const solidIv = subtract(union(solid), cuts);
  const solidAll = union(solid);
  const glassIv = subtract(subtract(union(glass), solidAll), cuts);
  const t = wallPx(orient, coord);
  for (const [a, b] of solidIv) wallSegments.push({ orient, coord, a, b, kind: 'solid', t });
  for (const [a, b] of glassIv) wallSegments.push({ orient, coord, a, b, kind: 'glass', t });
}

/** Rect (px) of a wall segment of thickness t. */
const segRect = (s) => (s.orient === 'h'
  ? { x: X(s.a), y: Z(s.coord) - s.t / 2, w: (s.b - s.a) * S, h: s.t }
  : { x: X(s.coord) - s.t / 2, y: Z(s.a), w: s.t, h: (s.b - s.a) * S });

// ---- 1. paper, rooms, circulation ----------------------------------------------------------------
add(`<defs>
  <pattern id="hatch" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
    <line x1="0" y1="0" x2="0" y2="14" stroke="${C.tealMid}" stroke-width="2" stroke-opacity="0.28"/>
  </pattern>
</defs>`);
rect(0, 0, W, H, `fill="${C.paper}"`);
rect(36, 36, W - 72, H - 72, `fill="none" stroke="${C.teal}" stroke-width="4"`);

for (const c of CIRCULATION) rect(X(c.x), Z(c.z), c.w * S, c.d * S, `fill="${C.cream}"`);
const zoneTint = (zoneId, floor) => mix(NEUTRAL[floor], ZONES[zoneId].color, 0.55);
for (const r of ROOMS) {
  const fill = r.zone ? zoneTint(r.zone, r.floor) : NEUTRAL[r.floor];
  rect(X(r.x), Z(r.z), r.w * S, r.d * S, `fill="${fill}"`);
}

// Fire staircase treads.
{
  const st = ROOM_BY_ID.stair;
  const x0 = X(st.x) + 0.9 * S;
  const x1 = X(st.x + st.w) - 0.9 * S;
  for (let i = 0; i < 7; i++) line(x0, Z(5.2 + i * 0.8), x1, Z(5.2 + i * 0.8), `stroke="${C.teal}" stroke-opacity="0.45" stroke-width="2"`);
  line((x0 + x1) / 2, Z(5.2), (x0 + x1) / 2, Z(5.2 + 6 * 0.8), `stroke="${C.teal}" stroke-opacity="0.45" stroke-width="2"`);
}

// ---- 2. walls ------------------------------------------------------------------------------------
for (const s of wallSegments.filter((q) => q.kind === 'glass')) {
  const g = segRect(s);
  rect(g.x, g.y, g.w, g.h, `fill="#f4fafa"`);
  if (s.orient === 'h') {
    line(g.x, g.y, g.x + g.w, g.y, `stroke="${C.tealMid}" stroke-width="2.5"`);
    line(g.x, g.y + g.h, g.x + g.w, g.y + g.h, `stroke="${C.tealMid}" stroke-width="2.5"`);
  } else {
    line(g.x, g.y, g.x, g.y + g.h, `stroke="${C.tealMid}" stroke-width="2.5"`);
    line(g.x + g.w, g.y, g.x + g.w, g.y + g.h, `stroke="${C.tealMid}" stroke-width="2.5"`);
  }
}
for (const s of wallSegments.filter((q) => q.kind === 'solid')) {
  const g = segRect(s);
  rect(g.x, g.y, g.w, g.h, `fill="${C.teal}"`);
}
// Corner blocks so L-junctions close up.
{
  const seen = new Set();
  const corner = (x, z) => {
    const k = `${x},${z}`;
    if (seen.has(k)) return;
    seen.add(k);
    const onEdge = x === 0 || x === FOOTPRINT.w || z === 0 || z === FOOTPRINT.d;
    const t = onEdge ? OUTER : INNER;
    // Skip corners that sit inside a door gap (never the case for valid layouts, but cheap to guard).
    if (OPENINGS.some((o) => (o.wall === 'h' ? Math.abs(o.at - z) < EPS && Math.abs(o.c - x) < o.w / 2 - EPS : Math.abs(o.at - x) < EPS && Math.abs(o.c - z) < o.w / 2 - EPS))) return;
    rect(X(x) - t / 2, Z(z) - t / 2, t, t, `fill="${C.teal}"`);
  };
  for (const r of ROOMS) { corner(r.x, r.z); corner(r.x + r.w, r.z); corner(r.x, r.z + r.d); corner(r.x + r.w, r.z + r.d); }
  corner(0, 0); corner(FOOTPRINT.w, 0); corner(0, FOOTPRINT.d); corner(FOOTPRINT.w, FOOTPRINT.d);
}

// ---- 3. openings: windows, glazing and doors -----------------------------------------------------
const spaceRect = (id) => ROOM_BY_ID[id] ?? CIRCULATION.find((c) => c.id === id) ?? null;
function sideOf(o, id) {
  const r = spaceRect(id);
  if (!r) return 1;
  const mid = o.wall === 'h' ? r.z + r.d / 2 : r.x + r.w / 2;
  return mid > o.at ? 1 : -1;
}
/** +1 = leaf swings toward +z / +x. Doors open into the room; emergency exits open outward. */
function swingSign(o) {
  const ids = o.rooms ?? [];
  if (ids.includes('outside')) {
    const s = sideOf(o, ids.find((i) => i !== 'outside'));
    return o.kind === 'emergency' ? -s : s;
  }
  const rooms = ids.filter((i) => ROOM_BY_ID[i]);
  if (rooms.length === 2) { // room to room: open into the larger one
    const area = (i) => ROOM_BY_ID[i].w * ROOM_BY_ID[i].d;
    return sideOf(o, area(rooms[0]) >= area(rooms[1]) ? rooms[0] : rooms[1]);
  }
  return sideOf(o, rooms[0] ?? ids[0]);
}

function windowSymbol(o) {
  const t = wallPx(o.wall, o.at);
  const a = o.c - o.w / 2;
  const b = o.c + o.w / 2;
  const g = segRect({ orient: o.wall, coord: o.at, a, b, t });
  rect(g.x, g.y, g.w, g.h, `fill="#f4fafa" stroke="${C.teal}" stroke-width="2"`);
}

/** One door leaf (hinge at `h`, opening along the wall toward `e`) plus its swing arc. */
const swingZones = []; // quarter discs swept by door leaves, in ft: { hx, hz, r, x0, x1, z0, z1 }
function leafAndArc(o, hinge, end, sign, color) {
  const r = Math.abs(end - hinge);
  const along = [hinge, hinge + Math.sign(end - hinge) * r].sort((a, b) => a - b);
  const across = [o.at, o.at + sign * r].sort((a, b) => a - b);
  swingZones.push(o.wall === 'h'
    ? { hx: hinge, hz: o.at, r, x0: along[0], x1: along[1], z0: across[0], z1: across[1] }
    : { hx: o.at, hz: hinge, r, x0: across[0], x1: across[1], z0: along[0], z1: along[1] });
  const P = (along, off) => (o.wall === 'h' ? [X(along), Z(o.at + off)] : [X(o.at + off), Z(along)]);
  const [hx, hy] = P(hinge, 0);
  const [tx, ty] = P(hinge, sign * r);
  const [ex, ey] = P(end, 0);
  const cross = (tx - hx) * (ey - hy) - (ty - hy) * (ex - hx);
  const sweep = cross > 0 ? 1 : 0;
  add(`<path d="M${r2(tx)} ${r2(ty)}A${r2(r * S)} ${r2(r * S)} 0 0 ${sweep} ${r2(ex)} ${r2(ey)}" fill="none" stroke="${color}" stroke-width="1.6" stroke-opacity="0.75"/>`);
  line(hx, hy, tx, ty, `stroke="${color}" stroke-width="3.2" stroke-linecap="round"`);
}

for (const o of OPENINGS) {
  if (o.kind === 'ribbon' || o.kind === 'pass') { windowSymbol(o); continue; }
  const sign = swingSign(o);
  const a = o.c - o.w / 2;
  const b = o.c + o.w / 2;
  const color = o.kind === 'emergency' ? C.orange : C.teal;
  if (o.kind === 'double' || o.kind === 'glazed' || o.kind === 'service') {
    leafAndArc(o, a, o.c, sign, color);
    leafAndArc(o, b, o.c, sign, color);
  } else leafAndArc(o, a, b, sign, color);
}

// ---- 4. passenger lift, pickup zone, staff entrance ----------------------------------------------
{
  const L = PASSENGER_LIFT;
  rect(X(L.x), Z(L.z), L.w * S, L.d * S, `fill="#eef2f3" stroke="${C.teal}" stroke-width="4"`);
  centeredLines([
    { s: 'PASSENGER', size: 10.5, tracking: 0.03, fill: C.ink },
    { s: 'LIFT', size: 10.5, tracking: 0.03, fill: C.ink },
  ], X(L.x + L.w / 2), Z(L.z + L.d / 2));
}
{
  const P = PICKUP_ZONE;
  rect(X(P.x), Z(P.z), P.w * S, P.d * S, `fill="url(#hatch)"`);
  rect(X(P.x) + 1.5, Z(P.z) + 1.5, P.w * S - 3, P.d * S - 3, `fill="none" stroke="${C.teal}" stroke-width="3" stroke-dasharray="16 10" stroke-opacity="0.85"`);
  centeredLines([
    { s: 'DELIVERY PARTNERS PICKUP ZONE', size: 16, tracking: 0.14, fill: C.teal },
    { s: `${P.w} × ${P.d} ft`, size: 13, font: f500, tracking: 0.08, fill: C.tealMid },
  ], X(P.x + P.w / 2 + 1.5), Z(P.z + P.d / 2) + 5);
}
{
  const cx = X(STAFF_ENTRANCE.x);
  const y0 = Z(FOOTPRINT.d) + OUTER / 2;
  // Up-arrow into the door, then the label.
  line(cx, y0 + 42, cx, y0 + 12, `stroke="${C.teal}" stroke-width="3" stroke-linecap="round"`);
  add(`<path d="M${r2(cx - 9)} ${r2(y0 + 22)}L${r2(cx)} ${r2(y0 + 10)}L${r2(cx + 9)} ${r2(y0 + 22)}" fill="none" stroke="${C.teal}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`);
  centeredLines([
    { s: 'STAFF', size: 15, tracking: 0.14, fill: C.teal },
    { s: 'ENTRANCE', size: 15, tracking: 0.14, fill: C.teal },
  ], cx, y0 + 76);
}

// ---- 5. labels -----------------------------------------------------------------------------------
const LABEL_TRACK = 0.12;
const LABEL_MARGIN = 0.25; // ft of air around door swings

/** Does the label box (ft) touch a door's swept quarter disc? */
function touchesSwing(box, zone) {
  const x0 = Math.max(box.x0, zone.x0); const x1 = Math.min(box.x1, zone.x1);
  const z0 = Math.max(box.z0, zone.z0); const z1 = Math.min(box.z1, zone.z1);
  if (x0 >= x1 || z0 >= z1) return false;
  const nx = Math.min(Math.max(zone.hx, x0), x1);
  const nz = Math.min(Math.max(zone.hz, z0), z1);
  return Math.hypot(nx - zone.hx, nz - zone.hz) < zone.r + LABEL_MARGIN;
}

const wallInset = (onPerimeter) => (onPerimeter ? WALL.outer : WALL.thickness) / 2 + 0.35;
/** Clear floor of a room (ft): inside the wall faces plus a little air. */
const clearFloor = (r) => ({
  x0: r.x + wallInset(r.x === 0),
  x1: r.x + r.w - wallInset(r.x + r.w === FOOTPRINT.w),
  z0: r.z + wallInset(r.z === 0),
  z1: r.z + r.d - wallInset(r.z + r.d === FOOTPRINT.d),
});

/**
 * Biggest label, and the spot nearest the room centre, that clears the walls and every door swing.
 * Horizontal text first (down to 13 px), then rotated text for narrow strips, then smaller horizontal.
 */
function placeLabel(r) {
  const dims = `${r.w} × ${r.d} ft`;
  const floor = clearFloor(r);
  const ccx = r.x + r.w / 2;
  const ccz = r.z + r.d / 2;
  const attempts = [
    ...[19, 18, 17, 16, 15, 14, 13].map((size) => ({ size, rotate: 0 })),
    ...[15, 14, 13, 12, 11, 10].map((size) => ({ size, rotate: -90 })),
    ...[12, 11, 10].map((size) => ({ size, rotate: 0 })),
  ];
  for (const { size, rotate } of attempts) {
    const run = (rotate ? floor.z1 - floor.z0 : floor.x1 - floor.x0) * S;
    const dimSize = Math.max(10, size * 0.72);
    const dimRow = { s: dims, size: dimSize, font: f500, tracking: 0.06, fill: C.ink, opacity: 0.6 };
    let best = null;
    for (const lines of wrapVariants(r.name, run, size, LABEL_TRACK)) {
      const base = lines.map((s) => ({ s, size, tracking: LABEL_TRACK, fill: C.ink }));
      const variants = measureText(f500, dims, { size: dimSize, tracking: 0.06 }) <= run ? [[...base, dimRow], base] : [base];
      for (const rows of variants) {
        const bs = blockSize(rows);
        const hw = (rotate ? bs.height : bs.width) / S / 2;
        const hh = (rotate ? bs.width : bs.height) / S / 2;
        const xLo = floor.x0 + hw; const xHi = floor.x1 - hw;
        const zLo = floor.z0 + hh; const zHi = floor.z1 - hh;
        if (xLo > xHi + 1e-6 || zLo > zHi + 1e-6) continue;
        const consider = (cx, cz) => {
          const box = { x0: cx - hw, x1: cx + hw, z0: cz - hh, z1: cz + hh };
          if (swingZones.some((z) => touchesSwing(box, z))) return;
          // Prefer the centre, then fewer lines, then keeping the size line.
          const dist = Math.hypot(cx - ccx, (cz - ccz) * 1.4) + (lines.length - 1) * 0.5 + (rows === base ? 0.6 : 0);
          if (!best || dist < best.dist) best = { rows, cx, cz, dist, rotate };
        };
        consider(Math.min(Math.max(ccx, xLo), xHi), Math.min(Math.max(ccz, zLo), zHi));
        for (let cz = zLo; cz <= zHi + 1e-6; cz += 0.25) for (let cx = xLo; cx <= xHi + 1e-6; cx += 0.25) consider(cx, cz);
      }
    }
    if (best) return best;
  }
  console.warn(`  label for ${r.id} does not clear the door swings; centring it`);
  return { rows: [{ s: r.name.toUpperCase(), size: 10, tracking: LABEL_TRACK, fill: C.ink }], cx: ccx, cz: ccz, rotate: 0 };
}

for (const r of ROOMS) {
  const { rows, cx, cz, rotate } = placeLabel(r);
  // The staircase label sits above its treads.
  centeredLines(rows, X(cx), r.id === 'stair' ? Z(2.8) : Z(cz), { rotate });
}
for (const [name, cx, cz, rot] of [
  ['Top Corridor', 30, 15, 0],
  ['Bottom Corridor', 30.25, 38.5, 0],
  ['Left Corridor', 12.5, 27, -90],
  ['Return Corridor', 41.75, 31, -90],
  ['Staff Spine', 52.25, 29, -90],
  ['Staff Lobby', 51, 45.6, 0],
]) {
  centeredLines([{ s: name.toUpperCase(), size: 12.5, tracking: 0.2, fill: C.muted }], X(cx), Z(cz), { rotate: rot });
}

// ---- 6. dimensions, north arrow, scale bar -------------------------------------------------------
function dimension(x1, y1, x2, y2, label) {
  const stroke = `stroke="${C.teal}" stroke-width="2"`;
  const horizontal = y1 === y2;
  const mid = horizontal ? (x1 + x2) / 2 : (y1 + y2) / 2;
  const tw = measureText(f600, label, { size: 20, tracking: 0.1 }) + 36;
  if (horizontal) {
    line(x1, y1, mid - tw / 2, y1, stroke); line(mid + tw / 2, y1, x2, y1, stroke);
    for (const x of [x1, x2]) { line(x, y1 - 14, x, y1 + 14, stroke); line(x - 8, y1 + 8, x + 8, y1 - 8, `stroke="${C.teal}" stroke-width="3.5"`); }
    text(label, { x: mid, y: y1 + capOf(f600, 20) / 2, size: 20, tracking: 0.1, anchor: 'middle', fill: C.teal });
  } else {
    line(x1, y1, x1, mid - tw / 2, stroke); line(x1, mid + tw / 2, x1, y2, stroke);
    for (const y of [y1, y2]) { line(x1 - 14, y, x1 + 14, y, stroke); line(x1 - 8, y + 8, x1 + 8, y - 8, `stroke="${C.teal}" stroke-width="3.5"`); }
    text(label, { x: x1, y: mid + capOf(f600, 20) / 2, size: 20, tracking: 0.1, anchor: 'middle', fill: C.teal, rotate: -90 });
  }
}
dimension(X(0), OY - 70, X(FOOTPRINT.w), OY - 70, `${FOOTPRINT.w} ft`);
line(X(0), OY - 18, X(0), OY - 84, `stroke="${C.teal}" stroke-width="1.5" stroke-opacity="0.6"`);
line(X(FOOTPRINT.w), OY - 18, X(FOOTPRINT.w), OY - 84, `stroke="${C.teal}" stroke-width="1.5" stroke-opacity="0.6"`);
dimension(OX - 76, Z(0), OX - 76, Z(FOOTPRINT.d), `${FOOTPRINT.d} ft`);
line(OX - 18, Z(0), OX - 90, Z(0), `stroke="${C.teal}" stroke-width="1.5" stroke-opacity="0.6"`);
line(OX - 18, Z(FOOTPRINT.d), OX - 90, Z(FOOTPRINT.d), `stroke="${C.teal}" stroke-width="1.5" stroke-opacity="0.6"`);

// ---- 7. title block + legend ---------------------------------------------------------------------
const rule = (y) => line(PANEL_X, y, PANEL_X + PANEL_W, y, `stroke="${C.teal}" stroke-width="2" stroke-opacity="0.55"`);
const fitSize = (str, font, max, size, tracking) => {
  let s = size;
  while (measureText(font, str, { size: s, tracking }) > max && s > 10) s -= 0.5;
  return s;
};

const LOCKUP_TOP = 118;
const LOCKUP_W = 300;
rule(228);
{
  const t1 = 'GROUND FLOOR PLAN';
  text(t1, { x: PANEL_X, y: 282, size: fitSize(t1, f700, PANEL_W, 27, 0.16), font: f700, tracking: 0.16 });
  text('CLOUD KITCHEN + OFFICE', { x: PANEL_X, y: 320, size: fitSize('CLOUD KITCHEN + OFFICE', f600, PANEL_W, 17, 0.14), tracking: 0.14, fill: C.slate });
  const kn = KITCHEN_NAME.toUpperCase();
  text(kn, { x: PANEL_X, y: 372, size: fitSize(kn, f700, PANEL_W, 22, 0.14), font: f700, tracking: 0.14, fill: C.teal });
  const stats = `${FOOTPRINT.w} × ${FOOTPRINT.d} FT  ·  ${TOTAL_AREA.toLocaleString('en-US')} SQ FT`;
  text(stats, { x: PANEL_X, y: 412, size: fitSize(stats, f600, PANEL_W, 16, 0.12), tracking: 0.12, fill: C.ink, opacity: 0.8 });
}
rule(444);

text('LEGEND', { x: PANEL_X, y: 500, size: 16, tracking: 0.24, fill: C.slate });
{
  let y = 540;
  const row = 46;
  const legendZones = [
    ['veg', 'Vegetarian'], ['jain', 'Jain'], ['vegan', 'Vegan'], ['nonveg', 'Non-Veg'], ['creator', 'Content Creator'],
  ];
  for (const [id, name] of legendZones) {
    rect(PANEL_X, y, 46, 30, `fill="${zoneTint(id, 'quarry')}" stroke="${C.teal}" stroke-width="1.5" stroke-opacity="0.5"`);
    text(name.toUpperCase(), { x: PANEL_X + 66, y: y + 15 + capOf(f600, 16) / 2, size: 16, tracking: 0.1 });
    y += row;
  }
  rect(PANEL_X, y, 46, 30, `fill="${NEUTRAL.concrete}" stroke="${C.teal}" stroke-width="1.5" stroke-opacity="0.5"`);
  text('SUPPORT & STORAGE', { x: PANEL_X + 66, y: y + 15 + capOf(f600, 16) / 2, size: 16, tracking: 0.1 });
  y += row;
  rect(PANEL_X, y, 46, 30, `fill="${C.cream}" stroke="${C.teal}" stroke-width="1.5" stroke-opacity="0.5"`);
  text('CIRCULATION', { x: PANEL_X + 66, y: y + 15 + capOf(f600, 16) / 2, size: 16, tracking: 0.1 });
  y += row + 10;

  // Door, emergency exit, window, glazing swatches.
  const iconRow = (label, draw) => {
    draw(PANEL_X, y);
    text(label, { x: PANEL_X + 66, y: y + 15 + capOf(f600, 16) / 2, size: 16, tracking: 0.1 });
    y += row;
  };
  const doorIcon = (x0, y0, color) => {
    line(x0 + 3, y0 + 3, x0 + 3, y0 + 33, `stroke="${color}" stroke-width="3.2" stroke-linecap="round"`);
    add(`<path d="M${x0 + 3} ${y0 + 33}A30 30 0 0 0 ${x0 + 33} ${y0 + 3}" fill="none" stroke="${color}" stroke-width="1.6" stroke-opacity="0.75"/>`);
    line(x0 + 3, y0 + 3, x0 + 40, y0 + 3, `stroke="${C.teal}" stroke-width="5"`);
  };
  iconRow('DOOR + SWING', (x0, y0) => doorIcon(x0, y0 - 2, C.teal));
  iconRow('EMERGENCY EXIT', (x0, y0) => doorIcon(x0, y0 - 2, C.orange));
  iconRow('WINDOW / PASS-THROUGH', (x0, y0) => {
    rect(x0, y0 + 9, 46, 12, `fill="#f4fafa" stroke="${C.teal}" stroke-width="2"`);
  });
  iconRow('GLAZED PARTITION', (x0, y0) => {
    rect(x0, y0 + 9, 46, 12, `fill="#f4fafa"`);
    line(x0, y0 + 9, x0 + 46, y0 + 9, `stroke="${C.tealMid}" stroke-width="2.5"`);
    line(x0, y0 + 21, x0 + 46, y0 + 21, `stroke="${C.tealMid}" stroke-width="2.5"`);
  });
}

// Notes
{
  const y0 = 1098;
  rule(y0 - 40);
  text('NOTES', { x: PANEL_X, y: y0, size: 16, tracking: 0.24, fill: C.slate });
  const notes = [
    `Walls ${WALL.thickness} ft, outer ${WALL.outer} ft`,
    'Doors 3 × 7 ft unless noted',
    'Dimensions in feet',
    'North is up',
  ];
  notes.forEach((n, i) => text(n, { x: PANEL_X, y: y0 + 44 + i * 36, size: 17, font: f500, tracking: 0.04, fill: C.ink, opacity: 0.85 }));
}

// North arrow + scale bar
{
  const cx = PANEL_X + 62;
  const cy = 1450;
  add(`<circle cx="${cx}" cy="${cy}" r="54" fill="none" stroke="${C.teal}" stroke-width="3"/>`);
  add(`<path d="M${cx} ${cy - 44}L${cx + 20} ${cy + 30}L${cx} ${cy + 16}Z" fill="${C.teal}"/>`);
  add(`<path d="M${cx} ${cy - 44}L${cx - 20} ${cy + 30}L${cx} ${cy + 16}Z" fill="${C.paper}" stroke="${C.teal}" stroke-width="3" stroke-linejoin="round"/>`);
  text('N', { x: cx, y: cy - 70, size: 26, font: f700, tracking: 0, anchor: 'middle', fill: C.teal });

  const bx = PANEL_X;
  const by = cy + 130;
  const unit = 5 * S;
  for (let i = 0; i < 2; i++) rect(bx + i * unit, by, unit, 14, `fill="${i % 2 ? C.paper : C.teal}" stroke="${C.teal}" stroke-width="2"`);
  [['0', 0], ['5', unit], ['10 ft', unit * 2]].forEach(([l, dx]) => text(l, { x: bx + dx, y: by + 46, size: 15, tracking: 0.08, anchor: 'middle', fill: C.ink }));
  text('SCALE', { x: bx, y: by - 22, size: 14, tracking: 0.24, fill: C.slate });
}

// Footer
text('Plan generated from the Aurexa layout data — indicative, not to scale for construction', {
  x: 72, y: H - 62, size: 17, font: f500, tracking: 0.06, fill: C.slate,
});
text('AUREXA DESIGN CONSULTANTS', { x: W - 72, y: H - 62, size: 15, tracking: 0.24, anchor: 'end', fill: C.slate });

// ---- render --------------------------------------------------------------------------------------
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">\n${layers.join('\n')}\n</svg>`;
let image = sharp(Buffer.from(svg));
if (fs.existsSync(LOCKUP)) {
  const lockup = await sharp(LOCKUP).resize({ width: LOCKUP_W, kernel: 'lanczos3' }).png().toBuffer();
  image = image.composite([{ input: lockup, left: PANEL_X - 2, top: LOCKUP_TOP }]);
}
await image.png({ compressionLevel: 9, effort: 10 }).toFile(OUT);
const meta = await sharp(OUT).metadata();
console.log(`  public/assets/floorplan.png  ${meta.width}x${meta.height}  (generated from layout data)`);
