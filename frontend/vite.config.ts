import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(({ mode }) => {
  // Load env variables so we can read VITE_API_URL
  const env = loadEnv(mode, process.cwd(), '')

  // Derive the backend origin from the API URL env var (strip /api/v1 suffix)
  // Used only by the dev proxy; on Render the browser calls the absolute URL directly.
  const apiUrl = env.VITE_API_URL || 'https://vidya-setu--pankajyewale111.replit.app/api/v1'
  const backendOrigin = apiUrl.replace(/\/api\/v1\/?$/, '').replace(/\/api\/?$/, '')

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
      // Proxy only active in local dev when VITE_API_URL is a relative path
      ...(apiUrl.startsWith('http') ? {} : {
        proxy: {
          '/api': {
            target: backendOrigin,
            changeOrigin: true,
            secure: true,
          },
          '/storage': {
            target: backendOrigin,
            changeOrigin: true,
            secure: true,
          },
        },
      }),
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
            react:   ['react', 'react-dom', 'react-router-dom'],
            charts:  ['recharts'],
            utils:   ['axios', 'zustand', 'date-fns'],
            tiptap:  ['@tiptap/react', '@tiptap/starter-kit'],
          },
        },
      },
    },
  }
})

