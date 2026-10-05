import { useEffect, useState } from 'react';

/** Narrow viewport (phone). Matches the Tailwind `md` breakpoint. */
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
