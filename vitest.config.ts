import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts', './test/vitest-setup.ts'],
    globals: true
  },
  resolve: {
    conditions: ['development', 'default']
  }
})
