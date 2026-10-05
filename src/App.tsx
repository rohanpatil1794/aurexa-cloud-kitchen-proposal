import { useEffect } from 'react';
import { STAGE_SCROLL_VH } from './config';
import { useStore } from './store';
import { Stage } from './scene/Stage';
import { TopBar } from './ui/TopBar';
import { Hero } from './ui/Hero';
import { ExplorerUI } from './ui/ExplorerUI';
import { LoadingSplash } from './ui/LoadingSplash';
import { Proposal } from './sections/Proposal';

/**
 * Page structure:
 *   #stage-wrap  (STAGE_SCROLL_VH tall; a later walkthrough prompt can lengthen it)
 *     #stage     sticky, full-viewport. ONE persistent <Canvas> (Stage) + overlays (Hero, ExplorerUI, splash)
 *   <Proposal/>  light proposal sections that scroll below the stage
 */
export function App() {
  const clearSelection = useStore((s) => s.clearSelection);

  // Esc returns to aerial from any selection.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && useStore.getState().selectedRoom) clearSelection();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [clearSelection]);

  return (
    <>
      <TopBar />
      <div id="stage-wrap" style={{ height: `${STAGE_SCROLL_VH}svh` }}>
        <section id="stage" aria-label="Interactive 3D proposal" className="sticky top-0 h-svh w-full overflow-hidden bg-stage">
          <Stage />
          <Hero />
          <ExplorerUI />
          <LoadingSplash />
        </section>
      </div>
      <Proposal />
    </>
  );
}
