// Room picking and the orange selection visuals.
//
//  - Picking: ONE invisible floor plane takes every pointer event; the hit point goes through roomAt(x, z), so it
//    is exact whatever the wall height. Corridors, outside and eye-level mode pick nothing. Only the explorer
//    phase accepts input, and a drag (> TAP_SLOP px) never selects.
//  - Hover: store.hoveredRoom (also set by the room list and the label pills) tints that room's floor.
//  - Selection: an orange floor tint plus an outline loop that glides from room to room and eases in and out.
//    The loop is drawn twice: on the floor (just inside the wall faces) and on the wall tops, which stay
//    visible from the aerial when the near walls hide the floor edge.
//
// Everything that animates lives in one useFrame and writes into preallocated buffers.
import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { FOOTPRINT, ROOMS, ROOM_BY_ID, roomAt } from '../../data/layout';
import type { RoomId } from '../../data/types';
import { SELECT_ORANGE } from '../../lib/palette';
import { wallAnim } from '../../lib/wallAnim';
import { useStore } from '../../store';
import { easeTo, pillPointer } from '../layers/labelsLayout';

/** Movement (px) between press and release beyond which a click is a drag. */
const TAP_SLOP = 6;
/** Pick plane, floor tint and floor loop heights: above the floor (0.02) and its threshold strips (0.032). */
const PICK_Y = 0.05;
const TINT_Y = 0.06;
const LOOP_Y = 0.075;
/** The wall-top loop floats this far above the wall tops (or the ceiling slab, which rests on them). */
const TOP_LIFT = 0.03;
const CEILING_SLAB = 0.4;
/** Floor loop starts just inside the wall faces (interior walls are 0.5 ft thick, centred on the room edge). */
const WALL_FACE = 0.32;
const HOVER_ALPHA = 0.22;
const SELECT_ALPHA = 0.16;
/** On-screen width of the loop, px: its world width follows the camera distance so it always reads the same. */
const LOOP_PX = 5.5;
const MIN_LOOP = 0.18;
const MIN_TOP_LOOP = 0.62;
/** A loop that appears from nothing starts this much (ft) outside the room and closes in on it. */
const SETTLE = 2;
const DEG = Math.PI / 180;

const NO_RAYCAST = () => {};
const orange = new THREE.Color(SELECT_ORANGE);
const _cam = new THREE.Vector3();

/** Floor tint: one quad per room in a single mesh; each quad's alpha is its own vertex colour alpha. */
function buildTint() {
  const n = ROOMS.length;
  const pos = new Float32Array(n * 12);
  const col = new Float32Array(n * 16);
  const idx = new Uint16Array(n * 6);
  ROOMS.forEach((r, i) => {
    pos.set([r.x, 0, r.z, r.x + r.w, 0, r.z, r.x + r.w, 0, r.z + r.d, r.x, 0, r.z + r.d], i * 12); // NW, NE, SE, SW
    for (let v = 0; v < 4; v++) col.set([orange.r, orange.g, orange.b, 0], i * 16 + v * 4);
    const v = i * 4;
    idx.set([v, v + 3, v + 2, v, v + 2, v + 1], i * 6);
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const color = new THREE.BufferAttribute(col, 4);
  color.setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('color', color);
  geo.setIndex(new THREE.BufferAttribute(idx, 1));
  const mat = new THREE.MeshBasicMaterial({
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    toneMapped: false,
    polygonOffset: true,
    polygonOffsetFactor: -3,
    polygonOffsetUnits: -3,
  });
  return { geo, color, mat };
}

/** A rectangular loop: a flat band between an outer rectangle and the rectangle `width` inside it. */
function buildLoop() {
  const pos = new THREE.BufferAttribute(new Float32Array(24), 3);
  pos.setUsage(THREE.DynamicDrawUsage);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', pos);
  // Vertices 0-3 outer corners (NW, NE, SE, SW), 4-7 the matching inner corners: one quad per side.
  geo.setIndex([0, 1, 5, 0, 5, 4, 1, 2, 6, 1, 6, 5, 2, 3, 7, 2, 7, 6, 3, 0, 4, 3, 4, 7]);
  const mat = new THREE.MeshBasicMaterial({
    color: orange,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    toneMapped: false,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -4,
    polygonOffsetUnits: -4,
  });
  return { geo, pos, mat };
}
type Loop = ReturnType<typeof buildLoop>;

function setLoop(loop: Loop, x0: number, z0: number, x1: number, z1: number, width: number): void {
  const p = loop.pos;
  const w = Math.min(width, (x1 - x0) / 2.2, (z1 - z0) / 2.2);
  p.setXYZ(0, x0, 0, z0);
  p.setXYZ(1, x1, 0, z0);
  p.setXYZ(2, x1, 0, z1);
  p.setXYZ(3, x0, 0, z1);
  p.setXYZ(4, x0 + w, 0, z0 + w);
  p.setXYZ(5, x1 - w, 0, z0 + w);
  p.setXYZ(6, x1 - w, 0, z1 - w);
  p.setXYZ(7, x0 + w, 0, z1 - w);
  p.needsUpdate = true;
}

function createRig() {
  const n = ROOMS.length;
  return {
    tint: buildTint(),
    floorLoop: buildLoop(),
    topLoop: buildLoop(),
    hover: new Float32Array(n),
    select: new Float32Array(n),
    alpha: new Float32Array(n),
    /** The eased loop rectangle and its fade. */
    loop: { x: 0, z: 0, w: 1, d: 1, a: 0 },
    /** What the loop geometry was last built from: rect x, z, w, d and band width. */
    applied: new Float32Array(5).fill(NaN),
  };
}

export function RoomPicking() {
  const gl = useThree((s) => s.gl);
  const rig = useMemo(createRig, []);
  const topLoopMesh = useRef<THREE.Mesh>(null);

  useEffect(() => {
    const canvas = gl.domElement;
    return () => {
      canvas.style.cursor = '';
      useStore.getState().setHoveredRoom(null);
      rig.tint.geo.dispose();
      rig.tint.mat.dispose();
      for (const l of [rig.floorLoop, rig.topLoop]) {
        l.geo.dispose();
        l.mat.dispose();
      }
    };
  }, [gl, rig]);

  useFrame((state, rawDt) => {
    const s = useStore.getState();
    const dt = Math.min(rawDt, 0.1);
    const snap = s.reducedMotion;
    const explorer = s.phase === 'explorer';
    // Standing inside a room (eye level): the loop and selection tint would only be in the way.
    const sel = explorer && s.camera.mode !== 'look' ? s.selectedRoom : null;
    const hov = explorer ? s.hoveredRoom : null;

    // ---- floor tint ------------------------------------------------------------------------------------------
    const color = rig.tint.color;
    let dirty = false;
    for (let i = 0; i < ROOMS.length; i++) {
      const id = ROOMS[i].id;
      const h = (rig.hover[i] = easeTo(rig.hover[i], id === hov ? 1 : 0, id === hov ? 16 : 9, dt, snap));
      const k = (rig.select[i] = easeTo(rig.select[i], id === sel ? 1 : 0, 10, dt, snap));
      const a = Math.max(h * HOVER_ALPHA, k * SELECT_ALPHA);
      if (a === rig.alpha[i]) continue;
      rig.alpha[i] = a;
      for (let v = 0; v < 4; v++) color.setW(i * 4 + v, a);
      dirty = true;
    }
    if (dirty) color.needsUpdate = true;

    // ---- outline loop ----------------------------------------------------------------------------------------
    const lp = rig.loop;
    if (sel) {
      const r = ROOM_BY_ID[sel];
      if (lp.a < 0.02 || snap) {
        const grow = snap ? 0 : SETTLE;
        lp.x = r.x - grow; lp.z = r.z - grow; lp.w = r.w + 2 * grow; lp.d = r.d + 2 * grow;
      } else {
        lp.x = THREE.MathUtils.damp(lp.x, r.x, 9, dt);
        lp.z = THREE.MathUtils.damp(lp.z, r.z, 9, dt);
        lp.w = THREE.MathUtils.damp(lp.w, r.w, 9, dt);
        lp.d = THREE.MathUtils.damp(lp.d, r.d, 9, dt);
      }
    }
    lp.a = easeTo(lp.a, sel ? 1 : 0, 8, dt, snap);
    const show = lp.a > 0.004;
    rig.floorLoop.mat.visible = rig.topLoop.mat.visible = show;
    if (!show) return;

    const cam = state.camera as THREE.PerspectiveCamera;
    _cam.set(lp.x + lp.w / 2, 0, lp.z + lp.d / 2);
    const dist = cam.position.distanceTo(_cam);
    const pxPerFt = state.size.height / (2 * dist * Math.tan((cam.fov * DEG) / 2));
    const width = Math.max(MIN_LOOP, LOOP_PX / pxPerFt);

    const a = rig.applied;
    const moved = Math.abs(a[0] - lp.x) + Math.abs(a[1] - lp.z) + Math.abs(a[2] - lp.w) + Math.abs(a[3] - lp.d) + Math.abs(a[4] - width);
    if (!(moved < 1e-4)) { // also true while `applied` is still NaN
      a[0] = lp.x; a[1] = lp.z; a[2] = lp.w; a[3] = lp.d; a[4] = width;
      const x1 = lp.x + lp.w, z1 = lp.z + lp.d;
      setLoop(rig.floorLoop, lp.x + WALL_FACE, lp.z + WALL_FACE, x1 - WALL_FACE, z1 - WALL_FACE, width);
      const half = Math.max(width, MIN_TOP_LOOP) / 2;
      setLoop(rig.topLoop, lp.x - half, lp.z - half, x1 + half, z1 + half, half * 2);
    }

    const pulse = snap ? 1 : 0.88 + 0.12 * Math.sin(state.clock.elapsedTime * 2.6);
    rig.floorLoop.mat.opacity = lp.a * pulse;
    rig.topLoop.mat.opacity = lp.a * pulse * 0.92;
    if (topLoopMesh.current) topLoopMesh.current.position.y = wallAnim.h + (wallAnim.t > 0.02 ? CEILING_SLAB : 0) + TOP_LIFT;
  });

  // ---- pointer input -----------------------------------------------------------------------------------------
  const pickable = () => {
    const s = useStore.getState();
    return s.phase === 'explorer' && s.camera.mode !== 'look' && !s.cameraPath;
  };
  /** Hover a room (or nothing). The cursor is set on the canvas itself: the stage CSS gives it its own grab cursor. */
  const hover = (id: RoomId | null) => {
    useStore.getState().setHoveredRoom(id);
    gl.domElement.style.cursor = id ? 'pointer' : '';
  };
  const roomIdAt = (e: ThreeEvent<PointerEvent | MouseEvent>) => roomAt(e.point.x, e.point.z)?.id ?? null;

  return (
    <group name="room-picking">
      <mesh
        name="pick-plane"
        position={[FOOTPRINT.w / 2, PICK_Y, FOOTPRINT.d / 2]}
        rotation-x={-Math.PI / 2}
        visible={false}
        onPointerMove={(e) => {
          // Mouse only: while a button is down the user is orbiting, and touch has no hover.
          if (!pickable() || e.nativeEvent.buttons) hover(null);
          else hover(roomIdAt(e));
        }}
        onPointerDown={(e) => {
          // Touch: light the room under the finger while it is down. (Not for the press a label pill forwards to the camera
          // controls, which is synthetic: that finger is on a pill, and lighting the floor under it would swap dot and pill.)
          if (e.nativeEvent.isTrusted && e.nativeEvent.pointerType === 'touch' && pickable()) useStore.getState().setHoveredRoom(roomIdAt(e));
        }}
        onPointerUp={(e) => {
          if (e.nativeEvent.pointerType === 'touch') hover(null);
        }}
        onPointerOut={() => {
          if (!pillPointer.over) hover(null);
        }}
        onClick={(e) => {
          if (e.delta > TAP_SLOP || !pickable()) return;
          const id = roomIdAt(e);
          if (id) useStore.getState().goRoom(id, 'overview');
        }}
      >
        <planeGeometry args={[FOOTPRINT.w + 40, FOOTPRINT.d + 40]} />
        <meshBasicMaterial side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={rig.tint.geo} material={rig.tint.mat} position-y={TINT_Y} renderOrder={8} frustumCulled={false} raycast={NO_RAYCAST} />
      <mesh geometry={rig.floorLoop.geo} material={rig.floorLoop.mat} position-y={LOOP_Y} renderOrder={9} frustumCulled={false} raycast={NO_RAYCAST} />
      <mesh ref={topLoopMesh} geometry={rig.topLoop.geo} material={rig.topLoop.mat} renderOrder={9} frustumCulled={false} raycast={NO_RAYCAST} />
    </group>
  );
}
