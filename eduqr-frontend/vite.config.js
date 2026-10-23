import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Local dev: /api calls are proxied to your local Express server (port 3000)
export default defineConfig({
  plugins: [react()],
  server: {
  port: 5173,
  proxy: {
    '/api': {
      target: 'http://localhost:3000',
      changeOrigin: true,
      configure: (proxy) => {
        proxy.on('proxyReq', (proxyReq) => proxyReq.removeHeader('origin'));
      },
    },
  },
},
});
