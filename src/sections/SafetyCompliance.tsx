import type { ReactNode } from 'react';
import { CIRCULATION, DOORS, OPENINGS, ROOMS, ROOM_BY_ID, ROOM_COUNT, openingPoint } from '../data/layout';
import { SAFETY_COUNTS, SAFETY_POINTS } from '../data/safety';
import type { RoomId, SafetyKind } from '../data/types';
import {
  EmergencyLightIcon, ExitDoorIcon, ExitSignIcon, ExtinguisherIcon, GasLeakIcon, GasValveIcon,
  HeatIcon, SmokeIcon, StairsIcon,
} from './icons';
import { Reveal, SectionHeading, SeeIn3DButton } from './primitives';

// Every number on this page comes from the generated safety points (data/safety.ts), so the copy can never drift from
// what the 3D layer shows. The wording of each claim was checked against the safety rules in that file.
const COUNT = SAFETY_COUNTS;
const WORDS = ['none', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
/** Small counts in words ("four"), anything larger as a figure. */
const words = (n: number) => WORDS[n] ?? String(n);
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const join = (items: string[]) => (items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`);

const pointsOf = (kind: SafetyKind) => SAFETY_POINTS.filter((p) => p.kind === kind);
const inRoom = (kind: SafetyKind, room: RoomId) => pointsOf(kind).filter((p) => p.room === room).length;
const CORRIDOR_IDS = new Set<string>(CIRCULATION.map((c) => c.id));

/** "four in the Main Hot Kitchen and one in the Bakery & Bread Production": where a kind is placed, room by room. */
const placedIn = (kind: SafetyKind) =>
  join(ROOMS.filter((r) => inRoom(kind, r.id) > 0).map((r) => `${words(inRoom(kind, r.id))} in the ${r.name}`));

const EMERGENCY_EXITS = OPENINGS.filter((o) => o.kind === 'emergency');
/** Each emergency exit is a door from a room straight outside; the room is the first of its two spaces. */
const EXIT_ROOMS = EMERGENCY_EXITS.map((o) => ROOM_BY_ID[o.rooms![0] as RoomId].name).join(' and ');

// ---- extinguishers: one near every door, and one per kitchen door inside the kitchen ----
const KITCHEN_EXTINGUISHERS = inRoom('extinguisher', 'kitchen');
/** What "a few strides" means, ft (about four strides). The claim is only made while the model keeps to it. */
const STRIDES_FT = 10;
/** The longest walk from any door of the plan to its nearest extinguisher, ft. */
const FURTHEST_DOOR_FT = Math.max(
  ...DOORS.map((o) => {
    const [x, z] = openingPoint(o);
    return Math.min(...pointsOf('extinguisher').map((p) => Math.hypot(p.x - x, p.z - z)));
  }),
);
const EXTINGUISHER_REACH =
  FURTHEST_DOOR_FT <= STRIDES_FT ? 'always one within a few strides of every room door' : 'spread through the rooms and corridors';

// ---- smoke: a detector in every room (two or more where a room has several) ----
const SMOKE_ROOMS = ROOMS.filter((r) => inRoom('smoke', r.id) > 0).length;
const SMOKE_EXTRA = ROOMS.filter((r) => inRoom('smoke', r.id) > 1);
const SMOKE_COVERAGE = SMOKE_ROOMS === ROOM_COUNT ? 'one in every room' : `in ${SMOKE_ROOMS} of the ${ROOM_COUNT} rooms`;

// ---- LPG: low on the walls beside the gas ring main, which runs through the corridors round the kitchen ----
const LPG_CORRIDOR = pointsOf('lpg').filter((p) => p.room && CORRIDOR_IDS.has(p.room)).length;
const LPG_KITCHEN = inRoom('lpg', 'kitchen');

// ---- emergency lights: above the exits and the Staff Entrance, plus corridor junctions ----
const EM_JUNCTIONS = pointsOf('emlight').filter((p) => /junction/i.test(p.label ?? '')).length;
const EM_DOORS = COUNT.emlight - EM_JUNCTIONS;

const FEATURES: { title: string; body: string; icon: ReactNode }[] = [
  {
    title: 'ABC fire extinguishers',
    body:
      `${COUNT.extinguisher} in all: ${EXTINGUISHER_REACH}, and ${words(KITCHEN_EXTINGUISHERS)} ` +
      `inside the ${ROOM_BY_ID.kitchen.name}, where the heat and the fuel are.`,
    icon: <ExtinguisherIcon className="size-8" />,
  },
  {
    title: 'Smoke detectors',
    body:
      `${COUNT.smoke} in all: ${SMOKE_COVERAGE}` +
      (SMOKE_EXTRA.length
        ? `, with ${join(SMOKE_EXTRA.map((r) => `${words(inRoom('smoke', r.id))} in the ${r.name}`))}`
        : '') +
      ', so a fire is picked up early in whichever room it starts.',
    icon: <SmokeIcon className="size-8" />,
  },
  {
    title: 'Heat detectors',
    body: `${COUNT.heat} in all: ${placedIn('heat')}, where steam and oven heat suit heat sensing better than smoke.`,
    icon: <HeatIcon className="size-8" />,
  },
  {
    title: 'LPG leak detectors',
    body:
      `${COUNT.lpg} in all, mounted low because LPG sinks: ${words(LPG_CORRIDOR)} in the corridors that carry the gas ring main` +
      (LPG_KITCHEN ? ` and ${words(LPG_KITCHEN)} inside the ${ROOM_BY_ID.kitchen.name}.` : '.'),
    icon: <GasLeakIcon className="size-8" />,
  },
  {
    title: 'Emergency gas shut-off',
    body:
      `${COUNT.gasvalve === 1 ? 'A single valve' : `${cap(words(COUNT.gasvalve))} valves`} on the gas ring main, just outside the ` +
      `${ROOM_BY_ID.kitchen.name}’s west door, so the gas can be cut on the way out.`,
    icon: <GasValveIcon className="size-8" />,
  },
  {
    title: 'Emergency lighting',
    body:
      `${COUNT.emlight} in all: ${words(EM_DOORS)} above the ${words(EMERGENCY_EXITS.length)} emergency exits, the fire-stair door and ` +
      `the Staff Entrance, and ${words(EM_JUNCTIONS)} where corridors meet, so the way out stays lit.`,
    icon: <EmergencyLightIcon className="size-8" />,
  },
  {
    title: 'Green EXIT signs',
    body: `${COUNT.exit} in all: above both emergency exits (${EXIT_ROOMS}) and the fire-stair door.`,
    icon: <ExitSignIcon className="size-9" />,
  },
  {
    title: 'A dedicated fire staircase',
    body: 'Enclosed in the north-west corner behind its own door onto the top corridor, apart from the working floor.',
    icon: <StairsIcon className="size-8" />,
  },
  {
    title: `${cap(words(EMERGENCY_EXITS.length))} emergency exits`,
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
            label="Safety planning"
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
            These are design intentions: the layout is designed for these features, and every count above comes straight from
            the model. Quantities, ratings and positions are confirmed with the local fire authority and licensed installers
            during detailed design.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
