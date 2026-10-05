import { FLOW_COLORS, ZONE_COLORS } from '../lib/palette';

interface IconProps {
  className?: string;
}

const base = {
  width: 24,
  height: 24,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  focusable: false,
} as const;

// ---- UI glyphs -------------------------------------------------------------

export const CubeIcon = ({ className }: IconProps) => (
  <svg {...base} className={className}>
    <path d="M12 2.5l8.5 4.8v9.4L12 21.5l-8.5-4.8V7.3z" />
    <path d="M12 12l8.5-4.7M12 12v9.5M12 12L3.5 7.3" />
  </svg>
);

export const ArrowRightIcon = ({ className }: IconProps) => (
  <svg {...base} className={className}>
    <path d="M4 12h15M13 6l6 6-6 6" />
  </svg>
);

export const ArrowUpIcon = ({ className }: IconProps) => (
  <svg {...base} className={className}>
    <path d="M12 20V5M6 11l6-6 6 6" />
  </svg>
);

export const DownloadIcon = ({ className }: IconProps) => (
  <svg {...base} className={className}>
    <path d="M12 4v11M7 10.5l5 5 5-5M5 20h14" />
  </svg>
);

export const CopyIcon = ({ className }: IconProps) => (
  <svg {...base} className={className}>
    <rect x="8.5" y="8.5" width="11" height="11" rx="2" />
    <path d="M15.5 8.5V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7.5a2 2 0 0 0 2 2h2.5" />
  </svg>
);

export const CheckIcon = ({ className }: IconProps) => (
  <svg {...base} className={className}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </svg>
);

export const MailIcon = ({ className }: IconProps) => (
  <svg {...base} className={className}>
    <rect x="3" y="5.5" width="18" height="13" rx="2" />
    <path d="M3.5 7l8.5 6 8.5-6" />
  </svg>
);

export const PhoneIcon = ({ className }: IconProps) => (
  <svg {...base} className={className}>
    <path d="M6.5 3.5h3l1.5 4-2 1.3a10 10 0 0 0 5.2 5.2l1.3-2 4 1.5v3a2 2 0 0 1-2 2A15.5 15.5 0 0 1 4.5 5.5a2 2 0 0 1 2-2z" />
  </svg>
);

export const PinIcon = ({ className }: IconProps) => (
  <svg {...base} className={className}>
    <path d="M12 21s6.5-5.6 6.5-11a6.5 6.5 0 0 0-13 0C5.5 15.4 12 21 12 21z" />
    <circle cx="12" cy="10" r="2.3" />
  </svg>
);

export const ClockIcon = ({ className }: IconProps) => (
  <svg {...base} className={className}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </svg>
);

export const UserIcon = ({ className }: IconProps) => (
  <svg {...base} className={className}>
    <circle cx="12" cy="8" r="3.8" />
    <path d="M4.5 20c0-4 3.4-6.5 7.5-6.5s7.5 2.5 7.5 6.5" />
  </svg>
);

// ---- Vision pillars --------------------------------------------------------

/** Four prep rooms, one zone colour each. */
export const ZoningIcon = ({ className }: IconProps) => (
  <svg {...base} strokeWidth={0} className={className}>
    <rect x="3" y="3" width="8" height="8" rx="1.8" fill={ZONE_COLORS.veg} />
    <rect x="13" y="3" width="8" height="8" rx="1.8" fill={ZONE_COLORS.jain} />
    <rect x="3" y="13" width="8" height="8" rx="1.8" fill={ZONE_COLORS.vegan} />
    <rect x="13" y="13" width="8" height="8" rx="1.8" fill={ZONE_COLORS.nonveg} />
  </svg>
);

/** Three one-way routes in the flow colours. */
export const OneWayIcon = ({ className }: IconProps) => (
  <svg {...base} strokeWidth={2} className={className}>
    <path d="M3 6h16m-3.5-3.5L19 6l-3.5 3.5" stroke={FLOW_COLORS.raw} />
    <path d="M3 12h16m-3.5-3.5L19 12l-3.5 3.5" stroke={FLOW_COLORS.dirty} />
    <path d="M3 18h16m-3.5-3.5L19 18l-3.5 3.5" stroke={FLOW_COLORS.orders} />
  </svg>
);

export const PeopleIcon = ({ className }: IconProps) => (
  <svg {...base} className={className}>
    <circle cx="8.5" cy="8" r="3.2" />
    <path d="M3 20c0-3.3 2.4-5.5 5.5-5.5s5.5 2.2 5.5 5.5" />
    <path d="M15.5 14.5c0-4 3-6.5 6-6.5 0 4-2.5 6.5-6 6.5z" />
    <path d="M15.8 14c1.4-2 2.8-3.3 4.8-4" />
  </svg>
);

// ---- Safety features -------------------------------------------------------

export const ExtinguisherIcon = ({ className }: IconProps) => (
  <svg {...base} className={className}>
    <rect x="7.5" y="9" width="8" height="12" rx="2.5" />
    <path d="M11.5 9V6.2M8.5 6.2H15l2-1.7M15.5 7.5c2.2.4 3.4 1.7 3.5 4.2M7.5 14h8" />
  </svg>
);

export const SmokeIcon = ({ className }: IconProps) => (
  <svg {...base} className={className}>
    <circle cx="12" cy="12" r="8.5" />
    <circle cx="12" cy="12" r="4.5" />
    <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
  </svg>
);

export const HeatIcon = ({ className }: IconProps) => (
  <svg {...base} className={className}>
    <path d="M10 14.2V5.5a2 2 0 0 1 4 0v8.7a4 4 0 1 1-4 0z" />
    <path d="M12 9v8M17.5 6h3M17.5 9.5h2" />
    <circle cx="12" cy="17.5" r="1.4" fill="currentColor" stroke="none" />
  </svg>
);

export const GasLeakIcon = ({ className }: IconProps) => (
  <svg {...base} className={className}>
    <rect x="4.5" y="9" width="9.5" height="12" rx="3" />
    <path d="M7.5 9V6.5h3.5V9M17 8c1 1 1 2 0 3s-1 2 0 3M20 6c1 1 1 2 0 3" />
  </svg>
);

export const GasValveIcon = ({ className }: IconProps) => (
  <svg {...base} className={className}>
    <path d="M3.5 11v8l8.5-4zM20.5 11v8L12 15z" />
    <path d="M12 15V7M8.5 7h7" />
  </svg>
);

export const EmergencyLightIcon = ({ className }: IconProps) => (
  <svg {...base} className={className}>
    <path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z" />
    <path d="M9.5 18.5h5M10.5 21h3" />
  </svg>
);

/** A small green EXIT sign (the one coloured safety icon). */
export const ExitSignIcon = ({ className }: IconProps) => (
  <svg {...base} strokeWidth={0} className={className}>
    <rect x="2" y="6" width="20" height="12" rx="2.2" fill="#1a7f46" />
    <text x="12" y="14.6" textAnchor="middle" fontSize="6.6" fontWeight="800" letterSpacing="0.5" fill="#fff" fontFamily="inherit">EXIT</text>
  </svg>
);

export const StairsIcon = ({ className }: IconProps) => (
  <svg {...base} className={className}>
    <path d="M3 20h5v-4h4v-4h4V8h5" />
    <path d="M3 20h18" />
  </svg>
);

export const ExitDoorIcon = ({ className }: IconProps) => (
  <svg {...base} className={className}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
  </svg>
);
