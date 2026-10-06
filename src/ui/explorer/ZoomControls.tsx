// On-screen zoom: a "+" / "-" pair, so zooming does not depend on knowing Ctrl + scroll or a pinch (the plain mouse wheel scrolls
// the page). Each press is one step of CameraRig's zoom (store.zoomStep): closer / further in orbit views, a longer / wider lens at
// eye level. Glass pill, two 44 px targets; stacked, or side by side (`rowWhenShort`) on short screens, where a second 44 px
// would reach down into the legends above the phone sheet.
import { useStore } from '../../store';
import { MinusIcon, PlusIcon } from './icons';

const button = 'explorer-chip pointer-events-auto grid size-11 place-items-center text-cream/90';

export function ZoomControls({ className = '', rowWhenShort = false }: { className?: string; rowWhenShort?: boolean }) {
  const stepZoom = useStore((s) => s.stepZoom);
  return (
    <div
      role="group"
      aria-label="Zoom"
      data-label-obstacle
      className={`glass explorer-card pointer-events-auto flex flex-col overflow-hidden rounded-[22px] ${
        rowWhenShort ? '[@media(max-height:700px)]:flex-row' : ''
      } ${className}`}
    >
      <button type="button" aria-label="Zoom in" title="Zoom in" onClick={() => stepZoom(1)} className={button}>
        <PlusIcon size={18} />
      </button>
      <span
        aria-hidden="true"
        className={`mx-2 h-px bg-cream/14 ${rowWhenShort ? '[@media(max-height:700px)]:mx-0 [@media(max-height:700px)]:my-2 [@media(max-height:700px)]:h-auto [@media(max-height:700px)]:w-px' : ''}`}
      />
      <button type="button" aria-label="Zoom out" title="Zoom out" onClick={() => stepZoom(-1)} className={button}>
        <MinusIcon size={18} />
      </button>
    </div>
  );
}
