/** Standard user-OAuth WHOOP webhooks (not the separate laboratory Partner API).
 * https://developer.whoop.com/docs/developing/webhooks/ */
export async function validWhoopSignature(
  raw: string | Uint8Array,
  timestamp: string | null,
  signature: string | null,
  secret: string | undefined,
  now = Date.now(),
): Promise<boolean> {
  if (
    !secret ||
    !timestamp ||
    !signature ||
    !/^\d{13}$/.test(timestamp) ||
    Math.abs(now - Number(timestamp)) > 300000 ||
    !/^[A-Za-z0-9+/]{43}=?$/.test(signature)
  )
    return false;
  try {
    const encoder = new TextEncoder(),
      key = await crypto.subtle.importKey(
        "raw",
        encoder.encode(secret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["verify"],
      );
    const decoded = Uint8Array.from(atob(signature), (c) => c.charCodeAt(0));
    const prefix = encoder.encode(timestamp),
      body = typeof raw === "string" ? encoder.encode(raw) : raw;
    const signed = new Uint8Array(prefix.length + body.length);
    signed.set(prefix);
    signed.set(body, prefix.length);
    return (
      decoded.length === 32 &&
      (await crypto.subtle.verify("HMAC", key, decoded, signed))
    );
  } catch {
    return false;
  }
}
export function whoopWebhookPayload(
  value: unknown,
): { user_id: string; id: string; type: string; trace_id: string } | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const body = value as Record<string, unknown>;
  const user =
    typeof body.user_id === "number" &&
    Number.isSafeInteger(body.user_id) &&
    body.user_id > 0
      ? String(body.user_id)
      : typeof body.user_id === "string" && /^\d{1,19}$/.test(body.user_id)
        ? body.user_id
        : null;
  const id =
    typeof body.id === "string" && body.id.length > 0 && body.id.length <= 200
      ? body.id
      : typeof body.id === "number" &&
          Number.isSafeInteger(body.id) &&
          body.id > 0
        ? String(body.id)
        : null;
  if (
    !user ||
    !id ||
    typeof body.type !== "string" ||
    ![
      "workout.updated",
      "workout.deleted",
      "sleep.updated",
      "sleep.deleted",
      "recovery.updated",
      "recovery.deleted",
    ].includes(body.type) ||
    typeof body.trace_id !== "string" ||
    !/^[A-Za-z0-9_-]{1,200}$/.test(body.trace_id)
  )
    return null;
  return { user_id: user, id, type: body.type, trace_id: body.trace_id };
}
export async function whoopDeliveryKey(body: {
  user_id: string;
  id: string;
  type: string;
  trace_id: string;
}): Promise<string> {
  const bytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(
      JSON.stringify([body.user_id, body.id, body.type, body.trace_id]),
    ),
  );
  return Array.from(new Uint8Array(bytes), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}
