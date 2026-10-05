// Pure helpers for the room labels: easing and screen-space overlap resolution. No React, no three.
import { MathUtils } from 'three';

/** Ease `v` towards `goal` (framerate-independent). `snap` jumps straight there (prefers-reduced-motion). */
export function easeTo(v: number, goal: number, rate: number, dt: number, snap = false): number {
  if (snap || Math.abs(goal - v) < 0.003) return goal;
  return MathUtils.damp(v, goal, rate, dt);
}

/**
 * True while the mouse is over a label pill. R3F reports "pointer left the canvas" a moment AFTER the pill's
 * pointerover, so RoomPicking checks this before clearing a hover the pill has just set.
 */
export const pillPointer = { over: false };

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/**
 * Offsets a box may take, as [fraction of its width, boxes of its height], nearest first. Index 0 is "stay put".
 * (Sorted by an assumed 80 x 30 px box: only the order matters.)
 */
const CANDIDATES: readonly (readonly [number, number])[] = (() => {
  const list: [number, number][] = [];
  for (const fx of [0, -0.6, 0.6, -1.2, 1.2]) for (let rows = -5; rows <= 5; rows++) list.push([fx, rows]);
  const cost = ([fx, rows]: [number, number]) => Math.hypot(fx * 80, rows * 34);
  return list.sort((a, b) => cost(a) - cost(b));
})();
/** Free space kept between neighbouring boxes, px. */
const GAP = 4;

/**
 * Places label boxes on screen so none overlap. Boxes are visited in priority order; each takes its
 * anchor position if that is free, otherwise the nearest free spot from a list of offsets
 * (stacked above / below, then shifted sideways, further out as needed). A box with no free spot is left unplaced.
 *
 * All storage is allocated once, so `resolve()` can run every frame.
 */
export class Declutter {
  /** Inputs, px: box centre at its anchor, and box size. */
  readonly x: Float32Array;
  readonly y: Float32Array;
  readonly w: Float32Array;
  readonly h: Float32Array;
  /** Input: 1 if the box takes part this frame. */
  readonly active: Uint8Array;
  /** Outputs: offset from the anchor in px, and whether a free spot was found (inactive boxes: 0). */
  readonly dx: Float32Array;
  readonly dy: Float32Array;
  readonly placed: Uint8Array;

  /** Boxes are kept inside this rectangle, px (the part of the screen no UI covers). */
  minX = 0;
  minY = 0;
  maxX = Infinity;
  maxY = Infinity;

  /** Candidate each box used last frame: tried again before the others so layouts do not flicker while orbiting. */
  private readonly last: Uint8Array;
  // Boxes placed so far this pass: centre and half size (padded by half the gap).
  private readonly px: Float32Array;
  private readonly py: Float32Array;
  private readonly phw: Float32Array;
  private readonly phh: Float32Array;
  private count = 0;

  constructor(n: number) {
    this.x = new Float32Array(n);
    this.y = new Float32Array(n);
    this.w = new Float32Array(n);
    this.h = new Float32Array(n);
    this.active = new Uint8Array(n);
    this.dx = new Float32Array(n);
    this.dy = new Float32Array(n);
    this.placed = new Uint8Array(n);
    this.last = new Uint8Array(n);
    this.px = new Float32Array(n);
    this.py = new Float32Array(n);
    this.phw = new Float32Array(n);
    this.phh = new Float32Array(n);
  }

  /** `order` lists the first `count` box indices to visit, highest priority first. */
  resolve(order: ArrayLike<number>, count: number): void {
    this.count = 0;
    for (let k = 0; k < count; k++) {
      const i = order[k];
      this.dx[i] = 0;
      this.dy[i] = 0;
      this.placed[i] = 0;
      if (!this.active[i]) continue;
      const prev = this.last[i];
      let ok = this.tryPlace(i, 0) || (prev > 0 && this.tryPlace(i, prev));
      for (let c = 1; !ok && c < CANDIDATES.length; c++) if (c !== prev) ok = this.tryPlace(i, c);
      if (!ok) this.last[i] = 0;
    }
  }

  private tryPlace(i: number, c: number): boolean {
    const hw = this.w[i] / 2 + GAP / 2;
    const hh = this.h[i] / 2 + GAP / 2;
    const cx = clamp(this.x[i] + CANDIDATES[c][0] * this.w[i], this.minX + hw, this.maxX - hw);
    const cy = clamp(this.y[i] + CANDIDATES[c][1] * (this.h[i] + GAP), this.minY + hh, this.maxY - hh);
    for (let j = 0; j < this.count; j++) {
      if (Math.abs(cx - this.px[j]) < hw + this.phw[j] && Math.abs(cy - this.py[j]) < hh + this.phh[j]) return false;
    }
    const m = this.count++;
    this.px[m] = cx;
    this.py[m] = cy;
    this.phw[m] = hw;
    this.phh[m] = hh;
    this.dx[i] = cx - this.x[i];
    this.dy[i] = cy - this.y[i];
    this.placed[i] = 1;
    this.last[i] = c;
    return true;
  }
}
