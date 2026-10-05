// Kind registry: maps EquipItem.kind -> a builder that draws the item with primitives.
//
// A kind builder receives the PrimBuilder, already inside a frame whose origin is the CENTRE of the
// item's footprint on the floor (y = 0), rotated by item.rot. Local +x = item right, +z = item front.
// Use item.w / item.d (footprint) and item.h (height hint) to size the parts. See lib/prims.ts.
import type { EquipItem } from '../../data/types';
import type { PrimBuilder } from '../../lib/prims';

export type KindBuilder = (b: PrimBuilder, item: EquipItem) => void;

const kinds = new Map<string, KindBuilder>();

export function registerKinds(map: Record<string, KindBuilder>): void {
  for (const [k, fn] of Object.entries(map)) {
    if (import.meta.env.DEV && kinds.has(k)) console.warn(`[equipment] kind "${k}" registered twice`);
    kinds.set(k, fn);
  }
}

export function getKind(kind: string): KindBuilder | undefined {
  return kinds.get(kind);
}

export function registeredKinds(): string[] {
  return [...kinds.keys()];
}

/** Build every item into one PrimBuilder (frames at the item centre, rotated by item.rot). */
export function buildItems(b: PrimBuilder, items: EquipItem[]): void {
  for (const it of items) {
    const fn = kinds.get(it.kind);
    if (!fn) {
      if (import.meta.env.DEV) console.warn(`[equipment] no builder for kind "${it.kind}" (item ${it.id})`);
      continue;
    }
    b.frame({ x: it.x + it.w / 2, z: it.z + it.d / 2, ry: it.rot ?? 0 }, () => fn(b, it));
  }
}
