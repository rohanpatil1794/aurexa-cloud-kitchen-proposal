import { WALL } from '../data/layout';

/**
 * Shared, mutable, per-frame wall-height state. NOT React state (no re-renders).
 * Owned (written) by scene/building/Walls.tsx once per frame; everyone else only reads it
 * inside their own useFrame.
 *   h = current animated wall height in ft (3.5 dollhouse → 10 full)
 *   t = 0 (dollhouse) … 1 (full height)
 */
export const wallAnim = {
  h: WALL.dollhouse as number,
  t: 0,
};
