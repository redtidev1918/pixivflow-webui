import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const DEV_API_PORT = process.env.VITE_DEV_API_PORT || 3000;

  return {
  // Build-time injection so VITE_API_BASE_URL works in production bundles.
  define: {
    __VITE_API_BASE_URL__: JSON.stringify(env.VITE_API_BASE_URL ?? ''),
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: `http://localhost:${DEV_API_PORT}`,
        changeOrigin: true,
      },
      '/socket.io': {
        target: `http://localhost:${DEV_API_PORT}`,
        ws: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  // relative base keeps the built bundle servable from any sub-path
  base: './',
  };
});

