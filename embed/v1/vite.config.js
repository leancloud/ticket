import { defineConfig } from 'vite';
import reactRefresh from '@vitejs/plugin-react-refresh';
import reactJSX from 'vite-react-jsx';
import path from 'path';

export default defineConfig({
  base: '/embed/v1/',
  plugins: [reactRefresh(), reactJSX()],
  server: {
    port: 8080,
    // proxy: {
    //   '/api': 'http://127.0.0.1:3000',
    //   '/env.js': 'http://127.0.0.1:3000',
    // },
  },
  resolve: {
    alias: {
      components: path.resolve('./src/components/'),
      utils: path.resolve('./src/utils/'),
    },
  },
});
