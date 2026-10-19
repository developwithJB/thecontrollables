import { defineConfig } from '@playwright/test';
const api = process.env.LOCAL_SUPABASE_URL || '';
if (!api || !['127.0.0.1', 'localhost'].includes(new URL(api).hostname)) throw new Error('Private check-in integration tests require an explicitly local Supabase URL.');
export default defineConfig({
  testDir: './tests/e2e', testMatch: 'private-checkins-local.spec.ts', workers: 1, retries: 0, reporter: [['list']],
  use: { baseURL: 'http://127.0.0.1:5555', screenshot: 'only-on-failure', trace: 'retain-on-failure' },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 5555', url: 'http://127.0.0.1:5555/tests/fixtures/private-checkins-local.html', reuseExistingServer: false,
    env: { VITE_SUPABASE_URL: api, VITE_SUPABASE_PUBLISHABLE_KEY: process.env.LOCAL_SUPABASE_ANON_KEY!, VITE_ENABLE_DEV_MOCK_AUTH: 'false' },
  },
});
