import { defineConfig } from 'vite';
import reactRefresh from '@vitejs/plugin-react-refresh';
import reactJSX from 'vite-react-jsx';
import legacy from '@vitejs/plugin-legacy';
import path from 'path';

export default defineConfig({
  base: '/in-app/v1/',
  plugins: [
    reactRefresh(),
    reactJSX(),
    legacy({
      polyfills: ['es.global-this'],
      modernPolyfills: ['es.global-this'],
      additionalLegacyPolyfills: ['intersection-observer', 'regenerator-runtime/runtime'],
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
