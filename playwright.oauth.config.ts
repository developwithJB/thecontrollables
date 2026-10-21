import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "oauth-return-local.spec.ts",
  workers: 1,
  retries: 0,
  reporter: "list",
  outputDir: "output/payment-security-2026-10-21/oauth-results",
  use: {
    baseURL: "http://127.0.0.1:8086",
    serviceWorkers: "block",
    reducedMotion: "reduce",
  },
  projects: [
    { name: "oauth-desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "oauth-mobile", use: { ...devices["iPhone 14"] } },
  ],
  webServer: {
    command: "npm run dev -- --host 127.0.0.1 --port 8086",
    url: "http://127.0.0.1:8086",
    reuseExistingServer: true,
    timeout: 120000,
  },
});
