// Camera poses. All derived from layout data. CameraRig.tsx may adapt a pose to the viewport
// aspect (portrait phones dolly out) but the numbers here are the "desktop landscape" truth.
import type { PresetId, Room, Vec3 } from './types';
import { EYE_HEIGHT, doorsOf, roomCenter } from './layout';

export interface Pose {
  position: Vec3;
  target: Vec3;
}

export const PRESET_LABELS: Record<PresetId, string> = {
  aerial: 'Aerial',
  plan: 'Plan',
  kitchen: 'Hot Kitchen',
  entrance: 'Entrance',
};

export const PRESETS: Record<PresetId, Pose> = {
  // 3/4 view from the south-west. Targets sit on the building's centre column, so orbiting never swings the model.
  aerial: { position: [-19, 112, 100.25], target: [30, 0, 27.25] },
  // top-down, north is up the screen
  plan: { position: [30, 116, 27.26], target: [30, 0, 27.25] },
  kitchen: { position: [6, 36, 64], target: [27.75, 0, 26] },
  // outside, south-east, looking at the logo door
  entrance: { position: [66, 9, 67], target: [52.2, 3.5, 50] },
};

/** Hero camera: further out than the aerial. The rig slowly auto-orbits around `target`. */
export const HERO_POSE: Pose = { position: [-22.5, 96.6, 111.25], target: [30, 0, 27.25] };

const deg = Math.PI / 180;

/** Room "Overview": 3/4 view from the south-west, distance scaled to the room. */
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
  };
}

/** Room "Eye-level": 5.5 ft eye height, standing just inside the room's longest-sightline door, looking in. */
export function roomEye(room: Room): Pose {
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

// ---------------------------------------------------------------------------
// Lens, viewport fitting and the explorer-panel offset (consumed by scene/CameraRig.tsx)
// ---------------------------------------------------------------------------

/** Vertical field of view in degrees. `orbit` is the architectural 3/4-view lens; `look` is the eye-level lens (see lookFov). */
export const FOV = { orbit: 32, look: 62 } as const;

/** Desktop explorer side panel: the rig shifts the rendered image left by half of it. */
export const PANEL_WIDTH = 360;
/** Viewports narrower than this are "mobile" (matches the Tailwind md breakpoint and useIsMobile). */
export const DESKTOP_MIN_WIDTH = 768;

/**
 * Effective viewport aspect (width of the free area / height) at which each orbit pose frames the
 * building snugly. Narrower viewports dolly the pose out proportionally so the footprint keeps
 * fitting the width. Hero and room poses use DEFAULT_FIT_ASPECT.
 */
export const FIT_ASPECT: Record<PresetId, number> = { aerial: 1.2, plan: 1.0, kitchen: 1.15, entrance: 0.8 };
export const DEFAULT_FIT_ASPECT = 1.3;
/** Never dolly further than this multiple of the authored distance. */
export const MAX_FIT_DOLLY = 3.4;

/**
 * Fraction of the viewport height the aerial and hero views are lifted by (CameraRig, desktop only): the near
 * plinth corner is magnified by perspective, so the building's visual centre sits below the geometric one.
 */
export const FRAME_LIFT = { hero: 0.07, aerial: 0.05 } as const;

/** Eye-level lens: keep roughly a 75 degree horizontal view, within sane vertical limits. */
export function lookFov(aspect: number): number {
  const v = 2 * Math.atan(Math.tan((75 * deg) / 2) / Math.max(0.3, aspect)) / deg;
  return Math.min(84, Math.max(FOV.look, v));
}

/** Horizontal extent (ft) of the 60 x 50 footprint seen from azimuth `az` (radians from south). */
const footprintExtent = (az: number) => 60 * Math.abs(Math.cos(az)) + 50 * Math.abs(Math.sin(az));

/**
 * Adapt an orbit pose to the viewport: dolly out on narrow viewports and, with `reframe`
 * (aerial / hero), swing portrait phones towards a frontal, higher view so the footprint is
 * narrower on screen and the tall screen is used for depth.
 */
export function fitOrbitPose(pose: Pose, aspect: number, fitAspect: number, reframe = false): Pose {
  const [tx, ty, tz] = pose.target;
  const dx = pose.position[0] - tx, dy = pose.position[1] - ty, dz = pose.position[2] - tz;
  let dist = Math.hypot(dx, dy, dz);
  const az0 = Math.atan2(dx, dz);
  let az = az0;
  let el = Math.asin(dy / dist);
  let fit = fitAspect;
  if (reframe && aspect < 1) {
    const t = Math.min(1, (1 - aspect) / 0.5);
    az = az0 * (1 - 0.7 * t);
    el = Math.min(el + 14 * deg * t, 76 * deg);
    fit = fitAspect * (footprintExtent(az) / footprintExtent(az0));
  }
  dist *= Math.min(MAX_FIT_DOLLY, Math.max(1, fit / aspect));
  const c = Math.cos(el);
  return {
    target: pose.target,
    position: [tx + dist * c * Math.sin(az), ty + dist * Math.sin(el), tz + dist * c * Math.cos(az)],
  };
}
