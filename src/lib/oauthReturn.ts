export type PendingOAuthReturn = {
  family: "wearable" | "integration";
  code: string;
  state: string;
};
let pending: PendingOAuthReturn | null = null;
/** Remove authorization codes from the URL before telemetry or React mounts. */
export function captureOAuthReturn() {
  const params = new URLSearchParams(window.location.hash.slice(1));
  const family = params.get("oauth_return");
  if (!family) return;
  const code = params.get("code"),
    state = params.get("state");
  window.history.replaceState(
    null,
    "",
    window.location.pathname + window.location.search,
  );
  if (
    (family === "wearable" || family === "integration") &&
    code &&
    code.length <= 4096 &&
    state &&
    /^[a-f0-9]{64}$/.test(state)
  )
    pending = { family, code, state };
}
export function takeOAuthReturn() {
  const value = pending;
  pending = null;
  return value;
}
export function trustedOAuthMessage(
  event: Pick<MessageEvent, "origin" | "source">,
  origin: string,
  popup: Window | null,
) {
  return !!popup && event.origin === origin && event.source === popup;
}
