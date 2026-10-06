// Procedural floor textures (canvas, generated once, never fetched).
//
// Each texture is a near-white *detail* map (joints, grain, mottling) that multiplies the per-vertex
// floor colour, so the same pattern serves any tint. UVs are world-aligned (u = x / span, v = z / span),
// so tile size is constant in feet across rooms and joints line up where neighbouring rooms meet.
import * as THREE from 'three';
import type { FloorKind } from '../data/types';
import { FLOOR_KINDS, SIZE, paintFloor } from './floorPainters';

export type FloorMaterialKind = FloorKind | 'circulation';

export interface FloorStyle {
  /** Feet covered by one repeat of the texture. */
  span: number;
  /** Base colour (sRGB hex) multiplied with the detail map. */
  color: string;
  roughness: number;
  metalness: number;
}

export const FLOOR_STYLES: Record<FloorMaterialKind, FloorStyle> = {
  quarry: { span: 4, color: '#b6866a', roughness: 0.8, metalness: 0 },
  steel: { span: 8, color: '#9fb1bf', roughness: 0.42, metalness: 0.25 },
  concrete: { span: 10, color: '#c3c5c3', roughness: 0.92, metalness: 0 },
  cream: { span: 4, color: '#f3e5ca', roughness: 0.5, metalness: 0 },
  timber: { span: 4, color: '#bb8556', roughness: 0.6, metalness: 0 },
  garden: { span: 6, color: '#b5a880', roughness: 0.94, metalness: 0 },
  circulation: { span: 4, color: '#f6e3c2', roughness: 0.55, metalness: 0 },
};

const cache = new Map<FloorKind, THREE.Texture>();
/** Detail maps the worker has finished (bottom-up rows, see floorWorker.ts), waiting to be turned into textures. */
const painted = new Map<FloorKind, Uint8Array<ArrayBuffer>>();
let started = false;

/**
 * Starts painting every floor texture in a worker (once). The painters take ~0.1 s on a laptop and several times that on a
 * phone, inside the one task that mounts the floors; here they run beside the main thread while the rest of the scene is
 * built. floorTexture() takes what is ready and paints the rest itself, so a missing worker (or a slow one) only costs time.
 */
export function prepareFloorTextures(): void {
  if (started || typeof Worker === 'undefined' || typeof OffscreenCanvas === 'undefined') return;
  started = true;
  try {
    const worker = new Worker(new URL('./floorWorker.ts', import.meta.url), { type: 'module' });
    let received = 0;
    worker.onmessage = (e: MessageEvent<{ kind: FloorKind; pixels: Uint8Array<ArrayBuffer> }>) => {
      if (!cache.has(e.data.kind)) painted.set(e.data.kind, e.data.pixels); // already painted here (the worker was late): drop it
      if (++received === FLOOR_KINDS.length) worker.terminate();
    };
    worker.onerror = () => worker.terminate();
    worker.postMessage(0);
  } catch {
    // no module workers here: floorTexture() paints on the main thread
  }
}

export function floorTexture(material: FloorMaterialKind): THREE.Texture {
  // Circulation is the same polished cream as the cream rooms: one texture, so the tile joints run on through the doors.
  const kind: FloorKind = material === 'circulation' ? 'cream' : material;
  let tex = cache.get(kind);
  if (tex) return tex;
  const pixels = painted.get(kind);
  if (pixels) {
    painted.delete(kind);
    tex = new THREE.DataTexture(pixels, SIZE, SIZE, THREE.RGBAFormat);
    tex.generateMipmaps = true;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.needsUpdate = true;
  } else {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = SIZE;
    // Every painter ends in getImageData: a CPU-backed canvas skips the GPU read-back.
    paintFloor(kind, canvas.getContext('2d', { willReadFrequently: true })!);
    tex = new THREE.CanvasTexture(canvas);
  }
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  cache.set(kind, tex);
  return tex;
}
