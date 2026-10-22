// This allowlist is a server boundary, not a client authorization decision.
const allowedKeys = new Set([
  "placement",
  "step",
  "reason_category",
  "method",
  "surface",
  "track",
  "reading_status",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "last_utm_source",
  "last_utm_medium",
  "last_utm_campaign",
  "last_utm_content",
  "ref",
  "referrer_host",
  "app_version",
  "page_name",
  "is_virtual",
  "load_time_ms",
  "mode",
  "action_id",
  "duration_ms",
  "count",
  "success",
]);
const growthNames = new Set([
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
]);
const identifier = (v: unknown, fallback: string) =>
  typeof v === "string" &&
  /^[a-zA-Z0-9_.:/ -]{1,80}$/.test(v) &&
  !/https?:|data:|@|sk_|whsec_|bearer|eyJ/i.test(v)
    ? v
    : fallback;
export function safeTelemetryProps(value: unknown) {
  const result: Record<string, string | number | boolean | null> = {};
  if (!value || typeof value !== "object" || Array.isArray(value))
    return result;
  for (const [key, v] of Object.entries(value)) {
    if (!allowedKeys.has(key)) continue;
    if (v === null || typeof v === "boolean") result[key] = v;
    else if (typeof v === "number" && Number.isFinite(v) && Math.abs(v) <= 1e8)
      result[key] = v;
    else if (
      typeof v === "string" &&
      v.length <= 80 &&
      !/https?:|data:|@|sk_|whsec_|bearer|eyJ/i.test(v)
    )
      result[key] = v;
  }
  return result;
}
export function sanitizeTelemetry(input: unknown, owner: string | null) {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw Error("invalid_payload");
  const { kind, payload } = input as { kind?: unknown; payload?: unknown };
  if (!payload || typeof payload !== "object" || Array.isArray(payload))
    throw Error("invalid_payload");
  const p = payload as Record<string, unknown>;
  const path =
    typeof p.page_path === "string" &&
    /^\/[a-zA-Z0-9/_-]{0,160}$/.test(p.page_path)
      ? p.page_path
      : "/";
  const base = {
    user_id: owner,
    page_path: path,
    session_id:
      typeof p.session_id === "string" && /^[a-f0-9-]{36}$/i.test(p.session_id)
        ? p.session_id
        : null,
  };
  if (kind === "event") {
    const event_type = identifier(p.event_type, "interaction"),
      event_name = identifier(p.event_name, "unknown");
    if (
      event_name === "unknown" ||
      (event_type === "growth" && !growthNames.has(event_name))
    )
      throw Error("invalid_event");
    return {
      table: "app_events" as const,
      row: {
        ...base,
        event_type,
        event_name,
        event_data: safeTelemetryProps(p.event_data),
        screen_size:
          typeof p.screen_size === "string" &&
          /^\d{1,5}x\d{1,5}$/.test(p.screen_size)
            ? p.screen_size
            : null,
      },
    };
  }
  if (kind === "page")
    return {
      table: "page_views" as const,
      row: {
        ...base,
        referrer: null,
        load_time_ms:
          typeof p.load_time_ms === "number" &&
          p.load_time_ms >= 0 &&
          p.load_time_ms <= 3600000
            ? Math.floor(p.load_time_ms)
            : null,
        screen_size:
          typeof p.screen_size === "string" &&
          /^\d{1,5}x\d{1,5}$/.test(p.screen_size)
            ? p.screen_size
            : null,
      },
    };
  // Error messages/stacks can include private reflections, URLs, or credentials.
  // Sentry retains the existing diagnostic path; the growth DB gets no raw text.
  if (kind === "error")
    return {
      table: "app_errors" as const,
      row: {
        ...base,
        error_message: "Client error reported",
        error_stack: null,
        error_type: identifier(p.error_type, "runtime"),
        component_name: identifier(p.component_name, "client"),
        additional_context: safeTelemetryProps(p.additional_context),
      },
    };
  throw Error("invalid_kind");
}
