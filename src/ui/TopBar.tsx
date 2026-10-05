import { useCallback, useEffect, useRef, useState, type MouseEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useStore } from '../store';
import { useIsMobile } from '../lib/hooks';
import { STUDIO_NAME } from '../config';
import { CubeMotif } from './CubeMotif';

const LINKS = [
  { id: 'vision', label: 'Vision' },
  { id: 'stage', label: 'Explorer' },
  { id: 'zones-flow', label: 'Zones & Flow' },
  { id: 'safety', label: 'Safety' },
  { id: 'design-language', label: 'Design Language' },
  { id: 'contact', label: 'Contact' },
] as const;
type LinkId = (typeof LINKS)[number]['id'];

type Tone = 'dark' | 'light';

/** Past this scroll distance the hero text starts sliding under the bar, so it gets a frosted backing. */
const SCROLLED_PX = 24;

const stageEl = () => document.getElementById('stage-wrap') ?? document.getElementById('stage');

const darkBackgrounds = new WeakMap<Element, boolean>();
/** True when the element paints a dark background of its own (read once per element; backgrounds do not change). */
function hasDarkBackground(el: Element): boolean {
  let dark = darkBackgrounds.get(el);
  if (dark === undefined) {
    const css = getComputedStyle(el).backgroundColor;
    const [r, g, b, a = 1] = css.startsWith('rgb') ? (css.match(/[0-9.]+/g) ?? []).map(Number) : [];
    dark = a > 0.5 && 0.2126 * r + 0.7152 * g + 0.0722 * b < 110;
    darkBackgrounds.set(el, dark);
  }
  return dark;
}

/**
 * Reads the page under the bar (`barH` tall): which tone (dark stage or dark section vs light section)
 * and which section is in view. The stage counts as "under the bar" until its bottom edge clears the bar.
 */
function measure(barH: number): { tone: Tone; active: LinkId; scrolled: boolean } {
  const mid = barH / 2;
  const stage = stageEl();
  const overStage = !!stage && stage.getBoundingClientRect().bottom > barH + 4;

  const line = Math.max(120, window.innerHeight * 0.3);
  const atBottom = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4;
  let active: LinkId = 'stage';
  let activeTop = -Infinity;
  let underBar: Element | null = null;
  for (const { id } of LINKS) {
    if (id === 'stage') continue;
    const el = document.getElementById(id);
    if (!el) continue;
    const { top, bottom } = el.getBoundingClientRect();
    if (top <= mid && bottom > mid) underBar = el;
    if ((top <= line || atBottom) && top > activeTop) {
      active = id;
      activeTop = top;
    }
  }
  const overDark = overStage || (underBar !== null && hasDarkBackground(underBar));
  return { tone: overDark ? 'dark' : 'light', active, scrolled: window.scrollY > SCROLLED_PX };
}

/** Every focusable control currently on screen inside `root`. */
const visibleFocusables = (root: HTMLElement) =>
  Array.from(root.querySelectorAll<HTMLElement>('a[href], button:not([disabled])')).filter((el) => el.offsetParent !== null);

export function TopBar() {
  const phase = useStore((s) => s.phase);
  const reducedMotion = useStore((s) => s.reducedMotion);
  const isMobile = useIsMobile();
  const [view, setView] = useState<ReturnType<typeof measure>>({ tone: 'dark', active: 'stage', scrolled: false });
  const [menuOpen, setMenuOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const open = menuOpen && isMobile;

  // Track the page under the bar (rAF-coalesced scroll / resize).
  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const next = measure(headerRef.current?.offsetHeight ?? 64);
      setView((v) => (v.tone === next.tone && v.active === next.active && v.scrolled === next.scrolled ? v : next));
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    // Sections mount after the bar does; re-measure once the layout has settled.
    const settle = window.setTimeout(schedule, 600);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(settle);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, []);

  // Growing past the phone breakpoint closes the menu for good (it must not reappear when shrinking again).
  useEffect(() => {
    if (!isMobile) setMenuOpen(false);
  }, [isMobile]);

  // Mobile menu: scroll lock, Esc to close, Tab kept inside the bar + drawer.
  useEffect(() => {
    if (!open) return;
    const root = document.documentElement;
    const prevOverflow = root.style.overflow;
    root.style.overflow = 'hidden';
    const focusRaf = requestAnimationFrame(() => headerRef.current?.querySelector<HTMLElement>('.mobile-menu-link')?.focus());
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false);
        toggleRef.current?.focus();
      } else if (e.key === 'Tab' && headerRef.current) {
        const items = visibleFocusables(headerRef.current);
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      cancelAnimationFrame(focusRaf);
      root.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const goTo = useCallback((id: LinkId, e: MouseEvent) => {
    e.preventDefault();
    setMenuOpen(false);
    document.documentElement.style.overflow = ''; // release the menu's scroll lock before scrolling
    if (id === 'stage') {
      if (useStore.getState().phase === 'hero') useStore.getState().enterSpace();
      window.scrollTo({ top: 0 });
      history.replaceState(null, '', '#stage');
      return;
    }
    const el = document.getElementById(id);
    if (!el) return;
    // Section top flush under the bar (smooth via CSS scroll-behavior).
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - (headerRef.current?.offsetHeight ?? 64) });
    history.replaceState(null, '', `#${id}`);
  }, []);

  const goTop = useCallback((e: MouseEvent) => {
    e.preventDefault();
    setMenuOpen(false);
    document.documentElement.style.overflow = '';
    window.scrollTo({ top: 0 });
    history.replaceState(null, '', window.location.pathname + window.location.search);
  }, []);

  const tone: Tone = open ? 'dark' : view.tone;
  // Backing: cream over light sections; over the stage, clear on the untouched hero and frosted teal once it
  // has text sliding under it (explorer open, or the page scrolled). The open menu brings its own backdrop.
  const bg = open || phase === 'loading' ? 'clear' : view.tone === 'light' ? 'cream' : phase === 'explorer' || view.scrolled ? 'teal' : 'clear';

  return (
    <>
      <a href="#vision" className="skip-link">
        Skip to content
      </a>
      <header ref={headerRef} className="topbar" data-tone={tone} data-bg={bg} data-open={open}>
        <div className="topbar-bg topbar-bg--clear" aria-hidden="true" />
        <div className="topbar-bg topbar-bg--teal" aria-hidden="true" />
        <div className="topbar-bg topbar-bg--cream" aria-hidden="true" />

        <div className="topbar-inner">
          <a href="#stage" className="topbar-logo" onClick={goTop} aria-label={`${STUDIO_NAME}, back to top`}>
            <img className="topbar-logo-img topbar-logo-img--dark" src="/brand/lockup-dark.png" width={389} height={96} alt="" />
            <img className="topbar-logo-img topbar-logo-img--light" src="/brand/lockup-light.png" width={389} height={96} alt="" />
          </a>

          <nav aria-label="Primary" className="hidden md:block">
            <ul className="topbar-links">
              {LINKS.map(({ id, label }) => (
                <li key={id}>
                  <a
                    href={`#${id}`}
                    className="topbar-link"
                    aria-current={view.active === id ? 'location' : undefined}
                    onClick={(e) => goTo(id, e)}
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <button
            ref={toggleRef}
            type="button"
            className="topbar-burger md:hidden"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setMenuOpen((v) => !v)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>

        <AnimatePresence>
          {open && (
            <motion.nav
              id="mobile-menu"
              aria-label="Primary"
              className="mobile-menu"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reducedMotion ? 0 : 0.28 }}
            >
              <CubeMotif variant="outline" tone="dark" className="mobile-menu-motif" />
              <ul className="mobile-menu-list">
                {LINKS.map(({ id, label }, i) => (
                  <motion.li
                    key={id}
                    initial={reducedMotion ? false : { opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45, delay: 0.08 + i * 0.05, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <a
                      href={`#${id}`}
                      className="mobile-menu-link"
                      aria-current={view.active === id ? 'location' : undefined}
                      onClick={(e) => goTo(id, e)}
                    >
                      {label}
                    </a>
                  </motion.li>
                ))}
              </ul>
              <p className="mobile-menu-foot">{STUDIO_NAME}</p>
            </motion.nav>
          )}
        </AnimatePresence>
      </header>
    </>
  );
}
