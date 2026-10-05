import { CLIENT_NAME, STUDIO_NAME } from '../config';
import { ArrowUpIcon } from './icons';
import { scrollToStage } from './seeIn3D';

export function Footer() {
  return (
    <footer className="bg-cream text-ink">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-5 py-12 sm:px-8 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-5">
          <img src="/brand/lockup-light.png" width={389} height={96} alt="Aurexa" className="h-10 w-auto self-start" />
          <p className="text-sm leading-relaxed text-ink/80">
            © {new Date().getFullYear()} {STUDIO_NAME}
            <span aria-hidden="true"> · </span>
            <br className="sm:hidden" />
            Prepared for {CLIENT_NAME}
          </p>
        </div>

        <a
          href="#stage"
          onClick={(e) => { e.preventDefault(); scrollToStage(); }}
          className="prop-btn prop-btn--ghost self-start md:self-auto"
        >
          Back to the 3D model
          <ArrowUpIcon className="size-[1.25em] shrink-0" />
        </a>
      </div>
    </footer>
  );
}
