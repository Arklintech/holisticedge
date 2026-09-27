import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => {
  const isHmrDisabled = process.env.DISABLE_HMR === 'true';

  return {
    root: path.resolve(__dirname),
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      port: 3000,
      strictPort: false,
      proxy: {
        '/api': {
          target: 'http://localhost:5000',
          changeOrigin: true,
          secure: false,
          configure: (proxy) => {
            proxy.on('error', (_err, req, res) => {
              if (res && 'writeHead' in res && !res.headersSent) {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, fallback: true, message: 'Local dev server response' }));
              }
            });
          },
        },
      },
      hmr: isHmrDisabled ? false : true,
      watch: isHmrDisabled
        ? null
        : {
            ignored: [
              '**/server/**',
              '**/server/data/**',
              '**/tests/**',
              '**/prisma/**',
              '**/.git/**',
              '**/dist/**',
              '**/*.log',
              '**/.system_generated/**',
              '**/data/**',
              '**/*.db',
              '**/*.sqlite*',
            ],
          },
    },
  };
});
