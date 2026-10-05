// Small shared building blocks of the explorer UI: segmented control, switch row, zone dot, section heading.
import { useId, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../../store';
import { ZONES } from '../../data/layout';
import type { ZoneId } from '../../data/types';

/** A wide-tracked group heading: an h2 by default (the page's one h1 is the hero title), h3 when it sits under a room's name. */
export function MicroHeading({ children, className = '', as: Tag = 'h2' }: { children: ReactNode; className?: string; as?: 'h2' | 'h3' }) {
  return <Tag className={`micro ${className}`}>{children}</Tag>;
}

/** Zone colour dot; renders a blank slot of the same size for rooms without a zone, so names stay aligned. */
export function ZoneDot({ zone, blank = false }: { zone?: ZoneId; blank?: boolean }) {
  if (!zone) return blank ? <span aria-hidden className="size-2.5 shrink-0" /> : null;
  return (
    <span
      role="img"
      aria-label={`${ZONES[zone].name} zone`}
      className="size-2.5 shrink-0 rounded-full ring-1 ring-black/30"
      style={{ background: ZONES[zone].color }}
    />
  );
}

/** Flow colour chip; the cream hairline keeps the black Orders Out chip visible on the dark panel. */
export function FlowChip({ color }: { color: string }) {
  return <span aria-hidden className="h-2 w-6 shrink-0 rounded-full" style={{ background: color, boxShadow: '0 0 0 1px rgba(246,227,194,0.42)' }} />;
}

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  icon?: ReactNode;
}

/** Two-to-four way toggle; the orange pill slides to the chosen segment. */
export function Segmented<T extends string>({
  label, value, options, onChange,
}: {
  label: string;
  value: T;
  options: SegmentOption<T>[];
  onChange: (v: T) => void;
}) {
  const pillId = useId();
  const reduced = useStore((s) => s.reducedMotion);
  return (
    <div
      role="group"
      aria-label={label}
      className="grid rounded-xl bg-black/25 p-1"
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(o.value)}
            className={`relative flex min-h-11 items-center justify-center rounded-lg px-2 text-[13px] font-medium transition-colors md:min-h-9 ${
              on ? 'text-ink' : 'text-cream/70 hover:text-cream'
            }`}
          >
            {on && (
              <motion.span
                layoutId={pillId}
                className="absolute inset-0 rounded-lg bg-orange"
                transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 520, damping: 42 }}
              />
            )}
            <span className="relative flex items-center gap-1.5">
              {o.icon}
              {o.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** A layer toggle: leading mark, name, one-line meaning and a switch. */
export function SwitchRow({
  mark, name, meaning, on, onToggle,
}: {
  mark: ReactNode;
  name: string;
  meaning: string;
  on: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onToggle}
      className="flex min-h-12 w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-cream/6"
    >
      <span className="grid w-7 shrink-0 place-items-center text-cream/80">{mark}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-medium leading-tight text-cream">{name}</span>
        <span className="mt-0.5 block text-[12px] leading-snug text-cream/72">{meaning}</span>
      </span>
      <span
        aria-hidden
        className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${on ? 'bg-orange' : 'bg-cream/20'}`}
      >
        <span
          className={`absolute left-0.5 top-0.5 size-4 rounded-full bg-white shadow transition-transform ${
            on ? 'translate-x-4' : ''
          }`}
        />
      </span>
    </button>
  );
}

/** Scrolls `el` just far enough to be fully visible inside its `.thin-scroll` ancestor (never moves the page). */
export function scrollIntoNearest(el: HTMLElement, smooth: boolean) {
  const box = el.closest<HTMLElement>('.thin-scroll');
  if (!box) return;
  const pad = 10;
  const c = box.getBoundingClientRect();
  const r = el.getBoundingClientRect();
  const dy = r.top < c.top + pad ? r.top - c.top - pad : r.bottom > c.bottom - pad ? r.bottom - c.bottom + pad : 0;
  if (dy) box.scrollBy({ top: dy, behavior: smooth ? 'smooth' : 'auto' });
}
