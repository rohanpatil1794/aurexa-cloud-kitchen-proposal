import { DesignLanguage } from './DesignLanguage';
import { Footer } from './Footer';
import { NextSteps } from './NextSteps';
import { SectionDivider } from './primitives';
import { SafetyCompliance } from './SafetyCompliance';
import { Vision } from './Vision';
import { ZonesFlow } from './ZonesFlow';

/**
 * The scrolling proposal that sits below the sticky 3D stage. Its opaque background lets it cover the stage as it scrolls up.
 * Tonal rhythm: cream, white, sand, wall, teal, with a cream footer.
 */
export function Proposal() {
  return (
    <div id="proposal" className="relative z-10 bg-wall">
      <Vision />
      <SectionDivider />
      <ZonesFlow />
      <SectionDivider />
      <SafetyCompliance />
      <SectionDivider />
      <DesignLanguage />
      <SectionDivider />
      <NextSteps />
      <Footer />
    </div>
  );
}
