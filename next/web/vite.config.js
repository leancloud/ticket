import { defineConfig } from 'vite';
import reactRefresh from '@vitejs/plugin-react-refresh';
import reactJSX from 'vite-react-jsx';

export default defineConfig({
  base: '/next/',
  plugins: [reactRefresh(), reactJSX()],
  server: {
    port: 8081,
    proxy: {
      '/api': 'http://127.0.0.1:4000',
    },
  },
});
