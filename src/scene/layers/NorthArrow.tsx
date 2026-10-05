// North arrow: a flat compass on the ground just east of the plinth, near the north-east corner, always visible. A thin
// cream ring, a two-tone kite pointing north (-z) and a big "N" lying flat above it. Unlit, so the brand colours stay exact.
// In plan the free strip between the plinth and the explorer panel is narrow and the top bar covers everything north of
// the footprint, so as the camera comes overhead the compass glides to a smaller, further-south spot that stays in frame.
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { FOOTPRINT, WALL } from '../../data/layout';
import { BRAND } from '../../lib/palette';
import { getTextTexture } from '../../lib/textTexture';

const R = 3.2;
const EAST = FOOTPRINT.w + WALL.plinthMargin;
/** Resting spot in the aerial, and the smaller one (scale s) it glides to in plan. */
const AERIAL = { x: EAST + 7, z: 3.5, s: 1 } as const;
const PLAN = { x: EAST + 3.3, z: 5.2, s: 0.78 } as const;
const lerp = THREE.MathUtils.lerp;
/** Layer heights (ft), a hair apart so nothing z-fights at aerial distance. */
const Y = { disc: 0.02, ring: 0.04, kite: 0.06 } as const;

/** Lay a shape / plane flat: its +y becomes north (-z), its +z becomes up. */
const flat = <T extends THREE.BufferGeometry>(g: T): T => g.rotateX(-Math.PI / 2);

/** One half of the kite, apex at the top: west (side = -1) or east (+1). */
function kiteHalf(side: -1 | 1): THREE.ShapeGeometry {
  const s = new THREE.Shape();
  s.moveTo(0, 0.92 * R);
  s.lineTo(side * 0.34 * R, -0.62 * R);
  s.lineTo(0, -0.2 * R);
  s.closePath();
  return flat(new THREE.ShapeGeometry(s));
}

const unlit = (color: string, opacity = 1) =>
  new THREE.MeshBasicMaterial({ color, toneMapped: false, transparent: opacity < 1, opacity, side: THREE.DoubleSide, depthWrite: false });

export function NorthArrow() {
  const group = useRef<THREE.Group>(null);
  const parts = useMemo(() => {
    const ticks = [90, 180, 270].map((deg) => {
      const a = (deg * Math.PI) / 180;
      const tick = flat(new THREE.PlaneGeometry(0.12, 0.55));
      tick.rotateY(a);
      tick.translate(Math.sin(a) * (R - 0.55), 0, -Math.cos(a) * (R - 0.55));
      return tick;
    });
    return {
      disc: flat(new THREE.CircleGeometry(R, 64)),
      ring: flat(new THREE.RingGeometry(R - 0.14, R, 96)),
      ticks,
      west: kiteHalf(-1),
      east: kiteHalf(1),
      glyph: flat(new THREE.PlaneGeometry(6, 6)),
      discMat: unlit('#0b2324', 0.55),
      creamMat: unlit(BRAND.cream, 0.95),
      westMat: unlit(BRAND.tealLight),
      eastMat: unlit(BRAND.orange),
      glyphMat: new THREE.MeshBasicMaterial({
        map: getTextTexture({ text: 'N', aspect: 1, px: 340, fg: BRAND.cream, weight: 700, tracking: 0 }),
        transparent: true, toneMapped: false, depthWrite: false,
      }),
    };
  }, []);

  useEffect(() => () => {
    for (const v of Object.values(parts)) {
      for (const item of Array.isArray(v) ? v : [v]) item.dispose();
    }
  }, [parts]);

  useFrame((state) => {
    const g = group.current;
    if (!g) return;
    // How far overhead the camera is, relative to the building centre: 0 up to the aerial (sin 0.79), 1 in plan.
    const c = state.camera.position;
    const f = THREE.MathUtils.smoothstep(c.y / Math.hypot(c.x - FOOTPRINT.w / 2, c.y, c.z - FOOTPRINT.d / 2), 0.82, 0.97);
    g.position.set(lerp(AERIAL.x, PLAN.x, f), 0, lerp(AERIAL.z, PLAN.z, f));
    g.scale.setScalar(lerp(AERIAL.s, PLAN.s, f));
  });

  return (
    <group ref={group} name="north-arrow" position={[AERIAL.x, 0, AERIAL.z]}>
      <mesh geometry={parts.disc} material={parts.discMat} position-y={Y.disc} raycast={() => {}} />
      <mesh geometry={parts.ring} material={parts.creamMat} position-y={Y.ring} raycast={() => {}} />
      {parts.ticks.map((g, i) => (
        <mesh key={i} geometry={g} material={parts.creamMat} position-y={Y.ring} raycast={() => {}} />
      ))}
      <mesh geometry={parts.west} material={parts.westMat} position-y={Y.kite} raycast={() => {}} />
      <mesh geometry={parts.east} material={parts.eastMat} position-y={Y.kite} raycast={() => {}} />
      <mesh geometry={parts.glyph} material={parts.glyphMat} position={[0, Y.kite, -R - 1.9]} raycast={() => {}} />
    </group>
  );
}
