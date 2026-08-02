import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "formation-circuits.spec.ts",
  fullyParallel: false,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:8081",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    { name: "formation-desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "formation-mobile", use: { ...devices["iPhone 14"] } },
  ],
  webServer: {
    command: "VITE_ENABLE_DEV_MOCK_AUTH=true npm run dev -- --host 127.0.0.1 --port 8081",
    url: "http://127.0.0.1:8081/formation/today",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
