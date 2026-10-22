import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getSession: vi.fn(), invoke: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getSession: mocks.getSession },
    functions: { invoke: mocks.invoke },
  },
}));
import { sendTelemetry } from "@/lib/telemetrySink";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.invoke.mockResolvedValue({ error: null });
});

it("sends anonymous events without substituting the public key as a user token", async () => {
  mocks.getSession.mockResolvedValue({ data: { session: null }, error: null });
  await sendTelemetry("event", { event_name: "landing_view" });
  expect(mocks.invoke).toHaveBeenCalledWith("ingest-telemetry", {
    headers: { Authorization: "" },
    body: { kind: "event", payload: { event_name: "landing_view" } },
  });
});

it("preserves actual session authentication for server-derived ownership", async () => {
  mocks.getSession.mockResolvedValue({
    data: { session: { access_token: "synthetic-user-token" } },
    error: null,
  });
  await sendTelemetry("event", { event_name: "authenticated_visit" });
  expect(mocks.invoke).toHaveBeenCalledWith(
    "ingest-telemetry",
    expect.objectContaining({
      headers: { Authorization: "Bearer synthetic-user-token" },
    }),
  );
});

it("does not send an anonymous event when session retrieval fails", async () => {
  mocks.getSession.mockResolvedValue({
    data: { session: null },
    error: new Error("session failed"),
  });
  await expect(sendTelemetry("event", {})).rejects.toThrow(
    "telemetry_unavailable",
  );
  expect(mocks.invoke).not.toHaveBeenCalled();
});

it("does not retry a rejected user token anonymously", async () => {
  mocks.getSession.mockResolvedValue({
    data: { session: { access_token: "synthetic-expired" } },
    error: null,
  });
  mocks.invoke.mockResolvedValue({ error: new Error("unauthorized") });
  await expect(sendTelemetry("event", {})).rejects.toThrow(
    "telemetry_unavailable",
  );
  expect(mocks.invoke).toHaveBeenCalledTimes(1);
  expect(mocks.invoke.mock.calls[0][1].headers.Authorization).toBe(
    "Bearer synthetic-expired",
  );
});
