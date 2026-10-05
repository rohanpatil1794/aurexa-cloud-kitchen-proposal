import { useState } from 'react';
import { FLOORPLAN_URL, HERO, STUDIO_NAME } from '../config';
import { scrollToProposal } from './nav';

/**
 * Shown instead of the 3D stage when WebGL is unavailable (or the context cannot be created, or the scene chunk fails to
 * load). It is the whole stage: while it is mounted the hero and the explorer step aside (`#stage:has(.webgl-fallback)` in
 * index.css), since there is nothing for them to drive. Cream on dark teal, with the 2D floor plan so the proposal still reads.
 */
export function WebGLFallback() {
  const [imgFailed, setImgFailed] = useState(false);
  return (
    <section
      aria-label="Floor plan"
      className="webgl-fallback absolute inset-0 z-0 flex flex-col items-center gap-6 overflow-y-auto px-6 pb-10 pt-[calc(var(--topbar-h)+1.5rem)] text-center text-cream [&>*:first-child]:mt-auto [&>*:last-child]:mb-auto"
      style={{ background: 'radial-gradient(ellipse 80% 70% at 50% 45%, #15413f 0%, #0d2a2a 55%, #071617 100%)' }}
    >
      <div className="max-w-lg">
        <p className="brand-heading text-[11px] text-teal-light">{STUDIO_NAME}</p>
        <p className="hero-title mt-3 text-balance">{HERO.headline}</p>
        <h2 className="mt-5 text-base font-medium text-cream">The 3D view needs WebGL</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-cream/80">
          Your browser or device could not start 3D graphics. Try another browser, or turn on hardware
          acceleration. Meanwhile, here is the floor plan, and the rest of the proposal works as normal.
        </p>
      </div>
      {!imgFailed && (
        <figure className="m-0 w-full max-w-3xl">
          <img
            src={FLOORPLAN_URL}
            alt="Floor plan of the 3,000 sq ft cloud kitchen and office"
            onError={() => setImgFailed(true)}
            className="mx-auto max-h-[46svh] w-auto max-w-full rounded-md border border-cream/20 bg-cream/95 object-contain p-2 shadow-2xl"
          />
          <figcaption className="mt-2 text-xs tracking-wide text-cream/70">Floor plan, 60 × 50 ft</figcaption>
        </figure>
      )}
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button type="button" onClick={scrollToProposal} className="hero-cta">
          Continue to the proposal
        </button>
        {!imgFailed && (
          <a href={FLOORPLAN_URL} download className="prop-btn prop-btn--outline">
            Download the floor plan
          </a>
        )}
      </div>
    </section>
  );
}
