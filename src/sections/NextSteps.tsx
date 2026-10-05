import type { ReactNode } from 'react';
import { CONTACT, FLOORPLAN_URL, KITCHEN_NAME } from '../config';
import { CubeMotif } from '../ui/CubeMotif';
import { ArrowRightIcon, ClockIcon, DownloadIcon, MailIcon, PhoneIcon, PinIcon, UserIcon } from './icons';
import { Reveal, SectionHeading } from './primitives';

const STEPS: { title: string; detail: string }[] = [
  { title: 'Walk the model together', detail: 'A guided tour of the 3D model, room by room, with your team.' },
  { title: 'Refine the layout and equipment list', detail: 'Adjust rooms, doors and equipment to your menu and the way you work.' },
  { title: 'Confirm materials and finishes', detail: 'Agree the colours, surfaces and fittings shown in this proposal.' },
  { title: 'Move to detailed drawings', detail: 'Turn the agreed design into drawings the build can follow.' },
];

const MAIL_SUBJECT = encodeURIComponent(`Aurexa × ${KITCHEN_NAME} proposal`);
const PHONE_HREF = `tel:${CONTACT.phone.replace(/[^\d+]/g, '')}`;

function TapLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a className="prop-tap" href={href}>
      <span className="prop-link">{children}</span>
    </a>
  );
}

// dt and dd are the only children of the row div (valid dl grouping); the icon sits inside the dt so it stays decorative.
function ContactRow({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="relative py-3.5 pl-[3.25rem]">
      <dt className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-cream/90">
        <span aria-hidden="true" className="absolute left-0 top-4 grid size-9 place-items-center rounded-full bg-cream/12 text-sand">
          {icon}
        </span>
        {label}
      </dt>
      <dd className="mt-1 break-words text-[1.0625rem] leading-snug text-cream">{children}</dd>
    </div>
  );
}

export function NextSteps() {
  return (
    <section id="contact" aria-labelledby="contact-title" className="prop-on-teal relative scroll-mt-20 bg-teal text-cream">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <CubeMotif tone="dark" className="absolute -bottom-16 -right-16 size-[26rem] opacity-[0.07]" />
      </div>

      <div className="relative mx-auto max-w-6xl px-5 py-20 sm:px-8 md:py-28 lg:py-32">
        <SectionHeading
          id="contact-title"
          index="05"
          label="Next steps"
          title="From model to drawings, together"
          tone="dark"
          lead="This model is a starting point for a conversation. Here is how we would take it from here."
        />

        <div className="mt-14 grid gap-12 lg:mt-20 lg:grid-cols-12 lg:gap-14">
          <ol className="lg:col-span-7">
            {STEPS.map((s, i) => (
              <Reveal as="li" key={s.title} delay={i * 0.07} className="flex gap-5 border-t border-cream/25 py-6 sm:gap-7">
                <span aria-hidden="true" className="w-12 shrink-0 text-4xl font-light leading-none tracking-tight text-sand tabular-nums sm:w-16 sm:text-5xl">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div>
                  <h3 className="brand-heading text-[0.95rem] leading-snug tracking-[0.12em] text-cream">{s.title}</h3>
                  <p className="mt-2 text-[1rem] leading-relaxed text-cream/90">{s.detail}</p>
                </div>
              </Reveal>
            ))}
          </ol>

          <Reveal delay={0.1} className="lg:col-span-5">
            <div className="rounded-3xl border border-cream/25 bg-black/15 p-6 sm:p-8">
              <h3 className="brand-heading text-[0.95rem] tracking-[0.16em] text-cream">Get in touch</h3>
              <dl className="mt-3 divide-y divide-cream/15">
                <ContactRow icon={<UserIcon className="size-[1.1rem]" />} label="Contact">{CONTACT.person}</ContactRow>
                <ContactRow icon={<MailIcon className="size-[1.1rem]" />} label="Email">
                  <TapLink href={`mailto:${CONTACT.email}?subject=${MAIL_SUBJECT}`}>{CONTACT.email}</TapLink>
                </ContactRow>
                <ContactRow icon={<PhoneIcon className="size-[1.1rem]" />} label="Phone">
                  <TapLink href={PHONE_HREF}>{CONTACT.phone}</TapLink>
                </ContactRow>
                <ContactRow icon={<PinIcon className="size-[1.1rem]" />} label="Studio">{CONTACT.address}</ContactRow>
                <ContactRow icon={<ClockIcon className="size-[1.1rem]" />} label="Hours">{CONTACT.hours}</ContactRow>
              </dl>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <a className="prop-btn prop-btn--orange" href={`mailto:${CONTACT.email}?subject=${MAIL_SUBJECT}`}>
                  Start the conversation
                  <ArrowRightIcon className="size-[1.25em] shrink-0" />
                </a>
                <a className="prop-btn prop-btn--outline" href={FLOORPLAN_URL} download="aurexa-floor-plan.png">
                  <DownloadIcon className="size-[1.25em] shrink-0" />
                  Download the floor plan (PNG)
                </a>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
