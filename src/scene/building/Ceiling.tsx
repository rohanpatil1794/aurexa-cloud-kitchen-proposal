import { useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CIRCULATION, FOOTPRINT, ROOMS, ROOM_BY_ID, WALL } from '../../data/layout';
import { BRAND } from '../../lib/palette';
import { wallAnim } from '../../lib/wallAnim';
import { useStore } from '../../store';
import { WALL_COLORS } from './wallModel';

/** Slab thickness: the ceiling rests ON the wall tops, underside at y = wallAnim.h. */
const SLAB = 0.4;
/** Opacity when the camera is above the ceiling plane: a visible lid, still see-through enough to read the plan. */
const GHOST = 0.3;
/** The recessed light panels fade this much faster than the slab, so they stay readable through the ghost. */
const LIGHT_BOOST = 3;
/** Damping rate for the ghost <-> opaque fade (1/s). */
const FADE = 7;
const SKYLIGHT_OPACITY = 0.3;

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();

const smoothstep = (a: number, b: number, x: number) => {
  const t = THREE.MathUtils.clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

/** Interior of the Indoor Garden (inside its wall faces): the slab is cut away here and a skylight goes in. */
function gardenHole() {
  const g = ROOM_BY_ID.garden;
  const half = (onEdge: boolean) => (onEdge ? WALL.outer : WALL.thickness) / 2;
  return {
    x0: g.x + half(g.x === 0),
    x1: g.x + g.w - half(g.x + g.w === FOOTPRINT.w),
    z0: g.z + half(g.z === 0),
    z1: g.z + g.d - half(g.z + g.d === FOOTPRINT.d),
  };
}

/**
 * Recessed light panels: a small regular grid centred inside every space (never over a wall, never over the garden).
 * `pitch` is the grid spacing, so the evening light pools (EveningGlow) can match it.
 */
export function panelGrid(): { x: number; z: number; s: number; pitch: number }[] {
  const out: { x: number; z: number; s: number; pitch: number }[] = [];
  const inset = WALL.outer / 2;
  for (const r of [...ROOMS, ...CIRCULATION]) {
    if (r.id === 'garden') continue;
    const w = r.w - 2 * inset, d = r.d - 2 * inset;
    if (w < 1.4 || d < 1.4) continue;
    const nx = Math.max(1, Math.round(w / 6)), nz = Math.max(1, Math.round(d / 6));
    const cw = w / nx, cd = d / nz;
    const s = THREE.MathUtils.clamp(Math.min(cw, cd) * 0.5, 0.8, 2);
    for (let i = 0; i < nx; i++) for (let k = 0; k < nz; k++) out.push({ x: r.x + inset + (i + 0.5) * cw, z: r.z + inset + (k + 0.5) * cd, s, pitch: Math.min(cw, cd) });
  }
  return out;
}

/** The slab, split by face direction: the underside (lit warm cream) and the shell (concrete top + edges). */
function slabGeometries(): { under: THREE.BufferGeometry; shell: THREE.BufferGeometry } {
  const out = WALL.outer / 2;
  const hole = gardenHole();
  // Shape (x, y) = (x, -z); rotateX(-90deg) below maps shape y -> world -z and the extrusion to +y.
  const shape = new THREE.Shape();
  shape.moveTo(-out, out);
  shape.lineTo(FOOTPRINT.w + out, out);
  shape.lineTo(FOOTPRINT.w + out, -(FOOTPRINT.d + out));
  shape.lineTo(-out, -(FOOTPRINT.d + out));
  shape.closePath();
  const h = new THREE.Path();
  h.moveTo(hole.x0, -hole.z0);
  h.lineTo(hole.x1, -hole.z0);
  h.lineTo(hole.x1, -hole.z1);
  h.lineTo(hole.x0, -hole.z1);
  h.closePath();
  shape.holes.push(h);

  const geo = new THREE.ExtrudeGeometry(shape, { depth: SLAB, bevelEnabled: false, steps: 1 });
  geo.rotateX(-Math.PI / 2);
  const pos = geo.getAttribute('position'), nor = geo.getAttribute('normal');
  const top = new THREE.Color('#c8cccf');
  const edge = new THREE.Color('#b4b9bc');
  const under = { p: [] as number[], n: [] as number[] };
  const shell = { p: [] as number[], n: [] as number[], c: [] as number[] };
  // ExtrudeGeometry is non-indexed: every 3 vertices are one triangle with one flat normal.
  for (let i = 0; i < pos.count; i += 3) {
    const ny = nor.getY(i);
    const dst = ny < -0.5 ? under : shell;
    for (let k = i; k < i + 3; k++) {
      dst.p.push(pos.getX(k), pos.getY(k), pos.getZ(k));
      dst.n.push(nor.getX(k), nor.getY(k), nor.getZ(k));
      if (dst === shell) (ny > 0.5 ? top : edge).toArray(shell.c, shell.c.length);
    }
  }
  geo.dispose();
  const make = (d: { p: number[]; n: number[]; c?: number[] }) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(d.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(d.n, 3));
    if (d.c) g.setAttribute('color', new THREE.Float32BufferAttribute(d.c, 3));
    return g;
  };
  return { under: make(under), shell: make(shell) };
}

/** Opacity, switching a material between the opaque and the blended pipeline only when it has to. */
function setFade(m: THREE.Material, opacity: number, opaque: boolean): void {
  m.opacity = opacity;
  if (m.transparent === opaque) {
    m.transparent = !opaque;
    m.depthWrite = opaque;
  }
}

class CeilingRig {
  readonly group = new THREE.Group();
  private readonly fadeMats: (THREE.MeshStandardMaterial | THREE.MeshBasicMaterial)[] = [];
  private readonly lightMats: THREE.MeshBasicMaterial[] = [];
  private readonly skylight: THREE.Mesh;
  private readonly skylightMat: THREE.MeshStandardMaterial;
  private readonly disposables: { dispose(): void }[] = [];
  private opacity = 0;

  constructor() {
    const keep = <T extends { dispose(): void }>(o: T): T => {
      this.disposables.push(o);
      return o;
    };
    this.group.name = 'ceiling';
    this.group.visible = false;

    // ---- slab: warm cream underside (lifted by emissive, since it faces away from the key light), concrete top ----
    const geos = slabGeometries();
    const underMat = keep(
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(BRAND.cream).lerp(new THREE.Color('#ffffff'), 0.3),
        roughness: 0.95, metalness: 0, emissive: BRAND.cream, emissiveIntensity: 0.62,
      }),
    );
    const shellMat = keep(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0 }));
    for (const [geo, mat, name] of [[geos.under, underMat, 'ceiling-underside'], [geos.shell, shellMat, 'ceiling-top']] as const) {
      const mesh = new THREE.Mesh(keep(geo), mat);
      mesh.name = name;
      mesh.castShadow = false; // interiors stay lit by the key light
      mesh.receiveShadow = false;
      mesh.renderOrder = 4;
      mesh.raycast = () => {};
      this.group.add(mesh);
    }
    this.fadeMats.push(underMat, shellMat);

    // ---- recessed light panels: thin dark reveal + bright inset ----
    const panels = panelGrid();
    const plane = keep(new THREE.PlaneGeometry(1, 1).rotateX(Math.PI / 2));
    // Double-sided: from above (the ghost view) the panels show through the lid as dark-framed light squares.
    const revealMat = keep(new THREE.MeshBasicMaterial({ color: '#3b4044', side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }));
    const insetMat = keep(
      new THREE.MeshBasicMaterial({ color: new THREE.Color(1.5, 1.42, 1.18), side: THREE.DoubleSide, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
    );
    const reveal = new THREE.InstancedMesh(plane, revealMat, panels.length);
    const inset = new THREE.InstancedMesh(plane, insetMat, panels.length);
    reveal.name = 'ceiling-reveal';
    inset.name = 'ceiling-lights';
    panels.forEach((p, i) => {
      _q.identity();
      reveal.setMatrixAt(i, _m.compose(_p.set(p.x, -0.012, p.z), _q, _s.set(p.s + 0.22, 1, p.s + 0.22)));
      inset.setMatrixAt(i, _m.compose(_p.set(p.x, -0.024, p.z), _q, _s.set(p.s, 1, p.s)));
    });
    for (const [m, order] of [[reveal, 5], [inset, 6]] as const) {
      m.renderOrder = order;
      m.frustumCulled = false;
      m.raycast = () => {};
      this.group.add(m);
    }
    this.lightMats.push(revealMat, insetMat);

    // ---- garden skylight: translucent glass in a slim teal grid ----
    const hole = gardenHole();
    const hw = hole.x1 - hole.x0, hd = hole.z1 - hole.z0;
    this.skylightMat = keep(
      new THREE.MeshStandardMaterial({ color: '#cfe6e4', roughness: 0.05, metalness: 0, transparent: true, opacity: 0, depthWrite: false }),
    );
    this.skylight = new THREE.Mesh(new THREE.BoxGeometry(hw, 0.05, hd), this.skylightMat);
    this.skylight.position.set(hole.x0 + hw / 2, SLAB * 0.5, hole.z0 + hd / 2);
    keep(this.skylight.geometry);
    this.skylight.renderOrder = 7;
    this.skylight.raycast = () => {};
    this.group.add(this.skylight);

    const barMat = keep(new THREE.MeshStandardMaterial({ color: WALL_COLORS.glazing, roughness: 0.55 }));
    const bars: [number, number, number, number][] = [
      // cx, cz, sx, sz
      [hole.x0 + hw / 2, hole.z0 + hd / 2, hw, 0.14],
      [hole.x0 + hw / 3, hole.z0 + hd / 2, 0.14, hd],
      [hole.x0 + (2 * hw) / 3, hole.z0 + hd / 2, 0.14, hd],
    ];
    const barMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.12, 1), barMat, bars.length);
    keep(barMesh.geometry);
    bars.forEach(([cx, cz, sx, sz], i) => barMesh.setMatrixAt(i, _m.compose(_p.set(cx, SLAB * 0.5, cz), _q.identity(), _s.set(sx, 1, sz))));
    barMesh.name = 'skylight-bars';
    barMesh.renderOrder = 6;
    barMesh.frustumCulled = false;
    barMesh.raycast = () => {};
    this.group.add(barMesh);
    this.disposables.push(reveal, inset, barMesh);
  }

  /** Called once per frame (after Walls has written wallAnim). */
  frame(cameraY: number, dt: number, reduced: boolean): { moving: boolean } {
    const t = wallAnim.t;
    const present = t > 0.02;
    this.group.visible = present;
    if (!present) {
      this.opacity = 0;
      return { moving: false };
    }
    this.group.position.y = wallAnim.h;

    const appear = smoothstep(0.02, 0.15, t);
    const target = (cameraY > wallAnim.h ? GHOST : 1) * appear;
    const prev = this.opacity;
    this.opacity = reduced ? target : THREE.MathUtils.damp(prev, target, FADE, Math.min(dt, 0.1));
    if (Math.abs(this.opacity - target) < 0.002) this.opacity = target;
    if (this.opacity !== prev || prev === 0) this.applyOpacity(appear);
    return { moving: this.opacity !== target };
  }

  private applyOpacity(appear: number): void {
    const o = this.opacity;
    const opaque = o >= 0.999;
    for (const m of this.fadeMats) setFade(m, o, opaque);
    for (const m of this.lightMats) setFade(m, Math.min(1, o * LIGHT_BOOST), opaque);
    this.skylightMat.opacity = SKYLIGHT_OPACITY * appear;
  }

  dispose(): void {
    for (const d of this.disposables) d.dispose();
  }
}

/**
 * Ceiling + garden skylight. Only exists in 'full' wall mode: it appears as the walls rise
 * (wallAnim.t > 0.02) and its underside sits at y = wallAnim.h. From above it fades to a ghost so the
 * plan stays readable; from inside it is opaque. Never casts shadows.
 */
export function Ceiling() {
  const rig = useMemo(() => new CeilingRig(), []);
  useEffect(() => () => rig.dispose(), [rig]);

  useFrame((state, delta) => {
    const { moving } = rig.frame(state.camera.position.y, delta, useStore.getState().reducedMotion);
    if (moving) state.invalidate();
  });

  return <primitive object={rig.group} />;
}
