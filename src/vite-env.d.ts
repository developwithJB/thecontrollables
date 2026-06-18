/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_POSTHOG_KEY?: string;
  readonly VITE_POSTHOG_HOST?: string;
  readonly VITE_SENTRY_DSN?: string;
  readonly VITE_SENTRY_TRACES_SAMPLE_RATE?: string;
  readonly VITE_ENABLE_SUPABASE_ANALYTICS?: string;
  readonly VITE_ENABLE_DEV_MOCK_AUTH?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
