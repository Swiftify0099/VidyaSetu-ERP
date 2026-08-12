import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(({ mode }) => {
  // Load env variables so we can read VITE_API_URL
  const env = loadEnv(mode, process.cwd(), '')

  // Derive the backend origin from the API URL env var (strip /api/v1 suffix)
  // Used only by the dev proxy; on Render the browser calls the absolute URL directly.
  const apiUrl = env.VITE_API_URL || 'http://127.0.0.1:8000/api/v1'
  const backendTarget = (apiUrl.startsWith('http') ? apiUrl.replace(/\/api\/v1\/?$/, '').replace(/\/api\/?$/, '') : '') || 'http://127.0.0.1:8000'

  return {
    plugins: [react()],

    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },

    // ── Dev server (local only, ignored by Render) ──────────────
    server: {
      allowedHosts: true,
      port: 5173,
      host: true,
      hmr: false,
      proxy: {
        '/api': {
          target: backendTarget,
          changeOrigin: true,
          secure: true,
          ws: false,
          // Ensure path is passed through exactly — no rewriting
          rewrite: (path) => path,
          configure: (proxy) => {
            proxy.on('error', (err) => {
              console.error('[proxy error]', err.message);
            });
            proxy.on('proxyReq', (proxyReq) => {
              // Remove origin/referer so backend doesn't apply CORS logic
              proxyReq.removeHeader('origin');
              proxyReq.removeHeader('referer');
            });
          },
        },
        '/storage': {
          target: backendTarget,
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path,
        },
      },
    },

    // ── Production Build ────────────────────────────────────────
    build: {
      outDir: 'dist',
      sourcemap: false,
      // Raise chunk-size warning threshold (large ERP = expected)
      chunkSizeWarningLimit: 1500,
      rollupOptions: {
        output: {
          manualChunks: {
            react: ['react', 'react-dom', 'react-router-dom'],
            charts: ['recharts'],
            utils: ['axios', 'zustand', 'date-fns'],
            tiptap: ['@tiptap/react', '@tiptap/starter-kit'],
          },
        },
      },
    },
  }
})

