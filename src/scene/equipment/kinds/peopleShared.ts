// Helpers shared by the people-space kind builders (garden, creator corner, rider lounge).
import type { EquipItem } from '../../../data/types';

/** Small deterministic PRNG, so planting and scatter look identical on every load. */
export function rng(seed: number): () => number {
  let s = Math.imul(seed | 0, 2654435761) >>> 0 || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export const between = (r: () => number, a: number, b: number) => a + (b - a) * r();
export const pick = <T>(r: () => number, list: readonly T[]): T => list[Math.floor(r() * list.length)];

/** Numeric item prop with a fallback. */
export const num = (it: EquipItem, key: string, fallback: number): number => {
  const v = it.props?.[key];
  return typeof v === 'number' ? v : fallback;
};

/** Warm glow colours for lamps (emissive material, unlit). */
export const GLOW = { warm: '#ffdca0', cream: '#fff1d2', orange: '#f0782f' } as const;
