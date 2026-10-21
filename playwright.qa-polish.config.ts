import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "qa-polish.spec.ts",
  retries: 0,
  reporter: "list",
  use: {
    ...devices["Desktop Chrome"],
    viewport: { width: 390, height: 844 },
    baseURL: "http://127.0.0.1:8088",
    serviceWorkers: "block",
  },
  webServer: {
    command:
      "VITE_ENABLE_DEV_MOCK_AUTH=true npm run dev -- --host 127.0.0.1 --port 8088",
    url: "http://127.0.0.1:8088",
    reuseExistingServer: false,
  },
});
