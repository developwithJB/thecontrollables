import { it, expect } from "vitest";
import {
  validWhoopSignature,
  whoopWebhookPayload,
  whoopDeliveryKey,
} from "../../supabase/functions/_shared/whoopWebhook";
const secret = "synthetic-whoop-secret",
  raw =
    ' {"user_id":10129,"id":"日本","type":"sleep.updated","trace_id":"trace"}',
  now = 1792600000000;
async function signature(body = raw, timestamp = String(now)) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const bytes = new Uint8Array(
    await crypto.subtle.sign(
      "HMAC",
      key,
      new TextEncoder().encode(timestamp + body),
    ),
  );
  return btoa(String.fromCharCode(...bytes));
}
it("verifies exact UTF-8 bytes and never reserializes JSON before validation", async () => {
  const signed = await signature();
  expect(await validWhoopSignature(raw, String(now), signed, secret, now)).toBe(
    true,
  );
  expect(
    await validWhoopSignature(
      new TextEncoder().encode(raw),
      String(now),
      signed,
      secret,
      now,
    ),
  ).toBe(true);
  expect(
    await validWhoopSignature(
      JSON.stringify(JSON.parse(raw)),
      String(now),
      signed,
      secret,
      now,
    ),
  ).toBe(false);
});
it("rejects missing/wrong secret, malformed headers and stale/future signatures", async () => {
  const sig = await signature();
  for (const [time, signatureValue, key] of [
    [String(now), sig, undefined],
    [String(now), sig, "wrong"],
    [null, sig, secret],
    [String(now), "invalid", secret],
    [String(now - 600000), await signature(raw, String(now - 600000)), secret],
    [String(now + 600000), await signature(raw, String(now + 600000)), secret],
  ] as const)
    expect(await validWhoopSignature(raw, time, signatureValue, key, now)).toBe(
      false,
    );
});
it("stores only authenticated provider metadata and rejects unsafe numeric identifiers", () => {
  const body = whoopWebhookPayload({
    ...JSON.parse(raw),
    private_health: "remove",
  });
  expect(body).toEqual({
    user_id: "10129",
    id: "日本",
    type: "sleep.updated",
    trace_id: "trace",
  });
  expect(
    whoopWebhookPayload({ ...JSON.parse(raw), user_id: 9007199254740992 }),
  ).toBeNull();
  expect(
    whoopWebhookPayload({ ...JSON.parse(raw), type: "admin.grant" }),
  ).toBeNull();
});
it("deduplicates a stable provider event while retaining distinct objects/traces", async () => {
  const body = whoopWebhookPayload(JSON.parse(raw))!;
  expect(await whoopDeliveryKey(body)).toBe(
    await whoopDeliveryKey({ ...body }),
  );
  expect(await whoopDeliveryKey({ ...body, trace_id: "different" })).not.toBe(
    await whoopDeliveryKey(body),
  );
});
