const ATTRIBUTION_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "ref",
  "referrer_host",
] as const;
export type Attribution = Partial<
  Record<(typeof ATTRIBUTION_KEYS)[number], string>
> & { landing_path: string; captured_at: number };
export const sanitizeAttributionValue = (value: unknown): string | undefined =>
  typeof value === "string"
    ? value
        .toLowerCase()
        .replace(/[^a-z0-9._-]/g, "")
        .slice(0, 64) || undefined
    : undefined;
function readStoredAttribution(
  storage: Storage,
  key: string,
): Attribution | null {
  try {
    const input = JSON.parse(storage.getItem(key) || "null");
    if (!input || typeof input !== "object") return null;
    const sanitizedAttribution: Attribution = {
      landing_path:
        typeof input.landing_path === "string"
          ? input.landing_path.split(/[?#]/)[0]
          : "/",
      captured_at: Number(input.captured_at) || 0,
    };
    for (const key of ATTRIBUTION_KEYS) {
      const value = sanitizeAttributionValue(input[key]);
      if (value) sanitizedAttribution[key] = value;
    }
    return sanitizedAttribution;
  } catch {
    return null;
  }
}
export function getAttribution(): {
  first: Attribution | null;
  last: Attribution | null;
} {
  if (typeof window === "undefined") return { first: null, last: null };
  let first = null,
    last = null;
  try {
    first = readStoredAttribution(window.localStorage, "growth_first_touch");
  } catch {
    /* Storage unavailable */
  }
  try {
    last = readStoredAttribution(window.sessionStorage, "growth_last_touch");
  } catch {
    /* Storage unavailable */
  }
  return { first, last };
}
export function captureAttribution(location?: { pathname: string; search: string }): void {
  if (typeof window === "undefined") return;
  try {
    const touch: Attribution = {
      landing_path: location?.pathname ?? window.location.pathname,
      captured_at: Date.now(),
    };
    const searchParams = new URLSearchParams(location?.search ?? window.location.search);
    for (const key of ATTRIBUTION_KEYS) {
      if (key === "referrer_host") continue;
      const value = sanitizeAttributionValue(searchParams.get(key));
      if (value) touch[key] = value;
    }
    try {
      const host = new URL(document.referrer).hostname.toLowerCase();
      if (
        host !== window.location.hostname &&
        host !== "localhost" &&
        host !== "127.0.0.1" &&
        !host.endsWith(".localhost") &&
        !host.endsWith(".lovable.app") &&
        !host.endsWith(".lovableproject.com") &&
        host !== "lovable.dev" &&
        !host.endsWith(".lovable.dev")
      )
        touch.referrer_host = sanitizeAttributionValue(host);
    } catch {
      /* Empty or malformed referrer */
    }
    try {
      if (!window.localStorage.getItem("growth_first_touch"))
        window.localStorage.setItem(
          "growth_first_touch",
          JSON.stringify(touch),
        );
    } catch {
      /* Storage unavailable */
    }
    try {
      // Internal navigation/reloads must not erase the campaign that brought
      // this session in. A new campaign or external referrer becomes last touch.
      const previous = readStoredAttribution(window.sessionStorage, "growth_last_touch");
      const attributed = ATTRIBUTION_KEYS.some(key => !!touch[key]);
      if (attributed || !previous)
        window.sessionStorage.setItem("growth_last_touch", JSON.stringify(touch));
    } catch {
      /* Storage unavailable */
    }
  } catch {
    /* Attribution must never block startup */
  }
}
export function getSignupAttribution() {
  const { first, last } = getAttribution();
  return {
    signup_source: first?.utm_source || first?.referrer_host || "direct",
    signup_medium: first?.utm_medium || null,
    signup_campaign: first?.utm_campaign || null,
    signup_content: first?.utm_content || null,
    signup_ref: first?.ref || null,
    signup_landing_path: first?.landing_path || "/",
    signup_last_source: last?.utm_source || last?.referrer_host || "direct",
    signup_last_medium: last?.utm_medium || null,
    signup_last_campaign: last?.utm_campaign || null,
    signup_last_content: last?.utm_content || null,
  };
}
