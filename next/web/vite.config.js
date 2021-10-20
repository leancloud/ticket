import { defineConfig } from 'vite';
import reactRefresh from '@vitejs/plugin-react-refresh';
import reactJSX from 'vite-react-jsx';
import path from 'path';
import analyze from 'rollup-plugin-analyzer';

export default defineConfig({
  base: '/next/',
  plugins: [reactRefresh(), reactJSX()],
  server: {
    port: 8081,
    proxy: {
      '/api/1': 'http://127.0.0.1:3000',
      '/api/2': 'http://127.0.0.1:4000',
    },
  },
  resolve: {
    alias: {
      api: path.resolve('./src/api'),
      leancloud: path.resolve('./src/leancloud'),
      utils: path.resolve('./src/utils'),
      components: path.resolve('./src/components'),
      styles: path.resolve('./src/styles'),
    },
  },
  build: {
    rollupOptions: {
      plugins: [analyze()],
    },
  },
  css: {
    preprocessorOptions: {
      less: {
        // 支持内联 JavaScript
        javascriptEnabled: true,
      },
    },
  },
});
