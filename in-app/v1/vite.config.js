import { defineConfig } from 'vite';
import reactRefresh from '@vitejs/plugin-react-refresh';
import reactJSX from 'vite-react-jsx';
import legacy from '@vitejs/plugin-legacy';
import path from 'path';

const additionalLegacyPolyfills = ['intersection-observer'];

export default defineConfig({
  base: '/in-app/v1/',
  plugins: [reactRefresh(), reactJSX(), legacy({ additionalLegacyPolyfills })],
  server: {
    port: 8081,
    proxy: {
      '/api': 'http://127.0.0.1:3000',
    },
  },
  resolve: {
    alias: {
      '@': path.resolve('./src'),
      components: path.resolve('./src/components/'),
      utils: path.resolve('./src/utils/'),
      leancloud: path.resolve('./src/leancloud'),
      types: path.resolve('./src/types'),
      icons: path.resolve('./src/icons'),
    },
  },
});
