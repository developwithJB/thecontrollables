import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "launch-funnel-local.spec.ts",
  retries: 0,
  reporter: "list",
  fullyParallel: false,
  use: {
    baseURL: "http://127.0.0.1:8092",
    serviceWorkers: "block",
    reducedMotion: "reduce",
    timezoneId: "America/Los_Angeles",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "launch-desktop", use: { ...devices["Desktop Chrome"] } },
    {
      name: "launch-mobile",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
  webServer: {
    command: "npm run dev -- --host 127.0.0.1 --port 8092",
    url: "http://127.0.0.1:8092",
    reuseExistingServer: false,
  },
});
