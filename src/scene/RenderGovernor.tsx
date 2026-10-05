// Frame budget for the one Canvas: WHEN to draw (the canvas runs frameloop 'demand') and HOW sharp (pixel ratio).
//
//  - <RenderGovernor/> keeps frames coming only while something is changing: a store change (layers, selection, hover,
//    lighting, camera request ...) or the camera moving, each for SETTLE_MS, or a continuous animation (flow ribbons,
//    safety pulses, the hero turntable). The selected room's breathing outline only needs ~30 fps. A static explorer
//    draws nothing, so it costs no CPU / GPU / battery.
//  - it also times the frames of those continuous runs and steps the pixel ratio down a tier when they are slow
//    (and probes back up later). drei's PerformanceMonitor cannot do this under 'demand': it reads every idle gap as a slow frame.
//  - <BootGate/> compiles every shader program asynchronously before the first frame (KHR_parallel_shader_compile) and
//    then reads each program's uniform / attribute table in small slices, so the main thread - and the loading splash -
//    never block on the 2-3 s of synchronous program links, nor on the ~1 s of first-use introspection three does lazily.
import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import type { PerspectiveCamera } from 'three';
import { FLOW_LAYERS, useStore, type AppState } from '../store';
import { onContextRestored } from './lightState';

/** A change keeps frames coming this long: the slowest ease is the Day / Evening toggle (about 2.4 s to settle). */
const SETTLE_MS = 3000;
/**
 * The camera moving does the same, for a little longer: the rig also acts on timers (the hero turntable resumes 3 s after
 * the visitor lets go) and a frame has to come after them.
 */
const CAMERA_SETTLE_MS = 3600;
/** Frame interval of the selection outline's pulse (it is the only thing moving while a room is selected and the camera rests). */
const PULSE_MS = 33;
/** Camera components (ft, degrees, px, quaternion units) closer than this are "not moving": the rig's maths jitters by an ulp every frame. */
const POSE_EPS = 5e-4;
/** Gives up waiting for the shader compile (a driver that never reports completion) after this long. */
const COMPILE_TIMEOUT_MS = 12000;
/** The warm-up of the program tables yields to the browser after this long a slice. */
const WARM_SLICE_MS = 10;
const yieldToMain = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

/** Pixel-ratio ladder. Tier 0 supersamples on 1x desktop screens (thin rails and pipes alias at dpr 1). */
export const MAX_TIER = 2;
/** Never render more pixels than this (about 4K at dpr 1): a 1.5x supersampled 4K window would need ~300 MB of MSAA buffers. */
const MAX_PIXELS = 8.5e6;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** True while a layer or the turntable animates by itself (nothing in the store changes while it runs). */
function animating(s: AppState): boolean {
  if (s.reducedMotion) return false;
  if (s.autoOrbit || s.layers.safety) return true;
  for (let i = 0; i < FLOW_LAYERS.length; i++) if (s.layers[FLOW_LAYERS[i]]) return true;
  return false;
}

export function pixelRatio(tier: number, mobile: boolean, width: number, height: number): number {
  const native = typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1;
  const base = mobile ? clamp(native, 1, 1.5) : clamp(native, 1.5, 2);
  const wanted = tier === 0 ? base : tier === 1 ? Math.min(base, 1.25) : 1;
  const budget = Math.sqrt(MAX_PIXELS / Math.max(1, width * height));
  return Math.max(1, Math.min(wanted, budget));
}

/** Frame-time monitor tuning. Only frames of a continuous run count (an idle gap is not a slow frame). */
const WARMUP_FRAMES = 45;
/** A window ends after this many frames or this many ms, whichever comes first (and at least MIN_WINDOW_FRAMES). */
const WINDOW_FRAMES = 40;
const WINDOW_MS = 800;
const MIN_WINDOW_FRAMES = 6;
/** Mean frame interval above this (about 37 fps) in two windows in a row steps the quality down. */
const SLOW_MS = 27;
const PROBE_AFTER_MS = 25000;
const MAX_FAILED_PROBES = 2;

interface Props {
  tier: number;
  mobile: boolean;
  /** Pinned by ?quality= : never changes tier. */
  pinned: boolean;
  onTier: (tier: number) => void;
}

export function RenderGovernor({ tier, mobile, pinned, onTier }: Props) {
  const invalidate = useThree((s) => s.invalidate);
  const setDpr = useThree((s) => s.setDpr);
  const size = useThree((s) => s.size);

  const st = useRef({
    until: 0,
    last: 0,
    timer: 0,
    continued: false,
    pose: new Float64Array(12),
    cur: new Float64Array(12),
    // quality monitor
    skip: WARMUP_FRAMES,
    n: 0,
    sum: 0,
    slow: 0,
    changedAt: 0,
    probing: false,
    failedProbes: 0,
  }).current;

  useEffect(() => {
    const bump = () => {
      st.until = performance.now() + SETTLE_MS;
      invalidate();
    };
    bump();
    // Any store change may move something (a layer fading, a hover, a flight, the key light ...).
    const offStore = useStore.subscribe(bump);
    const offContext = onContextRestored(bump);
    document.addEventListener('visibilitychange', bump); // the tab is back: draw once more even if nothing changed
    return () => {
      offStore();
      offContext();
      document.removeEventListener('visibilitychange', bump);
      window.clearTimeout(st.timer);
    };
  }, [st, invalidate]);

  // Apply the pixel ratio for this tier. (The Canvas gets the tier-0 ratio as its initial `dpr`.)
  const dpr = pixelRatio(tier, mobile, size.width, size.height);
  useEffect(() => {
    setDpr(dpr);
    st.skip = 20; // the resize is a hitch, not a measurement
    st.n = 0;
    st.sum = 0;
    st.slow = 0;
  }, [dpr, setDpr, st]);

  useFrame((state) => {
    const now = performance.now();
    const s = useStore.getState();

    let busy = now < st.until || animating(s);

    const cam = state.camera as PerspectiveCamera;
    const c = st.cur;
    c[0] = cam.position.x; c[1] = cam.position.y; c[2] = cam.position.z;
    c[3] = cam.quaternion.x; c[4] = cam.quaternion.y; c[5] = cam.quaternion.z; c[6] = cam.quaternion.w;
    c[7] = cam.fov; c[8] = cam.zoom; c[9] = cam.view?.offsetX ?? 0; c[10] = cam.view?.offsetY ?? 0; c[11] = cam.aspect;
    for (let i = 0; i < c.length; i++) {
      if (Math.abs(c[i] - st.pose[i]) > POSE_EPS) {
        st.pose[i] = c[i];
        st.until = Math.max(st.until, now + CAMERA_SETTLE_MS);
        busy = true;
      }
    }

    if (st.continued && !pinned) sample(now - st.last);
    st.last = now;
    st.continued = busy;
    if (busy) state.invalidate();
    else if (s.selectedRoom && !s.reducedMotion && !st.timer) {
      st.timer = window.setTimeout(() => {
        st.timer = 0;
        invalidate();
      }, PULSE_MS);
    }
  });

  function sample(dt: number) {
    if (st.skip > 0) {
      st.skip--;
      return;
    }
    if (dt > 1000) return; // a paused tab, not a frame
    st.sum += Math.min(dt, 250);
    if (++st.n < MIN_WINDOW_FRAMES || (st.n < WINDOW_FRAMES && st.sum < WINDOW_MS)) return;
    const mean = st.sum / st.n;
    st.n = 0;
    st.sum = 0;
    const now = performance.now();
    if (mean > SLOW_MS) {
      if (++st.slow >= 2 && tier < MAX_TIER) {
        st.slow = 0;
        if (st.probing) st.failedProbes++;
        st.probing = false;
        st.changedAt = now;
        onTier(tier + 1);
      }
    } else {
      st.slow = 0;
      if (st.probing && now - st.changedAt > 8000) st.probing = false;
      if (tier > 0 && !st.probing && st.failedProbes < MAX_FAILED_PROBES && now - st.changedAt > PROBE_AFTER_MS) {
        st.probing = true;
        st.changedAt = now;
        onTier(tier - 1);
      }
    }
  }

  return null;
}

/**
 * Shader programs for the mounted scene (hidden layers included), without blocking the main thread:
 *  - every group the Scene commits starts its programs linking at once (in the GPU process, in parallel), while the main
 *    thread goes on building the next group;
 *  - when everything is built it waits for the last links, then reads the uniform tables (three does that lazily inside
 *    the first draw: ~30 ms a program on this machine, 1 s in all), then reports.
 * Rendering is held back ('never') until then, so the first frame has nothing left to prepare.
 */
export function BootGate({ stage, built, onCompiled }: { stage: number; built: boolean; onCompiled: () => void }) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);

  useEffect(() => {
    if (stage > 0 && !built) gl.compile(scene, camera);
  }, [gl, scene, camera, stage, built]);

  useEffect(() => {
    if (!built) return;
    let alive = true;
    const done = () => {
      if (alive) onCompiled();
    };
    const warm = async () => {
      let start = performance.now();
      for (const program of gl.info.programs ?? []) {
        if (!alive) return;
        program.getUniforms();
        program.getAttributes();
        if (performance.now() - start > WARM_SLICE_MS) {
          await yieldToMain();
          start = performance.now();
        }
      }
    };
    const timer = window.setTimeout(done, COMPILE_TIMEOUT_MS);
    gl.compileAsync(scene, camera).then(warm).then(done, done);
    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, [gl, scene, camera, built, onCompiled]);

  return null;
}
