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
  // 3/4 view from the south-west
  aerial: { position: [-10, 72, 82], target: [30, 0, 24] },
  // top-down, north is up the screen
  plan: { position: [30, 105, 25.01], target: [30, 0, 25] },
  kitchen: { position: [6, 36, 64], target: [27.75, 0, 26] },
  // outside, south-east, looking at the logo door
  entrance: { position: [66, 9, 67], target: [52.2, 3.5, 50] },
};

/** Hero camera: further out than the aerial. The rig slowly auto-orbits around `target`. */
export const HERO_POSE: Pose = { position: [-14, 80, 94], target: [30, 0, 24] };

const deg = Math.PI / 180;

/** Room "Overview": 3/4 view from the south-west, distance scaled to the room. */
export function roomOverview(room: Room): Pose {
  const [cx, cz] = roomCenter(room);
  const dist = Math.min(72, Math.max(24, Math.max(room.w, room.d) * 1.15 + 17));
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
