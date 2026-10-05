import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { BRAND } from '../lib/palette';
import { CheckIcon, CopyIcon } from './icons';
import { Reveal, SectionHeading } from './primitives';

interface Swatch {
  name: string;
  hex: string;
  role: string;
  /** Light text reads better on this colour. */
  onDark?: boolean;
}

const SWATCHES: Swatch[] = [
  { name: 'Aurexa Teal', hex: BRAND.teal, role: 'Feature walls, wall caps, headings', onDark: true },
  { name: 'Lagoon', hex: BRAND.tealMid, role: 'Secondary teal for supporting surfaces', onDark: true },
  { name: 'Seafoam', hex: BRAND.tealLight, role: 'Soft accents and glazing tints' },
  { name: 'Terracotta', hex: BRAND.orange, role: 'Highlights, selection, key actions', onDark: true },
  { name: 'Sand', hex: BRAND.sand, role: 'Warm panels and surfaces' },
  { name: 'Cream', hex: BRAND.cream, role: 'Floors and page backgrounds' },
  { name: 'Olive', hex: BRAND.olive, role: 'Plants and greenery', onDark: true },
  { name: 'Slate', hex: BRAND.slate, role: 'Cool neutral for utility spaces', onDark: true },
  { name: 'Steel', hex: BRAND.steelMid, role: 'Stainless steel and concrete' },
  { name: 'Mist', hex: BRAND.steelLight, role: 'Light steel and glass' },
  { name: 'Black', hex: BRAND.black, role: 'The logo, and the Orders Out flow', onDark: true },
  { name: 'White', hex: BRAND.white, role: 'Clean surfaces and the logo' },
];

const MATERIALS: { name: string; why: string; swatch: ReactNode }[] = [
  {
    name: 'Stainless steel',
    why: 'Benches, sinks, racks and hoods. Non-porous and easy to sanitise, it is the working surface of a professional kitchen.',
    swatch: <span className="prop-mat prop-mat--steel" />,
  },
  {
    name: 'Quarry tile',
    why: 'Hard-wearing, slip-resistant and washable, so the hot kitchen and prep floors can take daily hosing down.',
    swatch: <span className="prop-mat prop-mat--quarry" />,
  },
  {
    name: 'Teal feature walls',
    why: 'Aurexa teal on feature walls and wall caps ties the building together and helps people find their way.',
    swatch: <span className="prop-mat prop-mat--teal" />,
  },
  {
    name: 'Warm cream surfaces',
    why: 'Cream floors and light walls bounce daylight around, keep the mood warm and show a spill the moment it happens.',
    swatch: <span className="prop-mat prop-mat--cream" />,
  },
  {
    name: 'Greenery',
    why: 'The Indoor Garden, with its glazed walls and skylight, brings plants and daylight into the heart of the plan.',
    swatch: (
      <span className="prop-mat prop-mat--leaf">
        <svg viewBox="0 0 72 72" aria-hidden="true">
          <path d="M36 64V30" stroke={BRAND.cream} strokeWidth="2.5" strokeLinecap="round" fill="none" />
          <path d="M36 46C24 46 17 38 16 26c12 0 19 8 20 20z" fill={BRAND.cream} />
          <path d="M36 36C48 36 55 28 56 16c-12 0-19 8-20 20z" fill={BRAND.sand} />
          <path d="M36 56c8 0 13-5 14-13-8 0-13 5-14 13z" fill={BRAND.cream} opacity="0.85" />
        </svg>
      </span>
    ),
  },
];

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Clipboard API unavailable (insecure context, denied): fall back to a throwaway textarea.
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch { /* leave ok false */ }
    ta.remove();
    return ok;
  }
}

function useCopyToast() {
  const [message, setMessage] = useState('');
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const timer = useRef(0);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const copy = useCallback(async (hex: string) => {
    const ok = await copyText(hex);
    setCopied(ok ? hex : null);
    setMessage(ok ? `Copied ${hex}` : `Could not copy. The colour is ${hex}`);
    setVisible(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => { setVisible(false); setCopied(null); }, 2000);
  }, []);

  return { message, visible, copied, copy };
}

export function DesignLanguage() {
  const { message, visible, copied, copy } = useCopyToast();

  return (
    <section id="design-language" aria-labelledby="design-language-title" className="scroll-mt-20 bg-wall">
      <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 md:py-28 lg:py-32">
        <SectionHeading
          id="design-language-title"
          index="04"
          label="Design language"
          title="Warm, durable and unmistakably Aurexa"
          lead={`A palette of ${SWATCHES.length} colours and ${MATERIALS.length} core materials, chosen to be easy to clean, easy on the eye and recognisably Aurexa. Select any colour to copy its hex code.`}
        />

        <ul className="mt-14 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:mt-20 lg:grid-cols-4">
          {SWATCHES.map((s, i) => (
            <Reveal as="li" key={s.hex} delay={(i % 4) * 0.06} className="flex">
              <button
                type="button"
                className="prop-swatch"
                onClick={() => copy(s.hex)}
                aria-label={`Copy ${s.name}, ${s.hex}`}
              >
                <span
                  className="prop-swatch__chip"
                  style={{ background: s.hex, color: s.onDark ? '#fff' : BRAND.black }}
                >
                  {copied === s.hex ? <CheckIcon className="size-4" /> : <CopyIcon className="size-4" />}
                </span>
                <span className="prop-swatch__name">{s.name}</span>
                <span className="prop-swatch__hex">{s.hex}</span>
                <span className="prop-swatch__role">{s.role}</span>
              </button>
            </Reveal>
          ))}
        </ul>

        <div className="mt-20 grid gap-12 lg:mt-28 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-7">
            <Reveal>
              <h3 className="brand-heading text-lg tracking-[0.16em] text-teal">Materials</h3>
            </Reveal>
            <ul className="mt-6 divide-y divide-ink/10 border-y border-ink/10">
              {MATERIALS.map((m, i) => (
                <Reveal as="li" key={m.name} delay={i * 0.05} className="flex items-center gap-5 py-5">
                  {m.swatch}
                  <div>
                    <p className="font-semibold text-ink">{m.name}</p>
                    <p className="mt-1 text-[0.9375rem] leading-snug text-ink/75">{m.why}</p>
                  </div>
                </Reveal>
              ))}
            </ul>
          </div>

          <Reveal delay={0.1} className="lg:sticky lg:top-28 lg:col-span-5 lg:self-start">
            <aside className="prop-card flex flex-col items-start gap-6 p-7 sm:flex-row sm:items-center lg:flex-col lg:items-start">
              <img
                src="/brand/mark.png"
                width={600}
                height={615}
                alt="The Aurexa mark: a teal door framed in cream, set against four isometric cubes"
                className="w-28 shrink-0 sm:w-32 lg:w-40"
                loading="lazy"
              />
              <div>
                <h3 className="brand-heading text-[0.95rem] tracking-[0.12em] text-teal">The logo door</h3>
                <p className="mt-3 text-[0.9375rem] leading-relaxed text-ink/80">
                  The Staff Entrance is the signature entrance: a teal door framed in cream, drawn from the Aurexa mark and
                  set into the south wall. It is the one place where the brand steps off the page and into the building.
                </p>
              </div>
            </aside>
          </Reveal>
        </div>
      </div>

      {/* Visible toast for sighted users, plus a polite live region for assistive tech. */}
      <div role="status" aria-live="polite" className="sr-only">{visible ? message : ''}</div>
      <div aria-hidden="true" className="prop-toast" data-show={visible}>{message}</div>
    </section>
  );
}
