// Instanced meshes for the wall model (walls.ts), clipped to an animated wall height.
//
// One InstancedMesh per material class, all sharing one unit box. Every piece is clipped to the
// current height H: visible part = [y0, min(y1, H)], hidden (zero scale) if empty. Solid pieces get a
// teal cap that rides their visible top. `update(H)` rewrites the matrices in place (no allocation)
// and is only called while H is changing.
import * as THREE from 'three';
import { SCENE } from '../../lib/palette';
import { WALL_MODEL, WALL_STYLE } from './wallModel';
import type { Box } from './wallModel';

const UNIT = new THREE.BoxGeometry(1, 1, 1);
const MIN = 1e-3;
const CAP = WALL_STYLE.cap;
// Hairline-seam insurance. Adjacent solid boxes meet exactly (the model is disjoint), but the rasterised
// back-to-back end faces can peek through the crease as 1 px lines. Each body is grown by E in plan and
// buried EY into whatever sits on top of it; caps stand EC proud (so cap and body sides are never
// coplanar). The wall + cap materials also use a polygon offset: it pushes steep (edge-on) faces such as
// those buried end faces back much further than the flat faces beside them, which removes the seams.
const E = 0.001;
const EY = 0.002;
const EC = 0.0025;
const _c = new THREE.Color();
/**
 * The brand teal, a touch deeper: the cap's top face takes the full key + overhead fill, which would
 * wash #1d6866 out to a pale jade. Lit, the top reads as the brand teal and the 0.15 ft face a shade darker.
 */
const CAP_ALBEDO = new THREE.Color(SCENE.wallCap).multiplyScalar(0.62);

interface Slot { cx: number; cz: number; sx: number; sz: number; y0: number; y1: number; trim: boolean; inner: boolean }

const slotOf = (b: Box, trim = false, inner = false): Slot => ({
  cx: (b.x0 + b.x1) / 2, cz: (b.z0 + b.z1) / 2, sx: b.x1 - b.x0, sz: b.z1 - b.z0, y0: b.y0, y1: b.y1, trim, inner,
});

function put(a: Float32Array, i: number, cx: number, cy: number, cz: number, sx: number, sy: number, sz: number): void {
  const o = i * 16;
  a[o] = sx; a[o + 5] = sy; a[o + 10] = sz;
  a[o + 12] = cx; a[o + 13] = cy; a[o + 14] = cz; a[o + 15] = 1;
}
const hide = (a: Float32Array, i: number) => put(a, i, 0, 0, 0, 0, 0, 0);

/** Clipped piece: body ends one cap-height below the visible top when `trim` (a cap sits there instead). */
function putClipped(a: Float32Array, i: number, s: Slot, H: number): void {
  const vis = Math.min(s.y1, H) - s.y0;
  if (vis <= MIN) return hide(a, i);
  const h = s.trim ? vis - Math.min(CAP, vis) : vis;
  if (h <= MIN) return hide(a, i);
  put(a, i, s.cx, s.y0 + h / 2, s.cz, s.sx, h, s.sz);
}

function instanced(mat: THREE.Material, count: number, name: string): THREE.InstancedMesh {
  const m = new THREE.InstancedMesh(UNIT, mat, Math.max(1, count));
  m.name = name;
  m.count = count;
  m.frustumCulled = false; // matrices change with the wall height; the whole model is always roughly on screen anyway
  m.raycast = () => {}; // decorative: room hit-volumes handle picking
  return m;
}

export class WallRig {
  readonly group = new THREE.Group();
  /** Height the matrices were last written for. */
  height = NaN;

  private readonly mats: THREE.Material[] = [];
  private readonly meshes: THREE.InstancedMesh[] = [];
  private readonly body: THREE.InstancedMesh;
  private readonly cap: THREE.InstancedMesh;
  private readonly frames: THREE.InstancedMesh;
  private readonly leaves: THREE.InstancedMesh;
  private readonly bands: THREE.InstancedMesh;
  private readonly glass: THREE.InstancedMesh;

  private readonly solidSlots: Slot[];
  private readonly capSlots: Slot[];
  private readonly frameSlots: Slot[];
  private readonly leafSlots: Slot[];
  private readonly bandSlots: Slot[];
  private readonly glassSlots: Slot[];

  constructor(h: number) {
    const M = WALL_MODEL;
    this.group.name = 'walls';

    const std = (o: THREE.MeshStandardMaterialParameters) => {
      const m = new THREE.MeshStandardMaterial(o);
      this.mats.push(m);
      return m;
    };
    const add = (mesh: THREE.InstancedMesh, order = 0) => {
      mesh.renderOrder = order;
      this.meshes.push(mesh);
      this.group.add(mesh);
      return mesh;
    };

    this.solidSlots = M.solids.map((b) => slotOf(b));
    this.capSlots = [...M.solids.map((b) => slotOf(b, false, !!b.inner)), ...M.caps.map((b) => slotOf(b))];
    this.frameSlots = M.frames.map((b) => slotOf(b, b.trim));
    this.leafSlots = M.leaves.map((b) => slotOf(b));
    this.bandSlots = M.bands.map((b) => slotOf(b));
    this.glassSlots = M.glass.map((b) => slotOf(b, b.trim));

    this.body = add(instanced(std({ color: SCENE.wall, roughness: 0.92, metalness: 0, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 }), this.solidSlots.length, 'wall-body'));
    this.body.castShadow = true;
    this.body.receiveShadow = true;

    this.cap = add(instanced(std({ color: CAP_ALBEDO, roughness: 0.6, metalness: 0, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 }), this.capSlots.length, 'wall-cap'));
    this.cap.receiveShadow = true;

    this.bands = add(instanced(std({ color: 0xffffff, roughness: 0.8, metalness: 0 }), this.bandSlots.length, 'wall-bands'));
    this.bands.receiveShadow = true;
    M.bands.forEach((b, i) => this.bands.setColorAt(i, _c.set(b.color)));

    this.frames = add(instanced(std({ color: 0xffffff, roughness: 0.5, metalness: 0.25 }), this.frameSlots.length, 'wall-frames'));
    this.frames.castShadow = true;
    this.frames.receiveShadow = true;
    M.frames.forEach((b, i) => this.frames.setColorAt(i, _c.set(b.color)));

    this.leaves = add(instanced(std({ color: 0xffffff, roughness: 0.55, metalness: 0.1 }), this.leafSlots.length, 'wall-leaves'));
    this.leaves.castShadow = true;
    this.leaves.receiveShadow = true;
    M.leaves.forEach((b, i) => this.leaves.setColorAt(i, _c.set(b.color)));

    // Glazing: translucent, never writes depth, drawn after the opaque pass.
    this.glass = add(
      instanced(
        std({ color: '#cfe6e4', roughness: 0.05, metalness: 0, transparent: true, opacity: 0.26, depthWrite: false }),
        this.glassSlots.length,
        'wall-glass',
      ),
      3,
    );

    for (const m of [this.bands, this.frames, this.leaves]) if (m.instanceColor) m.instanceColor.needsUpdate = true;
    this.update(h);
  }

  /** Rewrite every instance matrix for wall height `H`. */
  update(H: number): void {
    this.height = H;
    const body = this.body.instanceMatrix.array as Float32Array;
    const cap = this.cap.instanceMatrix.array as Float32Array;

    const n = this.solidSlots.length;
    for (let i = 0; i < this.capSlots.length; i++) {
      const s = this.capSlots[i];
      const top = Math.min(s.y1, H);
      const vis = top - s.y0;
      if (vis <= MIN) {
        hide(cap, i);
        if (i < n) hide(body, i);
        continue;
      }
      if (s.inner && s.y1 <= H) {
        // covered by the box stacked above it: plain body, no cap
        put(body, i, s.cx, s.y0 + (vis + EY) / 2, s.cz, s.sx + 2 * E, vis + EY, s.sz + 2 * E);
        hide(cap, i);
        continue;
      }
      const capH = Math.min(CAP, vis);
      put(cap, i, s.cx, top - capH / 2, s.cz, s.sx + 2 * EC, capH, s.sz + 2 * EC);
      if (i < n) {
        const bodyH = vis - capH;
        if (bodyH > MIN) put(body, i, s.cx, s.y0 + (bodyH + EY) / 2, s.cz, s.sx + 2 * E, bodyH + EY, s.sz + 2 * E);
        else hide(body, i);
      }
    }

    const frames = this.frames.instanceMatrix.array as Float32Array;
    for (let i = 0; i < this.frameSlots.length; i++) putClipped(frames, i, this.frameSlots[i], H);
    const leaves = this.leaves.instanceMatrix.array as Float32Array;
    for (let i = 0; i < this.leafSlots.length; i++) putClipped(leaves, i, this.leafSlots[i], H);
    const bands = this.bands.instanceMatrix.array as Float32Array;
    for (let i = 0; i < this.bandSlots.length; i++) putClipped(bands, i, this.bandSlots[i], H);
    const glass = this.glass.instanceMatrix.array as Float32Array;
    for (let i = 0; i < this.glassSlots.length; i++) putClipped(glass, i, this.glassSlots[i], H);

    for (const m of this.meshes) m.instanceMatrix.needsUpdate = true;
  }

  dispose(): void {
    for (const m of this.meshes) m.dispose();
    for (const m of this.mats) m.dispose();
  }
}
