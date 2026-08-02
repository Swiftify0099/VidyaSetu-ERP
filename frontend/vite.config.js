import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            // Enables: import { DataTable } from '@/components/shared'
            '@': path.resolve(__dirname, './src'),
        },
    },
    server: {
        allowedHosts: true,
        port: 5000,
        host: '0.0.0.0',
        hmr: false,
        proxy: {
            '/api': {
                target: 'http://127.0.0.1:8000',
                changeOrigin: true,
                secure: false,
            },
            '/storage': {
                target: 'http://127.0.0.1:8000',
                changeOrigin: true,
                secure: false,
            },
        },
    },
    build: {
        outDir: 'dist',
        sourcemap: false,
        // Code split large chunks for better performance
        rollupOptions: {
            output: {
                manualChunks: {
                    react: ['react', 'react-dom', 'react-router-dom'],
                    charts: ['recharts'],
                    utils: ['axios', 'zustand', 'date-fns'],
                },
            },
        },
    },
});
