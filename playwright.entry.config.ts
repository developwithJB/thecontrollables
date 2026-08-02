import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "new-customer-entry.spec.ts",
  fullyParallel: false,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:8083",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    { name: "entry-desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "entry-mobile", use: { ...devices["iPhone 14"] } },
  ],
  webServer: {
    command: "npm run dev -- --host 127.0.0.1 --port 8083",
    url: "http://127.0.0.1:8083/",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
