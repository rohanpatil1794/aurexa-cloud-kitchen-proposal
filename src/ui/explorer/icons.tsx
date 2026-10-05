// Tiny inline icons for the explorer UI: 24 x 24 grid, 1.7 stroke, drawn for this project (no icon package).
import type { ReactElement, ReactNode } from 'react';
import type { PresetId } from '../../data/types';

interface IconProps {
  size?: number;
  className?: string;
}

function Icon({ size = 16, className, children }: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

// ---- tabs ---------------------------------------------------------------------------------------
export const RoomsIcon = (p: IconProps) => (
  <Icon {...p}><rect x="3.5" y="3.5" width="17" height="17" rx="2.5" /><path d="M3.5 10h8M11.5 3.5v17M11.5 15.5h9" /></Icon>
);
export const LayersIcon = (p: IconProps) => (
  <Icon {...p}><path d="m12 3.5 8.5 4.5-8.5 4.5L3.5 8z" /><path d="m3.5 12.5 8.5 4.5 8.5-4.5M3.5 16.5l8.5 4.5 8.5-4.5" /></Icon>
);
export const ViewsIcon = (p: IconProps) => (
  <Icon {...p}><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" /><circle cx="12" cy="12" r="2.8" /></Icon>
);

// ---- arrows -------------------------------------------------------------------------------------
export const BackIcon = (p: IconProps) => (
  <Icon {...p}><path d="M19 12H5.5M11 6l-6 6 6 6" /></Icon>
);
export const ChevronLeftIcon = (p: IconProps) => (
  <Icon {...p}><path d="m14.5 5.5-6.5 6.5 6.5 6.5" /></Icon>
);
export const ChevronRightIcon = (p: IconProps) => (
  <Icon {...p}><path d="m9.5 5.5 6.5 6.5-6.5 6.5" /></Icon>
);
export const ChevronDownIcon = (p: IconProps) => (
  <Icon {...p}><path d="m5.5 9.5 6.5 6.5 6.5-6.5" /></Icon>
);
export const ChevronUpIcon = (p: IconProps) => (
  <Icon {...p}><path d="m5.5 14.5 6.5-6.5 6.5 6.5" /></Icon>
);
export const CloseIcon = (p: IconProps) => (
  <Icon {...p}><path d="M6 6l12 12M18 6 6 18" /></Icon>
);
export const InfoIcon = (p: IconProps) => (
  <Icon {...p}><circle cx="12" cy="12" r="8.5" /><path d="M12 11v5.5M12 7.8h.01" /></Icon>
);

// ---- camera presets -----------------------------------------------------------------------------
const PRESET_ICONS: Record<PresetId, (p: IconProps) => ReactElement> = {
  aerial: (p) => (
    <Icon {...p}><path d="m12 3.5 8 4.2v8.6l-8 4.2-8-4.2V7.7z" /><path d="m4 7.7 8 4.2 8-4.2M12 11.9v8.6" /></Icon>
  ),
  plan: (p) => (
    <Icon {...p}><rect x="3.5" y="3.5" width="17" height="17" rx="1.5" /><path d="M3.5 9.5h6v5h-6M9.5 14.5V20.5M14.5 3.5v8h6" /></Icon>
  ),
  kitchen: (p) => (
    <Icon {...p}><path d="M12 3.5c.5 3.2 4.5 4.8 4.5 9a4.5 4.5 0 0 1-9 0c0-1.7.8-2.8 1.8-3.8.2 1.4.9 2 1.7 2.3-.4-2.8.2-5.2 1-7.5z" /></Icon>
  ),
  entrance: (p) => (
    <Icon {...p}><path d="M6.5 20.5v-16h11v16M3.5 20.5h17" /><circle cx="14.5" cy="12.5" r=".6" fill="currentColor" /></Icon>
  ),
};
export const PresetIcon = ({ id, ...p }: IconProps & { id: PresetId }) => PRESET_ICONS[id](p);

// ---- layer overlays -----------------------------------------------------------------------------
export const SafetyIcon = (p: IconProps) => (
  <Icon {...p}><path d="M12 3.5 5 6v5.5c0 4.2 2.8 7.4 7 9 4.2-1.6 7-4.8 7-9V6z" /><path d="m8.8 12 2.3 2.3 4.1-4.6" /></Icon>
);
export const ZonesIcon = (p: IconProps) => (
  <Icon {...p}><rect x="3.5" y="3.5" width="7.5" height="7.5" rx="1.5" /><rect x="13" y="3.5" width="7.5" height="7.5" rx="1.5" /><rect x="3.5" y="13" width="7.5" height="7.5" rx="1.5" /><rect x="13" y="13" width="7.5" height="7.5" rx="1.5" /></Icon>
);
export const LabelsIcon = (p: IconProps) => (
  <Icon {...p}><path d="M3.5 12V4.5a1 1 0 0 1 1-1H12l8.5 8.5-8 8.5z" /><circle cx="8" cy="8" r="1.3" /></Icon>
);
export const DimensionsIcon = (p: IconProps) => (
  <Icon {...p}><path d="M3.5 7v10M20.5 7v10M3.5 12h17M7 9l-3.5 3L7 15M17 9l3.5 3L17 15" /></Icon>
);
export const EquipmentIcon = (p: IconProps) => (
  <Icon {...p}><rect x="3.5" y="9" width="17" height="11.5" rx="1.5" /><path d="M3.5 13.5h17M8 6.5h8M7.5 17h.01M12 17h.01M16.5 17h.01" /></Icon>
);

// ---- scene modes --------------------------------------------------------------------------------
export const DollhouseIcon = (p: IconProps) => (
  <Icon {...p}><path d="M3.5 15.5V12h17v3.5M3.5 12 12 8l8.5 4M12 8v4M3.5 15.5 12 19.5l8.5-4" /></Icon>
);
export const FullHeightIcon = (p: IconProps) => (
  <Icon {...p}><path d="M3.5 8v9.5l8.5 3.5 8.5-3.5V8M3.5 8 12 4.5 20.5 8 12 11.5zM12 11.5V21" /></Icon>
);
export const SunIcon = (p: IconProps) => (
  <Icon {...p}><circle cx="12" cy="12" r="3.8" /><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4" /></Icon>
);
export const MoonIcon = (p: IconProps) => (
  <Icon {...p}><path d="M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10z" /></Icon>
);

// ---- room views ---------------------------------------------------------------------------------
export const OverviewIcon = (p: IconProps) => (
  <Icon {...p}><path d="M4 8.5V4h4.5M20 8.5V4h-4.5M4 15.5V20h4.5M20 15.5V20h-4.5" /><rect x="8.5" y="8.5" width="7" height="7" rx="1" /></Icon>
);
export const EyeLevelIcon = (p: IconProps) => (
  <Icon {...p}><circle cx="12" cy="6" r="2.5" /><path d="M7.5 21v-6.5a4.5 4.5 0 0 1 9 0V21" /></Icon>
);
