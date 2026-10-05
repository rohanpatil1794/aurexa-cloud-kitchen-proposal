// Floating "Back to aerial" chip: shown whenever the camera is off the aerial preset (inside a room, plan, entrance...).
import { AnimatePresence, motion } from 'framer-motion';
import { useStore } from '../../store';
import { BackIcon } from './icons';

export function BackChip({ className = '' }: { className?: string }) {
  const show = useStore((s) => s.activePreset !== 'aerial');
  const reduced = useStore((s) => s.reducedMotion);
  const clearSelection = useStore((s) => s.clearSelection);
  const t = reduced ? { duration: 0 } : { duration: 0.25 };
  return (
    <AnimatePresence>
      {show && (
        <motion.button
          type="button"
          onClick={clearSelection}
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.94 }}
          transition={t}
          className={`glass explorer-chip pointer-events-auto flex min-h-11 items-center gap-2 rounded-full pl-3.5 pr-4 text-[13px] font-medium ${className}`}
        >
          <BackIcon size={15} />
          Back to aerial
        </motion.button>
      )}
    </AnimatePresence>
  );
}
