// @ts-nocheck
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@tp-sdk/ui-react': path.resolve(__dirname, '../src'),
      '@ton-pay/api': path.resolve(__dirname, '../../api/src/index.ts'),
    },
  },
  server: {
    port: 3000,
    open: true,
    fs: {
      allow: [
        __dirname,
        path.resolve(__dirname, '../src'),
        path.resolve(__dirname, '..'),
        path.resolve(__dirname, '../node_modules'),
        path.resolve(__dirname, '../../api/src'),
      ],
    },
  },
});
