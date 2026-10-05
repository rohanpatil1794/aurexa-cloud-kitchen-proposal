import type { ReactNode } from 'react';
import { OPENINGS, ROOM_BY_ID } from '../data/layout';
import type { RoomId } from '../data/types';
import {
  EmergencyLightIcon, ExitDoorIcon, ExitSignIcon, ExtinguisherIcon, GasLeakIcon, GasValveIcon,
  HeatIcon, SmokeIcon, StairsIcon,
} from './icons';
import { Reveal, SectionHeading, SeeIn3DButton } from './primitives';

const EMERGENCY_EXITS = OPENINGS.filter((o) => o.kind === 'emergency');
/** Each emergency exit is a door from a room straight outside; the room is the first of its two spaces. */
const EXIT_ROOMS = EMERGENCY_EXITS.map((o) => ROOM_BY_ID[o.rooms![0] as RoomId].name).join(' and ');

const FEATURES: { title: string; body: string; icon: ReactNode }[] = [
  {
    title: 'ABC fire extinguishers',
    body: 'One at every room door, plus four in the Main Hot Kitchen, where the heat and the fuel are.',
    icon: <ExtinguisherIcon className="size-8" />,
  },
  {
    title: 'Smoke detectors',
    body: 'In every room, so a fire is caught wherever it starts.',
    icon: <SmokeIcon className="size-8" />,
  },
  {
    title: 'Heat detectors',
    body: 'In the kitchen and the bakery, where steam and oven heat suit heat sensing better than smoke.',
    icon: <HeatIcon className="size-8" />,
  },
  {
    title: 'LPG leak detectors',
    body: 'Placed near the gas ring main that feeds the cooking line.',
    icon: <GasLeakIcon className="size-8" />,
  },
  {
    title: 'Emergency gas shut-off',
    body: 'A single valve at the kitchen’s west door, so the gas can be cut on the way out.',
    icon: <GasValveIcon className="size-8" />,
  },
  {
    title: 'Emergency lighting',
    body: 'Above every exit and at the corridor corners, so the way out stays lit.',
    icon: <EmergencyLightIcon className="size-8" />,
  },
  {
    title: 'Green EXIT signs',
    body: `At both emergency exits: ${EXIT_ROOMS}.`,
    icon: <ExitSignIcon className="size-9" />,
  },
  {
    title: 'A dedicated fire staircase',
    body: 'Enclosed in the north-west corner behind its own door onto the top corridor, apart from the working floor.',
    icon: <StairsIcon className="size-8" />,
  },
  {
    title: 'Two emergency exits',
    body: `${EXIT_ROOMS} each open straight outside, at opposite ends of the south wall.`,
    icon: <ExitDoorIcon className="size-8" />,
  },
];

export function SafetyCompliance() {
  return (
    <section id="safety" aria-labelledby="safety-title" className="scroll-mt-20 bg-sand">
      <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 md:py-28 lg:py-32">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <SectionHeading
            id="safety-title"
            index="03"
            label="Safety and compliance"
            title="Safety planned in, not added on"
            tone="sand"
            lead="Every safety feature in the layout is placed on the model, so you can see exactly where each one sits."
          />
          <Reveal className="shrink-0">
            <SeeIn3DButton target={{ on: ['safety'] }} what="the safety layer" />
          </Reveal>
        </div>

        <ul className="mt-14 grid gap-4 sm:grid-cols-2 lg:mt-20 lg:grid-cols-3 lg:gap-5">
          {FEATURES.map((f, i) => (
            <Reveal as="li" key={f.title} delay={(i % 3) * 0.08} className="flex">
              <article className="prop-card flex w-full gap-4 p-5 sm:flex-col sm:gap-0 sm:p-6">
                <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-cream text-teal">{f.icon}</span>
                <div className="min-w-0">
                  <h3 className="brand-heading text-[0.875rem] leading-snug tracking-[0.12em] text-teal sm:mt-5">{f.title}</h3>
                  <p className="mt-2 text-[0.9375rem] leading-relaxed text-ink/80">{f.body}</p>
                </div>
              </article>
            </Reveal>
          ))}
        </ul>

        <Reveal>
          <p className="mt-10 max-w-3xl text-sm leading-relaxed text-ink/80">
            These are design intentions: the layout is planned with these features in mind. Quantities, ratings and positions
            are confirmed with the local fire authority and licensed installers during detailed design.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
