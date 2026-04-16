import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for CCA Legal Hub E2E tests.
 *
 * Run tests locally:
 *   npm run test:e2e           # headless
 *   npm run test:e2e:ui        # interactive UI mode
 *   npm run test:e2e:headed    # see the browser
 *
 * Authenticated tests require E2E_TEST_EMAIL and E2E_TEST_PASSWORD
 * env vars (otherwise they are skipped).
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'html',

  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:8080',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: 'npm run dev',
        url: 'http://localhost:8080',
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
