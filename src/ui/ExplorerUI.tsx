// Explorer overlay, shown once the visitor has entered the space: a glass side panel on desktop, a draggable bottom
// sheet on phones. Both carry Rooms | Layers | Views, plus the room card, the legends and the back chip (src/ui/explorer/).
import { useStore } from '../store';
import { useIsMobile } from '../lib/hooks';
import { DesktopExplorer } from './explorer/Desktop';
import { MobileExplorer } from './explorer/Mobile';

export function ExplorerUI() {
  const explorer = useStore((s) => s.phase === 'explorer');
  const mobile = useIsMobile();
  if (!explorer) return null;
  return mobile ? <MobileExplorer /> : <DesktopExplorer />;
}
