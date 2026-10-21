import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import {
  sanitizeTelemetry,
  safeTelemetryProps,
} from "../../supabase/functions/_shared/telemetry";
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import { certificateStoragePath } from "@/lib/privateCertificates";
const owner = "00000000-0000-4000-8000-000000000001";
describe("bounded telemetry privacy", () => {
  it("derives identity on the server and drops raw private data", () => {
    const e = sanitizeTelemetry(
      {
        kind: "event",
        payload: {
          event_type: "growth",
          event_name: "book_link_click",
          user_id: "spoof",
          page_path: "/pricing?token=secret",
          event_data: {
            placement: "formation_today",
            email: "private@example.com",
            reflection: "private",
            utm_source: "https://secret",
            count: 2,
          },
        },
      },
      owner,
    );
    expect(e.row).toMatchObject({
      user_id: owner,
      page_path: "/",
      event_data: { placement: "formation_today", count: 2 },
    });
    expect(JSON.stringify(e)).not.toMatch(/spoof|private|secret/);
  });
  it("stores no error messages, stacks, URL referrers or credentials", () => {
    const e = sanitizeTelemetry(
      {
        kind: "error",
        payload: {
          error_message: "private reflection",
          error_stack: "token",
          component_name: "https://secret",
          additional_context: { method: "Bearer secret", step: 2 },
        },
      },
      null,
    );
    expect(e.row).toMatchObject({
      error_message: "Client error reported",
      error_stack: null,
      component_name: "client",
      additional_context: { step: 2 },
    });
    expect(
      sanitizeTelemetry(
        {
          kind: "page",
          payload: { referrer: "https://private", load_time_ms: 9.8 },
        },
        null,
      ).row,
    ).toMatchObject({ referrer: null, load_time_ms: 9 });
  });
  it("rejects malformed envelopes and unrecognized growth names", () => {
    for (const v of [
      null,
      [],
      { kind: "event", payload: {} },
      { kind: "other", payload: {} },
      {
        kind: "event",
        payload: { event_type: "growth", event_name: "private_text" },
      },
    ])
      expect(() => sanitizeTelemetry(v, null)).toThrow();
    expect(
      safeTelemetryProps({
        placement: "sk_test_secret",
        count: Infinity,
        surface: ["private"],
        success: true,
      }),
    ).toEqual({ success: true });
  });
});
describe("private certificate locations", () => {
  const backend = "https://synthetic.supabase.invalid";
  const path = owner + "/season-abc.svg";
  it("supports stable paths, old public URLs and renewable signed URLs", () => {
    for (const v of [
      path,
      backend + "/storage/v1/object/public/certificates/" + path,
      backend +
        "/storage/v1/object/sign/certificates/" +
        path +
        "?token=expired",
    ])
      expect(certificateStoragePath(v, backend)).toBe(path);
    expect(() => certificateStoragePath("Certificate Template.png", backend)).toThrow();
  });
  it("rejects external, traversal and other-bucket locations", () => {
    for (const v of [
      "https://evil.invalid/" + path,
      backend + "/storage/v1/object/public/other/" + path,
      owner + "/../secret.svg",
      owner + "/%2e%2e/secret.svg",
      "//evil.invalid/x.svg",
      backend +
        "/storage/v1/object/public/certificates/" +
        owner +
        "/%252fsecret.svg",
    ])
      expect(() => certificateStoragePath(v, backend)).toThrow();
  });
  it("removes public URL generation and retains strict JWT settings", () => {
    for (const file of [
      "src/hooks/useReset.ts",
      "supabase/functions/generate-certificate/index.ts",
    ])
      expect(readFileSync(file, "utf8")).not.toContain("getPublicUrl");
    const config = readFileSync("supabase/config.toml", "utf8");
    for (const name of [
      "send-daily-nudge",
      "generate-insights",
      "generate-snapshot-insight",
    ])
      expect(config).toMatch(
        new RegExp("\\[functions\\." + name + "\\]\\s+verify_jwt = true"),
      );
  });
});

it('keeps bucket configuration outside managed SQL migrations',()=>{
 const migration=readFileSync('supabase/migrations/20261021000100_customer_launch_security.sql','utf8');
 expect(migration).not.toMatch(/UPDATE\s+storage\.buckets/i);
 expect(migration).toContain('Certificate owners can read their files');
});
