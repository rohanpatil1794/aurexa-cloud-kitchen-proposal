// North arrow: a flat compass on the ground beside the north-east corner of the plinth. A thin cream ring, a two-tone kite
// pointing north (-z) and a big "N" lying flat above it. Unlit, so the brand colours stay exact.
//
// It belongs to the overview poses (hero, aerial, plan), so:
//  - it keeps a steady size on screen (the group is scaled with the view depth; at world size it would balloon in close-ups);
//  - it fades out when the camera comes close to the building and while a room is selected;
//  - it rests at NORTH_ARROW_POS (data/safety.ts): well east of the corner in the explorer on a wide stage, where the room
//    pills (raised with the 10 ft walls) cannot reach it, nearer in the hero (no pills), above the corner on a compact stage
//    (phones, narrow windows), where there is free sky but no free side; it glides between those as the stage changes;
//  - it is clamped into the free part of the canvas (below the top bar, left of the panel, above the phone sheet): when its
//    resting spot would fall outside that area it slides along the ground plane, in screen space, to the nearest spot inside.
// NORTH_ARROW_RECT is where it really is on screen this frame: the label pills keep clear of it.
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { FreeRect } from '../../data/cameras';
import { FOOTPRINT } from '../../data/layout';
import { NORTH_ARROW_POS } from '../../data/safety';
import { BRAND } from '../../lib/palette';
import { getTextTexture } from '../../lib/textTexture';
import { useStore } from '../../store';
import { explorerFree } from '../stageLayout';

const R = 3.2;
/** A stage narrower than this (px) is compact, the same rule the label pills follow (Labels.tsx COMPACT_WIDTH). */
const COMPACT_STAGE = 720;
/** On-screen diameter of the ring in px: this share of the canvas height within the limits; plan draws it a little smaller. */
const SIZE = { share: 0.065, min: 40, max: 60, plan: 0.8 } as const;
/** Camera distances (ft) from the middle of the building over which it fades in as the camera moves out: gone in the room and
 *  eye-level views (under 80), shown in the aerial (about 140) and plan (about 115). */
const FADE_NEAR = 80;
const FADE_FAR = 105;
const CENTRE = { x: FOOTPRINT.w / 2, z: FOOTPRINT.d / 2 } as const;
/** Keep the compass this far (px) from the top bar and the other edges of the free area. */
const BAR_GAP = 10;
const EDGE_GAP = 10;
/** How fast the resting spot glides when the stage changes (hero to explorer, a resize across the compact limit), 1/s. */
const ANCHOR_RATE = 5;
/** Opacity of each material at full strength. */
const OPACITY = { disc: 0.55, cream: 0.95, kite: 1, glyph: 1 } as const;
const lerp = THREE.MathUtils.lerp;
const smoothstep = THREE.MathUtils.smoothstep;
/** Layer heights (ft), a hair apart so nothing z-fights at aerial distance. */
const Y = { disc: 0.02, ring: 0.04, kite: 0.06 } as const;
/** The "N" glyph: centre this far north of the compass centre, and the visible letter's half width / half height, ft at scale 1. */
const GLYPH = { z: -(R + 1.9), halfW: 1.4, halfH: 1.8 } as const;
/** The ring's west / east / south / north edge and the glyph's corners, flat (x, z) pairs in units of the group scale: what the screen box is made of. */
const OUTLINE = new Float64Array([
  -R, 0, R, 0, 0, R, 0, -R,
  -GLYPH.halfW, GLYPH.z - GLYPH.halfH, GLYPH.halfW, GLYPH.z - GLYPH.halfH,
  -GLYPH.halfW, GLYPH.z + GLYPH.halfH, GLYPH.halfW, GLYPH.z + GLYPH.halfH,
]);

/** Where the compass is on screen this frame (canvas px, ring + letter); `on` is false while it is faded out. Read-only for others. */
export const NORTH_ARROW_RECT = { x0: 0, y0: 0, x1: 0, y1: 0, on: false };

const _v = new THREE.Vector3();
const _free: FreeRect = { x0: 0, y0: 0, x1: 0, y1: 0 };
/** Result of measure(): the compass centre on screen (px) and the screen box of its outline relative to that centre. */
const _box = { cx: 0, cy: 0, x0: 0, x1: 0, y0: 0, y1: 0 };

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

/** Distance of the ground point (x, z) in front of the camera (view-space depth), ft. */
const depthAt = (camera: THREE.Camera, x: number, z: number): number => -_v.set(x, 0, z).applyMatrix4(camera.matrixWorldInverse).z;

/** Project a compass at (x, z) with group scale `s` into `_box`: its centre in canvas px and the box of its outline around it. Allocation free. */
function measure(camera: THREE.Camera, w: number, h: number, x: number, z: number, s: number): void {
  _v.set(x, 0, z).project(camera);
  const cx = (_v.x * 0.5 + 0.5) * w, cy = (0.5 - _v.y * 0.5) * h;
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (let i = 0; i < OUTLINE.length; i += 2) {
    _v.set(x + OUTLINE[i] * s, 0, z + OUTLINE[i + 1] * s).project(camera);
    const px = (_v.x * 0.5 + 0.5) * w - cx, py = (0.5 - _v.y * 0.5) * h - cy;
    if (px < x0) x0 = px;
    if (px > x1) x1 = px;
    if (py < y0) y0 = py;
    if (py > y1) y1 = py;
  }
  _box.cx = cx; _box.cy = cy; _box.x0 = x0; _box.x1 = x1; _box.y0 = y0; _box.y1 = y1;
}

/** Clamp `v` to [lo, hi]; the lower bound wins when the range is empty (a free area smaller than the compass). */
const clampLo = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export function NorthArrow() {
  const group = useRef<THREE.Group>(null);
  // Per-frame state (not React state): eased "a room is selected" 0..1, the opacity last written, the top bar height
  // (it changes with the viewport width, so it is re-read when the canvas size changes).
  const live = useRef({ selected: 0, opacity: -1, bar: 0, barFor: 0, ax: 0, az: 0, placed: false });
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
    NORTH_ARROW_RECT.on = false;
    for (const v of Object.values(parts)) {
      for (const item of Array.isArray(v) ? v : [v]) item.dispose();
    }
  }, [parts]);

  useFrame((state, rawDt) => {
    const g = group.current;
    if (!g) return;
    const { camera, size } = state;
    const st = live.current;
    const { selectedRoom, reducedMotion, phase, sheet } = useStore.getState();
    camera.updateMatrixWorld();
    const w = size.width, h = size.height;

    // Fade: away in close views and while a room is selected.
    const c = camera.position;
    const dist = Math.hypot(c.x - CENTRE.x, c.y, c.z - CENTRE.z);
    const picked = selectedRoom ? 1 : 0;
    st.selected = reducedMotion || Math.abs(st.selected - picked) < 0.003 ? picked : THREE.MathUtils.damp(st.selected, picked, 6, Math.min(rawDt, 0.1));
    const opacity = smoothstep(dist, FADE_NEAR, FADE_FAR) * (1 - st.selected);
    g.visible = opacity > 0.004;
    NORTH_ARROW_RECT.on = opacity > 0.05;
    if (!g.visible) return;
    if (Math.abs(opacity - st.opacity) > 0.002) {
      st.opacity = opacity;
      parts.discMat.opacity = OPACITY.disc * opacity;
      parts.creamMat.opacity = OPACITY.cream * opacity;
      parts.westMat.opacity = parts.eastMat.opacity = OPACITY.kite * opacity;
      parts.glyphMat.opacity = OPACITY.glyph * opacity;
    }

    // The part of the canvas no UI covers: the explorer's free area, the whole canvas below the top bar in the hero.
    const sizeKey = w * 8192 + h;
    if (st.barFor !== sizeKey) {
      st.barFor = sizeKey;
      st.bar = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--topbar-h')) || 0;
    }
    if (phase === 'explorer') explorerFree(w, h, sheet, st.bar, _free);
    else { _free.x0 = 0; _free.y0 = st.bar; _free.x1 = w; _free.y1 = h; }

    // How far overhead the camera is, relative to the building centre: 0 up to the aerial (sin 0.79), 1 in plan.
    const f = smoothstep(c.y / dist, 0.82, 0.97);
    const diameter = THREE.MathUtils.clamp(h * SIZE.share, SIZE.min, SIZE.max) * lerp(1, SIZE.plan, f);
    // Steady on-screen size: a unit of the compass spans (px per unit at depth 1) / depth px, so scale = px wanted / that.
    const k = camera.projectionMatrix.elements[5] * 0.5 * h * 2 * R;
    const resting = _free.x1 - _free.x0 < COMPACT_STAGE ? NORTH_ARROW_POS.compact : phase === 'explorer' ? NORTH_ARROW_POS.wide : NORTH_ARROW_POS.hero;
    if (!st.placed || reducedMotion) {
      st.placed = true;
      st.ax = resting.x;
      st.az = resting.z;
    } else {
      const dt = Math.min(rawDt, 0.1);
      st.ax = Math.abs(st.ax - resting.x) < 0.01 ? resting.x : THREE.MathUtils.damp(st.ax, resting.x, ANCHOR_RATE, dt);
      st.az = Math.abs(st.az - resting.z) < 0.01 ? resting.z : THREE.MathUtils.damp(st.az, resting.z, ANCHOR_RATE, dt);
    }
    let x = st.ax, z = st.az;
    let scale = (diameter * depthAt(camera, x, z)) / k;

    // Clamp the whole outline (ring and letter) into the free area, sliding the compass over the ground plane.
    measure(camera, w, h, x, z, scale);
    const nx = clampLo(_box.cx, _free.x0 + EDGE_GAP - _box.x0, _free.x1 - EDGE_GAP - _box.x1);
    const ny = clampLo(_box.cy, _free.y0 + BAR_GAP - _box.y0, _free.y1 - EDGE_GAP - _box.y1);
    if (nx !== _box.cx || ny !== _box.cy) {
      _v.set((nx / w) * 2 - 1, 1 - (ny / h) * 2, 0.5).unproject(camera).sub(c);
      if (_v.y < -1e-4) {
        const t = -c.y / _v.y;
        x = c.x + _v.x * t;
        z = c.z + _v.z * t;
        scale = (diameter * depthAt(camera, x, z)) / k;
        measure(camera, w, h, x, z, scale);
      }
    }
    g.position.set(x, 0, z);
    g.scale.setScalar(scale);
    NORTH_ARROW_RECT.x0 = _box.cx + _box.x0;
    NORTH_ARROW_RECT.x1 = _box.cx + _box.x1;
    NORTH_ARROW_RECT.y0 = _box.cy + _box.y0;
    NORTH_ARROW_RECT.y1 = _box.cy + _box.y1;
  });

  return (
    <group ref={group} name="north-arrow" position={[NORTH_ARROW_POS.wide.x, 0, NORTH_ARROW_POS.wide.z]} visible={false}>
      <mesh geometry={parts.disc} material={parts.discMat} position-y={Y.disc} raycast={() => {}} />
      <mesh geometry={parts.ring} material={parts.creamMat} position-y={Y.ring} raycast={() => {}} />
      {parts.ticks.map((g, i) => (
        <mesh key={i} geometry={g} material={parts.creamMat} position-y={Y.ring} raycast={() => {}} />
      ))}
      <mesh geometry={parts.west} material={parts.westMat} position-y={Y.kite} raycast={() => {}} />
      <mesh geometry={parts.east} material={parts.eastMat} position-y={Y.kite} raycast={() => {}} />
      <mesh geometry={parts.glyph} material={parts.glyphMat} position={[0, Y.kite, GLYPH.z]} raycast={() => {}} />
    </group>
  );
}
