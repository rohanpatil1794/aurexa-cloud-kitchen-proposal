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

/**
 * The model on a stage is about min(free width, MODEL_ASPECT x free height) px wide (the 3/4 view is ~1.3x wider than tall,
 * see stageLayout heroFree). Under COMPACT_MODEL px the stage is compact: a narrow one (phone portrait) and a short one
 * (landscape phone, a squat window) both qualify. The labels and the north compass share this rule.
 */
const MODEL_ASPECT = 1.3;
const COMPACT_MODEL = 720;
export const isCompactStage = (freeWidth: number, freeHeight: number): boolean =>
  Math.min(freeWidth, MODEL_ASPECT * freeHeight) < COMPACT_MODEL;

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/**
 * Offsets a box may take, as [fraction of its width, boxes of its height], nearest first. Index 0 is "stay put".
 * (Sorted by an assumed 90 x 42 px box: only the order matters.)
 */
const CANDIDATES: readonly (readonly [number, number])[] = (() => {
  const list: [number, number][] = [];
  for (const fx of [0, 0.25, -0.25, 0.5, -0.5, 0.75, -0.75, 1, -1, 1.25, -1.25, 1.5, -1.5])
    for (const rows of [0, -0.5, 0.5, -1, 1, -1.5, 1.5, -2, 2, -2.5, 2.5, -3, 3, -4, 4, -5, 5]) list.push([fx, rows]);
  const cost = ([fx, rows]: [number, number]) => Math.hypot(fx * 90, rows * 42);
  return list.sort((a, b) => cost(a) - cost(b)); // stable: equal costs keep the order above (a fixed, history-free tie-break)
})();
/** Free space kept between neighbouring boxes, px. */
const GAP = 4;
/** Most keep-out rectangles (panels, cards, chips) a Declutter takes. */
export const MAX_OBSTACLES = 16;

/**
 * Places label boxes on screen so none overlap. Boxes are visited in priority order; each takes its
 * anchor position if that is free, otherwise the nearest free spot from a list of offsets
 * (stacked above / below, then shifted sideways, further out as needed). A box with no free spot is left unplaced.
 * Keep-out rectangles (the UI over the stage) count as boxes placed first; keep-out points (each room's floor-centre click
 * target) are avoided by every box but the room's own.
 *
 * The result is a pure function of the inputs: nothing from earlier frames is remembered (no "stay where you were"
 * preference), so one camera pose always gives one layout, however the camera got there. Smoothing is the caller's job.
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

  /** Keep-out rectangles, px: x0, y0, x1, y1 each; fill the first `obstacleCount` before resolve(). */
  readonly obstacles = new Float32Array(MAX_OBSTACLES * 4);
  obstacleCount = 0;

  /** Keep-out points, px: the click target of box j (its room's floor centre). No box but j may cover it; `keepOn[j]` = it exists this frame. */
  readonly keepX: Float32Array;
  readonly keepY: Float32Array;
  readonly keepOn: Uint8Array;
  /** Half-size (px) of the square kept clear around each point. */
  keepHalf = 10;

  /** Boxes are kept inside this rectangle, px (the part of the screen no UI covers). */
  minX = 0;
  minY = 0;
  maxX = Infinity;
  maxY = Infinity;

  private readonly n: number;
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
    this.keepX = new Float32Array(n);
    this.keepY = new Float32Array(n);
    this.keepOn = new Uint8Array(n);
    this.n = n;
    this.px = new Float32Array(n + MAX_OBSTACLES);
    this.py = new Float32Array(n + MAX_OBSTACLES);
    this.phw = new Float32Array(n + MAX_OBSTACLES);
    this.phh = new Float32Array(n + MAX_OBSTACLES);
  }

  /** `order` lists the first `count` box indices to visit, highest priority first. */
  resolve(order: ArrayLike<number>, count: number): void {
    this.count = 0;
    for (let o = 0; o < this.obstacleCount; o++) {
      const x0 = this.obstacles[o * 4], y0 = this.obstacles[o * 4 + 1], x1 = this.obstacles[o * 4 + 2], y1 = this.obstacles[o * 4 + 3];
      const m = this.count++;
      this.px[m] = (x0 + x1) / 2;
      this.py[m] = (y0 + y1) / 2;
      this.phw[m] = (x1 - x0) / 2 + GAP / 2;
      this.phh[m] = (y1 - y0) / 2 + GAP / 2;
    }
    for (let k = 0; k < count; k++) {
      const i = order[k];
      this.dx[i] = 0;
      this.dy[i] = 0;
      this.placed[i] = 0;
      if (!this.active[i]) continue;
      for (let c = 0; c < CANDIDATES.length; c++) if (this.tryPlace(i, c)) break;
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
    for (let j = 0; j < this.n; j++) {
      if (j !== i && this.keepOn[j] && Math.abs(cx - this.keepX[j]) < hw + this.keepHalf && Math.abs(cy - this.keepY[j]) < hh + this.keepHalf) return false;
    }
    const m = this.count++;
    this.px[m] = cx;
    this.py[m] = cy;
    this.phw[m] = hw;
    this.phh[m] = hh;
    this.dx[i] = cx - this.x[i];
    this.dy[i] = cy - this.y[i];
    this.placed[i] = 1;
    return true;
  }
}
