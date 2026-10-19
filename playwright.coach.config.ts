import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "coach-settings.spec.ts",
  fullyParallel: false,
  retries: 0,
  reporter: "list",
  use: { baseURL: "http://127.0.0.1:8094", screenshot: "only-on-failure" },
  projects: [
    { name: "coach-375", use: { viewport: { width: 375, height: 900 } } },
    { name: "coach-1280", use: { viewport: { width: 1280, height: 1000 } } },
  ],
  webServer: {
    command: "npm run dev -- --host 127.0.0.1 --port 8094",
    url: "http://127.0.0.1:8094/tests/fixtures/coach-settings.html",
    reuseExistingServer: false,
    timeout: 120000,
  },
});
