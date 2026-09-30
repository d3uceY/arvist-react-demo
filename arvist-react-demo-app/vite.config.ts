import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const target = env.VITE_ARVIST_URL || 'https://arvist-staging.arvist.app';
  // Cloudflare Access gates the handshake at the edge. Browsers can't attach
  // custom headers to a WebSocket upgrade, so the socket.io connection is
  // proxied through this (Node) dev server, which can set them.
  const cfAccessHeaders =
    env.VITE_CF_ACCESS_CLIENT_ID && env.VITE_CF_ACCESS_CLIENT_SECRET
      ? {
          'CF-Access-Client-Id': env.VITE_CF_ACCESS_CLIENT_ID,
          'CF-Access-Client-Secret': env.VITE_CF_ACCESS_CLIENT_SECRET,
        }
      : undefined;

  return {
    plugins: [react(), tailwindcss()],
    server: {
      proxy: {
        '/v1/api': {
          target,
          changeOrigin: true,
          secure: true,
          headers: cfAccessHeaders,
        },
        '/socket.io': {
          target,
          changeOrigin: true,
          secure: true,
          ws: true,
          headers: cfAccessHeaders,
        },
      },
    },
    // @arvist/react is a `file:` link to a sibling checkout with its own
    // node_modules/react. Two React copies loaded at once breaks hooks
    // silently, so force a single instance from this project's root.
    resolve: {
      dedupe: ['react', 'react-dom'],
    },
  };
});

