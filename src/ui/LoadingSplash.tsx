import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { useStore } from '../store';

/** Shortest time the splash stays up, so a fast load does not flash it. */
const MIN_VISIBLE_MS = 900;
const FADE_S = 0.7;

/**
 * The splash waits for the scene's first frames, and the canvas draws only while the stage is on screen. A page that boots with
 * the stage off screen (a reload mid-page restores the scroll position, a link or a script scrolls during the boot) would keep
 * the splash over the whole page for good, so the splash goes as soon as the stage is seen to be off screen, wherever the
 * reader is. The scene keeps building behind the page (the shader compile needs no frames) and draws when the stage scrolls
 * back into view. An observer rather than a one-off check: the browser restores the scroll position after first paint.
 */
function useReleaseWhenStageOffscreen() {
  useEffect(() => {
    const stage = document.getElementById('stage');
    if (!stage || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([entry]) => {
      const s = useStore.getState();
      if (s.phase !== 'loading') return io.disconnect();
      if (!entry.isIntersecting) s.setSceneReady(true);
    });
    io.observe(stage);
    return () => io.disconnect();
  }, []);
}

/**
 * Full-screen brand splash while the 3D scene starts. Images only (the real mark and wordmark cuts),
 * so it paints before any web font arrives. Portalled to <body> so it covers the top bar too.
 * index.html holds a static copy of this markup (the boot screen React replaces): keep the two in step.
 */
export function LoadingSplash() {
  const sceneReady = useStore((s) => s.phase !== 'loading');
  const reducedMotion = useStore((s) => s.reducedMotion);
  const [minElapsed, setMinElapsed] = useState(false);
  const [gone, setGone] = useState(false);
  useReleaseWhenStageOffscreen();

  useEffect(() => {
    const t = window.setTimeout(() => setMinElapsed(true), MIN_VISIBLE_MS);
    return () => window.clearTimeout(t);
  }, []);

  if (gone) return null;
  const leaving = sceneReady && minElapsed;

  return createPortal(
    <motion.div
      className="splash"
      role="status"
      aria-label="Loading the proposal"
      initial={false}
      animate={leaving ? { opacity: 0, scale: reducedMotion ? 1 : 1.04 } : { opacity: 1, scale: 1 }}
      transition={{ duration: leaving ? FADE_S : 0, ease: [0.4, 0, 0.2, 1] }}
      style={{ pointerEvents: leaving ? 'none' : 'auto' }}
      onAnimationComplete={() => leaving && setGone(true)}
    >
      <div className="splash-logo">
        <img className="splash-mark" src="/brand/mark.png" width={600} height={615} alt="" decoding="sync" />
        <img className="splash-wordmark" src="/brand/wordmark-dark.png" width={654} height={187} alt="Aurexa Design Consultants" decoding="sync" />
      </div>
      <div className="splash-line" aria-hidden="true" />
    </motion.div>,
    document.body,
  );
}
