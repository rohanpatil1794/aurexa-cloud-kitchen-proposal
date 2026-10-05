// Texture for the flow ribbons, rasterised analytically (no canvas, no network): a band in the flow's colour with
// white marks, outlined by a thin light halo so the black flow still reads on the dark ground and every flow reads on the
// green, purple and red zone floors. Every flow has its own pattern (FLOW_PATTERNS: one chevron, a pair, a dashed band,
// a filled arrowhead), so the flows differ in shape as well as colour.
//
// Built with real RGB in the transparent texels (a canvas stores premultiplied pixels and would leave black
// fringes under mip-mapped linear filtering).
import * as THREE from 'three';
import { FLOW_RIBBON, type FlowPattern } from '../../data/flows';

/** Distance between two repeats of the pattern along a ribbon, ft. */
export const FLOW_REPEAT = 1.4;

const TEX_U = 512;
const TEX_V = 128;

const HALO_RGB = [251, 243, 226] as const;
const HALO_ALPHA = 0.9;
const HALO_WIDTH = 0.035;
/** Half width of the coloured band; the rest of the ribbon is halo and a gap to the neighbouring lane. */
const BAND_HALF = FLOW_RIBBON.width / 2 - HALO_WIDTH - 0.015;
const MARK_RGB = [255, 250, 240] as const;
/** Half stroke of a chevron, ft. */
const CHEVRON_STROKE = 0.055;

type Point = readonly [number, number];
/** Signed distance in ft to a shape at (u, v), u along the ribbon and v across it; negative inside. */
type Sdf = (u: number, v: number) => number;

/** Distance from (u, v) to an open polyline. */
function polylineDistance(u: number, v: number, line: readonly Point[]): number {
  let d = Infinity;
  for (let i = 1; i < line.length; i++) {
    const [ax, az] = line[i - 1], [bx, bz] = line[i];
    const ex = bx - ax, ez = bz - az;
    const t = Math.max(0, Math.min(1, ((u - ax) * ex + (v - az) * ez) / (ex * ex + ez * ez)));
    d = Math.min(d, Math.hypot(u - ax - t * ex, v - az - t * ez));
  }
  return d;
}

/** A chevron pointing towards +u (wing half-length `wing` across, `depth` back from the tip), centred at `at`. */
function chevron(at: number, wing: number, depth: number, tip: number): Sdf {
  const line: Point[] = [[at - depth, wing], [at + tip, 0], [at - depth, -wing]];
  return (u, v) => polylineDistance(u, v, line) - CHEVRON_STROKE;
}

/** A filled triangle (convex polygon): the largest of the signed distances to its edge lines. */
function triangle(a: Point, b: Point, c: Point): Sdf {
  const pts = [a, b, c];
  const turn = Math.sign((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]));
  const edges = pts.map((p, i) => {
    const q = pts[(i + 1) % 3];
    const ex = q[0] - p[0], ez = q[1] - p[1], l = Math.hypot(ex, ez);
    return { p, nx: (ez / l) * turn, nz: (-ex / l) * turn };
  });
  return (u, v) => {
    let d = -Infinity;
    for (const e of edges) d = Math.max(d, (u - e.p[0]) * e.nx + (v - e.p[1]) * e.nz);
    return d;
  };
}

const union = (a: Sdf, b: Sdf): Sdf => (u, v) => Math.min(a(u, v), b(u, v));

/** An unbroken band across the full repeat. */
const solidBand: Sdf = (_u, v) => Math.abs(v) - BAND_HALF;

/** One rounded dash per repeat, with a gap before the next. */
const DASH_HALF = 0.48;
const DASH_CORNER = 0.12;
const dashBand: Sdf = (u, v) => {
  const qx = Math.abs(u) - (DASH_HALF - DASH_CORNER), qy = Math.abs(v) - (BAND_HALF - DASH_CORNER);
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - DASH_CORNER;
};

const PATTERNS: Record<FlowPattern, { band: Sdf; mark: Sdf }> = {
  single: { band: solidBand, mark: chevron(0, 0.19, 0.16, 0.12) },
  double: { band: solidBand, mark: union(chevron(-0.19, 0.17, 0.1, 0.1), chevron(0.19, 0.17, 0.1, 0.1)) },
  dashed: { band: dashBand, mark: chevron(0, 0.17, 0.14, 0.12) },
  solid: { band: solidBand, mark: triangle([-0.17, 0.2], [0.2, 0], [-0.17, -0.2]) },
};

const hexToRgb = (hex: string): [number, number, number] => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

/** Repeating strip in the flow's colour; u runs along the ribbon (marks point towards +u), v across it. */
export function flowTexture(color: string, pattern: FlowPattern): THREE.DataTexture {
  const ink = hexToRgb(color);
  const data = new Uint8Array(TEX_U * TEX_V * 4);
  const texel = FLOW_REPEAT / TEX_U; // ft
  /** Anti-aliased coverage from a signed distance (negative inside). */
  const cover = (signed: number) => Math.max(0, Math.min(1, 0.5 - signed / texel));
  const { band: bandOf, mark: markOf } = PATTERNS[pattern];

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
      const band = bandOf(u, v);
      const mark = markOf(u, v);
      r = g = b = a = 0;
      over(HALO_RGB, HALO_ALPHA * cover(band - HALO_WIDTH));
      over(ink, cover(band));
      over(MARK_RGB, cover(mark) * cover(band + 0.02));
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
