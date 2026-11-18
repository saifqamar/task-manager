import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globalSetup: ['./test/global-setup.ts'],
    // Integration tests share one database; run files sequentially.
    fileParallelism: false,
  },
});
