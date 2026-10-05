// Dimensions layer: the overall 60 ft (south edge) and 50 ft (west edge) dimension lines in an architect's hand:
// a thin cream line, extension lines and oblique 45 degree end ticks, with the figure in a small pill that breaks the
// line. They frame the near corner of the aerial and both stay inside the plan view. The south line is pushed clear of
// the pickup apron. The figures stay inside the part of the screen no UI covers, so on a phone a pill never clips at the
// screen edge or hides under the bar, the side panel or the bottom sheet.
import { useEffect, useRef, useState, type ElementRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, Line } from '@react-three/drei';
import * as THREE from 'three';
import { FOOTPRINT, PICKUP_ZONE, WALL } from '../../data/layout';
import { DESKTOP_MIN_WIDTH, PANEL_WIDTH, SHEET_LIFT } from '../../data/cameras';
import type { Vec3 } from '../../data/types';
import { BRAND } from '../../lib/palette';
import { useStore } from '../../store';

/** South edge of the pickup apron incl. the plinth margin, ft. */
const APRON_END = PICKUP_ZONE.z + PICKUP_ZONE.d + WALL.plinthMargin;
/** Dimension line positions: x of the 50 ft line, z of the 60 ft line. */
const WEST_X = -(WALL.plinthMargin + 4);
const SOUTH_Z = APRON_END + 3.5;
/** Extension lines start this far off the footprint and run this far past the dimension line. */
const GAP = 1;
const OVERSHOOT = 1.3;
/** Half-length of the 45 degree tick, ft. */
const TICK = 0.65;
const Y = 0.05;
const LINE_OPACITY = 0.9;
const FADE_RATE = 9;
/** Pills keep this far (px) from the screen edge, top bar, side panel and sheet; one whose anchor is further outside is hidden. */
const MARGIN = 8;
const OUTSIDE = 60;
/** Half the size of a pill (px) on wide and on compact (phone) screens; compact screens use the smaller type of max-sm. */
const HALF = { wide: [34, 12], compact: [28, 10] } as const;
const COMPACT_WIDTH = 640;
const OFF_SCREEN: [number, number] = [-9999, -9999];
const _p = new THREE.Vector3();

/** Line segments as consecutive point pairs. */
function dimensionSegments(): Vec3[] {
  const { w, d } = FOOTPRINT;
  const out: Vec3[] = [];
  const seg = (ax: number, az: number, bx: number, bz: number) => out.push([ax, Y, az], [bx, Y, bz]);
  const tick = (x: number, z: number) => seg(x - TICK, z + TICK, x + TICK, z - TICK);

  seg(0, SOUTH_Z, w, SOUTH_Z); // 60 ft
  for (const x of [0, w]) {
    // the south-west extension line starts beyond the pickup apron instead of running over its edge
    seg(x, x === 0 ? APRON_END + 0.6 : d + GAP, x, SOUTH_Z + OVERSHOOT);
    tick(x, SOUTH_Z);
  }
  seg(WEST_X, 0, WEST_X, d); // 50 ft
  for (const z of [0, d]) {
    seg(-GAP, z, WEST_X - OVERSHOOT, z);
    tick(WEST_X, z);
  }
  return out;
}
const SEGMENTS = dimensionSegments();

/** Height of the fixed top bar, px (it changes with the viewport width, so it is re-read when the canvas size changes). */
let barPx = 0;
let barFor = 0;
const topBar = ({ width, height }: { width: number; height: number }) => {
  if (barFor !== width * 8192 + height) {
    barFor = width * 8192 + height;
    barPx = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--topbar-h')) || 0;
  }
  return barPx;
};

/** Where a pill is drawn (drei Html `calculatePosition`): its anchor on screen, pulled inside the free part of the screen. */
function pillPosition(el: THREE.Object3D, camera: THREE.Camera, size: { width: number; height: number }): [number, number] {
  _p.setFromMatrixPosition(el.matrixWorld).project(camera);
  const x = (_p.x * 0.5 + 0.5) * size.width, y = (0.5 - _p.y * 0.5) * size.height;
  const { phase, sheet } = useStore.getState();
  const explorer = phase === 'explorer';
  const desktop = size.width >= DESKTOP_MIN_WIDTH;
  const [hw, hh] = size.width < COMPACT_WIDTH ? HALF.compact : HALF.wide;
  const minX = MARGIN + hw, minY = topBar(size) + MARGIN + hh;
  const maxX = Math.max(minX, size.width - MARGIN - hw - (explorer && desktop ? PANEL_WIDTH + MARGIN : 0));
  const maxY = Math.max(minY, size.height - MARGIN - hh - (explorer && !desktop ? size.height * 2 * SHEET_LIFT[sheet] : 0));
  if (x < minX - OUTSIDE || x > maxX + OUTSIDE || y < minY - OUTSIDE || y > maxY + OUTSIDE) return OFF_SCREEN;
  return [THREE.MathUtils.clamp(x, minX, maxX), THREE.MathUtils.clamp(y, minY, maxY)];
}

/** True while `on`, and for `ms` after it turns off (so a fade-out can finish before unmounting). */
function useMountedWhile(on: boolean, ms: number): boolean {
  const [mounted, setMounted] = useState(on);
  useEffect(() => {
    if (on) {
      setMounted(true);
      return;
    }
    const t = window.setTimeout(() => setMounted(false), ms);
    return () => window.clearTimeout(t);
  }, [on, ms]);
  return on || mounted;
}

function Pill({ label }: { label: string }) {
  const on = useStore((s) => s.layers.dimensions);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(on));
    return () => cancelAnimationFrame(id);
  }, [on]);
  return (
    <div
      className="select-none whitespace-nowrap rounded-full border border-cream/45 bg-[rgba(8,22,23,0.78)] px-3 py-1 text-[10px] font-semibold uppercase leading-none tracking-[0.2em] text-cream max-sm:px-2 max-sm:text-[9px] max-sm:tracking-[0.16em]"
      style={{ opacity: shown ? 1 : 0, transition: 'opacity 350ms ease' }}
    >
      {label}
    </div>
  );
}

export function Dimensions() {
  const on = useStore((s) => s.layers.dimensions);
  const mounted = useMountedWhile(on, 700);
  const line = useRef<ElementRef<typeof Line>>(null);
  const opacity = useRef(0);

  useFrame((_, delta) => {
    const l = line.current;
    if (!l) return;
    const s = useStore.getState();
    const target = s.layers.dimensions ? LINE_OPACITY : 0;
    const prev = opacity.current;
    let next = s.reducedMotion ? target : THREE.MathUtils.damp(prev, target, FADE_RATE, Math.min(delta, 0.1));
    if (Math.abs(next - target) < 0.004) next = target;
    opacity.current = next;
    l.visible = next > 0;
    if (next !== prev) l.material.opacity = next;
  });

  if (!mounted) return null;
  return (
    <group name="dimensions">
      <Line ref={line} points={SEGMENTS} segments lineWidth={1.5} color={BRAND.cream} transparent opacity={0} depthWrite={false} />
      <Html position={[FOOTPRINT.w / 2, Y, SOUTH_Z]} center pointerEvents="none" zIndexRange={[20, 0]} calculatePosition={pillPosition}>
        <Pill label={`${FOOTPRINT.w} ft`} />
      </Html>
      <Html position={[WEST_X, Y, FOOTPRINT.d / 2]} center pointerEvents="none" zIndexRange={[20, 0]} calculatePosition={pillPosition}>
        <Pill label={`${FOOTPRINT.d} ft`} />
      </Html>
    </group>
  );
}
