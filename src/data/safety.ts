// Safety points, GENERATED from the layout (rooms, openings, circulation, gas ring) and the equipment footprints.
// Nothing is hand-placed: the tables below only say WHAT goes WHERE (per room / per opening), the code finds the spot.
//
//   extinguisher  inside every room with a fire load, on the wall beside its main door (all four doors of the kitchen);
//                 beside the fire-stair door; then a coverage pass adds one wherever a door of ANY room, corridor or exit
//                 has none within EXTINGUISHER_REACH ft (straight line, one of the door's two sides, no equipment in the
//                 way; one may serve two adjacent doors); in circulation, a station every STATION_SPACING ft of corridor
//                 unless one is already close. scripts/validate-layout.ts section 9 fails if a door is left uncovered.
//   smoke         ceiling, every room (two in the kitchen);   heat  ceiling, kitchen (2 x 2) and bakery
//   lpg           low on the walls that run beside the kitchen gas ring main (LPG is heavier than air)
//   gasvalve      emergency shut-off on the ring's riser beside the kitchen west door
//   emlight       above the exits and the staff entrance, and at corridor junctions
//   exit          EXIT signs over the two emergency exits and the fire-stair door
//
// Wall-hung items only take spots that are on solid wall, clear of every door (3 ft landing), glazing and
// floor-standing equipment. Spots on walls the aerial camera cannot see are used only when no visible one is close.
import type { EquipItem, Opening, SafetyKind, SafetyPoint, Side, SpaceId, Vec2 } from './types';
import { CIRCULATION, DOORS, FOOTPRINT, GAS_RING, OPENINGS, PASSENGER_LIFT, ROOMS, WALL, openingPoint, roomAt } from './layout';
import { EQUIPMENT } from './equipment';
import { BIN_COLORS, BRAND } from '../lib/palette';

/** Furthest an extinguisher may be from a door it serves, ft in a straight line in plan: every walk-through opening has one. */
export const EXTINGUISHER_REACH = 10;

/**
 * Resting ground position (ft, the compass centre; x east, z south) of the north arrow:
 *   wide     the explorer on a wide stage: well east of the north-east corner, clear of the room pills (they float at the wall tops);
 *   hero     the hero on a wide stage (no pills there): closer to the corner;
 *   compact  a stage narrower than 720 px (phones, narrow windows): above the corner, where there is free sky but no free side.
 * The arrow keeps a steady size on screen and is clamped into the free part of the canvas, so on small screens its real
 * spot can differ: where it really is on screen is NORTH_ARROW_RECT (scene/layers/NorthArrow.tsx).
 */
const PLINTH_EAST = FOOTPRINT.w + WALL.plinthMargin;
export const NORTH_ARROW_POS = {
  wide: { x: PLINTH_EAST + 28, z: 3.5 },
  hero: { x: PLINTH_EAST + 15, z: 3.5 },
  compact: { x: PLINTH_EAST + 9, z: -9 },
} as const;

// ---------------------------------------------------------------------------
// Legend metadata (shared by the 3D layer and the legend)
// ---------------------------------------------------------------------------
const GREEN = '#1f8f50';
const AMBER = '#e2a42b';

export interface SafetyKindInfo {
  kind: SafetyKind;
  label: string;
  /** Compact label for narrow legends. */
  short: string;
  detail: string;
  /** Accent colour: the pulse halo in the scene and the legend swatch. */
  color: string;
}

export const SAFETY_KINDS: SafetyKindInfo[] = [
  { kind: 'extinguisher', label: 'ABC extinguisher', short: 'Fire ext.', detail: `Within ${EXTINGUISHER_REACH} ft of every door`, color: BIN_COLORS.red },
  { kind: 'smoke', label: 'Smoke detector', short: 'Smoke', detail: 'Ceiling, every room', color: BRAND.tealLight },
  { kind: 'heat', label: 'Heat detector', short: 'Heat', detail: 'Kitchen and bakery', color: BRAND.orange },
  { kind: 'lpg', label: 'LPG leak detector', short: 'LPG leak', detail: 'Low-mounted, LPG sinks', color: BIN_COLORS.blue },
  { kind: 'gasvalve', label: 'Gas shut-off valve', short: 'Gas valve', detail: 'Emergency, kitchen west door', color: BIN_COLORS.red },
  { kind: 'emlight', label: 'Emergency light', short: 'Em. light', detail: 'Exits and corridor corners', color: AMBER },
  { kind: 'exit', label: 'Exit sign', short: 'Exit sign', detail: 'Emergency exits and fire stair', color: GREEN },
];

// ---------------------------------------------------------------------------
// Policy
// ---------------------------------------------------------------------------
/** Rooms without an extinguisher of their own (no fire load, or covered from the corridor). */
const NO_EXTINGUISHER = new Set<SpaceId>(['stair', 'lift', 'toilets', 'garden', 'cold']);
/** Rooms that get one extinguisher per door instead of one per room. */
const PER_DOOR = new Set<SpaceId>(['kitchen']);
/** Furthest an in-room extinguisher may hang from its door, ft. */
const INSIDE_REACH = 6;
/** The coverage pass first looks for an extinguisher this close to the doors it serves (so one can stand between two adjacent doors), ft. */
const COVER_NEAR = 7;
/** Clear distance kept between two extinguishers, ft; the coverage pass drops it to the minimum below when nothing else fits. */
const EXT_GAP = 2.5;
/** Corridor stretch covered by one extinguisher station, ft. */
const STATION_SPACING = 30;
/** Ceiling-mounted items hang this far below the slab underside, ft (centre height). */
const CEILING_DROP = 0.15;
const EXIT_SIGN_Y = 8.2;

/** Wall-hung footprints: half width along the wall, stand-off of the centre from the wall face, vertical extent. */
const MOUNTS = {
  extinguisher: { halfW: 0.34, halfD: 0.4, y: 3.4, y0: 2.5, y1: 4.4 },
  lpg: { halfW: 0.32, halfD: 0.22, y: 1.1, y0: 0.6, y1: 1.6 },
} as const;
type Mount = (typeof MOUNTS)[keyof typeof MOUNTS];

// ---------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------
const EPS = 1e-6;
const STEP = 0.25;
/** Clear distance kept from a wall corner, ft (on top of the item's half width). */
const CORNER = 0.45;
const DOOR_LANDING = 3.2;
const SIDES: Side[] = ['N', 'E', 'S', 'W'];
const OPPOSITE: Record<Side, Side> = { N: 'S', S: 'N', E: 'W', W: 'E' };
/** Inward normal of each side of a space (x, z). */
const NORMAL: Record<Side, Vec2> = { N: [0, 1], S: [0, -1], W: [1, 0], E: [-1, 0] };
/** Direction (EquipItem.rot convention) an item hung on a space's `side` wall faces: into the space. */
const FACING: Record<Side, number> = { N: 0, E: 270, S: 180, W: 90 };
/** Walls the south-west aerial camera sees the face of: the room's north and east walls. */
const AERIAL_SIDES = new Set<Side>(['N', 'E']);
const HIDDEN_PENALTY = 2.5;

interface Space { id: SpaceId; name: string; x: number; z: number; w: number; d: number; room: boolean; glass?: Side[] }
const SPACES: Space[] = [
  ...ROOMS.map((r): Space => ({ id: r.id, name: r.name, x: r.x, z: r.z, w: r.w, d: r.d, room: true, glass: r.glass })),
  ...CIRCULATION.map((c): Space => ({ id: c.id, name: c.name, x: c.x, z: c.z, w: c.w, d: c.d, room: false })),
];
const spaceById = (id: SpaceId): Space => {
  const s = SPACES.find((p) => p.id === id);
  if (!s) throw new Error(`safety: unknown space ${id}`);
  return s;
};

const lineOf = (s: Space, side: Side) => (side === 'N' ? s.z : side === 'S' ? s.z + s.d : side === 'W' ? s.x : s.x + s.w);
const halfThickness = (side: Side, line: number) => {
  const perimeter = side === 'N' || side === 'S' ? line < EPS || line > FOOTPRINT.d - EPS : line < EPS || line > FOOTPRINT.w - EPS;
  return (perimeter ? WALL.outer : WALL.thickness) / 2;
};
const r2 = (n: number) => Math.round(n * 100) / 100;

/** Which side of `space` the wall carrying opening `o` is on. */
function sideOfOpening(space: Space, o: Opening): Side {
  const probe = (s: Side) => Math.abs(lineOf(space, s) - o.at) < EPS;
  const sides: Side[] = o.wall === 'h' ? ['N', 'S'] : ['W', 'E'];
  const side = sides.find(probe);
  if (!side) throw new Error(`safety: opening ${o.id} is not on a wall of ${space.id}`);
  return side;
}
const otherSpace = (o: Opening, id: SpaceId): SpaceId | undefined => o.rooms?.find((r) => r !== id);
const isCirculation = (id?: SpaceId) => CIRCULATION.some((c) => c.id === id);

// ---- obstacles: floor-standing equipment and the passenger lift -----------------
interface Box { x0: number; x1: number; z0: number; z1: number }
function itemBox(it: EquipItem): Box {
  const rot = (((it.rot ?? 0) % 180) + 180) % 180;
  const cx = it.x + it.w / 2, cz = it.z + it.d / 2;
  const [w, d] = rot === 90 ? [it.d, it.w] : [it.w, it.d];
  return { x0: cx - w / 2, x1: cx + w / 2, z0: cz - d / 2, z1: cz + d / 2 };
}
const OBSTACLES: Box[] = [
  ...EQUIPMENT.filter((e) => !e.props?.overhead && !e.props?.flat).map(itemBox),
  { x0: PASSENGER_LIFT.x, x1: PASSENGER_LIFT.x + PASSENGER_LIFT.w, z0: PASSENGER_LIFT.z, z1: PASSENGER_LIFT.z + PASSENGER_LIFT.d },
];

/** Does the plan segment a -> b pass through the interior of box `k`? (touching or grazing a face is not a hit) */
function segmentCrossesBox(ax: number, az: number, bx: number, bz: number, k: Box): boolean {
  // cheap reject: the segment's bounding box misses the box
  if (Math.max(ax, bx) <= k.x0 || Math.min(ax, bx) >= k.x1 || Math.max(az, bz) <= k.z0 || Math.min(az, bz) >= k.z1) return false;
  let t0 = 0, t1 = 1;
  const dx = bx - ax, dz = bz - az;
  if (Math.abs(dx) < 1e-12) {
    if (ax <= k.x0 + 1e-9 || ax >= k.x1 - 1e-9) return false;
  } else {
    const ta = (k.x0 - ax) / dx, tb = (k.x1 - ax) / dx;
    t0 = Math.max(t0, Math.min(ta, tb));
    t1 = Math.min(t1, Math.max(ta, tb));
  }
  if (Math.abs(dz) < 1e-12) {
    if (az <= k.z0 + 1e-9 || az >= k.z1 - 1e-9) return false;
  } else {
    const ta = (k.z0 - az) / dz, tb = (k.z1 - az) / dz;
    t0 = Math.max(t0, Math.min(ta, tb));
    t1 = Math.min(t1, Math.max(ta, tb));
  }
  return t1 - t0 > 1e-9;
}

/**
 * Straight-line distance (ft) from an extinguisher standing at (x, z) in `space` to the centre of door `o`, or Infinity when it
 * does not serve it: it must be in one of the two spaces the door joins (so no wall or glazing is on the line), within
 * EXTINGUISHER_REACH (less a hair for rounding), and no floor-standing equipment may be on the line to the door (taken to the
 * wall face on the extinguisher's side, where a person stands to use it: the centre line of a thick wall is inside the wall).
 */
function reach(x: number, z: number, space: SpaceId | undefined, o: Opening): number {
  if (!space || !o.rooms?.includes(space)) return Infinity;
  const [dx, dz] = openingPoint(o);
  const d = Math.hypot(x - dx, z - dz);
  if (d > EXTINGUISHER_REACH - 0.05) return Infinity;
  const horizontal = o.wall === 'h';
  const half = halfThickness(horizontal ? 'N' : 'W', o.at);
  const sign = (horizontal ? z : x) >= o.at ? 1 : -1;
  const tx = horizontal ? dx : dx + sign * half;
  const tz = horizontal ? dz + sign * half : dz;
  return OBSTACLES.some((k) => segmentCrossesBox(x, z, tx, tz, k)) ? Infinity : d;
}

// ---- wall spots -----------------------------------------------------------------
interface Spot { x: number; z: number; side: Side; space: Space }

/** Is there solid, unglazed wall behind position `a` along `side` of `space`? Room walls always are; a corridor's boundary only where a room or the perimeter is. */
function solidWall(space: Space, side: Side, line: number, half: number, a: number): boolean {
  if (space.glass?.includes(side)) return false;
  if (space.room) return true;
  const horizontal = side === 'N' || side === 'S';
  const [nx, nz] = NORMAL[side];
  const d = half + 0.4;
  const px = horizontal ? a : line - nx * d;
  const pz = horizontal ? line - nz * d : a;
  const neighbour = roomAt(px, pz);
  if (neighbour) return !neighbour.glass?.includes(OPPOSITE[side]);
  return px < 0 || pz < 0 || px > FOOTPRINT.w || pz > FOOTPRINT.d; // outside the footprint = perimeter wall
}

const spotCache = new Map<string, Spot[]>();

/** Every free wall spot (0.25 ft apart) on the given sides of `space` for an item with footprint `m`. */
function wallSpots(space: Space, m: Mount, sides: readonly Side[] = SIDES): Spot[] {
  const key = `${space.id}|${m.y}|${sides.join('')}`;
  const hit = spotCache.get(key);
  if (hit) return hit;
  const out: Spot[] = [];
  const e = Math.max(m.halfW, m.halfD) + 0.1;
  for (const side of sides) {
    const horizontal = side === 'N' || side === 'S';
    const line = lineOf(space, side);
    const half = halfThickness(side, line);
    const [nx, nz] = NORMAL[side];
    const start = horizontal ? space.x : space.z;
    const end = start + (horizontal ? space.w : space.d);
    for (let a = start + CORNER + m.halfW; a <= end - CORNER - m.halfW + EPS; a += STEP) {
      if (!solidWall(space, side, line, half, a)) continue;
      const off = half + m.halfD;
      const x = horizontal ? a : line + nx * off;
      const z = horizontal ? line + nz * off : a;
      if (blocked(x, z, horizontal ? 'h' : 'v', line, a, m, e)) continue;
      out.push({ x, z, side, space });
    }
  }
  spotCache.set(key, out);
  return out;
}

function blocked(x: number, z: number, wall: 'h' | 'v', line: number, a: number, m: Mount, e: number): boolean {
  for (const o of OPENINGS) {
    if (o.y1 <= m.y0 || o.y0 >= m.y1) continue; // opening is above or below the item
    if (o.wall === wall && Math.abs(o.at - line) < EPS && Math.abs(a - o.c) < o.w / 2 + m.halfW + 0.2) return true;
  }
  for (const o of DOORS) {
    const reach = o.w / 2 + m.halfW + 0.15;
    const along = o.wall === 'h' ? x : z;
    const across = o.wall === 'h' ? z : x;
    if (Math.abs(along - o.c) < reach && Math.abs(across - o.at) < DOOR_LANDING) return true;
  }
  return OBSTACLES.some((b) => x + e > b.x0 + 0.05 && x - e < b.x1 - 0.05 && z + e > b.z0 + 0.05 && z - e < b.z1 - 0.05);
}

const distance = (s: Spot, p: Vec2) => Math.hypot(s.x - p[0], s.z - p[1]);

/** The spot closest to `target`; spots on walls the aerial cannot see count as HIDDEN_PENALTY ft further away. */
function nearest(spots: readonly Spot[], target: Vec2, skip: readonly Vec2[] = [], gap = 2.5, accept?: (s: Spot) => boolean): Spot | undefined {
  let best: Spot | undefined;
  let bestScore = Infinity;
  for (const s of spots) {
    if (skip.some(([px, pz]) => Math.hypot(s.x - px, s.z - pz) < gap)) continue;
    if (accept && !accept(s)) continue;
    const score = distance(s, target) + (AERIAL_SIDES.has(s.side) ? 0 : HIDDEN_PENALTY);
    if (score < bestScore) { bestScore = score; best = s; }
  }
  return best;
}

/** Point at fraction `f` along the `side` boundary of `space`. */
function along(space: Space, side: Side, f: number): Vec2 {
  const line = lineOf(space, side);
  return side === 'N' || side === 'S' ? [space.x + f * space.w, line] : [line, space.z + f * space.d];
}

// ---- ceiling slots --------------------------------------------------------------
/** Recessed light panels sit on a regular grid centred in every space (mirrors panelGrid in building/Ceiling.tsx); detectors keep clear of them. */
function lightPanels(s: Space): { x: number; z: number; half: number }[] {
  const inset = WALL.outer / 2;
  const w = s.w - 2 * inset, d = s.d - 2 * inset;
  if (w < 1.4 || d < 1.4) return [];
  const nx = Math.max(1, Math.round(w / 6)), nz = Math.max(1, Math.round(d / 6));
  const cw = w / nx, cd = d / nz;
  const half = Math.min(2, Math.max(0.8, Math.min(cw, cd) * 0.5)) / 2 + 0.11;
  const out: { x: number; z: number; half: number }[] = [];
  for (let i = 0; i < nx; i++) for (let k = 0; k < nz; k++) out.push({ x: s.x + inset + (i + 0.5) * cw, z: s.z + inset + (k + 0.5) * cd, half });
  return out;
}

const DETECTOR_R = 0.7;
/** Nearest free ceiling position to the fractional point (fx, fz) of the room: clear of the light panels, 1 ft off the walls. */
function ceilingSlot(s: Space, fx: number, fz: number): Vec2 {
  const panels = lightPanels(s);
  const clear = (x: number, z: number) =>
    x > s.x + 1 && x < s.x + s.w - 1 && z > s.z + 1 && z < s.z + s.d - 1 &&
    panels.every((p) => Math.abs(x - p.x) >= p.half + DETECTOR_R || Math.abs(z - p.z) >= p.half + DETECTOR_R);
  const cx = s.x + fx * s.w, cz = s.z + fz * s.d;
  let best: Vec2 = [cx, cz];
  let bestDist = Infinity;
  for (let dx = -4; dx <= 4; dx += 0.5) {
    for (let dz = -4; dz <= 4; dz += 0.5) {
      const dist = Math.hypot(dx, dz);
      if (dist < bestDist && clear(cx + dx, cz + dz)) { bestDist = dist; best = [cx + dx, cz + dz]; }
    }
  }
  return best;
}

// ---------------------------------------------------------------------------
// Generation
// ---------------------------------------------------------------------------
export function generateSafetyPoints(): SafetyPoint[] {
  const points: SafetyPoint[] = [];
  const seq: Partial<Record<SafetyKind, number>> = {};
  const add = (kind: SafetyKind, x: number, z: number, y: number, extra: { rot?: number; room?: SpaceId; label?: string } = {}) => {
    const n = (seq[kind] = (seq[kind] ?? 0) + 1);
    points.push({ id: `${kind}-${n}`, kind, x: r2(x), z: r2(z), y: r2(y), ...extra });
  };
  const ceilingY = WALL.height - CEILING_DROP;

  // ---- extinguishers ----------------------------------------------------------
  const extSpots: Vec2[] = [];
  const corridorExt: Vec2[] = [];
  /** Every extinguisher placed so far, with the space it stands in (what reach() needs). */
  const placed: { x: number; z: number; space: SpaceId }[] = [];
  const addExtinguisher = (spot: Spot) => {
    extSpots.push([spot.x, spot.z]);
    placed.push({ x: spot.x, z: spot.z, space: spot.space.id });
    if (!spot.space.room) corridorExt.push([spot.x, spot.z]);
    add('extinguisher', spot.x, spot.z, MOUNTS.extinguisher.y, { rot: FACING[spot.side], room: spot.space.id, label: `ABC extinguisher, ${spot.space.name}` });
  };

  for (const room of ROOMS) {
    if (NO_EXTINGUISHER.has(room.id)) continue;
    const doors = DOORS.filter((o) => o.rooms?.includes(room.id));
    // One per room beside the door that opens onto circulation (first door otherwise); the kitchen gets one per door.
    const main = doors.find((o) => isCirculation(otherSpace(o, room.id))) ?? doors[0];
    const perDoor = PER_DOOR.has(room.id);
    const chosen = perDoor ? doors : main ? [main] : [];
    const spots = wallSpots(spaceById(room.id), MOUNTS.extinguisher);
    for (const o of chosen) {
      const door = openingPoint(o);
      const serves = (s: Spot) => reach(s.x, s.z, s.space.id, o) < Infinity;
      // The kitchen's four hang on the nearest free wall in the room whether or not the line to the door is clear (its line
      // of appliances fills the north wall: the corridor side covers those two doors). Any other room's extinguisher must
      // serve its door: close to it, with nothing in between.
      let spot = nearest(spots, door, extSpots, EXT_GAP, perDoor ? undefined : (s) => serves(s) && distance(s, door) <= INSIDE_REACH);
      const outside = otherSpace(o, room.id);
      // A fully fitted room can leave no wall within reach of its door: then it hangs in the corridor, beside the door.
      if (!spot && !perDoor && isCirculation(outside)) {
        spot = nearest(wallSpots(spaceById(outside!), MOUNTS.extinguisher), door, extSpots, EXT_GAP, serves);
      }
      if (spot) addExtinguisher(spot);
    }
  }

  // Fire staircase: nothing hangs in the stair itself, so its extinguisher is on the corridor wall beside the door.
  const stairDoor = DOORS.find((o) => o.rooms?.includes('stair'));
  if (stairDoor) {
    const corridor = otherSpace(stairDoor, 'stair');
    const spot = corridor && nearest(wallSpots(spaceById(corridor), MOUNTS.extinguisher), openingPoint(stairDoor), extSpots);
    if (spot) addExtinguisher(spot);
  }

  // Coverage: every door of every room, corridor and exit gets an extinguisher within EXTINGUISHER_REACH (the brief). Greedy: the
  // free wall spot, on either side of a door still uncovered, that serves the most of them (close ones first, so one stands
  // between two adjacent doors rather than 9 ft from each), then the nearest to them and, in a tie, on a wall the aerial sees.
  const serving = (o: Opening) => placed.some((e) => reach(e.x, e.z, e.space, o) < Infinity);
  for (let pass = 0; pass < DOORS.length; pass++) {
    const open = DOORS.filter((o) => !serving(o));
    if (!open.length) break;
    const sides = new Set(open.flatMap((o) => o.rooms ?? []).filter((id) => SPACES.some((p) => p.id === id)));
    let best: Spot | undefined;
    for (const [limit, gap] of [[COVER_NEAR, EXT_GAP], [EXTINGUISHER_REACH, EXT_GAP], [EXTINGUISHER_REACH, 1]] as const) {
      let bestScore = -Infinity;
      for (const id of sides) {
        for (const s of wallSpots(spaceById(id), MOUNTS.extinguisher)) {
          if (extSpots.some(([px, pz]) => Math.hypot(s.x - px, s.z - pz) < gap)) continue;
          const ds = open.map((o) => reach(s.x, s.z, s.space.id, o)).filter((d) => d <= limit);
          if (!ds.length) continue;
          const cost = ds.reduce((acc, d) => acc + d, 0) / ds.length + (AERIAL_SIDES.has(s.side) ? 0 : HIDDEN_PENALTY);
          const score = ds.length * 100 - cost;
          if (score > bestScore) { bestScore = score; best = s; }
        }
      }
      if (best) break;
    }
    if (!best) break; // nothing fits: scripts/validate-layout.ts section 9 reports the doors left uncovered
    addExtinguisher(best);
  }

  // Corridor stations: every STATION_SPACING ft of corridor, and one at the entrance lobby, unless a corridor extinguisher
  // (the stair's, one standing in for a fully fitted room or one added for a door) is already within a quarter of that.
  for (const c of CIRCULATION) {
    const long = Math.max(c.w, c.d);
    const lobby = OPENINGS.some((o) => o.rooms?.includes(c.id) && o.rooms.includes('outside'));
    if (Math.min(c.w, c.d) < 3 || (long < 20 && !lobby)) continue;
    const n = Math.max(1, Math.ceil(long / STATION_SPACING));
    const spots = wallSpots(spaceById(c.id), MOUNTS.extinguisher);
    for (let i = 0; i < n; i++) {
      const f = (i + 0.5) / n;
      const target: Vec2 = c.w >= c.d ? [c.x + f * c.w, c.z + c.d / 2] : [c.x + c.w / 2, c.z + f * c.d];
      if (corridorExt.some(([x, z]) => Math.hypot(x - target[0], z - target[1]) < STATION_SPACING / 4)) continue;
      const spot = nearest(spots, target, extSpots);
      if (spot) addExtinguisher(spot);
    }
  }

  // ---- ceiling detectors -------------------------------------------------------
  for (const room of ROOMS) {
    const s = spaceById(room.id);
    const smoke: Vec2[] = room.id === 'kitchen' ? [[0.25, 0.5], [0.75, 0.5]] : room.id === 'bakery' ? [[0.5, 0.3]] : [[0.5, 0.5]];
    const heat: Vec2[] =
      room.id === 'kitchen' ? [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]] : room.id === 'bakery' ? [[0.5, 0.7]] : [];
    for (const [fx, fz] of smoke) {
      const [x, z] = ceilingSlot(s, fx, fz);
      add('smoke', x, z, ceilingY, { room: room.id, label: `Smoke detector, ${room.name}` });
    }
    for (const [fx, fz] of heat) {
      const [x, z] = ceilingSlot(s, fx, fz);
      add('heat', x, z, ceilingY, { room: room.id, label: `Heat detector, ${room.name}` });
    }
  }

  // ---- LPG detectors and the emergency gas valve -------------------------------
  // The ring main runs round the kitchen through the corridors (GAS_RING): detectors sit low on the walls beside it,
  // two more inside the kitchen. [space, side of that space, fraction along the side]
  const lpgSites: [SpaceId, Side, number][] = [
    ['left-corridor', 'E', 0.6],
    ['left-corridor', 'E', 0.92],
    ['bottom-corridor', 'N', 0.3],
    ['bottom-corridor', 'N', 0.7],
    ['return-corridor', 'E', 0.5],
    ['kitchen', 'N', 0.5],
    ['kitchen', 'E', 0.8],
  ];
  const lpgSpots: Vec2[] = [];
  for (const [id, side, f] of lpgSites) {
    const space = spaceById(id);
    const spot = nearest(wallSpots(space, MOUNTS.lpg, [side]), along(space, side, f), lpgSpots, 4);
    if (!spot) continue;
    lpgSpots.push([spot.x, spot.z]);
    add('lpg', spot.x, spot.z, MOUNTS.lpg.y, { rot: FACING[spot.side], room: space.id, label: `LPG leak detector, ${space.name}` });
  }

  const westDoor = DOORS.find((o) => o.wall === 'v' && o.rooms?.includes('kitchen') && o.rooms.includes('left-corridor'));
  if (westDoor) {
    // On the ring's west run (x = GAS_RING.west), just south of the door; a brass riser drops from the ring main to it.
    add('gasvalve', GAS_RING.west, westDoor.c + westDoor.w / 2 + 1.4, 4.3, { rot: 270, room: 'left-corridor', label: 'Emergency gas shut-off valve' });
  }

  // ---- exit signs and emergency lights ------------------------------------------
  const exits = [...OPENINGS.filter((o) => o.kind === 'emergency'), ...(DOORS.filter((o) => o.rooms?.includes('stair')))];
  for (const o of exits) {
    const approach = o.rooms?.find((r) => r !== 'outside' && r !== 'stair');
    if (!approach) continue;
    const space = spaceById(approach);
    const side = sideOfOpening(space, o);
    const [nx, nz] = NORMAL[side];
    const off = halfThickness(side, lineOf(space, side)) + 0.12;
    const [x, z] = o.wall === 'h' ? [o.c, o.at + nz * off] : [o.at + nx * off, o.c];
    const label = o.rooms?.includes('stair') ? 'Fire staircase' : (o.label ?? 'Emergency Exit');
    add('exit', x, z, EXIT_SIGN_Y, { rot: FACING[side], room: approach, label });
    const lampOff = off + 0.05;
    const [lx, lz] = o.wall === 'h' ? [o.c, o.at + nz * lampOff] : [o.at + nx * lampOff, o.c];
    add('emlight', lx, lz, EXIT_SIGN_Y + 0.95, { rot: FACING[side], room: approach, label: `Emergency light, ${label}` });
  }
  const entrance = OPENINGS.find((o) => o.kind === 'logo');
  if (entrance) {
    const lobby = spaceById('lobby');
    const side = sideOfOpening(lobby, entrance);
    const off = halfThickness(side, lineOf(lobby, side)) + 0.17;
    add('emlight', entrance.c, entrance.at + NORMAL[side][1] * off, 8.6, { rot: FACING[side], room: 'lobby', label: 'Emergency light, Staff Entrance' });
  }
  // Corridor junctions: the midpoint of every edge two circulation spaces share, merged when closer than 4.5 ft.
  const junctions: { at: Vec2; room: SpaceId }[] = [];
  for (let i = 0; i < CIRCULATION.length; i++) {
    for (let k = i + 1; k < CIRCULATION.length; k++) {
      const p = CIRCULATION[i], q = CIRCULATION[k];
      const ox0 = Math.max(p.x, q.x), ox1 = Math.min(p.x + p.w, q.x + q.w);
      const oz0 = Math.max(p.z, q.z), oz1 = Math.min(p.z + p.d, q.z + q.d);
      let at: Vec2 | null = null;
      if (ox1 - ox0 > EPS && (Math.abs(p.z + p.d - q.z) < EPS || Math.abs(q.z + q.d - p.z) < EPS)) {
        at = [(ox0 + ox1) / 2, Math.abs(p.z + p.d - q.z) < EPS ? q.z : p.z];
      } else if (oz1 - oz0 > EPS && (Math.abs(p.x + p.w - q.x) < EPS || Math.abs(q.x + q.w - p.x) < EPS)) {
        at = [Math.abs(p.x + p.w - q.x) < EPS ? q.x : p.x, (oz0 + oz1) / 2];
      }
      const [ax, az] = at ?? [0, 0];
      if (at && !junctions.some((j) => Math.hypot(j.at[0] - ax, j.at[1] - az) < 4.5)) junctions.push({ at, room: p.id });
    }
  }
  for (const { at: [x, z], room } of junctions) {
    add('emlight', x, z, WALL.height - 0.3, { room, label: 'Emergency light, corridor junction' });
  }

  return points;
}

export const SAFETY_POINTS: SafetyPoint[] = generateSafetyPoints();

export const SAFETY_COUNTS = SAFETY_KINDS.reduce(
  (acc, { kind }) => ({ ...acc, [kind]: SAFETY_POINTS.filter((p) => p.kind === kind).length }),
  {} as Record<SafetyKind, number>,
);

/** The nearest extinguisher that serves each walk-through opening (see reach()): the data behind "one within EXTINGUISHER_REACH of every door". */
export interface DoorCover {
  door: string;
  /** Id of the nearest serving extinguisher, or undefined when the door is not covered. */
  extinguisher?: string;
  /** Straight-line distance to it, ft. */
  ft: number;
}
export const DOOR_COVER: DoorCover[] = DOORS.map((o) => {
  let best: DoorCover = { door: o.id, ft: Infinity };
  for (const p of SAFETY_POINTS) {
    if (p.kind !== 'extinguisher') continue;
    const d = reach(p.x, p.z, p.room, o);
    if (d < best.ft) best = { door: o.id, extinguisher: p.id, ft: Math.round(d * 10) / 10 };
  }
  return best;
});

/** Figures for the proposal copy, all derived: how many doors, how many are covered, how far the furthest is, how many hang in the kitchen. */
export const EXTINGUISHER_COVERAGE = {
  reachFt: EXTINGUISHER_REACH,
  doors: DOORS.length,
  covered: DOOR_COVER.filter((c) => c.extinguisher).length,
  /** The longest straight line from any door to the extinguisher that serves it, ft. */
  farthestFt: DOOR_COVER.reduce((m, c) => (c.extinguisher ? Math.max(m, c.ft) : m), 0),
  kitchen: SAFETY_POINTS.filter((p) => p.kind === 'extinguisher' && p.room === 'kitchen').length,
};
