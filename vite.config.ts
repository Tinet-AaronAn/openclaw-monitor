import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5174,
    host: true,  // 允许外部访问
    allowedHosts: [
      'localhost',
      // 可以添加局域网 IP 或自定义域名
    ],
    proxy: {
      '/api': {
        target: 'http://localhost:3011',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:3012',
        ws: true,
      },
    },
  },
  build: {
    outDir: 'dist/client',
    sourcemap: true,
  },
});
