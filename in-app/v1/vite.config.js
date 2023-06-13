import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import legacy from '@vitejs/plugin-legacy';
import path from 'path';

export default defineConfig({
  base: '/in-app/v1/',
  plugins: [
    react(),
    legacy({
      targets: ['defaults', 'not IE 11', 'Android 56', 'iOS 10'],
    }),
  ],
  server: {
    port: 8081,
    proxy: {
      '/api': 'http://127.0.0.1:3000',
    },
  },
  resolve: {
    alias: {
      '@': path.resolve('./src'),
    },
  },
});
