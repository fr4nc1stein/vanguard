/// <reference types="vitest" />

import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/.next/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      exclude: [
        'node_modules/**',
        '.next/**',
        'tests/**',
        '*.config.ts',
        '**/*.d.ts',
      ],
      // Initial thresholds for core security functions
      // lib/crypto.ts, lib/auth.ts, lib/validation.ts are tested (~95% coverage)
      // lib/db and lib/services require integration tests
      thresholds: {
        lines: 40,
        functions: 30,
        branches: 40,
        statements: 40,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
