import type { User } from "@supabase/supabase-js";

const DEV_MOCK_USER_ID = "00000000-0000-4000-8000-000000000001";

export function isDevMockLifeOSAuthEnabled(): boolean {
  return import.meta.env.DEV && import.meta.env.VITE_ENABLE_DEV_MOCK_AUTH === "true";
}

export function getDevMockLifeOSUser(): User {
  return {
    id: DEV_MOCK_USER_ID,
    aud: "authenticated",
    role: "authenticated",
    email: "dev-my-controllables@example.local",
    email_confirmed_at: "2026-06-15T00:00:00.000Z",
    phone: "",
    confirmed_at: "2026-06-15T00:00:00.000Z",
    last_sign_in_at: "2026-06-15T00:00:00.000Z",
    app_metadata: {
      provider: "dev-mock",
      providers: ["dev-mock"],
    },
    user_metadata: {
      display_name: "Dev QA Reviewer",
      is_dev_mock_auth: true,
    },
    identities: [],
    created_at: "2026-06-15T00:00:00.000Z",
    updated_at: "2026-06-15T00:00:00.000Z",
    is_anonymous: false,
  } as User;
}
