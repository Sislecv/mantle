/// <reference types="vitest" />
import { defineConfig } from 'vite';

export default defineConfig({
  test: {
    environment: 'happy-dom',
  },
  server: {
    port: 3000,
    open: false,
  },
  build: {
    target: 'es2022',
  },
});
