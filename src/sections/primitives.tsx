import { animate, motion, useInView } from 'framer-motion';
import { useEffect, useRef, type ReactNode } from 'react';
import { useStore } from '../store';
import { CubeMotif } from '../ui/CubeMotif';
import { CubeIcon } from './icons';
import { seeIn3D, type SeeIn3DTarget } from './seeIn3D';

type RevealTag = 'div' | 'li' | 'article' | 'header';

interface RevealProps {
  as?: RevealTag;
  /** Seconds; use for gentle staggering inside a grid. */
  delay?: number;
  className?: string;
  children: ReactNode;
}

/** Fades and lifts its children in once, the first time they scroll into view. Static under reduced motion. */
export function Reveal({ as = 'div', delay = 0, className, children }: RevealProps) {
  const reduced = useStore((s) => s.reducedMotion);
  if (reduced) {
    const Plain = as;
    return <Plain className={className}>{children}</Plain>;
  }
  const Tag = motion[as] as typeof motion.div;
  return (
    <Tag
      className={className}
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -10% 0px' }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay }}
    >
      {children}
    </Tag>
  );
}

interface SectionHeadingProps {
  index: string;
  label: string;
  title: string;
  lead?: ReactNode;
  tone?: 'light' | 'sand' | 'dark';
  id: string;
}

export function SectionHeading({ index, label, title, lead, tone = 'light', id }: SectionHeadingProps) {
  const mod = tone === 'light' ? '' : ` prop-eyebrow--${tone}`;
  return (
    <Reveal as="header" className="max-w-3xl">
      <p className={`prop-eyebrow${mod}`}>
        {index} <span aria-hidden="true">/</span> {label}
      </p>
      <h2 id={id} className={`prop-h2 brand-heading${tone === 'dark' ? ' prop-h2--dark' : ''}`}>{title}</h2>
      {lead && <p className={`prop-lead${tone === 'dark' ? ' prop-lead--dark' : ''}`}>{lead}</p>}
    </Reveal>
  );
}

interface SeeIn3DButtonProps {
  target: SeeIn3DTarget;
  /** What the button shows, for the accessible name: "See it in 3D: <what>". */
  what: string;
  variant?: 'teal' | 'orange';
  children?: ReactNode;
}

export function SeeIn3DButton({ target, what, variant = 'teal', children = 'See it in 3D' }: SeeIn3DButtonProps) {
  return (
    <button
      type="button"
      className={`prop-btn prop-btn--${variant}`}
      onClick={() => seeIn3D(target)}
      aria-label={`See it in 3D: ${what}`}
    >
      <CubeIcon className="size-[1.25em] shrink-0" />
      {children}
    </button>
  );
}

const fmt = new Intl.NumberFormat('en-US');

/** Counts up from 0 the first time it scrolls into view. Static under reduced motion. */
export function CountUp({ to, className }: { to: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduced = useStore((s) => s.reducedMotion);
  const inView = useInView(ref, { once: true, margin: '0px 0px -10% 0px' });

  useEffect(() => {
    const el = ref.current;
    if (!el || reduced || !inView) return;
    const controls = animate(0, to, {
      duration: 1.6,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => { el.textContent = fmt.format(Math.round(v)); },
    });
    return () => controls.stop();
  }, [inView, reduced, to]);

  return (
    <>
      <span ref={ref} aria-hidden="true" className={className}>{fmt.format(reduced ? to : 0)}</span>
      <span className="sr-only">{fmt.format(to)}</span>
    </>
  );
}

/** Straddles the seam between two sections: a small badge carrying the logo's cube motif. */
export function SectionDivider() {
  return (
    <div aria-hidden="true" className="relative z-10 h-0">
      <div className="prop-seam">
        <CubeMotif tone="light" className="size-7" />
      </div>
    </div>
  );
}
