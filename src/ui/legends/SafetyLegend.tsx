// Key to the safety markers. ExplorerUI mounts it while the Safety layer is on. One row per kind, in the order of the
// 3D layer, with the count taken from the generated SAFETY_POINTS (nothing typed by hand).
import type { ReactElement } from 'react';
import { SAFETY_COUNTS, SAFETY_KINDS } from '../../data/safety';
import type { SafetyKind } from '../../data/types';

/** 'floating' = its own dark glass card over the stage (default); 'panel' = bare, for use inside an existing panel. */
export type SafetyLegendVariant = 'panel' | 'floating';

const RED = '#c9382f';
const CREAM = '#f3e6c8';
const DARK = '#2a3236';
const OUTLINE = 'rgba(246, 227, 194, 0.75)';

/** The markers as drawn in the 3D layer, flattened to 28 px icons (cream outline keeps them readable on dark glass). */
const ICONS: Record<SafetyKind, ReactElement> = {
  extinguisher: (
    <>
      <rect x="9.5" y="9" width="9" height="16.5" rx="3.2" fill={RED} stroke={OUTLINE} strokeWidth="1" />
      <rect x="9.5" y="15" width="9" height="5" fill={CREAM} />
      <rect x="12.5" y="5.5" width="3" height="4" fill={DARK} />
      <rect x="10.5" y="3.5" width="8.5" height="2.6" rx="1" fill={DARK} stroke={OUTLINE} strokeWidth="0.8" />
    </>
  ),
  smoke: (
    <>
      <circle cx="14" cy="14" r="10.5" fill="#efebe0" stroke={OUTLINE} strokeWidth="1" />
      <circle cx="14" cy="14" r="5" fill={DARK} />
      <circle cx="21" cy="8" r="1.7" fill="#ff4a3d" />
    </>
  ),
  heat: (
    <>
      <circle cx="14" cy="14" r="10.5" fill="#cb622a" stroke={OUTLINE} strokeWidth="1" />
      <circle cx="14" cy="14" r="6.8" fill="#efebe0" />
      <circle cx="14" cy="14" r="2.3" fill={DARK} />
    </>
  ),
  lpg: (
    <>
      <rect x="6" y="4" width="16" height="20" rx="3" fill="#efebe0" stroke={OUTLINE} strokeWidth="1" />
      <rect x="6" y="4" width="16" height="3.4" rx="1.7" fill="#3a7bc8" />
      <path d="M9.5 14h9M9.5 17.5h9M9.5 21h9" stroke={DARK} strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="17.5" cy="10.8" r="1.5" fill="#4aa3ff" />
    </>
  ),
  gasvalve: (
    <>
      <circle cx="13" cy="12" r="8.6" fill="none" stroke={RED} strokeWidth="3" />
      <path d="M13 3.4v17.2M4.4 12h17.2" stroke={RED} strokeWidth="2" />
      <circle cx="13" cy="12" r="2.2" fill={RED} />
      <rect x="17.5" y="16.5" width="8" height="10" rx="1.4" fill={CREAM} stroke={RED} strokeWidth="1.6" />
    </>
  ),
  emlight: (
    <>
      <rect x="2.5" y="9.5" width="23" height="10" rx="3.4" fill={CREAM} stroke={OUTLINE} strokeWidth="1" />
      <circle cx="9" cy="14.5" r="2.9" fill="#e2a42b" />
      <circle cx="19" cy="14.5" r="2.9" fill="#e2a42b" />
    </>
  ),
  exit: (
    <>
      <rect x="1.5" y="7" width="25" height="14" rx="2.6" fill="#1f8f50" stroke={CREAM} strokeWidth="1.6" />
      <text x="14" y="16.8" textAnchor="middle" fontSize="7.4" fontWeight="800" letterSpacing="0.6" fill="#fff" fontFamily="inherit">EXIT</text>
    </>
  ),
};

function Icon({ kind }: { kind: SafetyKind }) {
  return (
    <svg aria-hidden viewBox="0 0 28 28" className="size-6 shrink-0 md:size-7">
      {ICONS[kind]}
    </svg>
  );
}

export function SafetyLegend({ variant = 'floating', className = '' }: { variant?: SafetyLegendVariant; className?: string }) {
  const floating = variant === 'floating';
  const shell = floating ? 'glass explorer-glass explorer-card pointer-events-auto w-[300px] max-w-full px-4 py-3.5' : 'w-full';
  return (
    <section aria-label="Safety legend" className={`${shell} ${className}`}>
      <h3 className="micro mb-2.5">Fire &amp; safety</h3>
      {/* Floating: two compact columns with short labels on phones, one column of full labels from md up. */}
      <ul className={floating ? 'grid grid-cols-2 gap-x-3 gap-y-1.5 md:grid-cols-1' : 'space-y-2.5'}>
        {SAFETY_KINDS.map((k) => (
          <li key={k.kind} className="flex min-w-0 items-center gap-2 md:gap-3">
            <Icon kind={k.kind} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-semibold leading-tight text-cream md:text-[13px]">
                {floating ? (
                  <>
                    <span className="md:hidden">{k.short}</span>
                    <span className="hidden md:inline">{k.label}</span>
                  </>
                ) : (
                  k.label
                )}
              </p>
              {!floating && <p className="mt-0.5 text-[12px] leading-snug text-cream/70">{k.detail}</p>}
            </div>
            <span className="text-[12px] font-semibold tabular-nums text-cream/70 md:text-[13px]">{SAFETY_COUNTS[k.kind]}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
