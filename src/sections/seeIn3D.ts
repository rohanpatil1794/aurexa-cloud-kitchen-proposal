import { useStore, type LayerId } from '../store';

export interface SeeIn3DTarget {
  /** Layers to switch on. */
  on: readonly LayerId[];
  /** Layers to switch off first, e.g. the other flows when one flow is singled out. */
  off?: readonly LayerId[];
}

/** Scroll first; the stage reacts after this, so the page is already moving when the model does. */
const SETTLE_MS = 400;
/** Upper bound on the wait for the stage to come into view on a long scroll. */
const MAX_WAIT_MS = 1600;

let pending: { timer: number; observer: IntersectionObserver | null } | null = null;

function cancelPending() {
  if (!pending) return;
  window.clearTimeout(pending.timer);
  pending.observer?.disconnect();
  pending = null;
}

export function scrollToStage(): void {
  const el = document.getElementById('stage-wrap') ?? document.getElementById('stage');
  el?.scrollIntoView({ behavior: useStore.getState().reducedMotion ? 'auto' : 'smooth', block: 'start' });
}

function applyTarget({ on, off = [] }: SeeIn3DTarget) {
  const s = useStore.getState();
  if (s.phase !== 'explorer') s.enterSpace();
  else if (s.selectedRoom) s.clearSelection();
  for (const id of off) s.setLayer(id, false);
  for (const id of on) s.setLayer(id, true);
}

/**
 * "See it in 3D": scroll to the stage, open the explorer if it is still the hero, then
 * (about 400 ms later, once the stage is actually on screen) fly to the aerial view and switch layers.
 */
export function seeIn3D(target: SeeIn3DTarget): void {
  cancelPending();
  scrollToStage();

  const run = () => {
    cancelPending();
    applyTarget(target);
  };
  const stage = document.getElementById('stage');
  const timer = window.setTimeout(() => {
    if (!pending) return;
    if (!stage || !('IntersectionObserver' in window)) return run();
    pending.observer = new IntersectionObserver(([entry]) => entry.isIntersecting && run(), { threshold: 0.6 });
    pending.observer.observe(stage);
    pending.timer = window.setTimeout(run, MAX_WAIT_MS - SETTLE_MS);
  }, SETTLE_MS);
  pending = { timer, observer: null };
}
