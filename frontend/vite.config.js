var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
export default defineConfig(function (_a) {
    var mode = _a.mode;
    // Load env variables so we can read VITE_API_URL
    var env = loadEnv(mode, process.cwd(), '');
    // Derive the backend origin from the API URL env var (strip /api/v1 suffix)
    // Used only by the dev proxy; on Render the browser calls the absolute URL directly.
    var apiUrl = env.VITE_API_URL || 'http://127.0.0.1:8000/api/v1';
    var backendTarget = (apiUrl.startsWith('http') ? apiUrl.replace(/\/api\/v1\/?$/, '').replace(/\/api\/?$/, '') : '') || 'http://127.0.0.1:8000';
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
                    secure: false,
                },
                '/storage': {
                    target: backendTarget,
                    changeOrigin: true,
                    secure: false,
                },
            },
        },// ── Production Build ────────────────────────────────────────
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
    };
});
