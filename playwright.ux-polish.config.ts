import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "ux-polish-local.spec.ts",
  retries: 0,
  reporter: "list",
  workers: 1,
  use: {
    ...devices["Desktop Chrome"],
    viewport: { width: 1280, height: 900 },
    baseURL: "http://127.0.0.1:8094",
    serviceWorkers: "block",
    reducedMotion: "reduce",
    timezoneId: "America/Los_Angeles",
  },
  webServer: {
    command:
      "VITE_ENABLE_DEV_MOCK_AUTH=true npm run dev -- --host 127.0.0.1 --port 8094",
    url: "http://127.0.0.1:8094",
    reuseExistingServer: false,
  },
});
