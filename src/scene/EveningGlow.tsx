// Evening practicals: what makes the Evening toggle read as a lit interior at dusk instead of a darker filter.
//  - warm light pools on the floor under every recessed ceiling light (the grid the Ceiling draws), plus the garden
//  - additive halos round lamp-like emissive parts (hood lights, pass heat lamps, lanterns, festoon bulbs, ring light)
// Both are one draw call each, additive, never cast or receive anything, and cost nothing in Day (hidden).
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ROOM_BY_ID } from '../data/layout';
import { useStore } from '../store';
import { panelGrid } from './building/Ceiling';
import { FLOOR_Y } from './Floors';
import { lightState } from './lightState';

const POOL_COLOR = '#ff9d42';
const POOL_OPACITY = 0.62;
const POOL_Y = FLOOR_Y + 0.03;
const HALO_OPACITY = 0.85;
const HALO_SIZE = 2.1;

const _m = new THREE.Matrix4();
const _p = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3();
const _x = new THREE.Vector3();
const _c = new THREE.Color();

/** Soft round falloff: bright core, long gentle tail (reads as light, not as a disc). */
function glowTexture(): THREE.CanvasTexture {
  const S = 128;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  for (const [t, a] of [[0, 0.9], [0.15, 0.66], [0.35, 0.4], [0.6, 0.17], [0.85, 0.04], [1, 0]]) g.addColorStop(t, `rgba(255,255,255,${a})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function buildPools(tex: THREE.Texture) {
  const spots = panelGrid().map((p) => ({ x: p.x, z: p.z, d: THREE.MathUtils.clamp(p.pitch * 1.35, 4.5, 9) }));
  const g = ROOM_BY_ID.garden;
  // The garden has no ceiling grid (open skylight): two broad pools stand in for the festoon and lantern light.
  spots.push({ x: g.x + g.w * 0.3, z: g.z + g.d * 0.5, d: 8 }, { x: g.x + g.w * 0.72, z: g.z + g.d * 0.5, d: 8 });
  const geo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  const mat = new THREE.MeshBasicMaterial({
    map: tex, color: POOL_COLOR, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
    // The floors carry a polygon offset (-1) that pulls them towards the camera, more so at grazing angles: a flat quad
    // 0.03 ft above them would lose the depth test. Stronger than the floors' and the threshold strips' (-2).
    polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3,
  });
  const mesh = new THREE.InstancedMesh(geo, mat, spots.length);
  spots.forEach((s, i) => mesh.setMatrixAt(i, _m.compose(_p.set(s.x, POOL_Y, s.z), _q.identity(), _s.set(s.d, 1, s.d))));
  mesh.name = 'evening-pools';
  mesh.renderOrder = 3;
  mesh.frustumCulled = false;
  mesh.raycast = () => {};
  mesh.visible = false;
  return { mesh, geo, mat };
}

/** Lamp-like emissive instances (warm, bright, not a status LED) -> halo points. A long strip gets one halo every ~3 ft. */
function collectHalos(root: THREE.Object3D): { pos: number[]; col: number[] } {
  const pos: number[] = [];
  const col: number[] = [];
  root.updateMatrixWorld(true);
  root.traverse((o) => {
    const mesh = o as THREE.InstancedMesh;
    if (!mesh.isInstancedMesh || !/^inst-\w+-emissive$/.test(mesh.name) || !mesh.instanceColor) return;
    const sphere = mesh.name.includes('-sph-');
    for (let i = 0; i < mesh.count; i++) {
      _m.fromArray(mesh.instanceMatrix.array, i * 16).premultiply(mesh.matrixWorld);
      _m.decompose(_p, _q, _s);
      _c.fromArray(mesh.instanceColor.array, i * 3);
      const peak = Math.max(_c.r, _c.g, _c.b);
      const warm = _c.r >= _c.g && _c.g > _c.b * 1.15;
      const size = Math.max(_s.x, _s.y, _s.z);
      if (peak < 0.85 || !warm || size < (sphere ? 0.07 : 0.2)) continue;
      // box: dimensions are the scale; the strip runs along its longest axis
      const axis = _s.x >= _s.y && _s.x >= _s.z ? 0 : _s.y >= _s.z ? 1 : 2;
      const len = sphere ? 0 : _s.getComponent(axis);
      const n = Math.max(1, Math.round(len / 3));
      _x.set(axis === 0 ? 1 : 0, axis === 1 ? 1 : 0, axis === 2 ? 1 : 0).applyQuaternion(_q);
      for (let k = 0; k < n; k++) {
        const t = ((k + 0.5) / n - 0.5) * len;
        pos.push(_p.x + _x.x * t, _p.y + _x.y * t, _p.z + _x.z * t);
        col.push(_c.r / peak, _c.g / peak, _c.b / peak);
      }
    }
  });
  return { pos, col };
}

export function EveningGlow() {
  const tex = useMemo(glowTexture, []);
  const pools = useMemo(() => buildPools(tex), [tex]);
  const halos = useRef<THREE.Points | null>(null);
  const group = useRef<THREE.Group>(null);
  const haloMat = useMemo(
    () => new THREE.PointsMaterial({
      map: tex, size: HALO_SIZE, sizeAttenuation: true, vertexColors: true, transparent: true, opacity: 0,
      depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
    }),
    [tex],
  );

  useEffect(() => () => {
    pools.geo.dispose(); pools.mat.dispose(); pools.mesh.dispose();
    haloMat.dispose(); tex.dispose();
  }, [pools, haloMat, tex]);

  // The equipment batches are in the scene by the time this effect runs (one commit). Built up front, hidden, so
  // the shader compile at boot covers them and the first Evening toggle does not stall.
  useEffect(() => {
    const root = group.current?.parent;
    if (!root || !group.current) return;
    const { pos, col } = collectHalos(root);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    const pts = new THREE.Points(geo, haloMat);
    pts.name = 'evening-halos';
    pts.renderOrder = 4;
    pts.frustumCulled = false;
    pts.raycast = () => {};
    pts.visible = false;
    const parent = group.current;
    parent.add(pts);
    halos.current = pts;
    return () => {
      parent.remove(pts);
      geo.dispose();
      halos.current = null;
    };
  }, [haloMat]);

  useFrame(() => {
    const e = lightState.evening;
    const on = e > 0.004;
    pools.mesh.visible = on;
    if (on) pools.mat.opacity = POOL_OPACITY * e;
    if (halos.current) {
      halos.current.visible = on && useStore.getState().layers.equipment;
      haloMat.opacity = HALO_OPACITY * e;
    }
  });

  return (
    <group ref={group} name="evening-glow">
      <primitive object={pools.mesh} />
    </group>
  );
}
