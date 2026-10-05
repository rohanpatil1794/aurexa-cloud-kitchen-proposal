// Deterministic random numbers (mulberry32), so scatter, stock and planting look identical on every load.

function hashString(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 16777619);
  return h;
}

/** Random numbers in [0, 1) from a number or a string seed (item ids, for instance). */
export function rng(seed: number | string): () => number {
  let a = typeof seed === 'number' ? seed | 0 : hashString(seed);
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const between = (r: () => number, a: number, b: number) => a + (b - a) * r();
export const pick = <T>(r: () => number, list: readonly T[]): T => list[Math.floor(r() * list.length)];
