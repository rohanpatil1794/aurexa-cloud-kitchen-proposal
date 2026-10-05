import { AnimatePresence, motion, type Variants } from 'framer-motion';
import { useStore } from '../store';
import { CLIENT_NAME, HERO, STUDIO_NAME } from '../config';
import { CubeMotif } from './CubeMotif';
import { scrollToProposal } from './nav';

const EASE = [0.22, 1, 0.36, 1] as const;

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.25 } },
  exit: { opacity: 0, x: -24, transition: { duration: 0.5, ease: 'easeIn' } },
};
const reducedContainer: Variants = {
  hidden: {},
  show: {},
  exit: { opacity: 0, transition: { duration: 0.3 } },
};
const item: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: EASE } },
};
const reducedItem: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.4 } },
};

/** The subline with the client placeholder picked out in sand. */
function Subline() {
  const [before, after = ''] = HERO.subline.split(CLIENT_NAME);
  return (
    <>
      {before}
      <span className="whitespace-nowrap font-medium text-sand">{CLIENT_NAME}</span>
      {after}
    </>
  );
}

/**
 * Overlay on the stage while phase === 'hero'. The wrappers ignore the pointer so the model stays draggable.
 * The page's one <h1> is screen-reader-only and always present (the visible title is decoration), so the heading
 * outline survives once the hero is gone.
 */
export function Hero() {
  const phase = useStore((s) => s.phase);
  const reducedMotion = useStore((s) => s.reducedMotion);
  const enterSpace = useStore((s) => s.enterSpace);
  const child = reducedMotion ? reducedItem : item;

  return (
    <>
      <h1 className="sr-only">{HERO.headline}</h1>
      <AnimatePresence>
        {phase === 'hero' && (
          <motion.div
            key="hero"
            className="hero-root pointer-events-none absolute inset-0 z-10"
            variants={reducedMotion ? reducedContainer : container}
            initial="hidden"
            animate="show"
            exit="exit"
          >
            <div className="hero-scrim absolute inset-0" aria-hidden="true" />
            <CubeMotif variant="outline" tone="dark" className="hero-motif" />

            <div className="hero-col relative flex h-full flex-col justify-end px-6 pb-28 text-center wide:justify-center wide:px-0 wide:pb-12 wide:pl-[max(2.5rem,6vw)] wide:text-left">
              <div className="mx-auto max-w-[34rem] wide:mx-0 wide:max-w-[30rem]">
                <motion.div variants={child} className="hero-eyebrow flex items-center justify-center gap-3.5 wide:justify-start">
                  <img src="/brand/mark.png" width={600} height={615} alt="" className="h-11 w-auto select-none wide:h-12" draggable={false} />
                  <span aria-hidden="true" className="h-7 w-px bg-cream/25" />
                  <span className="text-[11px] font-medium uppercase tracking-[0.26em] text-cream/75">{STUDIO_NAME}</span>
                </motion.div>

                <motion.p variants={child} aria-hidden="true" className="hero-title mt-6 text-balance wide:mt-8">
                  {HERO.headline}
                </motion.p>

                <motion.span variants={child} className="hero-rule mx-auto mt-6 block h-0.5 w-12 bg-orange wide:mx-0" aria-hidden="true" />

                <motion.p variants={child} className="hero-subline mt-5 text-balance text-base leading-relaxed text-cream/85 wide:max-w-[28rem] wide:text-[1.0625rem]">
                  <Subline />
                </motion.p>

                <motion.div variants={child} className="hero-cta-row mt-8 wide:mt-10">
                  <button type="button" onClick={enterSpace} className="hero-cta pointer-events-auto">
                    <span>{HERO.cta}</span>
                    <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M3 10h13M11 5l5 5-5 5" />
                    </svg>
                  </button>
                </motion.div>
              </div>
            </div>

            <motion.div variants={child} className="absolute inset-x-0 bottom-3 flex justify-center wide:justify-start wide:pl-[max(2.5rem,6vw)]">
              <button type="button" onClick={scrollToProposal} className="hero-hint pointer-events-auto">
                <span>Scroll for the proposal</span>
                <svg className="hero-hint-chevron" viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M4 7.5l6 6 6-6" />
                </svg>
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
