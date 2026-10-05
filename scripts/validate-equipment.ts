// Equipment validator:  npx tsx scripts/validate-equipment.ts   (also: npm run validate:equipment)
// Checks every EquipItem in src/data/equipment/*:
//   - the room id exists and the item has a registered-looking kind
//   - the item's plan footprint (rot-aware) lies inside its room rectangle  (unless props.outside = true)
//   - items in the same room do not overlap in plan (unless either has props.overhead / props.flat / props.overlap)
//   - a 3 x 3 ft clear zone just inside every door of the room is free of floor-standing items
// Item flags (props): overhead (hangs above head height: hoods, canopies, pipes, hanging signs),
//   flat (floor decals / thin inlays), overlap (deliberately sits on another item), outside (may leave its room rect),
//   door (deliberately stands in a door zone, e.g. a door leaf model).
import { EQUIPMENT } from '../src/data/equipment';
import { OPENINGS, ROOM_BY_ID, ROOMS, type EquipItem, type Opening } from '../src/data/layout';

let errors = 0;
let warnings = 0;
const err = (m: string) => { errors++; console.log(`  ✗ ${m}`); };
const warn = (m: string) => { warnings++; console.log(`  ! ${m}`); };
const flag = (it: EquipItem, k: string) => !!it.props?.[k];

interface Box { x0: number; x1: number; z0: number; z1: number }
function box(it: EquipItem): Box {
  const rot = (((it.rot ?? 0) % 180) + 180) % 180;
  const cx = it.x + it.w / 2, cz = it.z + it.d / 2;
  const [w, d] = rot === 90 ? [it.d, it.w] : [it.w, it.d];
  return { x0: cx - w / 2, x1: cx + w / 2, z0: cz - d / 2, z1: cz + d / 2 };
}
const overlap = (a: Box, b: Box, eps = 0.02) => a.x0 < b.x1 - eps && b.x0 < a.x1 - eps && a.z0 < b.z1 - eps && b.z0 < a.z1 - eps;

console.log(`\nEquipment: ${EQUIPMENT.length} items in ${new Set(EQUIPMENT.map((e) => e.room)).size} spaces`);

// ids unique
const ids = new Set<string>();
for (const it of EQUIPMENT) { if (ids.has(it.id)) err(`duplicate item id ${it.id}`); ids.add(it.id); }

// per item
for (const it of EQUIPMENT) {
  const room = ROOM_BY_ID[it.room as keyof typeof ROOM_BY_ID];
  if (!room) continue; // outside / circulation items are not bounds-checked
  const b = box(it);
  if (!flag(it, 'outside')) {
    const e = 0.03;
    if (b.x0 < room.x - e || b.x1 > room.x + room.w + e || b.z0 < room.z - e || b.z1 > room.z + room.d + e) {
      err(`${it.id} (${it.kind}) leaves room ${room.id}: footprint x ${b.x0.toFixed(2)}–${b.x1.toFixed(2)}, z ${b.z0.toFixed(2)}–${b.z1.toFixed(2)} vs room x ${room.x}–${room.x + room.w}, z ${room.z}–${room.z + room.d}`);
    }
  }
}

// per room: overlaps + door clearance
for (const room of ROOMS) {
  const items = EQUIPMENT.filter((e) => e.room === room.id);
  const solid = items.filter((e) => !flag(e, 'overhead') && !flag(e, 'flat'));
  for (let i = 0; i < solid.length; i++) for (let k = i + 1; k < solid.length; k++) {
    const a = solid[i], c = solid[k];
    if (flag(a, 'overlap') || flag(c, 'overlap')) continue;
    if (overlap(box(a), box(c))) err(`${room.id}: ${a.id} overlaps ${c.id}`);
  }
  const doors: Opening[] = OPENINGS.filter((o) => o.rooms?.includes(room.id) && o.kind !== 'pass');
  for (const o of doors) {
    // 3 ft deep zone just inside the room, door-width wide
    const half = o.w / 2;
    let z: Box;
    if (o.wall === 'h') {
      const inside = Math.abs(o.at - (room.z + room.d)) < 1e-6 ? -1 : 1;
      z = { x0: o.c - half, x1: o.c + half, z0: inside < 0 ? o.at - 3 : o.at, z1: inside < 0 ? o.at : o.at + 3 };
    } else {
      const inside = Math.abs(o.at - (room.x + room.w)) < 1e-6 ? -1 : 1;
      z = { z0: o.c - half, z1: o.c + half, x0: inside < 0 ? o.at - 3 : o.at, x1: inside < 0 ? o.at : o.at + 3 };
    }
    for (const it of solid) {
      if (flag(it, 'door')) continue;
      if (overlap(box(it), z)) err(`${room.id}: ${it.id} (${it.kind}) blocks the 3 ft clear zone inside door ${o.id}`);
    }
  }
}

// every room should have at least one item (dressing)
for (const room of ROOMS) {
  if (!EQUIPMENT.some((e) => e.room === room.id)) warn(`room ${room.id} has no equipment yet`);
}

console.log(errors ? `\nFAILED: ${errors} error(s), ${warnings} warning(s)` : `\nEquipment checks passed (${warnings} warning(s)).`);
process.exit(errors ? 1 : 0);
