import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, '../shared'),
    },
  },
  server: {
    allowedHosts: ['pipi.hq', 'localhost'],
    port: 80,
    host: true,
    proxy: { '/api': { target: process.env.VITE_PROXY_TARGET || 'http://127.0.0.1:3000', changeOrigin: true } },
  },
});
