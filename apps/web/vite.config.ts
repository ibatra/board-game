import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

/**
 * `--mode demo` builds one self-contained index.html (JS, CSS and fonts all
 * inlined) for dropping on any static host. Online rooms need the WebSocket
 * server, so that build advertises pass-and-play and AI only, and uses hash
 * routing since a static host has no rewrite rules.
 */
export default defineConfig(({ mode }) => {
  const demo = mode === 'demo';
  return {
    base: demo ? './' : '/',
    plugins: [react(), tailwindcss(), ...(demo ? [viteSingleFile()] : [])],
    define: { __STATIC_DEMO__: JSON.stringify(demo) },
    build: demo ? { assetsInlineLimit: 4_000_000, cssCodeSplit: false } : {},
    server: {
      proxy: {
        '/ws': {
          target: 'ws://localhost:3001',
          ws: true,
        },
      },
    },
  };
});
