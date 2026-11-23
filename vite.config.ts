/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import { apiDevServer } from './dev/apiDevServer.ts';

export default defineConfig(({ mode }) => {
  // Expose server-only secrets to the local API emulation (never to the client bundle).
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''));

  return {
    plugins: [react(), apiDevServer()],
    build: {
      target: 'es2022',
      sourcemap: false,
      cssCodeSplit: true,
      rollupOptions: {
        output: {
          manualChunks: (id: string) => (id.includes('node_modules/react') ? 'react' : undefined),
        },
      },
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./tests/setup.ts'],
      include: ['src/**/*.test.{ts,tsx}', 'tests/**/*.test.ts'],
      coverage: {
        provider: 'v8',
        include: ['src/**/*.{ts,tsx}', 'api/**/*.ts'],
        exclude: ['src/main.tsx', 'src/**/*.test.{ts,tsx}', 'src/**/*.d.ts', 'src/testing/**'],
        reporter: ['text', 'html', 'lcov'],
      },
    },
  };
});
