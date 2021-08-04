import { defineConfig } from 'vite';
import reactRefresh from '@vitejs/plugin-react-refresh';
import reactJSX from 'vite-react-jsx';
import path from 'path';

export default defineConfig({
  base: '/in-app/v1/',
  plugins: [reactRefresh(), reactJSX()],
  server: {
    port: 8081,
    proxy: {
      '/api': 'http://127.0.0.1:3000',
    },
  },
  resolve: {
    alias: {
      components: path.resolve('./src/components/'),
      utils: path.resolve('./src/utils/'),
      leancloud: path.resolve('./src/leancloud'),
      types: path.resolve('./src/types'),
      icons: path.resolve('./src/icons'),
    },
  },
});
