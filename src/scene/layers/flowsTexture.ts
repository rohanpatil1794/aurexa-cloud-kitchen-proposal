// Texture for the flow ribbons, rasterised analytically (no canvas, no network): a solid band in the flow's
// colour with a light chevron every FLOW_REPEAT ft, outlined by a thin light halo so the black flow still reads
// on the dark ground and every flow reads on the green, purple and red zone floors.
//
// Built with real RGB in the transparent texels (a canvas stores premultiplied pixels and would leave black
// fringes under mip-mapped linear filtering).
import * as THREE from 'three';
import { FLOW_RIBBON } from '../../data/flows';

/** Distance between two chevrons along a ribbon, ft. */
export const FLOW_REPEAT = 1.4;

const TEX_U = 512;
const TEX_V = 128;
const HALO_RGB = [251, 243, 226] as const;
const HALO_ALPHA = 0.85;
const HALO_WIDTH = 0.03;
/** Half width of the coloured band; the rest of the ribbon is halo and a gap to the neighbouring lane. */
const BAND_HALF = FLOW_RIBBON.width / 2 - HALO_WIDTH - 0.015;
const BAND_ALPHA = 0.94;
const CHEVRON_RGB = [255, 250, 240] as const;
/** Chevron centre line (u, v) in ft about the repeat centre: upper wing, tip, lower wing; drawn with a round stroke. */
const CHEVRON: readonly (readonly [number, number])[] = [[-0.16, 0.19], [0.12, 0], [-0.16, -0.19]];
const CHEVRON_HALF_STROKE = 0.05;

/** Distance from (x, z) to an open polyline. */
function polylineDistance(x: number, z: number, line: readonly (readonly [number, number])[]): number {
  let d = Infinity;
  for (let i = 1; i < line.length; i++) {
    const [ax, az] = line[i - 1], [bx, bz] = line[i];
    const ex = bx - ax, ez = bz - az;
    const t = Math.max(0, Math.min(1, ((x - ax) * ex + (z - az) * ez) / (ex * ex + ez * ez)));
    d = Math.min(d, Math.hypot(x - ax - t * ex, z - az - t * ez));
  }
  return d;
}

const hexToRgb = (hex: string): [number, number, number] => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

/** Repeating band-and-chevron strip in the flow's colour; u runs along the ribbon (chevrons point towards +u), v across it. */
export function flowTexture(color: string): THREE.DataTexture {
  const ink = hexToRgb(color);
  const data = new Uint8Array(TEX_U * TEX_V * 4);
  const texel = FLOW_REPEAT / TEX_U; // ft
  /** Anti-aliased coverage from a signed distance (negative inside). */
  const cover = (signed: number) => Math.max(0, Math.min(1, 0.5 - signed / texel));

  // premultiplied accumulation of the layers, bottom to top; un-premultiplied when written
  let r = 0, g = 0, b = 0, a = 0;
  const over = (c: readonly number[], alpha: number) => {
    r = c[0] * alpha + r * (1 - alpha);
    g = c[1] * alpha + g * (1 - alpha);
    b = c[2] * alpha + b * (1 - alpha);
    a = alpha + a * (1 - alpha);
  };

  for (let j = 0; j < TEX_V; j++) {
    const v = ((j + 0.5) / TEX_V - 0.5) * FLOW_RIBBON.width;
    for (let i = 0; i < TEX_U; i++) {
      const u = ((i + 0.5) / TEX_U - 0.5) * FLOW_REPEAT;
      const band = Math.abs(v) - BAND_HALF;
      const chevron = polylineDistance(u, v, CHEVRON) - CHEVRON_HALF_STROKE;
      r = g = b = a = 0;
      over(HALO_RGB, HALO_ALPHA * cover(band - HALO_WIDTH));
      over(ink, BAND_ALPHA * cover(band));
      over(CHEVRON_RGB, cover(chevron) * cover(band + 0.02));
      const o = (j * TEX_U + i) * 4;
      data[o] = a > 1e-4 ? r / a : HALO_RGB[0];
      data[o + 1] = a > 1e-4 ? g / a : HALO_RGB[1];
      data[o + 2] = a > 1e-4 ? b / a : HALO_RGB[2];
      data[o + 3] = Math.round(a * 255);
    }
  }

  const tex = new THREE.DataTexture(data, TEX_U, TEX_V, THREE.RGBAFormat, THREE.UnsignedByteType);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = true;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}
