import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "youversion-local.spec.ts",
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:8086",
    serviceWorkers: "block",
    reducedMotion: "reduce",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "scripture-desktop", use: { ...devices["Desktop Chrome"] } },
    {
      name: "scripture-mobile",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
  webServer: {
    command: "npm run dev -- --host 127.0.0.1 --port 8086",
    url: "http://127.0.0.1:8086",
    reuseExistingServer: false,
    timeout: 120000,
    env: { VITE_YOUVERSION_READER_ENABLED: "false" },
  },
});
