// The one camera. drei <CameraControls> driven by the store:
//
//   store.camera       a new `camera.id` means "go here" (fly, or jump when `instant`)
//                      mode 'orbit'  normal orbit / dolly / truck
//                      mode 'look'   eye level: the orbit target sits ~0.01 ft in front of the camera along
//                                    the look direction, so dragging looks around in place, wheel/pinch zooms
//   store.autoOrbit    slow turntable around the current target, stops on any touch or flyTo
//   store.phase        'explorer' shifts the image clear of the side panel (desktop) / bottom sheet (mobile)
//   store.cameraPath   when set, the rig samples it by `cameraPathProgress` and ignores user input (see cameraPath.ts)
//
// Poses are adapted to the viewport: narrow or panel-reduced viewports dolly out (data/cameras.ts fitOrbitPose),
// eye level widens its lens on portrait screens. The store remains the only public API; `rig.controls` is
// there for non-React callers (debugging, screenshots).
import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { CameraControls } from '@react-three/drei';
import CameraControlsImpl from 'camera-controls';
import * as THREE from 'three';
import { useStore, type CameraMode, type CameraRequest } from '../store';
import {
  DEFAULT_FIT_ASPECT, DESKTOP_MIN_WIDTH, FIT_ASPECT, FOV, FRAME_LIFT, HERO_POSE, PANEL_WIDTH, fitOrbitPose, lookFov,
} from '../data/cameras';
import { createPathSampler, type PathSampler } from './cameraPath';

const { ACTION } = CameraControlsImpl;
const DEG = Math.PI / 180;

const AUTO_ORBIT_RAD_PER_S = 0.04;
/** Distance of the orbit target from the camera in look mode (ft). */
const LOOK_TARGET_DIST = 0.01;
/** Look-mode polar limits (radians from straight up): about 65 degrees up or down from the horizon. */
const LOOK_POLAR: [number, number] = [25 * DEG, 155 * DEG];
/** Orbit mode never goes under the ground: just short of the horizon. */
const ORBIT_MAX_POLAR = 88 * DEG;
const ORBIT_MIN_DISTANCE = 12;
const ORBIT_MAX_DISTANCE = 220;
/** The orbit target may truck anywhere over the plinth and a little beyond. */
const TARGET_BOUNDS = new THREE.Box3(new THREE.Vector3(-30, 0, -30), new THREE.Vector3(90, 30, 90));
/** Mobile bottom sheet: how far (fraction of viewport height) the image rides up per sheet state. */
const SHEET_LIFT = { peek: 0.07, half: 0.2, full: 0.2 } as const;

/** Non-React access to the live controls. The store stays the public API. */
export const rig: { controls: CameraControlsImpl | null } = { controls: null };

const damp = THREE.MathUtils.damp;
const _pos = new THREE.Vector3();
const _tgt = new THREE.Vector3();

export function CameraRig() {
  const controlsRef = useRef<CameraControlsImpl>(null);
  const get = useThree((s) => s.get);
  // Mutable per-frame state (never React state: nothing here re-renders).
  const st = useRef({
    fovTarget: FOV.orbit as number,
    /** Extra upward image shift (fraction of viewport height) for the current pose, see FRAME_LIFT. */
    lift: 0,
    offX: 0,
    offY: 0,
    applied: { w: 0, h: 0, x: NaN, y: NaN, fov: NaN, near: NaN },
    pathSrc: null as object | null,
    sampler: null as PathSampler | null,
    pathP: 0,
    pathLive: false,
    /** Re-enter orbit mode at the current pose (used when a camera path hands control back). */
    toOrbit: (() => {}) as (maxDistance: number) => void,
  }).current;

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    const dom = get().gl.domElement;
    rig.controls = controls;
    if (import.meta.env.DEV) (window as unknown as { __rig?: unknown }).__rig = controls;

    controls.smoothTime = 0.6;
    controls.draggingSmoothTime = 0.12;
    controls.restThreshold = 0.005;
    controls.dollyToCursor = false; // the view offset would skew cursor-anchored zoom
    controls.setBoundary(TARGET_BOUNDS);

    const layout = () => {
      const { width, height } = get().size;
      const aspect = width / height;
      const panel = useStore.getState().phase === 'explorer' && width >= DESKTOP_MIN_WIDTH;
      return { mobile: width < DESKTOP_MIN_WIDTH, aspect, freeAspect: panel ? (width - PANEL_WIDTH) / height : aspect };
    };

    const configureMode = (mode: CameraMode, aspect: number, maxDistance: number) => {
      const look = mode === 'look';
      st.fovTarget = look ? lookFov(aspect) : FOV.orbit;
      controls.minPolarAngle = look ? LOOK_POLAR[0] : 0;
      controls.maxPolarAngle = look ? LOOK_POLAR[1] : ORBIT_MAX_POLAR;
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
        controls.azimuthRotateSpeed = controls.polarRotateSpeed = 0.8;
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
      if ((get().camera as THREE.PerspectiveCamera).zoom !== 1) void controls.zoomTo(1, true);
    };
    st.toOrbit = (maxDistance) => configureMode('orbit', layout().aspect, maxDistance);

    /** `refit` = re-fly the current request because the layout changed (panel opened, phone rotated...). */
    const apply = (req: CameraRequest, refit: boolean) => {
      if (useStore.getState().cameraPath) return;
      const { aspect, freeAspect, mobile } = layout();
      const animate = !(req.instant && !refit) && !useStore.getState().reducedMotion;
      const [tx, ty, tz] = req.target;
      const hero = req.position === HERO_POSE.position;
      st.lift = req.mode === 'look' || mobile ? 0 : hero ? FRAME_LIFT.hero : req.preset === 'aerial' ? FRAME_LIFT.aerial : 0;

      if (req.mode === 'look') {
        configureMode('look', aspect, 1);
        const [px, py, pz] = req.position;
        const dx = tx - px, dy = ty - py, dz = tz - pz;
        const k = LOOK_TARGET_DIST / (Math.hypot(dx, dy, dz) || 1);
        void controls.setLookAt(px, py, pz, px + dx * k, py + dy * k, pz + dz * k, animate);
        return;
      }

      const reframe = hero || req.preset === 'aerial';
      const fitAspect = req.preset ? FIT_ASPECT[req.preset] : DEFAULT_FIT_ASPECT;
      const pose = fitOrbitPose({ position: req.position, target: req.target }, freeAspect, fitAspect, reframe);
      const dist = Math.hypot(pose.position[0] - tx, pose.position[1] - ty, pose.position[2] - tz);
      configureMode('orbit', aspect, Math.max(ORBIT_MAX_DISTANCE, dist * 1.25));
      void controls.setLookAt(...pose.position, tx, ty, tz, animate);
    };

    // Coalesce: enterSpace() changes phase and camera in one tick and must produce a single apply.
    // `queued` = null (nothing pending) or whether the pending apply is a layout refit.
    let queued: boolean | null = null;
    const queueApply = (refit: boolean) => {
      const pending = queued !== null;
      queued = pending ? queued! && refit : refit;
      if (pending) return;
      queueMicrotask(() => {
        const r = queued!;
        queued = null;
        apply(useStore.getState().camera, r);
      });
    };

    apply(useStore.getState().camera, false);
    const unsub = useStore.subscribe((s, prev) => {
      if (s.camera !== prev.camera) queueApply(false);
      else if (s.phase !== prev.phase) queueApply(true);
    });

    // Rotating a phone / crossing the mobile breakpoint re-frames; ordinary window drags do not.
    const layoutKey = () => {
      const l = layout();
      return `${l.mobile}|${l.aspect < 1}`;
    };
    let lastKey = layoutKey();
    const onResize = () => {
      const key = layoutKey();
      if (key === lastKey) return;
      lastKey = key;
      queueApply(true);
    };
    window.addEventListener('resize', onResize);

    // Any direct interaction ends the turntable.
    const stopAuto = () => {
      if (useStore.getState().autoOrbit) useStore.getState().setAutoOrbit(false);
    };
    dom.addEventListener('pointerdown', stopAuto, { passive: true });
    dom.addEventListener('wheel', stopAuto, { passive: true });

    return () => {
      unsub();
      window.removeEventListener('resize', onResize);
      dom.removeEventListener('pointerdown', stopAuto);
      dom.removeEventListener('wheel', stopAuto);
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
    } else if (s.autoOrbit && !s.reducedMotion) {
      void controls.rotate(AUTO_ORBIT_RAD_PER_S * dt, 0, true);
    }

    // ---- view offset: keep the model centred in the area the UI leaves free ---------------------------
    const { width: w, height: h } = state.size;
    let ox = 0, oy = h * st.lift;
    if (s.phase === 'explorer') {
      if (w < DESKTOP_MIN_WIDTH) oy += h * SHEET_LIFT[s.sheet];
      else ox = PANEL_WIDTH / 2;
    }
    if (s.reducedMotion) { st.offX = ox; st.offY = oy; }
    else {
      st.offX = Math.abs(st.offX - ox) < 0.05 ? ox : damp(st.offX, ox, 5, dt);
      st.offY = Math.abs(st.offY - oy) < 0.05 ? oy : damp(st.offY, oy, 5, dt);
    }

    // ---- lens (a dolly-zoom between aerial and eye level) and near plane ------------------------------
    cam.fov = Math.abs(cam.fov - st.fovTarget) < 0.01 ? st.fovTarget : damp(cam.fov, st.fovTarget, 4, dt);
    // The near plane grows with orbit distance: no z-fighting from far away, no wall clipping at eye level.
    const dist = st.pathLive ? _pos.distanceTo(_tgt) : controls.distance;
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
