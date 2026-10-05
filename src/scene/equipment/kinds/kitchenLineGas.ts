// Gas pipeline: the ring main around the kitchen (corridor side of the walls), the header behind the back
// line with a riser to every gas appliance, and the branches that cross the walls above the islands and drop
// onto them. Dull brass throughout, orange valve levers and wheels. Builders work in WORLD feet; `pipework`
// converts to the item frame (origin = footprint centre on the floor).
import { GAS_RING as G, OPENINGS } from '../../../data/layout';
import type { EquipItem, Vec3 } from '../../../data/types';
import { GAS_FEEDS, GAS_ISLAND_DROPS as ISLAND, GAS_RISERS, HEADER_Z, type GasDrop } from '../../../data/equipment/kitchenLine';
import type { PrimBuilder } from '../../../lib/prims';
import type { KindBuilder } from '../registry';
import { KL } from './kitchenLineParts';

const R_MAIN = 0.17;
const R_BRANCH = 0.11;
const R_DROP = 0.07;
const CEILING = 10;
/** Height of the gas cocks on the line risers. */
const RISER_VALVE_Y = 4.7;

type Axis = 'x' | 'y' | 'z';

/** The Safety layer hangs the emergency shut-off riser on the ring's west run just south of the kitchen west door. */
const SHUTOFF_Z = (() => {
  const door = OPENINGS.find((o) => o.id === 'kitchen-W22')!;
  return door.c + door.w / 2 + 1.4;
})();

function pipework(b: PrimBuilder, it: EquipItem) {
  const cx = it.x + it.w / 2;
  const cz = it.z + it.d / 2;
  const p = (v: Vec3): Vec3 => [v[0] - cx, v[1], v[2] - cz];
  const along = (v: Vec3, axis: Axis, d: number): Vec3 => [v[0] + (axis === 'x' ? d : 0), v[1] + (axis === 'y' ? d : 0), v[2] + (axis === 'z' ? d : 0)];

  return {
    local: p,
    run(a: Vec3, c: Vec3, r: number) {
      b.pipe({ m: 'brass', c: KL.brass, a: p(a), b: p(c), r });
    },
    /** Elbow or tee: a brass ball over the junction. */
    joint(at: Vec3, r: number) {
      const [x, y, z] = p(at);
      b.sph({ m: 'brass', c: KL.brass, x, y, z, r, shadow: false });
    },
    /** Flanged union: a short fat collar on a straight run. */
    union(at: Vec3, axis: Axis, r: number) {
      b.pipe({ m: 'brass', c: '#8a6d3f', a: p(along(at, axis, -0.11)), b: p(along(at, axis, 0.11)), r });
    },
    /** Quarter-turn gas cock on a vertical pipe: ball body with an orange lever. */
    cock(at: Vec3, r: number) {
      this.joint(at, r * 1.7);
      b.pipe({ m: 'matte', c: KL.orange, a: p(along(at, 'x', -0.2)), b: p(along(at, 'x', 0.2)), r: 0.03 });
    },
    /** Wheel valve on a horizontal run along `axis`: body, stem and a flat orange wheel. */
    wheelValve(at: Vec3, axis: 'x' | 'z', r: number) {
      const [x, y, z] = p(at);
      b.pipe({ m: 'brass', c: KL.brass, a: p(along(at, axis, -r * 1.8)), b: p(along(at, axis, r * 1.8)), r: r * 1.5 });
      b.pipe({ m: 'brass', c: KL.brass, a: [x, y, z], b: [x, y + r * 3.4, z], r: 0.04 });
      b.cyl({ m: 'matte', c: KL.orange, x, y: y + r * 3.4, z, r: r * 1.8, h: 0.05, shadow: false });
      b.sph({ m: 'brass', c: KL.brass, x, y: y + r * 3.4 + 0.05, z, r: 0.06, shadow: false });
    },
    /** Rod from the ring up to the ceiling slab. */
    hanger(at: Vec3) {
      const [x, y, z] = p(at);
      b.pipe({ m: 'steel', c: KL.top, a: [x, y + R_MAIN, z], b: [x, CEILING, z], r: 0.03 });
      b.cyl({ m: 'steel', c: KL.top, x, y: y + R_MAIN - 0.03, z, r: 0.07, h: 0.08, shadow: false });
    },
    /** Burner connection: branch drop with tee, cock, union and a flared nozzle just above the appliance. */
    drop({ x, z, end }: GasDrop) {
      const top: Vec3 = [x, G.y, z];
      this.joint(top, R_BRANCH * 1.2);
      this.run(top, [x, end, z], R_DROP);
      this.cock([x, end + 1.2, z], R_DROP);
      this.union([x, end + 0.35, z], 'y', R_DROP * 1.55);
      const [nx, , nz] = p(top);
      b.cone({ m: 'brass', c: KL.brass, x: nx, y: end - 0.15, z: nz, r: 0.13, h: 0.16, shadow: false });
    },
  };
}

/** Per ring run (north, east, south, west): where the sectional wheel valve and the two unions sit, as fractions of its length. */
const RUN_FEATURES: [number, number[]][] = [[0.4, [0.27, 0.74]], [0.62, [0.2, 0.8]], [0.62, [0.2, 0.85]], [0.3, [0.12, 0.85]]];

/** Ring main at 9 ft: four runs, elbows, unions, ceiling hangers, sectional valves, supply riser and regulator. */
const ring: KindBuilder = (b, it) => {
  const g = pipework(b, it);
  const y = G.y;
  const corners: Vec3[] = [[G.west, y, G.north], [G.east, y, G.north], [G.east, y, G.south], [G.west, y, G.south]];
  const tees: Vec3[] = [
    ...GAS_FEEDS.map((x): Vec3 => [x, y, G.north]),
    [G.west, y, ISLAND.z], [G.east, y, ISLAND.z], ...ISLAND.south.map((d): Vec3 => [d.x, y, G.south]),
  ];

  corners.forEach((a, i) => {
    const c = corners[(i + 1) % 4];
    const axis = i % 2 === 0 ? 'x' : 'z';
    const len = Math.hypot(c[0] - a[0], c[2] - a[2]);
    const at = (s: number): Vec3 => [a[0] + ((c[0] - a[0]) * s) / len, y, a[2] + ((c[2] - a[2]) * s) / len];
    g.run(a, c, R_MAIN);
    g.joint(a, R_MAIN * 1.25);

    // features along the run, as distances from its start
    const [valveT, unionsT] = RUN_FEATURES[i];
    const valveAt = len * valveT;
    const unionsAt = unionsT.map((t) => len * t);
    const teesAt = tees
      .filter((t) => (axis === 'x' ? Math.abs(t[2] - a[2]) : Math.abs(t[0] - a[0])) < 1e-6)
      .map((t) => Math.hypot(t[0] - a[0], t[2] - a[2]));
    if (axis === 'z' && a[0] === G.west) teesAt.push(Math.abs(SHUTOFF_Z - a[2]));
    g.wheelValve(at(valveAt), axis, 0.2);
    for (const s of unionsAt) g.union(at(s), axis, R_MAIN * 1.45);
    const taken = [valveAt, ...unionsAt, ...teesAt];
    for (let s = 3.5; s < len; s += 7) if (taken.every((t) => Math.abs(t - s) > 1)) g.hanger(at(s));
  });
  for (const t of tees) g.joint(t, R_MAIN * 1.2);

  // supply riser at the south-west corner: regulator with gauge, flange at the ceiling slab
  const sw: Vec3 = [G.west, y, G.south];
  g.run(sw, [G.west, CEILING + 0.15, G.south], R_MAIN);
  const [x, , z] = g.local(sw);
  b.cyl({ m: 'brass', c: KL.brass, x, y: y + 0.3, z, r: 0.3, h: 0.42 });
  b.sph({ m: 'matte', c: KL.orange, x, y: y + 0.72, z, r: 0.2, sy: 0.6, shadow: false });
  b.cyl({ m: 'steel', c: KL.top, x, y: CEILING - 0.12, z, r: 0.36, h: 0.1, shadow: false });
  b.cyl({ m: 'matte', c: KL.dark, x: x + 0.38, y: y + 0.52 - 0.02, z, r: 0.14, h: 0.05, rz: 90, shadow: false });
  b.cyl({ m: 'matte', c: '#f2f0e8', x: x + 0.41, y: y + 0.52 - 0.02, z, r: 0.11, h: 0.03, rz: 90, shadow: false });
};

/** Header inside the kitchen behind the back line, fed from the ring through the north wall; a riser per appliance. */
const header: KindBuilder = (b, it) => {
  const g = pipework(b, it);
  const y = G.y;
  const xs = GAS_RISERS.map((r) => r.x);
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs);
  g.run([x0, y, HEADER_Z], [x1, y, HEADER_Z], R_BRANCH);
  g.joint([x0, y, HEADER_Z], R_BRANCH * 1.2);
  g.joint([x1, y, HEADER_Z], R_BRANCH * 1.2);
  for (const x of GAS_FEEDS) {
    g.run([x, y, G.north], [x, y, HEADER_Z], R_BRANCH);
    g.joint([x, y, HEADER_Z], R_BRANCH * 1.2);
  }
  for (const r of GAS_RISERS) {
    g.joint([r.x, y, HEADER_Z], R_BRANCH * 1.1);
    g.run([r.x, y, HEADER_Z], [r.x, r.y, HEADER_Z], R_DROP);
    g.cock([r.x, RISER_VALVE_Y, HEADER_Z], R_DROP);
    g.joint([r.x, r.y, HEADER_Z], R_DROP * 1.5);
    g.run([r.x, r.y, HEADER_Z], [r.x, r.y, r.z], R_DROP);
    g.union([r.x, r.y, (HEADER_Z + r.z) / 2], 'z', R_DROP * 1.5);
  }
};

/** Branches from the west / east / south ring runs, across the walls at 9 ft, with a drop to each island appliance. */
const islands: KindBuilder = (b, it) => {
  const g = pipework(b, it);
  const y = G.y;
  /** Header along the island line from a ring run to the farthest drop, plus a cross branch for drops off that line. */
  const branch = (from: number, drops: GasDrop[], far: number) => {
    g.run([from, y, ISLAND.z], [far, y, ISLAND.z], R_BRANCH);
    for (const d of drops) {
      if (d.z !== ISLAND.z) {
        g.run([d.x, y, ISLAND.z], [d.x, y, d.z], R_BRANCH);
        g.joint([d.x, y, ISLAND.z], R_BRANCH * 1.2);
      }
      g.drop(d);
    }
  };
  branch(G.west, ISLAND.west, Math.max(...ISLAND.west.map((d) => d.x)));
  branch(G.east, ISLAND.east, Math.min(...ISLAND.east.map((d) => d.x)));
  for (const d of ISLAND.south) {
    g.run([d.x, y, G.south], [d.x, y, d.z], R_BRANCH);
    g.drop(d);
  }
};

export const GAS_KINDS: Record<string, KindBuilder> = {
  'kitchenLine.gasRing': ring,
  'kitchenLine.gasHeader': header,
  'kitchenLine.gasIslands': islands,
};
