// Procedural floor textures (canvas, generated once, never fetched).
//
// Each texture is a near-white *detail* map (joints, grain, mottling) that multiplies the per-vertex
// floor colour, so the same pattern serves any tint. UVs are world-aligned (u = x / span, v = z / span),
// so tile size is constant in feet across rooms and joints line up where neighbouring rooms meet.
import * as THREE from 'three';
import type { FloorKind } from '../data/types';

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

const SIZE = 512;

// Deterministic PRNG so the pattern is identical on every load.
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const grey = (v: number, warm = 0) => {
  const c = Math.max(0, Math.min(255, Math.round(v * 255)));
  return `rgb(${c},${Math.round(c * (1 - warm * 0.03))},${Math.round(c * (1 - warm * 0.08))})`;
};

/** Per-pixel noise added on top of what is already drawn (tiles perfectly: no spatial correlation). */
function speckle(ctx: CanvasRenderingContext2D, rand: () => number, amount: number) {
  const img = ctx.getImageData(0, 0, SIZE, SIZE);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (rand() - 0.5) * 2 * amount;
    d[i] += n; d[i + 1] += n; d[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
}

/** Soft round blotch drawn with wrap-around, so mottling tiles seamlessly. */
function blotch(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, rgba: string) {
  for (const ox of [-SIZE, 0, SIZE]) {
    for (const oy of [-SIZE, 0, SIZE]) {
      const cx = x + ox, cy = y + oy;
      if (cx + r < 0 || cx - r > SIZE || cy + r < 0 || cy - r > SIZE) continue;
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      g.addColorStop(0, rgba);
      g.addColorStop(1, rgba.replace(/[\d.]+\)$/, '0)'));
      ctx.fillStyle = g;
      ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    }
  }
}

function mottle(ctx: CanvasRenderingContext2D, rand: () => number, count: number, rMin: number, rMax: number, alpha: number) {
  for (let i = 0; i < count; i++) {
    const dark = rand() < 0.5;
    blotch(ctx, rand() * SIZE, rand() * SIZE, rMin + rand() * (rMax - rMin), `rgba(${dark ? '40,30,20' : '255,255,255'},${(alpha * (0.4 + rand() * 0.6)).toFixed(3)})`);
  }
}

/** Random piece lengths in [min, max] that sum to exactly `total` (so rows tile seamlessly). */
function partition(total: number, min: number, max: number, rand: () => number): number[] {
  const out: number[] = [];
  let left = total;
  while (left > 0) {
    let len = min + rand() * (max - min);
    if (left - len < min) len = left;
    out.push(len);
    left -= len;
  }
  return out;
}

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h);
  ctx.fill();
}

type Painter = (ctx: CanvasRenderingContext2D, rand: () => number) => void;

/** Quarry tile: 1 ft tiles (4 x 4 per repeat), each with its own warmth and lightness, dark grout. */
const quarry: Painter = (ctx, rand) => {
  const n = 4, t = SIZE / n, grout = 5;
  ctx.fillStyle = grey(0.62, 1);
  ctx.fillRect(0, 0, SIZE, SIZE);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const v = 0.9 + rand() * 0.1;
    const g = ctx.createLinearGradient(i * t, j * t, (i + 1) * t, (j + 1) * t);
    g.addColorStop(0, grey(v + 0.03, 1));
    g.addColorStop(1, grey(v - 0.05, 1));
    ctx.fillStyle = g;
    ctx.fillRect(i * t + grout / 2, j * t + grout / 2, t - grout, t - grout);
  }
  mottle(ctx, rand, 40, 18, 60, 0.07);
  speckle(ctx, rand, 9);
};

/** Brushed steel: long horizontal streaks and a 4 ft panel seam. */
const steel: Painter = (ctx, rand) => {
  ctx.fillStyle = grey(0.9);
  ctx.fillRect(0, 0, SIZE, SIZE);
  for (let i = 0; i < 700; i++) {
    const y = rand() * SIZE, x = rand() * SIZE, len = 40 + rand() * 260;
    ctx.strokeStyle = rand() < 0.5 ? `rgba(255,255,255,${0.05 + rand() * 0.12})` : `rgba(40,55,70,${0.03 + rand() * 0.08})`;
    ctx.lineWidth = 0.6 + rand() * 1.2;
    for (const ox of [0, -SIZE]) {
      ctx.beginPath();
      ctx.moveTo(x + ox, y);
      ctx.lineTo(x + ox + len, y);
      ctx.stroke();
    }
  }
  ctx.fillStyle = grey(0.62);
  for (const p of [0, SIZE / 2, SIZE]) {
    ctx.fillRect(p - 1.5, 0, 3, SIZE);
    ctx.fillRect(0, p - 1.5, SIZE, 3);
  }
  speckle(ctx, rand, 5);
};

/** Concrete: soft mottling, fine pores, saw-cut control joints every 5 ft. */
const concrete: Painter = (ctx, rand) => {
  ctx.fillStyle = grey(0.93);
  ctx.fillRect(0, 0, SIZE, SIZE);
  mottle(ctx, rand, 70, 30, 110, 0.09);
  for (let i = 0; i < 260; i++) blotch(ctx, rand() * SIZE, rand() * SIZE, 1.5 + rand() * 2.5, `rgba(60,60,60,${0.1 + rand() * 0.15})`);
  ctx.fillStyle = grey(0.72);
  for (const p of [0, SIZE / 2, SIZE]) {
    ctx.fillRect(p - 1.5, 0, 3, SIZE);
    ctx.fillRect(0, p - 1.5, SIZE, 3);
  }
  speckle(ctx, rand, 8);
};

/** Polished cream: 2 ft large-format tiles with hairline joints and a faint cloudy veil. */
const cream: Painter = (ctx, rand) => {
  ctx.fillStyle = grey(0.97, 0.4);
  ctx.fillRect(0, 0, SIZE, SIZE);
  mottle(ctx, rand, 26, 40, 130, 0.045);
  ctx.fillStyle = grey(0.8, 0.8);
  for (const p of [0, SIZE / 2, SIZE]) {
    ctx.fillRect(p - 1, 0, 2, SIZE);
    ctx.fillRect(0, p - 1, SIZE, 2);
  }
  speckle(ctx, rand, 4);
};

/** Timber: 0.5 ft boards with staggered end joints, per-board colour, fine grain. */
const timber: Painter = (ctx, rand) => {
  const rows = 8, h = SIZE / rows;
  ctx.fillStyle = grey(0.45, 1);
  ctx.fillRect(0, 0, SIZE, SIZE);
  for (let r = 0; r < rows; r++) {
    let x = 0;
    for (const len of partition(SIZE, 110, 260, rand)) {
      ctx.fillStyle = grey(0.8 + rand() * 0.2, 1);
      ctx.fillRect(x + 1.5, r * h + 1.5, len - 3, h - 3);
      for (let k = 0; k < 14; k++) {
        ctx.strokeStyle = rand() < 0.5 ? `rgba(60,30,10,${0.05 + rand() * 0.08})` : `rgba(255,235,200,${0.04 + rand() * 0.06})`;
        ctx.lineWidth = 0.8 + rand();
        const gy = r * h + 3 + rand() * (h - 6);
        ctx.beginPath();
        ctx.moveTo(x + 2, gy);
        ctx.lineTo(x + len - 2, gy + (rand() - 0.5) * 3);
        ctx.stroke();
      }
      x += len;
    }
  }
  speckle(ctx, rand, 6);
};

/** Indoor garden floor: warm flagstone in running bond, olive-tinted pavers and moss in the joints. */
const garden: Painter = (ctx, rand) => {
  ctx.fillStyle = grey(0.5, 1);
  ctx.fillRect(0, 0, SIZE, SIZE);
  let y = 0;
  for (const h of partition(SIZE, 70, 96, rand)) {
    let x = 0;
    for (const w of partition(SIZE, 90, 190, rand)) {
      const olive = rand() < 0.28;
      const v = 0.82 + rand() * 0.16;
      ctx.fillStyle = olive ? `rgb(${Math.round(v * 232)},${Math.round(v * 245)},${Math.round(v * 200)})` : grey(v, 1);
      roundedRect(ctx, x + 3, y + 3, w - 6, h - 6, 6);
      x += w;
    }
    y += h;
  }
  for (let i = 0; i < 90; i++) blotch(ctx, rand() * SIZE, rand() * SIZE, 3 + rand() * 7, `rgba(96,120,48,${0.08 + rand() * 0.12})`);
  mottle(ctx, rand, 20, 20, 70, 0.06);
  speckle(ctx, rand, 10);
};

const PAINTERS: Record<FloorMaterialKind, { paint: Painter; seed: number }> = {
  quarry: { paint: quarry, seed: 11 },
  steel: { paint: steel, seed: 23 },
  concrete: { paint: concrete, seed: 37 },
  cream: { paint: cream, seed: 41 },
  timber: { paint: timber, seed: 53 },
  garden: { paint: garden, seed: 67 },
  circulation: { paint: cream, seed: 79 },
};

const cache = new Map<FloorMaterialKind, THREE.CanvasTexture>();

export function floorTexture(kind: FloorMaterialKind): THREE.CanvasTexture {
  let tex = cache.get(kind);
  if (tex) return tex;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = SIZE;
  const ctx = canvas.getContext('2d')!;
  const { paint, seed } = PAINTERS[kind];
  paint(ctx, rng(seed));
  tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  cache.set(kind, tex);
  return tex;
}
