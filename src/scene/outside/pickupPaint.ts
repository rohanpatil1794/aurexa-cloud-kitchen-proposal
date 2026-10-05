// Ground markings for the Delivery Partners Pickup Zone: a dashed outline (one merged mesh of flat
// quads) and the text decals. Everything lies flat on the plinth, a hair above it.
import * as THREE from 'three';
import { getTextTexture } from '../../lib/textTexture';

/** Height of the paint above the world floor (the plinth top is at y = -0.01, room floors at 0.02). */
export const PAINT_Y = 0.02;
export const PAINT_ORANGE = '#b9521f';

/** Painted zone rectangle, ft (x0, z0, x1, z1): the pickup zone inset from its edges, starting off the wall face. */
export const ZONE_RECT = { x0: 0.3, z0: 51.1, x1: 21.7, z1: 55.1 } as const;

const DASH = { width: 0.17, len: 1.0, gap: 0.6 };

/** Dashes along the four sides of a rectangle; each side is fitted to a whole number of dashes and corners close in an L. */
export function dashedRectGeometry(r: { x0: number; z0: number; x1: number; z1: number }): THREE.BufferGeometry {
  const pos: number[] = [];
  const nor: number[] = [];
  const idx: number[] = [];
  const hw = DASH.width / 2;
  const quad = (xa: number, za: number, xb: number, zb: number) => {
    const i = pos.length / 3;
    pos.push(xa, 0, za, xb, 0, za, xb, 0, zb, xa, 0, zb);
    nor.push(0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0);
    idx.push(i, i + 2, i + 1, i, i + 3, i + 2);
  };
  const side = (a: number, b: number, fixed: number, horizontal: boolean) => {
    const total = b - a + DASH.width;
    const n = Math.max(1, Math.round((total + DASH.gap) / (DASH.len + DASH.gap)));
    const len = (total + DASH.gap) / n - DASH.gap;
    for (let k = 0; k < n; k++) {
      const s = a - hw + k * (len + DASH.gap);
      if (horizontal) quad(s, fixed - hw, s + len, fixed + hw);
      else quad(fixed - hw, s, fixed + hw, s + len);
    }
  };
  side(r.x0, r.x1, r.z0, true);
  side(r.x0, r.x1, r.z1, true);
  side(r.z0, r.z1, r.x0, false);
  side(r.z0, r.z1, r.x1, false);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  geo.setIndex(idx);
  return geo;
}

export interface Decal {
  text: string;
  /** Plane size, ft. The text fills ~90% of the width, so pick the aspect to suit the string. */
  w: number;
  h: number;
  x: number;
  z: number;
  tracking: number;
}

/** Flat text lying on the ground, readable from the south (text "up" points north). */
export function decalMaterial(d: Decal): THREE.MeshStandardMaterial {
  const map = getTextTexture({ text: d.text, aspect: d.w / d.h, fg: PAINT_ORANGE, weight: 700, tracking: d.tracking, px: 1024 });
  return new THREE.MeshStandardMaterial({
    map, transparent: true, depthWrite: false, roughness: 0.85, metalness: 0, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
  });
}
