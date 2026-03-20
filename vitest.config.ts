import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.test.ts', '**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['apps/web/lib/**', 'apps/web/server/**'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './apps/web'),
      '@packages': path.resolve(__dirname, './packages'),
    },
  },
})
