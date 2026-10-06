import { FLOWS, FLOW_PATTERNS } from '../data/flows';
import { ROOMS, ZONES } from '../data/layout';
import type { ZoneId } from '../data/types';
import { FLOW_LAYERS } from '../store';
import { FlowSwatch } from './FlowSwatch';
import { CubeIcon } from './icons';
import { Reveal, SectionHeading, SeeIn3DButton } from './primitives';
import { seeIn3D } from './seeIn3D';

// glyph: a letter code beside the colour, so a zone is never told by colour alone.
const ZONE_ROWS: { id: ZoneId; glyph: string; line: string }[] = [
  { id: 'veg', glyph: 'V', line: 'Every vegetarian dish begins here, on a green floor with green boards and bins.' },
  { id: 'jain', glyph: 'J', line: 'Its own benches, boards and bins for Jain ingredient rules, all in yellow.' },
  { id: 'vegan', glyph: 'VG', line: 'Plant-based food prepared with no animal product in the room, in purple.' },
  { id: 'nonveg', glyph: 'NV', line: 'Meat, poultry and fish are cut and cleaned here, and only here, in red.' },
];

/** Page ink (--color-ink in index.css): with white, the two label colours a zone swatch can carry. */
const INK = '#0c1718';
const luminance = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a: number, b: number) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
/** White or ink, whichever reads better on the zone colour. */
const labelOn = (bg: string) => (contrast(luminance(bg), 1) >= contrast(luminance(bg), luminance(INK)) ? '#ffffff' : INK);

const zoneRoom = (id: ZoneId) => ROOMS.find((r) => r.zone === id);

const ZONE_TARGET = { on: ['zones'] } as const;
const FLOWS_TARGET = { on: FLOW_LAYERS } as const;

export function ZonesFlow() {
  return (
    <section id="zones-flow" aria-labelledby="zones-flow-title" className="scroll-mt-20 bg-white">
      <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 md:py-28 lg:py-32">
        <SectionHeading
          id="zones-flow-title"
          index="02"
          label="Zones and flow"
          title="Colour tells you where you are, and where things go"
          lead="Two colour systems run through the plan. Zone colours say what is prepared where. Flow colours say how people, ingredients, dishes and orders move. Both are layers you can switch on in the 3D model."
        />

        <div className="mt-14 grid gap-6 lg:mt-20 lg:grid-cols-2 lg:gap-8">
          <Reveal className="flex">
            <div className="prop-panel flex w-full flex-col">
              <h3 className="brand-heading text-lg tracking-[0.16em] text-teal">Diet zones</h3>
              <p className="mt-2 text-[0.9375rem] leading-relaxed text-ink/75">
                Four prep rooms, one colour and one letter each. The colour carries from the floor to the boards and bins.
              </p>
              <ul className="mt-6 divide-y divide-ink/10 border-y border-ink/10">
                {ZONE_ROWS.map(({ id, glyph, line }) => {
                  const room = zoneRoom(id);
                  return (
                    <li key={id} className="flex items-center gap-4 py-5">
                      <span
                        aria-hidden="true"
                        className="grid size-11 shrink-0 place-items-center rounded-xl text-[0.8125rem] font-bold tracking-[0.04em] ring-1 ring-ink/10"
                        style={{ background: ZONES[id].color, color: labelOn(ZONES[id].color) }}
                      >
                        {glyph}
                      </span>
                      <div>
                        <p className="font-semibold text-ink">{ZONES[id].name}</p>
                        <p className="mt-0.5 text-[0.9375rem] leading-snug text-ink/75">{line}</p>
                        {room && (
                          <p className="mt-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-ink/70">
                            {room.name} · {room.w} × {room.d} ft
                          </p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-4 flex items-start gap-3 text-sm leading-relaxed text-ink/70">
                <span aria-hidden="true" className="mt-1 size-3 shrink-0 rounded-full" style={{ background: ZONES.creator.color }} />
                A fifth colour, blue, marks the Content Creator Corner. It is a space for people, not a prep room.
              </p>
              <div className="mt-auto pt-7">
                <SeeIn3DButton target={ZONE_TARGET} what="diet zones" />
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.1} className="flex">
            <div className="prop-panel flex w-full flex-col">
              <h3 className="brand-heading text-lg tracking-[0.16em] text-teal">Workflow flows</h3>
              <p className="mt-2 text-[0.9375rem] leading-relaxed text-ink/75">
                Four routes, each with its own colour and pattern. Choose one to see it on its own in the model.
              </p>
              <ul className="mt-6 divide-y divide-ink/10 border-y border-ink/10">
                {FLOWS.map((f) => (
                  <li key={f.id}>
                    <button
                      type="button"
                      className="prop-row"
                      onClick={() => seeIn3D({ on: [f.id], off: FLOW_LAYERS.filter((l) => l !== f.id) })}
                    >
                      <FlowSwatch color={f.color} pattern={FLOW_PATTERNS[f.id]} />
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold text-ink">{f.name}</span>
                        <span className="mt-0.5 block text-[0.9375rem] leading-snug text-ink/75">{f.summary}</span>
                      </span>
                      <CubeIcon className="prop-row__go size-5 shrink-0" />
                      <span className="sr-only">See it in 3D</span>
                    </button>
                  </li>
                ))}
              </ul>
              <div className="mt-auto pt-7">
                <SeeIn3DButton target={FLOWS_TARGET} what="all four flows" />
              </div>
            </div>
          </Reveal>
        </div>

        <Reveal className="mt-8 flex flex-col items-start justify-between gap-5 rounded-3xl bg-cream px-6 py-7 sm:flex-row sm:items-center sm:px-9 lg:mt-10">
          <p className="max-w-xl text-lg leading-snug text-ink">
            See the zones and all four flows together, then step into any room to check the details.
          </p>
          <SeeIn3DButton target={{ on: ['zones', ...FLOW_LAYERS] }} what="zones and flows together" variant="orange" />
        </Reveal>
      </div>
    </section>
  );
}
