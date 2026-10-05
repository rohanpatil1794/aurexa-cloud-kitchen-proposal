// Page navigation shared by the top bar, the hero and the explorer: sections scroll in flush under the bar.

/** Height of the fixed top bar right now (it grows by the safe-area inset on notched phones). */
const barHeight = () => document.querySelector<HTMLElement>('.topbar')?.offsetHeight ?? 64;

/** Scroll to a proposal section by id (smooth, via CSS scroll-behavior). Returns false when it is not in the page. */
export function scrollToSection(id: string): boolean {
  const el = document.getElementById(id);
  if (!el) return false;
  window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - barHeight() });
  return true;
}

/** "Continue to the proposal": the first section below the stage. */
export function scrollToProposal() {
  if (!scrollToSection('vision')) window.scrollTo({ top: window.innerHeight });
}
