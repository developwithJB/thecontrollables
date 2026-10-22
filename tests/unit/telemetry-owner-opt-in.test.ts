// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  init: vi.fn(),
  capture: vi.fn(),
  identify: vi.fn(),
  reset: vi.fn(),
  register: vi.fn(),
  invoke: vi.fn(),
  onAuth: vi.fn(),
}));
vi.mock("posthog-js", () => ({
  default: {
    init: mocks.init,
    capture: mocks.capture,
    identify: mocks.identify,
    reset: mocks.reset,
    register: mocks.register,
  },
}));
vi.mock("@sentry/react", () => ({
  init: vi.fn(),
  setUser: vi.fn(),
  setTag: vi.fn(),
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: async () => ({
        data: {
          session: { user: { id: "synthetic-owner", app_metadata: {} } },
        },
      }),
      onAuthStateChange: mocks.onAuth,
    },
    functions: { invoke: mocks.invoke },
  },
}));
beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.stubEnv("VITE_ENABLE_POSTHOG", "");
  vi.stubEnv("VITE_POSTHOG_KEY", "synthetic-public-project-token");
  vi.stubEnv("VITE_SENTRY_DSN", "");
  window.__TELEMETRY_READY__ = Promise.resolve();
  const local = new Map<string, string>();
  const session = new Map<string, string>();
  const storage = (map: Map<string, string>) => ({
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => map.set(key, value),
  });
  vi.stubGlobal("localStorage", storage(local));
  vi.stubGlobal("sessionStorage", storage(session));
  mocks.invoke.mockResolvedValue({ data: { accepted: true }, error: null });
  mocks.onAuth.mockReturnValue({
    data: { subscription: { unsubscribe: vi.fn() } },
  });
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

it.each(["", "false"])(
  "never initializes, identifies, resets or captures without explicit opt-in: %s",
  async (flag) => {
    vi.stubEnv("VITE_ENABLE_POSTHOG", flag);
    const { initTelemetry } = await import("@/lib/telemetry");
    const { capturePosthogEvent } = await import("@/hooks/useAnalytics");
    initTelemetry();
    await Promise.resolve();
    const changed = mocks.onAuth.mock.calls[0][0];
    changed("SIGNED_IN", { user: { id: "synthetic-owner", app_metadata: {} } });
    changed("SIGNED_OUT", null);
    capturePosthogEvent("landing_view", { placement: "link_in_bio" });
    expect(mocks.init).not.toHaveBeenCalled();
    expect(mocks.identify).not.toHaveBeenCalled();
    expect(mocks.reset).not.toHaveBeenCalled();
    expect(mocks.capture).not.toHaveBeenCalled();
  },
);
it("requires a key as well as the opt-in switch", async () => {
  vi.stubEnv("VITE_ENABLE_POSTHOG", "true");
  vi.stubEnv("VITE_POSTHOG_KEY", "");
  const { initTelemetry } = await import("@/lib/telemetry");
  initTelemetry();
  await Promise.resolve();
  expect(mocks.init).not.toHaveBeenCalled();
  expect(mocks.identify).not.toHaveBeenCalled();
});
it("keeps the Supabase growth sink active with PostHog disabled", async () => {
  const { trackGrowthEvent } = await import("@/lib/growthEvents");
  trackGrowthEvent("landing_view", { placement: "link_in_bio" });
  await vi.waitFor(() =>
    expect(mocks.invoke).toHaveBeenCalledWith(
      "ingest-telemetry",
      expect.objectContaining({
        body: expect.objectContaining({
          kind: "event",
          payload: expect.objectContaining({ event_name: "landing_view" }),
        }),
      }),
    ),
  );
  expect(mocks.init).not.toHaveBeenCalled();
  expect(mocks.capture).not.toHaveBeenCalled();
});
it("allows explicitly enabled owner-approved configuration using mocked SDK only", async () => {
  vi.stubEnv("VITE_ENABLE_POSTHOG", "true");
  const { initTelemetry } = await import("@/lib/telemetry");
  const { capturePosthogEvent } = await import("@/hooks/useAnalytics");
  initTelemetry();
  await Promise.resolve();
  expect(mocks.init).toHaveBeenCalledWith(
    "synthetic-public-project-token",
    expect.any(Object),
  );
  expect(mocks.identify).toHaveBeenCalledWith("synthetic-owner", {
    plan_tier: "free",
  });
  capturePosthogEvent("landing_view", { placement: "link_in_bio" });
  await vi.waitFor(() =>
    expect(mocks.capture).toHaveBeenCalledWith(
      "landing_view",
      expect.objectContaining({ placement: "link_in_bio" }),
    ),
  );
});
