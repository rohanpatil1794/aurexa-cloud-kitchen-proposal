// The one camera. drei <CameraControls> driven by the store:
//
//   store.camera       a new `camera.id` means "go here" (fly, or jump when `instant`)
//                      mode 'orbit'  normal orbit / dolly / truck
//                      mode 'look'   eye level: the orbit target sits ~0.01 ft in front of the camera along
//                                    the look direction, so dragging looks around in place, wheel/pinch zooms
//   store.autoOrbit    slow turntable around the current target, stops when the visitor drags the model
//   store.phase        'explorer' shifts the image clear of the side panel (desktop) / bottom sheet (mobile);
//                      the hero shifts it clear of the headline
//   store.cameraPath   when set, the rig samples it by `cameraPathProgress` and ignores user input (see cameraPath.ts)
//
// Poses are framed in the part of the screen the UI leaves free (data/cameras.ts fitFrame, stageLayout.ts): the camera
// dollies until the subject fits and the view offset puts it in the middle of that area, so the same preset works on
// desktop, tablet and phone, and a resized window refits. Eye level widens its lens on portrait screens (lookFov).
// Flights into, between and out of eye level are crane moves along a path (up over the walls, straight down onto the
// spot), so they never cut through geometry; the lens changes late on the way in. The store remains the only public
// API; `rig.controls` is there for non-React callers (debugging, screenshots).
import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { CameraControls } from '@react-three/drei';
import CameraControlsImpl from 'camera-controls';
import * as THREE from 'three';
import { useStore, type CameraKeyframe, type CameraMode, type CameraRequest } from '../store';
import { FOV, fitFrame, lookFov, type FreeRect, type Pose } from '../data/cameras';
import type { Vec3 } from '../data/types';
import { createPathSampler, type PathSampler } from './cameraPath';
import { CARD, explorerFree, hasRoomCard, heroFree, isSheetLayout, measureHeroText, sheetCover, topBarHeight } from './stageLayout';

const { ACTION } = CameraControlsImpl;
const DEG = Math.PI / 180;

const AUTO_ORBIT_RAD_PER_S = 0.04;
/** The hero turntable starts again this long (s) after the visitor lets go of the model. */
const AUTO_RESUME_S = 3;
/** Distance of the orbit target from the camera in look mode (ft). */
const LOOK_TARGET_DIST = 0.01;
/** Look-mode polar limits (radians from straight up): about 65 degrees up or down from the horizon. */
const LOOK_POLAR: [number, number] = [25 * DEG, 155 * DEG];
/**
 * Orbit mode never goes lower than this (radians from straight up) unless the pose itself does: a mouse reaches 10 degrees
 * above the horizon, a finger stops at 28 (a casual swipe on a phone must not flatten the model into a sliver).
 */
const ORBIT_MAX_POLAR = { mouse: 80 * DEG, touch: 62 * DEG };
/** Rotation per dragged pixel scale: a finger turns the model more gently than the mouse. */
const ORBIT_ROTATE_SPEED = { mouse: 0.8, touch: 0.4 };
const ORBIT_MIN_DISTANCE = 12;
const ORBIT_MAX_DISTANCE = 220;
/** The orbit target may truck anywhere over the plinth and a little beyond. */
const TARGET_BOUNDS = new THREE.Box3(new THREE.Vector3(-30, 0, -30), new THREE.Vector3(90, 30, 90));
/** Window resizes refit the camera once they have settled for this long (ms). */
const REFIT_DELAY_MS = 150;

/** Flights to and from eye level: height of the crane move over the walls (ft), how far ahead the eye looks (ft). */
const CRANE_HEIGHT = 16;
const GLANCE = 8;
const AHEAD = 20;
/** A flight takes 0.9 s plus its length over FLIGHT_SPEED ft/s, within these limits (s). */
const FLIGHT_SPEED = 110;
const FLIGHT_MIN_S = 1.5;
const FLIGHT_MAX_S = 2.4;
/** The lens changes over this stretch of a flight (0 = start, 1 = end): late on the way in, early on the way out. */
const FOV_IN: [number, number] = [0.55, 1];
const FOV_OUT: [number, number] = [0, 0.5];
/** Gap (px) kept between the subject of a room overview and the room card, and how much further out the camera may go to fit beside it. */
const CARD_GAP = 16;
const CARD_SHRINK_MAX = 1.3;

/** Non-React access to the live controls. The store stays the public API. */
export const rig: { controls: CameraControlsImpl | null } = { controls: null };

const damp = THREE.MathUtils.damp;
const _pos = new THREE.Vector3();
const _tgt = new THREE.Vector3();
const _free: FreeRect = { x0: 0, y0: 0, x1: 0, y1: 0 };

const lerp3 = (a: Vec3, b: Vec3, t: number): Vec3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
/** The point `dist` ft from `from` on the way to `to`. */
function toward(from: Vec3, to: Vec3, dist: number): Vec3 {
  const dx = to[0] - from[0], dy = to[1] - from[1], dz = to[2] - from[2];
  const k = dist / (Math.hypot(dx, dy, dz) || 1);
  return [from[0] + dx * k, from[1] + dy * k, from[2] + dz * k];
}

/** `request`: a new camera request. `reframe`: the layout class changed, fit the authored pose again. `refit`: the size changed, keep the heading. `settle`: the hero text appeared (a jump). */
type Apply = 'request' | 'reframe' | 'refit' | 'settle';

interface Flight {
  sampler: PathSampler;
  t: number;
  dur: number;
  fov: [number, number];
  fovAt: [number, number];
  land: () => void;
}

export function CameraRig() {
  const controlsRef = useRef<CameraControlsImpl>(null);
  const get = useThree((s) => s.get);
  // Mutable per-frame state (never React state: nothing here re-renders).
  const st = useRef({
    mode: 'orbit' as CameraMode,
    fovTarget: FOV.orbit as number,
    /** Where the framed subject's centre sits relative to the screen centre (px): the view offset adds it, see fitFrame. */
    cx: 0,
    cy: 0,
    offX: 0,
    offY: 0,
    applied: { w: 0, h: 0, x: NaN, y: NaN, fov: NaN, near: NaN },
    topBar: 0,
    /** The hero model's free area (measured around the headline when the hero opens). */
    heroFree: { x0: 0, y0: 0, x1: 1, y1: 1 } as FreeRect,
    /** Polar angle of the current orbit pose: the visitor may orbit up to it even where the mouse / touch limit is higher. */
    poseMaxPolar: 0,
    /** The visitor has orbited / zoomed since the camera last went somewhere: resizes then leave the explorer camera alone. */
    userMoved: false,
    /** The visitor stopped the hero turntable (and when they last touched the model): it starts again after a pause. */
    userStoppedAuto: false,
    lastControl: 0,
    pathSrc: null as object | null,
    sampler: null as PathSampler | null,
    pathP: 0,
    pathLive: false,
    flight: null as Flight | null,
    /** Re-enter orbit mode at the current pose (used when a camera path hands control back). */
    toOrbit: (() => {}) as (maxDistance: number) => void,
  }).current;

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    const dom = get().gl.domElement;
    const cam = get().camera as THREE.PerspectiveCamera;
    rig.controls = controls;
    if (import.meta.env.DEV) (window as unknown as { __rig?: unknown }).__rig = controls;

    controls.smoothTime = 0.6;
    controls.draggingSmoothTime = 0.12;
    controls.restThreshold = 0.005;
    controls.dollyToCursor = false; // the view offset would skew cursor-anchored zoom
    controls.setBoundary(TARGET_BOUNDS);

    const size = () => {
      const { width, height } = get().size;
      return { w: width, h: height, aspect: width / height };
    };
    /** Layout class: a change reframes from the authored pose, anything else refits the current heading. */
    const layoutKey = () => {
      const { w, h } = size();
      return `${isSheetLayout(w)}|${w < h}`;
    };
    let lastKey = layoutKey();

    const configureMode = (mode: CameraMode, aspect: number, maxDistance: number) => {
      const look = mode === 'look';
      st.mode = mode;
      st.fovTarget = look ? lookFov(aspect) : FOV.orbit;
      controls.minPolarAngle = look ? LOOK_POLAR[0] : 0;
      controls.maxPolarAngle = look ? LOOK_POLAR[1] : Math.max(ORBIT_MAX_POLAR.mouse, st.poseMaxPolar);
      controls.minDistance = look ? 0 : ORBIT_MIN_DISTANCE;
      controls.maxDistance = look ? 1 : maxDistance;
      if (look) {
        // One dragged pixel turns the view by about one screen pixel (rad/px = 2π·speed / height).
        controls.azimuthRotateSpeed = controls.polarRotateSpeed = (st.fovTarget * DEG) / (2 * Math.PI);
        controls.mouseButtons.left = ACTION.ROTATE;
        controls.mouseButtons.right = ACTION.NONE;
        controls.mouseButtons.middle = ACTION.NONE;
        controls.mouseButtons.wheel = ACTION.ZOOM;
        controls.touches.one = ACTION.TOUCH_ROTATE;
        controls.touches.two = ACTION.TOUCH_ZOOM;
        controls.touches.three = ACTION.NONE;
        controls.minZoom = 0.75;
        controls.maxZoom = 2.2;
      } else {
        controls.azimuthRotateSpeed = controls.polarRotateSpeed = ORBIT_ROTATE_SPEED.mouse;
        controls.mouseButtons.left = ACTION.ROTATE;
        controls.mouseButtons.right = ACTION.TRUCK;
        controls.mouseButtons.middle = ACTION.DOLLY;
        // The hero is part of a scrolling page: leave the wheel to the page until the explorer is entered.
        controls.mouseButtons.wheel = useStore.getState().phase === 'explorer' ? ACTION.DOLLY : ACTION.NONE;
        controls.touches.one = ACTION.TOUCH_ROTATE;
        controls.touches.two = ACTION.TOUCH_DOLLY_TRUCK;
        controls.touches.three = ACTION.TOUCH_TRUCK;
        controls.minZoom = controls.maxZoom = 1;
      }
      if (cam.zoom !== 1) void controls.zoomTo(1, true);
    };
    st.toOrbit = (maxDistance) => configureMode('orbit', size().aspect, maxDistance);

    // A finger turns the model more gently and may not drop the camera to the horizon.
    const onPointerDown = (e: PointerEvent) => {
      if (st.mode !== 'orbit') return;
      const touch = e.pointerType === 'touch';
      controls.azimuthRotateSpeed = controls.polarRotateSpeed = touch ? ORBIT_ROTATE_SPEED.touch : ORBIT_ROTATE_SPEED.mouse;
      controls.maxPolarAngle = Math.max(touch ? ORBIT_MAX_POLAR.touch : ORBIT_MAX_POLAR.mouse, st.poseMaxPolar);
    };
    dom.addEventListener('pointerdown', onPointerDown, { passive: true });

    // Only dragging (or zooming) the model ends the turntable: a tap, or a swipe the page takes over to scroll, does not.
    const onUserControl = () => {
      const s = useStore.getState();
      st.userMoved = true;
      st.lastControl = get().clock.elapsedTime;
      if (s.autoOrbit) {
        s.setAutoOrbit(false);
        st.userStoppedAuto = true;
      }
    };
    controls.addEventListener('control', onUserControl);

    /** The camera's pose right now (also mid-flight): its position, and what it looks at (AHEAD ft ahead at eye level). */
    const currentKey = (): CameraKeyframe => {
      const p = cam.position;
      if (st.mode === 'orbit' && !st.flight) {
        controls.getTarget(_tgt, false);
      } else {
        cam.getWorldDirection(_tgt).multiplyScalar(AHEAD).add(p);
      }
      return { position: [p.x, p.y, p.z], target: [_tgt.x, _tgt.y, _tgt.z] };
    };

    /** A flight cut short leaves the controls' own state stale: point it where the camera really is, in orbit mode. */
    const syncControls = () => {
      const p = cam.position;
      cam.getWorldDirection(_tgt).multiplyScalar(60).add(p);
      st.flight = null;
      controls.enabled = true;
      configureMode('orbit', size().aspect, ORBIT_MAX_DISTANCE);
      void controls.setLookAt(p.x, p.y, p.z, _tgt.x, _tgt.y, _tgt.z, false);
    };

    /** Fly along `keys`; `land` (called at the end) hands the camera back to the controls. */
    const fly = (keys: CameraKeyframe[], fov: [number, number], fovAt: [number, number], land: () => void) => {
      const sampler = createPathSampler(keys);
      if (!sampler) return land();
      let len = 0;
      for (let i = 1; i < keys.length; i++) len += _pos.set(...keys[i].position).distanceTo(_tgt.set(...keys[i - 1].position));
      controls.stop();
      controls.enabled = false;
      st.flight = { sampler, t: 0, dur: THREE.MathUtils.clamp(0.9 + len / FLIGHT_SPEED, FLIGHT_MIN_S, FLIGHT_MAX_S), fov, fovAt, land };
    };

    /** The explorer's free area, or (hero) the area clear of the headline, measured now. */
    const freeArea = (): FreeRect => {
      const s = useStore.getState();
      const { w, h } = size();
      if (s.phase === 'explorer') return explorerFree(w, h, s.sheet, st.topBar, { x0: 0, y0: 0, x1: 0, y1: 0 });
      st.heroFree = heroFree(w, h, st.topBar, measureHeroText(dom));
      return st.heroFree;
    };

    /** Eye level: jump, or crane in from the current view (over the walls, then straight down onto the spot). */
    const applyLook = (req: CameraRequest, jump: boolean) => {
      const { aspect } = size();
      const eye = req.position;
      const aim = toward(eye, req.target, AHEAD);
      const glance = toward(eye, req.target, GLANCE);
      const from = currentKey();
      const fromLook = st.mode === 'look' || st.flight !== null;
      st.cx = st.cy = 0;
      const land = () => {
        st.flight = null;
        controls.enabled = true;
        configureMode('look', aspect, 1);
        const t = toward(eye, req.target, LOOK_TARGET_DIST);
        void controls.setLookAt(eye[0], eye[1], eye[2], t[0], t[1], t[2], false);
      };
      if (jump || (fromLook && _pos.set(...from.position).distanceTo(_tgt.set(...eye)) < 0.5)) return land();
      const above: Vec3 = [eye[0], CRANE_HEIGHT, eye[2]];
      let via: CameraKeyframe;
      if (fromLook) via = { position: [from.position[0], CRANE_HEIGHT, from.position[2]], target: glance };
      else {
        const mid = lerp3(from.position, above, 0.5);
        mid[1] = Math.max(mid[1], CRANE_HEIGHT + 4);
        via = { position: mid, target: lerp3(from.target, glance, 0.5) };
      }
      fly([from, via, { position: above, target: glance }, { position: eye, target: aim }], [cam.fov, lookFov(aspect)], fromLook ? [0, 1] : FOV_IN, land);
    };

    /** Orbit: frame the pose in the free area, then spring there, or (out of a room) crane out over the walls. */
    const applyOrbit = (req: CameraRequest, kind: Apply, jump: boolean) => {
      const s = useStore.getState();
      const { w, h, aspect } = size();
      const refit = kind === 'refit';
      const free = freeArea();
      let pose: Pose = { position: req.position, target: req.target, frame: req.frame ?? undefined };
      if (refit && pose.frame) {
        // Same layout class: keep the heading the camera is going to (or the visitor orbited to), change only the distance
        // and the shift.
        controls.getPosition(_pos, true);
        controls.getTarget(_tgt, true);
        pose = { position: [_pos.x, _pos.y, _pos.z], target: [_tgt.x, _tgt.y, _tgt.z], frame: pose.frame };
      }
      let framed = fitFrame(pose, w, h, free, refit);
      st.cx = framed.cx;
      st.cy = framed.cy;
      // A room overview keeps clear of the room card (bottom-left of the desktop stage). Best: fit the room into the area
      // right of the card, if that costs it no more than CARD_SHRINK_MAX x the distance; else shift it right or up.
      if (s.selectedRoom && !req.preset && hasRoomCard(w, h) && pose.frame) {
        const midX = (free.x0 + free.x1) / 2, midY = (free.y0 + free.y1) / 2;
        const left = midX - framed.width / 2, bottom = midY + framed.height / 2;
        if (left < CARD.w + CARD_GAP && bottom > h - CARD.h - CARD_GAP) {
          const clear: FreeRect = { ...free, x0: CARD.w + CARD_GAP };
          const [tx, ty, tz] = pose.target;
          const reach = (p: Vec3) => Math.hypot(p[0] - tx, p[1] - ty, p[2] - tz);
          const beside = fitFrame(pose, w, h, clear, refit);
          if (reach(beside.position) <= reach(framed.position) * CARD_SHRINK_MAX) {
            framed = beside;
            st.cx = beside.cx + midX - (clear.x0 + clear.x1) / 2;
            st.cy = beside.cy;
          } else {
            const right = CARD.w + CARD_GAP - left;
            const up = bottom - (h - CARD.h - CARD_GAP);
            const fitsRight = midX + right + framed.width / 2 <= free.x1;
            const fitsUp = midY - up - framed.height / 2 >= free.y0;
            if (fitsRight && (!fitsUp || right <= up)) st.cx -= right;
            else if (fitsUp) st.cy += up;
            else st.cx -= Math.max(0, free.x1 - (midX + framed.width / 2));
          }
        }
      }

      const [tx, ty, tz] = pose.target;
      const [px, py, pz] = framed.position;
      const dist = Math.hypot(px - tx, py - ty, pz - tz);
      st.poseMaxPolar = Math.acos(THREE.MathUtils.clamp((py - ty) / dist, -1, 1)) + 1.5 * DEG;
      const maxDistance = Math.max(ORBIT_MAX_DISTANCE, dist * 1.25);

      const atRoom = st.mode === 'look' && !st.flight;
      if (st.flight) syncControls();
      if (atRoom && !jump) {
        // Out of a room: up over the walls (they drop on the way), then across to the new view.
        const from = currentKey();
        const seen = toward(from.position, from.target, GLANCE);
        const up: Vec3 = [from.position[0], CRANE_HEIGHT, from.position[2]];
        const across: Vec3 = lerp3(up, framed.position, 0.5);
        across[1] = Math.max(across[1], CRANE_HEIGHT);
        const keys: CameraKeyframe[] = [
          from,
          { position: up, target: seen },
          { position: across, target: lerp3(seen, pose.target, 0.5) },
          { position: framed.position, target: pose.target },
        ];
        fly(keys, [cam.fov, FOV.orbit], FOV_OUT, () => {
          st.flight = null;
          controls.enabled = true;
          configureMode('orbit', aspect, maxDistance);
          void controls.setLookAt(px, py, pz, tx, ty, tz, false);
        });
        return;
      }
      if (st.mode !== 'orbit' || jump) configureMode('orbit', aspect, maxDistance);
      else {
        controls.maxDistance = maxDistance;
        controls.maxPolarAngle = Math.max(ORBIT_MAX_POLAR.mouse, st.poseMaxPolar);
      }
      void controls.setLookAt(px, py, pz, tx, ty, tz, !jump);
    };

    const apply = (req: CameraRequest, kind: Apply) => {
      const s = useStore.getState();
      if (s.cameraPath) return;
      if (kind === 'refit' && (st.flight || st.mode !== req.mode)) return;
      st.topBar = topBarHeight(dom);
      if (kind === 'request') st.userMoved = false;
      const jump = (req.instant && kind === 'request') || kind === 'settle' || s.reducedMotion;
      if (req.mode === 'look') {
        if (kind === 'refit') {
          // Same room: only the lens follows the new aspect.
          st.fovTarget = lookFov(size().aspect);
          controls.azimuthRotateSpeed = controls.polarRotateSpeed = (st.fovTarget * DEG) / (2 * Math.PI);
        } else applyLook(req, jump || kind === 'reframe');
      } else applyOrbit(req, kind, jump);
    };

    // Coalesce: enterSpace() changes phase and camera in one tick and must produce a single apply.
    let queued: Apply | null = null;
    const queueApply = (kind: Apply) => {
      const pending = queued !== null;
      // A new request wins over a reframe, a reframe over a refit.
      if (!pending || kind === 'request' || (kind === 'reframe' && queued === 'refit')) queued = kind;
      if (pending) return;
      queueMicrotask(() => {
        const k = queued!;
        queued = null;
        apply(useStore.getState().camera, k);
      });
    };

    apply(useStore.getState().camera, 'request');
    const unsub = useStore.subscribe((s, prev) => {
      if (s.camera !== prev.camera) queueApply('request');
      else if (s.phase !== prev.phase) queueApply(prev.phase === 'loading' ? 'settle' : 'reframe');
      // The phone sheet moved between peek and half: the strip it leaves free changed size. (Full is framed like half.)
      else if (s.sheet !== prev.sheet && s.phase === 'explorer' && !st.userMoved && sheetCover(size().h, s.sheet) !== sheetCover(size().h, prev.sheet)) queueApply('refit');
    });

    // Resizes (window drags, devtools, split screen, a rotated phone) refit once they settle: a new layout class reframes
    // from the authored pose; otherwise the explorer leaves a visitor's own orbit and zoom alone (the hero always refits,
    // keeping the angle).
    let resizeTimer = 0;
    const onResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        const key = layoutKey();
        if (key !== lastKey) {
          lastKey = key;
          st.userMoved = false;
          queueApply('reframe');
        } else if (!st.userMoved || useStore.getState().phase !== 'explorer') queueApply('refit');
      }, REFIT_DELAY_MS);
    };
    window.addEventListener('resize', onResize);

    return () => {
      unsub();
      window.clearTimeout(resizeTimer);
      window.removeEventListener('resize', onResize);
      dom.removeEventListener('pointerdown', onPointerDown);
      controls.removeEventListener('control', onUserControl);
      if (rig.controls === controls) rig.controls = null;
    };
  }, [get, st]);

  // Priority -0.5: after drei's controls.update (-1), before default (0) callbacks; never takes over rendering.
  useFrame((state, rawDt) => {
    const controls = controlsRef.current;
    if (!controls) return;
    const dt = Math.min(rawDt, 0.1);
    const s = useStore.getState();
    const cam = state.camera as THREE.PerspectiveCamera;

    // ---- camera path (stub for the scroll-driven walkthrough) ---------------------------------------
    if (s.cameraPath !== st.pathSrc) {
      st.pathSrc = s.cameraPath;
      st.sampler = s.cameraPath ? createPathSampler(s.cameraPath.keyframes) : null;
      st.pathP = s.cameraPathProgress;
    }
    if (st.sampler) {
      if (!st.pathLive) {
        st.pathLive = true;
        st.flight = null;
        controls.enabled = false;
        st.fovTarget = FOV.orbit;
        if (s.autoOrbit) s.setAutoOrbit(false);
      }
      st.pathP = s.reducedMotion ? s.cameraPathProgress : damp(st.pathP, s.cameraPathProgress, 7, dt);
      st.sampler.sample(st.pathP, _pos, _tgt);
      cam.position.copy(_pos);
      cam.lookAt(_tgt);
    } else if (st.pathLive) {
      // Path ended: hand the camera back to the controls at the pose it stopped on.
      st.pathLive = false;
      controls.enabled = true;
      void controls.setLookAt(_pos.x, _pos.y, _pos.z, _tgt.x, _tgt.y, _tgt.z, false);
      st.toOrbit(Math.max(ORBIT_MAX_DISTANCE, _pos.distanceTo(_tgt) * 1.25));
    } else if (st.flight) {
      // ---- eye-level flight: along the path, eased, the lens on its own schedule ----------------------
      const f = st.flight;
      f.t = Math.min(f.dur, f.t + dt);
      const u = THREE.MathUtils.smoothstep(f.t / f.dur, 0, 1);
      f.sampler.sample(u, _pos, _tgt);
      cam.position.copy(_pos);
      cam.lookAt(_tgt);
      st.fovTarget = THREE.MathUtils.lerp(f.fov[0], f.fov[1], THREE.MathUtils.smoothstep(u, f.fovAt[0], f.fovAt[1]));
      if (f.t >= f.dur) f.land();
    } else if (s.autoOrbit && !s.reducedMotion) {
      void controls.rotate(AUTO_ORBIT_RAD_PER_S * dt, 0, true);
    } else if (st.userStoppedAuto && s.phase === 'hero' && !s.reducedMotion && state.clock.elapsedTime - st.lastControl > AUTO_RESUME_S) {
      // The visitor let go of the hero model: the turntable carries on.
      st.userStoppedAuto = false;
      s.setAutoOrbit(true);
    }

    // ---- view offset: put the subject in the middle of the area the UI leaves free ----------------------
    const { width: w, height: h } = state.size;
    const free = s.phase === 'explorer' ? explorerFree(w, h, s.sheet, st.topBar, _free) : st.heroFree;
    // Eye level fills the whole stage (the bar is translucent); everything else keeps clear of it.
    const top = s.camera.mode === 'look' ? 0 : free.y0;
    const ox = w / 2 - (free.x0 + free.x1) / 2 + st.cx;
    const oy = h / 2 - (top + free.y1) / 2 + st.cy;
    if (s.reducedMotion) { st.offX = ox; st.offY = oy; }
    else {
      st.offX = Math.abs(st.offX - ox) < 0.05 ? ox : damp(st.offX, ox, 5, dt);
      st.offY = Math.abs(st.offY - oy) < 0.05 ? oy : damp(st.offY, oy, 5, dt);
    }

    // ---- lens (a dolly-zoom between aerial and eye level) and near plane ------------------------------
    cam.fov = Math.abs(cam.fov - st.fovTarget) < 0.01 ? st.fovTarget : damp(cam.fov, st.fovTarget, 4, dt);
    // The near plane grows with orbit distance (with height during a flight): no z-fighting from far away, no wall
    // clipping at eye level.
    const dist = st.pathLive ? _pos.distanceTo(_tgt) : st.flight ? cam.position.y : controls.distance;
    const near = THREE.MathUtils.clamp(dist * 0.012, 0.08, 1.5);

    const a = st.applied;
    if (a.w !== w || a.h !== h || a.x !== st.offX || a.y !== st.offY || a.fov !== cam.fov || Math.abs(a.near - near) > a.near * 0.05) {
      a.w = w; a.h = h; a.x = st.offX; a.y = st.offY; a.fov = cam.fov; a.near = near;
      cam.near = near;
      // setViewOffset(fullW, fullH, x, y, w, h): a positive x / y slides the image left / up.
      if (st.offX === 0 && st.offY === 0) cam.clearViewOffset();
      else cam.setViewOffset(w, h, st.offX, st.offY, w, h);
      cam.updateProjectionMatrix();
    }
  }, -0.5);

  return <CameraControls ref={controlsRef} />;
}
