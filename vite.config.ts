import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, URL } from 'node:url';

// public/assets/floorplan-original.png (or the "floorplan-orignal.png" spelling) is the client's
// AI-drawn plan, kept for REFERENCE ONLY. The site never references it, and this keeps it out of
// the deployed bundle too. The generated floorplan.png is the one the site uses.
const referenceOnlyAssets = (): Plugin => ({
  name: 'reference-only-assets',
  apply: 'build',
  closeBundle() {
    const dir = path.resolve('dist/assets');
    if (!fs.existsSync(dir)) return;
    for (const f of fs.readdirSync(dir)) {
      if (/^floorplan-or[a-z]*\.(png|jpe?g|webp)$/i.test(f)) fs.rmSync(path.join(dir, f), { force: true });
    }
  },
});

// Static build, Vercel "Vite" preset compatible (outDir: dist).
export default defineConfig({
  plugins: [react(), tailwindcss(), referenceOnlyAssets()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: { port: 5173, host: true },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
          r3f: ['@react-three/fiber', '@react-three/drei'],
        },
      },
    },
  },
});
