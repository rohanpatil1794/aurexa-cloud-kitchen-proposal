// Rooms | Layers | Views: the tab bar (WAI-ARIA tabs with arrow-key navigation) and the matching tab panel.
import { useRef, type KeyboardEvent, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { useStore, type PanelTab } from '../../store';
import { LayersIcon, RoomsIcon, ViewsIcon } from './icons';
import { LayersTab } from './LayersTab';
import { RoomsTab } from './RoomsTab';
import { ViewsTab } from './ViewsTab';

const TABS: { id: PanelTab; label: string; icon: ReactNode }[] = [
  { id: 'rooms', label: 'Rooms', icon: <RoomsIcon size={16} /> },
  { id: 'layers', label: 'Layers', icon: <LayersIcon size={16} /> },
  { id: 'views', label: 'Views', icon: <ViewsIcon size={16} /> },
];

const tabId = (t: PanelTab) => `explorer-tab-${t}`;
const panelId = (t: PanelTab) => `explorer-panel-${t}`;

export function TabBar({ onSelect }: { onSelect?: (t: PanelTab) => void }) {
  const tab = useStore((s) => s.panelTab);
  const setPanelTab = useStore((s) => s.setPanelTab);
  const reduced = useStore((s) => s.reducedMotion);
  const refs = useRef<Record<PanelTab, HTMLButtonElement | null>>({ rooms: null, layers: null, views: null });
  const select = onSelect ?? setPanelTab;

  const onKeyDown = (e: KeyboardEvent) => {
    const i = TABS.findIndex((t) => t.id === tab);
    const j =
      e.key === 'ArrowRight' ? (i + 1) % TABS.length
      : e.key === 'ArrowLeft' ? (i + TABS.length - 1) % TABS.length
      : e.key === 'Home' ? 0
      : e.key === 'End' ? TABS.length - 1
      : -1;
    if (j < 0) return;
    e.preventDefault();
    select(TABS[j].id);
    refs.current[TABS[j].id]?.focus();
  };

  return (
    <div role="tablist" aria-label="Explorer sections" onKeyDown={onKeyDown} className="flex h-12 shrink-0 px-2">
      {TABS.map((t) => {
        const on = t.id === tab;
        return (
          <button
            key={t.id}
            ref={(el) => { refs.current[t.id] = el; }}
            type="button"
            role="tab"
            id={tabId(t.id)}
            aria-selected={on}
            aria-controls={panelId(t.id)}
            tabIndex={on ? 0 : -1}
            onClick={() => select(t.id)}
            className={`micro relative flex flex-1 items-center justify-center gap-2 rounded-lg transition-colors hover:text-cream ${on ? 'text-cream' : ''}`}
          >
            {t.icon}
            {t.label}
            {on && (
              <motion.span
                layoutId="explorer-tab-underline"
                className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-orange"
                transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 520, damping: 42 }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

/** The content of the current tab (the caller makes it scroll). Remounts per tab, so a scrolling panel opens at the top. */
export function TabPanel({ className = '' }: { className?: string }) {
  const tab = useStore((s) => s.panelTab);
  return (
    <div
      key={tab}
      role="tabpanel"
      id={panelId(tab)}
      aria-labelledby={tabId(tab)}
      className={`explorer-fade-in ${className}`}
    >
      {tab === 'rooms' ? <RoomsTab /> : tab === 'layers' ? <LayersTab /> : <ViewsTab />}
    </div>
  );
}
