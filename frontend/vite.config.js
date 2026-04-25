import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// APK 빌드 시: `npm run build:app` → base './' (상대경로)
// 일반 웹 빌드: `npm run build` → base '/carevision/' (GitHub Pages 스타일)
export default defineConfig(({ mode }) => ({
  base: mode === 'app' ? './' : '/carevision/',
  plugins: [react()],
  server: {
    port: process.env.PORT ? parseInt(process.env.PORT) : 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
}));
