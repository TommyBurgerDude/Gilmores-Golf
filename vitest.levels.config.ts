import { defineConfig } from 'vitest/config'

// Slow, exhaustive check of every level. Run with: npm run verify:levels
export default defineConfig({
  test: {
    include: ['src/test/levels/*.slow.ts'],
    environment: 'node',
    testTimeout: 3_600_000,
    fileParallelism: true,
  },
})
