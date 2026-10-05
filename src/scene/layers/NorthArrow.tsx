// North arrow: a flat compass on the ground just east of the plinth, near the north-east corner. A thin cream ring, a
// two-tone kite pointing north (-z) and a big "N" lying flat above it. Unlit, so the brand colours stay exact.
//
// It belongs to the overview poses, so it keeps a steady size on screen (the group is scaled with the camera distance;
// at world size it would balloon in close-ups), fades out when the camera comes close or a room is selected, and slides
// south along the plinth edge whenever its N would end up under the top bar. In plan the free strip between the plinth
// and the explorer panel is narrow, so as the camera comes overhead the compass glides to a smaller, further-south spot
// that stays in frame.
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { FOOTPRINT, WALL } from '../../data/layout';
import { BRAND } from '../../lib/palette';
import { getTextTexture } from '../../lib/textTexture';
import { useStore } from '../../store';

const R = 3.2;
const EAST = FOOTPRINT.w + WALL.plinthMargin;
/** Resting spot in the aerial (further east on wide screens, where the label pills crowd the corner and there is room; phones need it close), and the one it glides to in plan. */
const AERIAL = { x: EAST + 7, xWide: EAST + 15, z: 3.5 } as const;
const PLAN = { x: EAST + 3.3, z: 5.2 } as const;
/** On-screen diameter of the ring in px: this share of the canvas height within the limits; plan draws it a little smaller. */
const SIZE = { share: 0.065, min: 40, max: 60, plan: 0.8 } as const;
/** Camera distances (ft) over which it fades in as the camera moves out: gone in every room overview, shown in the aerial (172) and plan (125). */
const FADE_NEAR = 62;
const FADE_FAR = 92;
/** How far north of its centre the "N" reaches (ring radius + the glyph's offset and half its height), ft at scale 1. */
const N_REACH = R + 3.6;
/** Keeps the N this far (px) below the top bar, sliding the compass south by at most MAX_SLIDE ft to do so. */
const BAR_GAP = 10;
const MAX_SLIDE = 16;
/** Opacity of each material at full strength. */
const OPACITY = { disc: 0.55, cream: 0.95, kite: 1, glyph: 1 } as const;
const lerp = THREE.MathUtils.lerp;
const smoothstep = THREE.MathUtils.smoothstep;
const _top = new THREE.Vector3();
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

const unlit = (color: string, opacity: number) =>
  new THREE.MeshBasicMaterial({ color, toneMapped: false, transparent: true, opacity, side: THREE.DoubleSide, depthWrite: false });

export function NorthArrow() {
  const group = useRef<THREE.Group>(null);
  // Per-frame state (not React state): eased "a room is selected" 0..1, the opacity last written, the top bar height
  // (it changes with the viewport width, so it is re-read when the canvas size changes).
  const live = useRef({ selected: 0, opacity: -1, bar: 0, barFor: 0 });
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
      discMat: unlit('#0b2324', OPACITY.disc),
      creamMat: unlit(BRAND.cream, OPACITY.cream),
      westMat: unlit(BRAND.tealLight, OPACITY.kite),
      eastMat: unlit(BRAND.orange, OPACITY.kite),
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

  useFrame((state, rawDt) => {
    const g = group.current;
    if (!g) return;
    const { camera, size } = state;
    const st = live.current;
    const { selectedRoom, reducedMotion } = useStore.getState();
    camera.updateMatrixWorld();

    // Fade: away in close views and while a room is selected.
    const c = camera.position;
    const dist = Math.hypot(c.x - g.position.x, c.y, c.z - g.position.z);
    const picked = selectedRoom ? 1 : 0;
    st.selected = reducedMotion || Math.abs(st.selected - picked) < 0.003 ? picked : THREE.MathUtils.damp(st.selected, picked, 6, Math.min(rawDt, 0.1));
    const opacity = smoothstep(dist, FADE_NEAR, FADE_FAR) * (1 - st.selected);
    g.visible = opacity > 0.004;
    if (!g.visible) return;
    if (Math.abs(opacity - st.opacity) > 0.002) {
      st.opacity = opacity;
      parts.discMat.opacity = OPACITY.disc * opacity;
      parts.creamMat.opacity = OPACITY.cream * opacity;
      parts.westMat.opacity = parts.eastMat.opacity = OPACITY.kite * opacity;
      parts.glyphMat.opacity = OPACITY.glyph * opacity;
    }

    // How far overhead the camera is, relative to the building centre: 0 up to the aerial (sin 0.79), 1 in plan.
    const f = smoothstep(c.y / Math.hypot(c.x - FOOTPRINT.w / 2, c.y, c.z - FOOTPRINT.d / 2), 0.82, 0.97);
    const aerialX = lerp(AERIAL.x, AERIAL.xWide, smoothstep(size.width / size.height, 1.1, 1.6));
    g.position.set(lerp(aerialX, PLAN.x, f), 0, lerp(AERIAL.z, PLAN.z, f));
    // Steady on-screen size: a unit of the compass spans (px per unit at depth 1) / distance px, so scale = px wanted / that.
    const px = THREE.MathUtils.clamp(size.height * SIZE.share, SIZE.min, SIZE.max) * lerp(1, SIZE.plan, f);
    const scale = (px * dist) / (camera.projectionMatrix.elements[5] * 0.5 * size.height * 2 * R);
    g.scale.setScalar(scale);

    // Keep the N below the top bar: project its top and slide south by what is lacking (px / px per ft).
    const sizeKey = size.width * 8192 + size.height;
    if (st.barFor !== sizeKey) {
      st.barFor = sizeKey;
      st.bar = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--topbar-h')) || 0;
    }
    const topZ = g.position.z - N_REACH * scale;
    const y0 = (0.5 - _top.set(g.position.x, 0, topZ).project(camera).y * 0.5) * size.height;
    const pxPerFt = (0.5 - _top.set(g.position.x, 0, topZ + 1).project(camera).y * 0.5) * size.height - y0;
    const lacking = st.bar + BAR_GAP - y0;
    if (lacking > 0 && pxPerFt > 0.5) g.position.z += Math.min(MAX_SLIDE, lacking / pxPerFt);
  });

  return (
    <group ref={group} name="north-arrow" position={[AERIAL.x, 0, AERIAL.z]} visible={false}>
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
