import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Fixed ports: IndexedDB data is tied to the origin, so each port has its own data.
// - 5173: the real app (built files, `npm run serve`, started at login). Your results live here.
// - 5174: development (`npm run dev`). Separate data, so testing never touches real results.
// base './': built files use relative paths, so the same build works on localhost and on
// GitHub Pages (served from /daily-games-hub/). Routes use HashRouter (#/stats) for the same reason:
// Pages has no fallback to index.html for unknown paths.
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  server: { port: 5174, strictPort: true, open: true },
  preview: { port: 5173, strictPort: true, open: false },
});
