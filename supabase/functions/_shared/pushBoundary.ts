/** Only supported browser push services, never arbitrary URLs or redirects. */
export function allowedPushEndpoint(value: string): boolean {
  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.port ||
      url.hash
    )
      return false;
    const host = url.hostname;
    return (
      (host === "fcm.googleapis.com" &&
        /^\/(fcm\/send|wp)\/.+/.test(url.pathname)) ||
      (host === "updates.push.services.mozilla.com" &&
        /^\/wpush\/v[12]\/.+/.test(url.pathname)) ||
      (host === "web.push.apple.com" && url.pathname.length > 1) ||
      (/^[a-z0-9-]+\.notify\.windows\.com$/.test(host) &&
        url.pathname.startsWith("/w/"))
    );
  } catch {
    return false;
  }
}
/** Reuse the existing server credential; no new key or scheduler scope. */
export async function pushServiceAuthorized(
  header: string | null,
  secret: string | undefined,
): Promise<boolean> {
  if (!secret || !header?.startsWith("Bearer ")) return false;
  const encoder = new TextEncoder();
  const [actual, expected] = await Promise.all(
    [header.slice(7), secret].map((value) =>
      crypto.subtle.digest("SHA-256", encoder.encode(value)),
    ),
  );
  const a = new Uint8Array(actual),
    b = new Uint8Array(expected);
  return (
    a.reduce(
      (difference, value, index) => difference | (value ^ b[index]),
      0,
    ) === 0
  );
}
