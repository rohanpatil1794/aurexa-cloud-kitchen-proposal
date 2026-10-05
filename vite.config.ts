import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';
import { HERO, SITE_DESCRIPTION, SITE_TITLE, STUDIO_NAME } from './src/config';

/**
 * Public origin that og:image / twitter:image point at. Crawlers (WhatsApp, LinkedIn, Slack) do not resolve
 * relative URLs. Vercel exposes the production domain as VERCEL_PROJECT_PRODUCTION_URL (no protocol);
 * set SITE_URL to override it, e.g. for a custom domain or another host.
 */
function siteOrigin(): string {
  const raw = process.env.SITE_URL ?? process.env.VERCEL_PROJECT_PRODUCTION_URL ?? '';
  if (!raw) return '';
  return (/^https?:\/\//i.test(raw) ? raw : `https://${raw}`).replace(/\/+$/, '');
}

const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Fills the {{TOKEN}}s in index.html from src/config.ts, so the tab title and link previews follow the config. */
function htmlMeta(): Plugin {
  const origin = siteOrigin();
  const tokens: Record<string, string> = {
    SITE_TITLE,
    SITE_DESCRIPTION,
    STUDIO_NAME,
    OG_DESCRIPTION: `${HERO.subline}.`,
    OG_IMAGE: `${origin}/og.png`,
    OG_IMAGE_ALT: `${STUDIO_NAME} mark beside the title: ${SITE_TITLE}`,
  };
  return {
    name: 'html-meta',
    configResolved(config) {
      if (config.command === 'build' && !origin) {
        config.logger.warn('[html-meta] SITE_URL / VERCEL_PROJECT_PRODUCTION_URL is not set: og:image and twitter:image stay relative (/og.png).');
      }
    },
    transformIndexHtml: {
      order: 'pre',
      handler: (html) => html.replace(/\{\{(\w+)\}\}/g, (token, key: string) => (key in tokens ? escapeHtml(tokens[key]) : token)),
    },
  };
}

/** Vite fingerprints the fonts, so index.html cannot name them: preload the hero's weights (400 body, 500 labels, 600 title) from the bundle. */
function preloadFonts(): Plugin {
  return {
    name: 'preload-fonts',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler: (_html, ctx) =>
        Object.keys(ctx.bundle ?? {})
          .filter((file) => /public-sans-latin-(?:400|500|600)-normal-[^/]+\.woff2$/.test(file))
          .map((file) => ({
            tag: 'link',
            injectTo: 'head' as const,
            attrs: { rel: 'preload', as: 'font', type: 'font/woff2', crossorigin: '', href: `/${file}` },
          })),
    },
  };
}

// Static build, Vercel "Vite" preset compatible (outDir: dist).
export default defineConfig({
  plugins: [react(), tailwindcss(), htmlMeta(), preloadFonts()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: { port: 5173, host: true },
  build: {
    target: 'es2022',
    // Fingerprinted JS / CSS / fonts go to dist/static/ so vercel.json can cache that folder as immutable.
    // dist/assets/ keeps only the un-hashed public files (floorplan.png), which must stay revalidated.
    assetsDir: 'static',
    // three alone is about 690 KB: it is its own lazy chunk, off the first-paint path, so the default 500 KB warning is raised.
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        // React is shared by the first-paint bundle; three, r3f, drei and the scene follow the lazy Stage
        // import (scene/LazyStage.tsx), so they download after the page has painted.
        manualChunks(id) {
          const path = id.replace(/\\/g, '/');
          if (/\/node_modules\/(?:react|react-dom|scheduler)\//.test(path)) return 'vendor';
          if (/\/node_modules\/three\//.test(path)) return 'three';
        },
      },
    },
  },
});
