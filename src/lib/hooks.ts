import { useEffect, useState, useSyncExternalStore } from 'react';
import { isSheetLayout } from '../data/cameras';

/** Narrow viewport (phone). Matches the Tailwind `md` breakpoint: the top bar's burger menu follows it. */
export function useIsMobile(): boolean {
  const q = '(max-width: 767px)';
  const [m, setM] = useState(() => (typeof window !== 'undefined' ? window.matchMedia(q).matches : false));
  useEffect(() => {
    const mq = window.matchMedia(q);
    const on = () => setM(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return m;
}

/** The stage's size in px: the box the 3D canvas (and so the camera's framing) fills; the window until the stage exists. */
function stageSize(): [number, number] {
  const el = typeof document !== 'undefined' ? document.getElementById('stage') : null;
  return el && el.clientWidth > 0 ? [el.clientWidth, el.clientHeight] : [window.innerWidth, window.innerHeight];
}

const subscribeResize = (notify: () => void) => {
  window.addEventListener('resize', notify);
  window.addEventListener('orientationchange', notify);
  return () => {
    window.removeEventListener('resize', notify);
    window.removeEventListener('orientationchange', notify);
  };
};
const sheetLayoutNow = () => isSheetLayout(...stageSize());

/**
 * The explorer's layout: the bottom sheet (phones, portrait tablets) or the side panel. It applies the same rule
 * (data/cameras.ts isSheetLayout) to the same box (the stage) that scene/CameraRig frames the model in, so the UI, the free
 * area the camera fits the model into and the labels' keep-out areas always agree.
 */
export function useSheetLayout(): boolean {
  return useSyncExternalStore(subscribeResize, sheetLayoutNow, () => false);
}

/** Non-reactive check, for one-off decisions (shadow map size, dpr cap). */
export function isMobileNow(): boolean {
  return typeof window !== 'undefined' && (window.matchMedia('(max-width: 767px)').matches || window.matchMedia('(pointer: coarse)').matches);
}

export function webglAvailable(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}
