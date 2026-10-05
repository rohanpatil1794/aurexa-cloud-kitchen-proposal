// Shared links: opening /#safety lands on that section (same offset as the nav in ui/TopBar.tsx) and /#stage
// opens the explorer. The nav keeps the hash up to date with history.replaceState, so a copied or reloaded URL
// comes back to where the reader was. Runs once, when the page mounts.
import { useEffect } from 'react';
import { useStore } from '../store';

/** Scroll position that puts the top of `el` flush under the fixed top bar. */
const sectionTop = (el: HTMLElement) =>
  Math.round(el.getBoundingClientRect().top + window.scrollY - (document.querySelector<HTMLElement>('.topbar')?.offsetHeight ?? 64));

export function useDeepLink(): void {
  useEffect(() => {
    let id = '';
    try {
      id = decodeURIComponent(window.location.hash.slice(1));
    } catch {
      return; // malformed escape: ignore the hash
    }
    if (!id) return;

    if (id === 'stage') {
      // The explorer opens once the scene has started (the phase stays 'loading' until the first frames are drawn).
      const { phase, enterSpace } = useStore.getState();
      if (phase === 'hero') enterSpace();
      if (phase !== 'loading') return;
      const unsubscribe = useStore.subscribe((s) => {
        if (s.phase !== 'hero') return;
        unsubscribe();
        s.enterSpace();
      });
      return unsubscribe;
    }

    const target = document.getElementById(id);
    if (!target) return;
    let cancelled = false;
    let y = sectionTop(target);
    window.scrollTo({ top: y, behavior: 'instant' });
    // Web fonts and late layout move the section: follow it, unless the reader has scrolled since.
    document.fonts?.ready.then(() => {
      if (cancelled || Math.abs(window.scrollY - y) > 2) return;
      y = sectionTop(target);
      window.scrollTo({ top: y, behavior: 'instant' });
    });
    // The stage is off screen, so the Canvas will not draw its first frames and the splash would never leave:
    // release it, the scene starts when the reader scrolls up to it.
    useStore.getState().setSceneReady(true);
    return () => {
      cancelled = true;
    };
  }, []);
}
