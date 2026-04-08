// client/vite.config.ts

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalizedId = id.replace(/\\/g, '/');
          if (!normalizedId.includes('/node_modules/')) return;

          if (normalizedId.includes('/recharts/') || normalizedId.includes('/d3-')) {
            return 'chart-vendor';
          }

          if (
            normalizedId.includes('/react-calendar/') ||
            normalizedId.includes('/date-fns/') ||
            normalizedId.includes('/@hyunbinseo/holidays-kr/')
          ) {
            return 'calendar-vendor';
          }
        },
      },
    },
  },
});
