import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "freemium-checkout-local.spec.ts",
  fullyParallel: false,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:8085",
    serviceWorkers: "block",
    reducedMotion:"reduce",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "billing-desktop", use: { ...devices["Desktop Chrome"] } },
    {
      name: "billing-mobile",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
  webServer: {
    command: "npm run dev -- --host 127.0.0.1 --port 8085",
    url: "http://127.0.0.1:8085",
    reuseExistingServer: true,
    timeout: 120000,
  },
});
