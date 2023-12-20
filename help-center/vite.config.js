import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import legacy from '@vitejs/plugin-legacy';
import path from 'path';

export default defineConfig({
  base: '/help-center',
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
  css: {
    preprocessorOptions: {
      less: {
        javascriptEnabled: true,
      },
    },
  },
});
