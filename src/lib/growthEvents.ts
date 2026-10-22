import { sendTelemetry } from "./telemetrySink";
import { supabase } from "@/integrations/supabase/client";
import { capturePosthogEvent } from "@/hooks/useAnalytics";
import { getAttribution } from "./growthAttribution";
import { APP_VERSION } from "./version";
import { getLocalDate } from "@/domain/formation/circuitRules";
export const GROWTH_EVENTS_ENABLED = true;
export const GROWTH_EVENT_NAMES = [
  "landing_view",
  "quick_start_step_viewed",
  "signup_form_viewed",
  "signup_submitted",
  "signup_failed",
  "first_circuit_completed",
  "book_link_click",
  "book_nudge_viewed",
  "book_nudge_dismissed",
  "share_clicked",
  "share_completed",
  "authenticated_visit",
  "day7_return",
  "checkout_requested",
  "checkout_opened",
  "checkout_failed",
  "pro_offer_viewed",
  "pro_offer_clicked",
  "pro_offer_dismissed",
] as const;
type GrowthPropertyValue = string | number | boolean | null;
const ALLOWED_PROPERTY_KEYS = new Set([
  "placement",
  "step",
  "reason_category",
  "method",
  "surface",
  "track",
  "reading_status",
]);
const ATTRIBUTION_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "ref",
  "referrer_host",
] as const;
export function sanitizeGrowthProps(
  props: Record<string, unknown> = {},
): Record<string, GrowthPropertyValue> {
  const result: Record<string, GrowthPropertyValue> = {};
  for (const [key, value] of Object.entries(props)) {
    if (!ALLOWED_PROPERTY_KEYS.has(key)) continue;
    if (
      value === null ||
      typeof value === "boolean" ||
      (typeof value === "number" && Number.isFinite(value))
    )
      result[key] = value as GrowthPropertyValue;
    if (
      typeof value === "string" &&
      value.length <= 80 &&
      !/https?:\/\/|data:|@/i.test(value)
    )
      result[key] = value;
  }
  return result;
}
type GrowthEventPayload = {
  event_type: string;
  event_name: string;
  event_data: Record<string, GrowthPropertyValue>;
  page_path: string;
  session_id: string;
  screen_size: string;
  user_id?: string;
};
type BufferedGrowthEvent = { at: number; payload: GrowthEventPayload };
let sessionEventCount = 0,
  landingViewed = false,
  authRetrySubscribed = false;
let fallbackSessionId: string | undefined;
const BUFFER_KEY = "growth_event_buffer";
const pendingDeliveries = new Set<Promise<unknown>>();
function readBufferedGrowthEvents(): BufferedGrowthEvent[] {
  try {
    const data = JSON.parse(localStorage.getItem(BUFFER_KEY) || "[]");
    return Array.isArray(data)
      ? data
          .filter(
            (e) =>
              e?.at > Date.now() - 7 * 86400000 &&
              e?.payload?.event_type === "growth",
          )
          .slice(-50)
      : [];
  } catch {
    return [];
  }
}
function saveBufferedGrowthEvents(events: BufferedGrowthEvent[]) {
  try {
    localStorage.setItem(BUFFER_KEY, JSON.stringify(events.slice(-50)));
  } catch {
    /* Best effort */
  }
}
async function sendGrowthTelemetry(payload: GrowthEventPayload) {
  const anonymous = { ...payload };
  delete anonymous.user_id;
  await sendTelemetry("event", anonymous);
}
function subscribeToSignInRetry() {
  if (authRetrySubscribed) return;
  authRetrySubscribed = true;
  supabase.auth.onAuthStateChange((event) => {
    if (event !== "SIGNED_IN") return;
    // Defer Supabase calls outside the synchronous auth callback lock.
    setTimeout(() => {
      const pending = readBufferedGrowthEvents();
      saveBufferedGrowthEvents([]);
      void Promise.allSettled(
        pending.map((e) => sendGrowthTelemetry(e.payload)),
      );
    }, 0);
  });
}
export function trackGrowthEvent(
  name: string,
  props?: Record<string, unknown>,
): void {
  if (!GROWTH_EVENTS_ENABLED || typeof window === "undefined") return;
  if (!(GROWTH_EVENT_NAMES as readonly string[]).includes(name)) {
    if (import.meta.env.DEV) console.warn("Unknown growth event");
    return;
  }
  try {
    let session = (fallbackSessionId ??= crypto.randomUUID());
    try {
      session = sessionStorage.getItem("app_session_id") || session;
      sessionStorage.setItem("app_session_id", session);
      sessionEventCount = Math.max(
        sessionEventCount,
        Number(sessionStorage.getItem("growth_event_count")) || 0,
      );
      landingViewed =
        landingViewed ||
        sessionStorage.getItem("growth_landing_view") === "true";
    } catch {
      /* Use memory throttle when storage is blocked */
    }
    if (sessionEventCount >= 30 || (name === "landing_view" && landingViewed))
      return;
    sessionEventCount++;
    if (name === "landing_view") landingViewed = true;
    try {
      sessionStorage.setItem("growth_event_count", String(sessionEventCount));
      if (landingViewed) sessionStorage.setItem("growth_landing_view", "true");
    } catch {
      /* Use memory throttle */
    }
    const data = sanitizeGrowthProps(props);
    const { first, last } = getAttribution();
    for (const key of ATTRIBUTION_KEYS)
      if (first?.[key]) data[key] = first[key];
    for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_content"] as const)
      if (last?.[key]) data[`last_${key}`] = last[key];
    data.app_version = APP_VERSION;
    const payload: GrowthEventPayload = {
      event_type: "growth",
      event_name: name,
      event_data: data,
      page_path: window.location.pathname,
      session_id: session,
      screen_size: `${window.innerWidth}x${window.innerHeight}`,
    };
    subscribeToSignInRetry();
    capturePosthogEvent(name, data);
    const delivery = sendGrowthTelemetry(payload).catch(() =>
      saveBufferedGrowthEvents([
        ...readBufferedGrowthEvents(),
        { at: Date.now(), payload },
      ]),
    );
    pendingDeliveries.add(delivery);
    void delivery.finally(() => pendingDeliveries.delete(delivery));
  } catch {
    /* Analytics never blocks UI or navigation */
  }
}

/** Give checkout events a bounded chance to arrive before same-tab navigation. */
export async function flushGrowthEvents(): Promise<void> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      Promise.allSettled([...pendingDeliveries]),
      new Promise<void>(resolve => { timeout = setTimeout(resolve, 300); }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}
export function trackFirstCircuitCompleted(
  userId: string | undefined,
  track: string,
) {
  if (!userId) return;
  try {
    const key = `growth_first_circuit_${userId}`;
    if (localStorage.getItem(key)) return;
    localStorage.setItem(key, "true");
    trackGrowthEvent("first_circuit_completed", { track });
  } catch {
    /* Skip dedupe-sensitive event if storage is unavailable */
  }
}

/** Browser deduplication is measurement only, never account or practice authority. */
export function trackAuthenticatedVisit(userId: string) {
  try {
    const key = `growth_authenticated_visit:${userId}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "true");
    trackGrowthEvent("authenticated_visit");
  } catch { /* Analytics must not block authentication. */ }
}

export function trackDaySevenReturn(userId: string, createdAt: string, today: string, track: string) {
  const signupDate = new Date(createdAt);
  if (!userId || Number.isNaN(signupDate.getTime())) return;
  signupDate.setDate(signupDate.getDate() + 6);
  if (today !== getLocalDate(signupDate)) return;
  try {
    const key = `growth_day7_return:${userId}`;
    if (localStorage.getItem(key)) return;
    localStorage.setItem(key, "true");
    trackGrowthEvent("day7_return", { track });
  } catch { /* Missing browser storage must not block Today. */ }
}
export function signupFailureCategory(error: unknown): string {
  const code =
    error && typeof error === "object" && "code" in error
      ? String(error.code)
      : "";
  const message =
    error instanceof Error
      ? error.message
      : error && typeof error === "object" && "message" in error
        ? String(error.message)
        : "";
  if (/already|exists|registered/i.test(code + message)) return "exists";
  if (/weak|password/i.test(code + message)) return "weak_password";
  if (/network|fetch|timeout/i.test(code + message)) return "network";
  return "other";
}
