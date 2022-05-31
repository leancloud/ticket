import { defineConfig } from 'vite';
import reactRefresh from '@vitejs/plugin-react-refresh';
import reactJSX from 'vite-react-jsx';
import path from 'path';
import replace from '@rollup/plugin-replace';

const replaceForDocsearchDotJs = replace({
  'process.env.RESET_APP_DATA_TIMER': false,
  'global.MutationObserver': 'window.MutationObserver',
  'global.queueMicrotask': 'window.queueMicrotask',
});

export default defineConfig({
  base: '/next/',
  plugins: [reactRefresh(), reactJSX(), replaceForDocsearchDotJs],
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
