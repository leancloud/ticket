import { defineConfig } from 'vite';
import reactRefresh from '@vitejs/plugin-react-refresh';
import reactJSX from 'vite-react-jsx';
import path from 'path';

export default defineConfig({
  base: '/next/',
  plugins: [reactRefresh(), reactJSX()],
  server: {
    port: 8081,
    proxy: {
      '/api': 'http://127.0.0.1:4000',
    },
  },
  resolve: {
    alias: {
      api: path.resolve('./src/api'),
      utils: path.resolve('./src/utils'),
      components: path.resolve('./src/components'),
    },
  },
});
