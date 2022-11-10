import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  base: '/next/',
  plugins: [react()],
  server: {
    port: 8081,
    proxy: {
      '/api/1': 'http://127.0.0.1:3000',
      '/api/2': 'http://127.0.0.1:4000',
    },
  },
  resolve: {
    alias: {
      '@': path.resolve('./src'),
    },
  },
  css: {
    preprocessorOptions: {
      less: {
        javascriptEnabled: true,
      },
    },
  },
});
