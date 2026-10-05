// Primitive batcher.
//
// Equipment and room dressing are described as lists of simple primitives (box / cylinder / cone /
// sphere) by *kind builder* functions. `buildBatch()` turns the whole list into a handful of
// InstancedMeshes (one per geometry × material class), with per-instance colour. A whole kitchen
// plus every room's dressing is therefore only ~15–25 draw calls.
//
// Conventions (local frame inside `frame()`):
//   origin = centre of the item's footprint, on the floor (y = 0). +x = item's right, +z = item's front.
//   Angles are DEGREES. ry > 0 turns the item counter-clockwise seen from above (front +z → east at 90).
//   box / cyl / cone:  x,z = centre of the footprint,  y = BOTTOM of the part,  h = height.
//   sph:               x,y,z = CENTRE of the sphere.
//   rx / ry / rz rotate the part about its own centre.
import * as THREE from 'three';
import type { Vec3 } from '../data/types';

export type PrimGeo = 'box' | 'cyl' | 'cone' | 'sph';
/**
 * steel    = brushed stainless / metals (high metalness)
 * matte    = paint, plastic, wood, fabric, foliage, concrete
 * gloss    = ceramic, marble, glazed tile, enamel bins
 * glass    = translucent glass (not a shadow caster)
 * emissive = unlit "light" colour for lamp panels, screens, LEDs (colour can be pushed above 1 for glow)
 * brass    = polished brass pipework and knobs
 */
export type PrimMat = 'steel' | 'matte' | 'gloss' | 'glass' | 'emissive' | 'brass';
type Col = THREE.ColorRepresentation;

interface Base {
  m?: PrimMat;
  c?: Col;
  x?: number;
  y?: number;
  z?: number;
  rx?: number;
  ry?: number;
  rz?: number;
  /** false = does not cast a shadow (small details). Default true (glass/emissive never cast). */
  shadow?: boolean;
}

interface PrimRec {
  geo: PrimGeo;
  mat: PrimMat;
  color: THREE.Color;
  matrix: THREE.Matrix4;
  shadow: boolean;
}

export interface SignOpts {
  text: string;
  /** Centre of the sign plane in the current frame. */
  x?: number;
  y?: number;
  z?: number;
  /** Plane size in ft. */
  w: number;
  h: number;
  rx?: number;
  ry?: number;
  rz?: number;
  fg?: string;
  /** null/undefined = transparent background */
  bg?: string | null;
  /** Unlit + not tone-mapped, reads as a lit sign/screen. */
  emissive?: boolean;
  /** Visible from both sides. Default false. */
  double?: boolean;
  weight?: number;
  /** letter-spacing in em */
  tracking?: number;
  /** Small second line, drawn under the text (e.g. "FIVE STAGES"). */
  sub?: string;
}

export interface SignRec extends SignOpts {
  /** Full world matrix (frame × local). */
  matrix: THREE.Matrix4;
}

const DEG = Math.PI / 180;
const UP = new THREE.Vector3(0, 1, 0);

const GEO: Record<PrimGeo, THREE.BufferGeometry> = {
  box: new THREE.BoxGeometry(1, 1, 1),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 20, 1),
  cone: new THREE.ConeGeometry(1, 1, 20, 1),
  sph: new THREE.SphereGeometry(1, 16, 10),
};

const MAT: Record<PrimMat, THREE.Material> = {
  steel: new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.85, roughness: 0.36 }),
  matte: new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0, roughness: 0.82 }),
  gloss: new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.05, roughness: 0.26 }),
  glass: new THREE.MeshStandardMaterial({
    color: 0xffffff, metalness: 0, roughness: 0.06, transparent: true, opacity: 0.3, depthWrite: false,
  }),
  emissive: new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }),
  brass: new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 1, roughness: 0.32 }),
};

const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _v = new THREE.Vector3();
const _s = new THREE.Vector3();
const _a = new THREE.Vector3();
const _b = new THREE.Vector3();

export class PrimBuilder {
  readonly prims: PrimRec[] = [];
  readonly signs: SignRec[] = [];
  private stack: THREE.Matrix4[] = [new THREE.Matrix4()];

  private get top(): THREE.Matrix4 {
    return this.stack[this.stack.length - 1];
  }

  /** Run `fn` with a child frame at (x, y, z) rotated `ry` degrees about the vertical axis. */
  frame(o: { x?: number; y?: number; z?: number; ry?: number }, fn: () => void): void {
    const local = new THREE.Matrix4().compose(
      new THREE.Vector3(o.x ?? 0, o.y ?? 0, o.z ?? 0),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, (o.ry ?? 0) * DEG, 0)),
      new THREE.Vector3(1, 1, 1),
    );
    this.stack.push(new THREE.Matrix4().multiplyMatrices(this.top, local));
    try {
      fn();
    } finally {
      this.stack.pop();
    }
  }

  private add(geo: PrimGeo, o: Base, cx: number, cy: number, cz: number, sx: number, sy: number, sz: number): void {
    _e.set((o.rx ?? 0) * DEG, (o.ry ?? 0) * DEG, (o.rz ?? 0) * DEG, 'YXZ');
    const local = new THREE.Matrix4().compose(_v.set(cx, cy, cz), _q.setFromEuler(_e), _s.set(sx, sy, sz));
    const mat = o.m ?? 'matte';
    this.prims.push({
      geo,
      mat,
      color: new THREE.Color(o.c ?? '#ffffff'),
      matrix: new THREE.Matrix4().multiplyMatrices(this.top, local),
      shadow: (o.shadow ?? true) && mat !== 'glass' && mat !== 'emissive',
    });
  }

  box(o: Base & { w: number; h: number; d: number }): void {
    this.add('box', o, o.x ?? 0, (o.y ?? 0) + o.h / 2, o.z ?? 0, o.w, o.h, o.d);
  }

  /** Cylinder, radius r, height h, axis along local y. */
  cyl(o: Base & { r: number; h: number }): void {
    this.add('cyl', o, o.x ?? 0, (o.y ?? 0) + o.h / 2, o.z ?? 0, o.r, o.h, o.r);
  }

  /** Cone, base radius r, height h, apex up. */
  cone(o: Base & { r: number; h: number }): void {
    this.add('cone', o, o.x ?? 0, (o.y ?? 0) + o.h / 2, o.z ?? 0, o.r, o.h, o.r);
  }

  /** Sphere / ellipsoid. r = radius; sx/sy/sz optionally scale each axis (multipliers on r). */
  sph(o: Base & { r: number; sx?: number; sy?: number; sz?: number }): void {
    this.add('sph', o, o.x ?? 0, o.y ?? 0, o.z ?? 0, o.r * (o.sx ?? 1), o.r * (o.sy ?? 1), o.r * (o.sz ?? 1));
  }

  /** Straight round pipe / rod between two points (in the current frame). */
  pipe(o: { m?: PrimMat; c?: Col; a: Vec3; b: Vec3; r: number; shadow?: boolean }): void {
    _a.set(...o.a);
    _b.set(...o.b);
    const dir = _b.clone().sub(_a);
    const len = dir.length();
    if (len < 1e-6) return;
    dir.normalize();
    const mid = _a.clone().add(_b).multiplyScalar(0.5);
    const local = new THREE.Matrix4().compose(mid, new THREE.Quaternion().setFromUnitVectors(UP, dir), new THREE.Vector3(o.r, len, o.r));
    const mat = o.m ?? 'brass';
    this.prims.push({
      geo: 'cyl',
      mat,
      color: new THREE.Color(o.c ?? '#ffffff'),
      matrix: new THREE.Matrix4().multiplyMatrices(this.top, local),
      shadow: (o.shadow ?? false) && mat !== 'glass' && mat !== 'emissive',
    });
  }

  /** Flat text plane (canvas texture). Rendered by <Signs/>. Faces +z in the local frame by default. */
  sign(o: SignOpts): void {
    _e.set((o.rx ?? 0) * DEG, (o.ry ?? 0) * DEG, (o.rz ?? 0) * DEG, 'YXZ');
    const local = new THREE.Matrix4().compose(_v.set(o.x ?? 0, o.y ?? 0, o.z ?? 0), _q.setFromEuler(_e), _s.set(1, 1, 1));
    this.signs.push({ ...o, matrix: new THREE.Matrix4().multiplyMatrices(this.top, local) });
  }
}

/** Build one InstancedMesh per (geometry × material × shadow) from a builder. */
export function buildBatch(builder: PrimBuilder): THREE.Group {
  const group = new THREE.Group();
  group.name = 'prim-batch';
  const buckets = new Map<string, PrimRec[]>();
  for (const p of builder.prims) {
    const key = `${p.geo}|${p.mat}|${p.shadow ? 1 : 0}`;
    let list = buckets.get(key);
    if (!list) buckets.set(key, (list = []));
    list.push(p);
  }
  for (const [key, list] of buckets) {
    const [geo, mat, shadow] = key.split('|') as [PrimGeo, PrimMat, string];
    const mesh = new THREE.InstancedMesh(GEO[geo], MAT[mat], list.length);
    mesh.name = `inst-${geo}-${mat}`;
    for (let i = 0; i < list.length; i++) {
      mesh.setMatrixAt(i, list[i].matrix);
      mesh.setColorAt(i, list[i].color);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.castShadow = shadow === '1';
    mesh.receiveShadow = mat !== 'emissive' && mat !== 'glass';
    mesh.computeBoundingSphere();
    mesh.computeBoundingBox();
    // Decorative: never intercept pointer events (room hit-volumes handle picking).
    mesh.raycast = () => {};
    if (mat === 'glass') mesh.renderOrder = 2;
    group.add(mesh);
  }
  return group;
}

export function disposeBatch(group: THREE.Group): void {
  group.traverse((o) => {
    if ((o as THREE.InstancedMesh).isInstancedMesh) (o as THREE.InstancedMesh).dispose();
  });
}

/** Shared geometries / materials, for components that need one-off meshes in the same look. */
export const SHARED = { geo: GEO, mat: MAT };
