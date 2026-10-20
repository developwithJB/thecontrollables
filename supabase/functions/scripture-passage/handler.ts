import {
  fetchYouVersionPassage,
  gospelPassageId,
  verifyScriptureQuote,
  youVersionReady,
  YouVersionSourceError,
  type YouVersionConfig,
} from "../_shared/youversion.ts";
const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Cache-Control": "no-store",
  "Access-Control-Expose-Headers": "Retry-After",
};
export function createScriptureHandler(deps: {
  config: YouVersionConfig;
  request: typeof fetch;
  authenticate: (token: string) => Promise<boolean>;
  onSourceFailure?: (code: string) => void;
}) {
  const json = (body: unknown, status = 200) =>
    Response.json(body, { status, headers });
  // Advisory backoff per edge instance; not a distributed request allowance.
  let sourceRetryAt = 0;
  const retryResponse = (code: string, status: number, seconds: number) =>
    Response.json(
      { error: code, retryAfterSeconds: seconds },
      { status, headers: { ...headers, "Retry-After": String(seconds) } },
    );
  return async (req: Request) => {
    if (req.method === "OPTIONS") return new Response(null, { headers });
    if (req.method !== "POST")
      return json({ error: "method_not_allowed" }, 405);
    try {
      const authorization = req.headers.get("Authorization") ?? "";
      if (
        !authorization.startsWith("Bearer ") ||
        !(await deps.authenticate(authorization.slice(7)))
      )
        return json({ error: "authentication_required" }, 401);
      const bodyText = await req.text();
      if (bodyText.length > 8000)
        return json({ error: "request_too_large" }, 413);
      let body: Record<string, unknown>;
      try {
        body = JSON.parse(bodyText);
      } catch {
        return json({ error: "invalid_request" }, 400);
      }
      if (!body || typeof body !== "object" || Array.isArray(body))
        return json({ error: "invalid_request" }, 400);
      if (body.operation === "status")
        return json({ available: youVersionReady(deps.config) });
      if (body.operation !== "passage" && body.operation !== "verify_quote")
        return json({ error: "invalid_operation" }, 400);
      try {
        gospelPassageId(body.reference);
      } catch {
        return json({ error: "invalid_gospel_reference" }, 400);
      }
      if (
        body.operation === "verify_quote" &&
        (typeof body.quote !== "string" ||
          !body.quote.trim() ||
          body.quote.length > 4000)
      )
        return json({ error: "invalid_quote" }, 400);
      if (!youVersionReady(deps.config))
        return json({ error: "scripture_reader_unavailable" }, 503);
      if (sourceRetryAt > Date.now())
        return retryResponse(
          "scripture_source_retry_later",
          429,
          Math.ceil((sourceRetryAt - Date.now()) / 1000),
        );
      // Only the reference and configured Bible ID go upstream. No user ID,
      // prayer, reflection, quote, coaching history, or model call is forwarded.
      const passage = await fetchYouVersionPassage(
        deps.config,
        body.reference,
        deps.request,
      );
      return json({
        passage,
        ...(body.operation === "verify_quote"
          ? {
              verdict: verifyScriptureQuote(
                body.quote as string,
                passage,
                body.reference,
                deps.config.bibleId,
              ),
            }
          : {}),
      });
    } catch (error) {
      if (error instanceof YouVersionSourceError) {
        deps.onSourceFailure?.(error.code);
        if (error.retryAfterSeconds) {
          sourceRetryAt = Date.now() + error.retryAfterSeconds * 1000;
          return retryResponse(
            error.code,
            error.status,
            error.retryAfterSeconds,
          );
        }
        return json({ error: error.code }, error.status);
      }
      deps.onSourceFailure?.("scripture_source_unavailable");
      return json({ error: "scripture_source_unavailable" }, 503);
    }
  };
}
