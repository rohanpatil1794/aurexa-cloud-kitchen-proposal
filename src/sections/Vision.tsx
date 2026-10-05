import type { ReactNode } from 'react';
import { KITCHEN_NAME } from '../config';
import {
  CUISINE_STATION_COUNT, DIETARY_ZONE_COUNT, ROOM_BY_ID, ROOM_COUNT, TOTAL_AREA, ZONES,
} from '../data/layout';
import type { ZoneId } from '../data/types';
import { BRAND, FLOW_COLORS } from '../lib/palette';
import { CubeMotif } from '../ui/CubeMotif';
import { OneWayIcon, PeopleIcon, ZoningIcon } from './icons';
import { CountUp, Reveal, SectionHeading } from './primitives';

const DIET_ZONES: ZoneId[] = ['veg', 'jain', 'vegan', 'nonveg'];

interface Chip {
  label: string;
  color: string;
}

const PILLARS: { title: string; icon: ReactNode; body: string; chips: Chip[] }[] = [
  {
    title: 'Hygiene-first diet zoning',
    icon: <ZoningIcon className="size-8" />,
    body: 'Vegetarian, Jain, Vegan and Non-Veg food each get a dedicated prep room, with its own door and a colour-coded floor, boards and bins. Cross-contact is designed out of the plan, not left to memory.',
    chips: DIET_ZONES.map((id) => ({ label: ZONES[id].name, color: ZONES[id].color })),
  },
  {
    title: 'One-way workflows',
    icon: <OneWayIcon className="size-8" />,
    body: 'Clean in, dirty out, orders out. Ingredients, staff, used utensils and waste, and finished orders each follow their own route, planned so that the routes never cross.',
    chips: [
      { label: 'Clean in', color: FLOW_COLORS.raw },
      { label: 'Dirty out', color: FLOW_COLORS.dirty },
      { label: 'Orders out', color: FLOW_COLORS.orders },
    ],
  },
  {
    title: 'Spaces for people',
    icon: <PeopleIcon className="size-8 text-teal" />,
    body: 'A kitchen runs on the people in it, and on the riders who collect from it. So there is room to create, to rest and to wait somewhere pleasant, away from the cooking line.',
    chips: [
      { label: ROOM_BY_ID.creator.name, color: ZONES.creator.color },
      { label: ROOM_BY_ID.garden.name, color: BRAND.olive },
      { label: ROOM_BY_ID.rider.name, color: BRAND.orange },
    ],
  },
];

const STATS: { value: number; label: string }[] = [
  { value: TOTAL_AREA, label: 'Square feet, kitchen and office' },
  { value: ROOM_COUNT, label: 'Rooms, each with a job' },
  { value: DIETARY_ZONE_COUNT, label: 'Dietary zones' },
  { value: CUISINE_STATION_COUNT, label: 'Cuisine stations' },
];

export function Vision() {
  return (
    <section id="vision" aria-labelledby="vision-title" className="scroll-mt-20 bg-cream">
      <div className="relative mx-auto max-w-6xl px-5 py-20 sm:px-8 md:py-28 lg:py-32">
        <CubeMotif
          variant="outline"
          className="pointer-events-none absolute right-8 top-28 hidden w-80 opacity-40 xl:block"
        />
        <SectionHeading
          id="vision-title"
          index="01"
          label="The vision"
          title="Built around hygiene, flow and people"
          lead={
            <>
              {KITCHEN_NAME} is a {TOTAL_AREA.toLocaleString('en-US')} sq ft commercial cloud kitchen and office. Every room,
              door and route in this model follows three ideas, so the kitchen stays safe, simple to run and good to work in.
            </>
          }
        />

        <ul className="mt-14 grid gap-5 lg:mt-20 lg:grid-cols-3 lg:gap-6">
          {PILLARS.map((p, i) => (
            <Reveal as="li" key={p.title} delay={i * 0.1} className="flex">
              <article className="prop-card flex w-full flex-col p-7">
                <span className="grid size-14 place-items-center rounded-2xl bg-wall">{p.icon}</span>
                <h3 className="brand-heading mt-6 text-[0.95rem] leading-snug tracking-[0.12em] text-teal lg:min-h-[2.75em]">{p.title}</h3>
                <p className="mt-3 text-[0.9375rem] leading-relaxed text-ink/80">{p.body}</p>
                <ul className="mt-auto flex flex-wrap gap-2 pt-6">
                  {p.chips.map((c) => (
                    <li key={c.label} className="prop-chip">
                      <span aria-hidden="true" className="size-2.5 rounded-full" style={{ background: c.color }} />
                      {c.label}
                    </li>
                  ))}
                </ul>
              </article>
            </Reveal>
          ))}
        </ul>

        <dl className="mt-16 grid grid-cols-2 gap-x-6 gap-y-10 lg:mt-24 lg:grid-cols-4">
          {STATS.map((s, i) => (
            <Reveal key={s.label} delay={i * 0.08} className="flex flex-col border-t border-teal/30 pt-5">
              <dt className="brand-heading order-last mt-4 text-[0.7rem] leading-relaxed tracking-[0.18em] text-ink/75">{s.label}</dt>
              <dd className="text-[clamp(2.75rem,2rem+3.5vw,4.5rem)] font-light leading-none tracking-tight text-teal tabular-nums">
                <CountUp to={s.value} />
              </dd>
            </Reveal>
          ))}
        </dl>
      </div>
    </section>
  );
}
