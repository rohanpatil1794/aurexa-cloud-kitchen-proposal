// Camera poses. All derived from layout data. CameraRig.tsx frames a pose in the part of the screen the UI leaves
// free (fitFrame below), so the numbers here are the authored direction and a "desktop landscape" distance.
import type { PresetId, Room, Vec3 } from './types';
import { EYE_HEIGHT, FOOTPRINT, PICKUP_ZONE, STAFF_ENTRANCE, WALL, doorsOf, roomCenter } from './layout';

/**
 * What a pose keeps on screen: world points (ft) that fitFrame dollies the camera out (or in) to fit inside the free
 * screen rectangle, and shifts into its centre.
 */
export interface Frame {
  points: readonly Vec3[];
  /** 'fit' = dolly in or out until the points fill the area; 'out' = never closer than the authored distance. */
  fit: 'fit' | 'out';
  /** Fraction of the free area's width / height kept empty on each side. */
  pad: number;
  /** 'fit' never comes closer than this share of the authored distance. */
  minDist?: number;
  /** Portrait screens swing the view towards a frontal, higher one (the footprint is narrower, the screen is tall). */
  portrait?: boolean;
  /** The subject turns (the hero turntable): fit it at every heading. */
  turn?: boolean;
}

export interface Pose {
  position: Vec3;
  target: Vec3;
  /** Orbit poses only: the subject the viewport framing works from. */
  frame?: Frame;
}

export const PRESET_LABELS: Record<PresetId, string> = {
  aerial: 'Aerial',
  plan: 'Plan',
  kitchen: 'Hot Kitchen',
  entrance: 'Entrance',
};

const deg = Math.PI / 180;

/** Corners of a footprint rectangle at height y. */
const rect = (x0: number, z0: number, x1: number, z1: number, y: number): Vec3[] => [[x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1]];
/** The eight corners of a box. */
const box = (x0: number, z0: number, x1: number, z1: number, y0: number, y1: number): Vec3[] => [...rect(x0, z0, x1, z1, y0), ...rect(x0, z0, x1, z1, y1)];

/** Plinth (footprint + margin), the pickup apron it extends over, and the tops of the full-height walls and ceiling. */
const M = WALL.plinthMargin;
const CEILING_TOP = WALL.height + 0.4;
const BUILDING: Vec3[] = [
  ...rect(-M, -M, FOOTPRINT.w + M, FOOTPRINT.d + M, 0),
  ...rect(-M, FOOTPRINT.d, PICKUP_ZONE.x + PICKUP_ZONE.w + M, PICKUP_ZONE.z + PICKUP_ZONE.d + M, 0),
  ...rect(0, 0, FOOTPRINT.w, FOOTPRINT.d, CEILING_TOP),
];
/** The aerial also leaves a little room for the north arrow beside the north-east corner. */
const AERIAL_POINTS: Vec3[] = [...BUILDING, [FOOTPRINT.w + M + 4, 0.5, -2.5]];
/**
 * The plan view shows the dimension lines too: the 60 ft line south of the apron, the 50 ft line west of the plinth (its north end
 * sits under the Back chip, so the view keeps that corner clear of it).
 */
const PLAN_POINTS: Vec3[] = [...BUILDING, [-5.2, 0, -M - 2.6], [FOOTPRINT.w + M, 0, 59.2]];

const BUILDING_FRAME = { fit: 'fit', pad: 0.035, portrait: true } as const;

export const PRESETS: Record<PresetId, Pose> = {
  // 3/4 view from the south-west. Targets sit on the building's centre column, so orbiting never swings the model.
  aerial: { position: [-19, 112, 100.25], target: [30, 0, 27.25], frame: { ...BUILDING_FRAME, points: AERIAL_POINTS } },
  // top-down, north is up the screen
  plan: { position: [30, 116, 27.26], target: [30, 0, 27.25], frame: { ...BUILDING_FRAME, points: PLAN_POINTS, portrait: false } },
  // the kitchen with the pass counter in front, the hood behind
  kitchen: {
    position: [6, 36, 64],
    target: [27.75, 0, 26],
    frame: { fit: 'out', pad: 0.04, points: box(15, 16.5, 40.5, 36, 0, 8.5) },
  },
  // outside, south-east, looking at the logo door
  entrance: {
    position: [66, 9, 67],
    target: [52.2, 3.5, 50],
    frame: { fit: 'out', pad: 0.06, points: box(STAFF_ENTRANCE.x - 3, STAFF_ENTRANCE.z - 1, STAFF_ENTRANCE.x + 3, STAFF_ENTRANCE.z + 2, 0, 8.5) },
  },
};

/**
 * The preset pose for the current wall height. In full-height mode the 10 ft near walls would hide the Hot Kitchen's pass
 * counter and lower islands, so that preset looks down more steeply (66 degrees keeps the strip behind the wall as narrow
 * as the 3.5 ft dollhouse wall leaves it at the authored 39 degrees) and a little further out.
 */
export function presetPose(id: PresetId, fullHeight: boolean): Pose {
  const p = PRESETS[id];
  if (id !== 'kitchen' || !fullHeight) return p;
  const [tx, ty, tz] = p.target;
  const dx = p.position[0] - tx, dy = p.position[1] - ty, dz = p.position[2] - tz;
  const dist = Math.hypot(dx, dy, dz) * 1.15;
  const az = Math.atan2(dx, dz), el = 66 * deg;
  return {
    ...p,
    position: [tx + dist * Math.cos(el) * Math.sin(az), ty + dist * Math.sin(el), tz + dist * Math.cos(el) * Math.cos(az)],
  };
}

/** Hero camera: further out than the aerial. The rig slowly auto-orbits around `target`. */
export const HERO_POSE: Pose = {
  position: [-22.5, 96.6, 111.25],
  target: [30, 0, 27.25],
  frame: { fit: 'fit', pad: 0.03, portrait: true, turn: true, points: AERIAL_POINTS },
};

/** Room "Overview": 3/4 view from the south-west, framed so the whole room sits in the free area. */
export function roomOverview(room: Room): Pose {
  const [cx, cz] = roomCenter(room);
  const dist = Math.min(84, Math.max(30, Math.max(room.w, room.d) * 1.5 + 20));
  const az = 28 * deg;
  const el = 52 * deg;
  const target: Vec3 = [cx, 0.5, cz];
  return {
    target,
    position: [
      cx - dist * Math.sin(az) * Math.cos(el),
      dist * Math.sin(el),
      cz + dist * Math.cos(az) * Math.cos(el),
    ],
    frame: { fit: 'fit', pad: 0.1, minDist: 0.75, points: box(room.x, room.z, room.x + room.w, room.z + room.d, 0, WALL.height) },
  };
}

// ---------------------------------------------------------------------------
// Eye level
// ---------------------------------------------------------------------------

/**
 * Hand-picked eye-level views for rooms where "just inside the longest door" puts the lens against equipment, a door
 * leaf or a blank wall. `at` is where the eye stands (plan x, z), `bearing` the way it looks in degrees clockwise
 * from north (0 north, 90 east, 180 south, -90 west). Most stand in a doorway or just outside it and look in, so the
 * view has depth; every spot keeps at least 1 ft clear of walls and equipment. Rooms not listed use eyeFromDoor.
 */
const EYE_VIEWS: Partial<Record<Room['id'], { at: [number, number]; bearing: number }>> = {
  stair: { at: [3.5, 14.7], bearing: 0 },
  bakery: { at: [35, 15.3], bearing: 0 },
  cold: { at: [41.6, 12.8], bearing: 18 },
  dry: { at: [50.5, 14.7], bearing: 0 },
  lift: { at: [55.8, 10.2], bearing: 8 },
  recv: { at: [57, 14.6], bearing: 0 },
  dessert: { at: [13, 20.5], bearing: -90 },
  dish: { at: [47, 21], bearing: 180 },
  rider: { at: [18, 51.8], bearing: 0 },
  waste: { at: [28.5, 42.8], bearing: 120 },
  lockers: { at: [51.3, 21.2], bearing: 75 },
  elec: { at: [52, 28], bearing: 102 },
  creator: { at: [51, 36.3], bearing: 85 },
  toilets: { at: [52, 41.8], bearing: 112 },
  exit: { at: [49.5, 48], bearing: 114 },
};

/** The eye looks this far ahead (ft) and slightly down: about -9 degrees. */
const EYE_LOOK = 6;
const EYE_PITCH = -9 * deg;

function eyeAt(x: number, z: number, bearing: number): Pose {
  const b = bearing * deg;
  return {
    position: [x, EYE_HEIGHT, z],
    target: [
      x + Math.sin(b) * EYE_LOOK * Math.cos(EYE_PITCH),
      EYE_HEIGHT + Math.sin(EYE_PITCH) * EYE_LOOK,
      z - Math.cos(b) * EYE_LOOK * Math.cos(EYE_PITCH),
    ],
  };
}

/** Standing just inside the room's longest-sightline door, looking in. */
function eyeFromDoor(room: Room): Pose {
  const [cx, cz] = roomCenter(room);
  const doors = doorsOf(room.id).filter((o) => o.kind !== 'pass');
  let best: { px: number; pz: number; nx: number; nz: number; depth: number } | null = null;
  for (const o of doors) {
    let px: number, pz: number, nx = 0, nz = 0, depth: number;
    if (o.wall === 'h') {
      px = o.c; pz = o.at; depth = room.d;
      nz = Math.abs(o.at - (room.z + room.d)) < 1e-6 ? -1 : 1;
    } else {
      px = o.at; pz = o.c; depth = room.w;
      nx = Math.abs(o.at - (room.x + room.w)) < 1e-6 ? -1 : 1;
    }
    if (!best || depth > best.depth) best = { px, pz, nx, nz, depth };
  }
  if (!best) return { position: [cx, EYE_HEIGHT, cz + 1], target: [cx, EYE_HEIGHT - 1, cz - 3] };
  const inset = Math.min(1.6, best.depth * 0.25);
  const look = Math.max(3, best.depth * 0.6);
  return {
    position: [best.px + best.nx * inset, EYE_HEIGHT, best.pz + best.nz * inset],
    target: [best.px + best.nx * look, EYE_HEIGHT - 1.2, best.pz + best.nz * look],
  };
}

/** Room "Eye-level": 5.5 ft eye height, a vantage with depth (see EYE_VIEWS). */
export function roomEye(room: Room): Pose {
  const v = EYE_VIEWS[room.id];
  return v ? eyeAt(v.at[0], v.at[1], v.bearing) : eyeFromDoor(room);
}

// ---------------------------------------------------------------------------
// Lens, viewport fitting and the explorer-panel offset (consumed by scene/CameraRig.tsx)
// ---------------------------------------------------------------------------

/** Vertical field of view in degrees. `orbit` is the architectural 3/4-view lens; `look` is the eye-level lens (see lookFov). */
export const FOV = { orbit: 32, look: 62 } as const;

/** Desktop explorer side panel: the rig shifts the rendered image left by half of it. */
export const PANEL_WIDTH = 360;
/** Viewports narrower than this are phones (matches the Tailwind md breakpoint: the top bar's burger menu, useIsMobile). */
export const DESKTOP_MIN_WIDTH = 768;
/** Portrait viewports up to this wide (portrait tablets, narrow tall windows) get the bottom sheet too: a 360 px side panel would leave the model a sliver. */
export const SHEET_PORTRAIT_MAX_WIDTH = 1100;

/**
 * THE explorer layout rule: the bottom sheet for phones and portrait viewports up to SHEET_PORTRAIT_MAX_WIDTH wide, the side
 * panel for everything else (landscape tablets and desktops; landscape phones fold the panel into a drawer, stageLayout
 * isShortScreen). The camera framing (stageLayout.explorerFree, CameraRig) and the UI (lib/hooks useSheetLayout, which feeds
 * ExplorerUI) both call this one function with the stage's size, so they cannot disagree. A square viewport counts as portrait,
 * as in the CSS orientation media feature.
 */
export const isSheetLayout = (width: number, height: number): boolean =>
  width < DESKTOP_MIN_WIDTH || (height >= width && width <= SHEET_PORTRAIT_MAX_WIDTH);

/** Never dolly further than this multiple of the authored distance. */
const MAX_FIT_DOLLY = 3.4;

/**
 * Mobile bottom sheet (ui/explorer/Sheet.tsx). Peek is a fixed header (drag handle + tab bar) plus the bottom safe-area
 * inset; half and full are fractions of the stage height.
 */
export const SHEET_PEEK_PX = 76;
export const SHEET_FRACTION = { half: 0.52, full: 0.88 } as const;

/**
 * Fraction of the viewport height the sheet's cover is halved to (a lift that centres a model in the strip the sheet leaves
 * free). Only the Dimensions layer still sizes its clamp from it; the camera uses stageLayout.explorerFree.
 */
export const SHEET_LIFT = { peek: 0.055, half: 0.25, full: 0.25 } as const;

/** Eye-level lens: keep roughly a 75 degree horizontal view, within sane vertical limits. */
export function lookFov(aspect: number): number {
  const v = 2 * Math.atan(Math.tan((75 * deg) / 2) / Math.max(0.3, aspect)) / deg;
  return Math.min(84, Math.max(FOV.look, v));
}

/** The part of the viewport (px) a pose should be framed in: what the top bar, side panel or sheet leave free. */
export interface FreeRect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** Where a framed subject ends up: the camera position, and the image shift (px) that centres it, see fitFrame. */
export interface Framed {
  position: Vec3;
  /** How far (px) the subject's centre sits right of / below the screen centre when the camera looks at the target. */
  cx: number;
  cy: number;
  /** The subject's size on screen (px). */
  width: number;
  height: number;
}

interface Bounds { l: number; r: number; t: number; b: number }

/** Tangent-space extents (x right, y up, from the screen centre) of `points` seen from `p` looking at `tgt`, merged into `out`. */
function mergeExtents(p: Vec3, tgt: Vec3, points: readonly Vec3[], out: Bounds): void {
  let fx = tgt[0] - p[0], fy = tgt[1] - p[1], fz = tgt[2] - p[2];
  const fl = Math.hypot(fx, fy, fz);
  fx /= fl; fy /= fl; fz /= fl;
  // right = f x up(0,1,0), up = right x f
  let rx = -fz, rz = fx;
  const rl = Math.hypot(rx, rz);
  rx /= rl; rz /= rl;
  const ux = -rz * fy, uy = rz * fx - rx * fz, uz = rx * fy;
  for (const q of points) {
    const vx = q[0] - p[0], vy = q[1] - p[1], vz = q[2] - p[2];
    const depth = vx * fx + vy * fy + vz * fz;
    const sx = (vx * rx + vz * rz) / depth;
    const sy = (vx * ux + vy * uy + vz * uz) / depth;
    if (sx < out.l) out.l = sx;
    if (sx > out.r) out.r = sx;
    if (sy > out.t) out.t = sy;
    if (sy < out.b) out.b = sy;
  }
}

const FIT_STEPS = 6;
const TURN_SAMPLES = 12;

/**
 * Frame an orbit pose: keep its direction (portrait screens swing it towards frontal and higher, unless `keepHeading`),
 * move the camera along it until `pose.frame.points` fit the free rectangle, and report where the subject then sits
 * so the rig can shift it to the middle of that rectangle. Pure perspective maths on the orbit lens, no scene access.
 */
export function fitFrame(pose: Pose, w: number, h: number, free: FreeRect, keepHeading = false): Framed {
  const frame = pose.frame;
  const [tx, ty, tz] = pose.target;
  const dx = pose.position[0] - tx, dy = pose.position[1] - ty, dz = pose.position[2] - tz;
  const d0 = Math.hypot(dx, dy, dz);
  let az = Math.atan2(dx, dz);
  let el = Math.asin(dy / d0);
  if (!frame) return { position: pose.position, cx: 0, cy: 0, width: 0, height: 0 };
  if (frame.portrait && !keepHeading && w < h) {
    const t = Math.min(1, (1 - w / h) / 0.5);
    az *= 1 - 0.7 * t;
    el = Math.min(el + 14 * deg * t, 76 * deg);
  }

  const k = h / 2 / Math.tan((FOV.orbit * deg) / 2); // px per unit of tangent
  const availW = (free.x1 - free.x0) * (1 - 2 * frame.pad);
  const availH = (free.y1 - free.y0) * (1 - 2 * frame.pad);
  const lo = frame.fit === 'out' ? d0 : d0 * (frame.minDist ?? 0.7);
  const hi = d0 * MAX_FIT_DOLLY;
  const headings = frame.turn ? TURN_SAMPLES : 1;
  const bounds: Bounds = { l: 0, r: 0, t: 0, b: 0 };
  const survey = (dist: number) => {
    bounds.l = bounds.b = Infinity;
    bounds.r = bounds.t = -Infinity;
    const c = Math.cos(el);
    for (let i = 0; i < headings; i++) {
      const a = az + (i * 2 * Math.PI) / headings;
      mergeExtents([tx + dist * c * Math.sin(a), ty + dist * Math.sin(el), tz + dist * c * Math.cos(a)], pose.target, frame.points, bounds);
    }
  };

  let dist = Math.min(hi, Math.max(lo, d0));
  for (let i = 0; i < FIT_STEPS; i++) {
    survey(dist);
    const need = Math.max((k * (bounds.r - bounds.l)) / availW, (k * (bounds.t - bounds.b)) / availH);
    const next = Math.min(hi, Math.max(lo, dist * need));
    const done = Math.abs(next - dist) < 0.05;
    dist = next;
    if (done) break;
  }
  survey(dist);
  const c = Math.cos(el);
  return {
    position: [tx + dist * c * Math.sin(az), ty + dist * Math.sin(el), tz + dist * c * Math.cos(az)],
    cx: (k * (bounds.l + bounds.r)) / 2,
    cy: (-k * (bounds.t + bounds.b)) / 2,
    width: k * (bounds.r - bounds.l),
    height: k * (bounds.t - bounds.b),
  };
}
