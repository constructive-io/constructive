import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    // Run tests sequentially to avoid database concurrency issues
    // Each test file drops and recreates schemas, so they can't run in parallel
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    // Also disable file parallelism
    fileParallelism: false,
    // Set reasonable timeout for DB operations
    testTimeout: 30000,
  },
});
