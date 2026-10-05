// Camera-path API for the scroll-driven walkthrough (stub wired end to end, no path authored yet). The sampler is also what
// CameraRig flies the crane moves into, between and out of eye level along (it keeps its own clock there).
//
//   import { cameraPath } from './scene/cameraPath';
//   cameraPath.start({ keyframes: [{ position, target }, ...] });  // CameraRig takes over the camera
//   const stop = cameraPath.bindScroll(document.getElementById('stage-wrap')!);  // progress follows scroll
//   ...
//   stop(); cameraPath.stop();                                      // hand control back to the user
//
// The store stays the only public state (`cameraPath`, `cameraPathProgress`); this file only wraps it
// and holds the sampler CameraRig uses.
import * as THREE from 'three';
import type { CameraKeyframe, CameraPath } from '../store';
import { useStore } from '../store';

/** Position / target sampler over a keyframe list: Catmull-Rom splines, no per-call allocation. */
export interface PathSampler {
  /** Write the pose at progress `t` (0..1) into `position` and `target`. */
  sample(t: number, position: THREE.Vector3, target: THREE.Vector3): void;
}

export function createPathSampler(keyframes: CameraKeyframe[]): PathSampler | null {
  if (keyframes.length < 2) return null;
  const pos = new THREE.CatmullRomCurve3(keyframes.map((k) => new THREE.Vector3(...k.position)), false, 'centripetal');
  const tgt = new THREE.CatmullRomCurve3(keyframes.map((k) => new THREE.Vector3(...k.target)), false, 'centripetal');
  return {
    sample(t, position, target) {
      const u = Math.min(1, Math.max(0, t));
      pos.getPointAt(u, position);
      tgt.getPointAt(u, target);
    },
  };
}

export const cameraPath = {
  /** Start driving the camera along `path` (progress resets to 0). User input is disabled meanwhile. */
  start(path: CameraPath): void {
    useStore.getState().setCameraPath(path);
  },
  /** Stop and give the camera back to the user, at the pose the path ended on. */
  stop(): void {
    useStore.getState().setCameraPath(null);
  },
  /** 0..1 along the path. */
  setProgress(t: number): void {
    useStore.getState().setCameraPathProgress(t);
  },
  /**
   * Map the scroll position through `el` to progress: 0 when its top meets the viewport top, 1 when its
   * bottom meets the viewport bottom (i.e. the sticky stage's travel inside #stage-wrap). Returns an unsubscribe.
   */
  bindScroll(el: HTMLElement): () => void {
    const update = () => {
      const r = el.getBoundingClientRect();
      const travel = r.height - window.innerHeight;
      cameraPath.setProgress(travel > 0 ? -r.top / travel : 0);
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  },
};
