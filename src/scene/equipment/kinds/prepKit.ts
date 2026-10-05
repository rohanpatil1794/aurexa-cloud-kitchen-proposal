// Small helpers shared by the Prep & Storage kind builders (prepRooms.ts, prepStorage.ts).
import * as THREE from 'three';
import type { PrimBuilder } from '../../../lib/prims';

/**
 * Light satin stainless for large surfaces (bench tops, cabinets). The metallic 'steel' material mostly
 * reflects the dark stage, so big steel masses would read as black: use this with m: 'gloss'.
 */
export const SATIN_STEEL = '#c6ced5';

const _a = new THREE.Color();
const _b = new THREE.Color();

/** Mix colour `c` towards white (t > 0) or black (t < 0) by |t|. */
export function tint(c: string, t: number): string {
  _a.set(c);
  return `#${_a.lerp(_b.set(t > 0 ? '#ffffff' : '#000000'), Math.abs(t)).getHexString()}`;
}

/** Deterministic random source, so every rebuild draws the same goods. */
export function rng(seed: number): () => number {
  let k = Math.abs(Math.floor(seed)) % 2147483647 || 1;
  return () => ((k = (k * 16807) % 2147483647) / 2147483647);
}

/** Lidded tub (gastronorm / storage tub) centred on x / z, standing on y. */
export function tub(
  b: PrimBuilder,
  o: { x: number; y: number; z: number; w: number; d: number; h: number; c: string; lid?: string },
): void {
  b.box({ m: 'gloss', c: o.c, x: o.x, y: o.y, z: o.z, w: o.w, h: o.h - 0.07, d: o.d });
  b.box({ m: 'gloss', c: o.lid ?? tint(o.c, 0.3), x: o.x, y: o.y + o.h - 0.07, z: o.z, w: o.w + 0.04, h: 0.07, d: o.d + 0.04, shadow: false });
}
