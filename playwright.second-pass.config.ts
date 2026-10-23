import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e", testMatch: "second-pass-local.spec.ts", retries: 0, workers: 1, reporter: "list",
  use: { baseURL: "http://127.0.0.1:8096", serviceWorkers: "block", reducedMotion: "reduce", timezoneId: "America/Los_Angeles", trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 900 } } },
    { name: "phone", use: { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
    { name: "phone-webkit", use: { ...devices["iPhone 13"], viewport: { width: 390, height: 844 } } },
  ],
  webServer: { command: "VITE_ENABLE_DEV_MOCK_AUTH=true npm run dev -- --host 127.0.0.1 --port 8096", url: "http://127.0.0.1:8096", reuseExistingServer: false },
});
