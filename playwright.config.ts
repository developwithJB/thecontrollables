import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for The Dashboard
 * 
 * Run tests:
 *   npm run test:e2e          - Run all E2E tests
 *   npm run test:e2e:ui       - Run with interactive UI
 *   npm run test:e2e -- --headed  - Run with browser visible
 */

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:8080',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    // Desktop browsers
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    // Mobile viewports
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 14'] },
    },
    {
      name: 'Mobile Safari Pro Max',
      use: { ...devices['iPhone 14 Pro Max'] },
    },

    // Tablet
    {
      name: 'iPad',
      use: { ...devices['iPad (gen 7)'] },
    },
  ],

  // Local development server
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:8080',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
