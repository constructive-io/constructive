import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './__tests__',
  testMatch: '**/*.playwright.test.ts',
  timeout: 60000,
  retries: 0,
  use: {
    baseURL: 'http://localhost',
  },
  projects: [
    {
      name: 'api',
      testMatch: '**/*.playwright.test.ts',
    },
  ],
});
