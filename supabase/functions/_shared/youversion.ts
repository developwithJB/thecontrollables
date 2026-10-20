/** Reviewed against official platform-skills afa6236; no key or licensed text is bundled. */
export interface YouVersionConfig {
  enabled: boolean;
  commercialApproval: string;
  aiAppApproval: string;
  appKey: string;
  bibleId: string;
}
export interface ScripturePassage {
  id: string;
  reference: string;
  text: string;
  bibleId: string;
  version: string;
  copyright: string;
  sourceUrl: string;
}
export class YouVersionSourceError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
    readonly retryAfterSeconds?: number,
  ) {
    super(code);
  }
}
/** Retry-After may be delta seconds or an HTTP date. Never reflect raw headers. */
export function sourceRetryDelay(value: string | null, fallback = 60): number {
  const seconds =
    value && /^\d+$/.test(value.trim())
      ? Number(value)
      : value
        ? Math.ceil((Date.parse(value) - Date.now()) / 1000)
        : NaN;
  return Number.isSafeInteger(seconds) ? Math.max(1, seconds) : fallback;
}
const books = {
  Matthew: ["MAT", 28],
  Mark: ["MRK", 16],
  Luke: ["LUK", 24],
  John: ["JHN", 21],
} as const;
export function gospelPassageId(reference: unknown): string {
  if (typeof reference !== "string") throw Error("invalid_gospel_reference");
  const match =
    /^(Matthew|Mark|Luke|John) ([1-9]\d?):([1-9]\d?)(?:-([1-9]\d?))?$/.exec(
      reference,
    );
  if (!match) throw Error("invalid_gospel_reference");
  const [book, chapters] = books[match[1] as keyof typeof books];
  const start = Number(match[3]),
    end = Number(match[4] ?? match[3]);
  if (
    Number(match[2]) > chapters ||
    start > 200 ||
    end > 200 ||
    end < start ||
    end - start >= 50
  )
    throw Error("invalid_gospel_reference");
  return `${book}.${match[2]}.${start}${end === start ? "" : `-${end}`}`;
}
export function youVersionReady(config: YouVersionConfig): boolean {
  // Rollout metadata is not legal permission. Operators must retain the actual
  // written commercial/publisher approval before configuring this deployment.
  return (
    config.enabled &&
    !!config.commercialApproval.trim() &&
    !!config.aiAppApproval.trim() &&
    !!config.appKey.trim() &&
    /^[1-9]\d{0,8}$/.test(config.bibleId)
  );
}
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw Error("invalid_scripture_response");
  return value as Record<string, unknown>;
}
function text(value: unknown, max: number): string {
  if (typeof value !== "string" || !value.trim() || value.length > max)
    throw Error("invalid_scripture_response");
  return value;
}
export async function fetchYouVersionPassage(
  config: YouVersionConfig,
  reference: unknown,
  request: typeof fetch,
): Promise<ScripturePassage> {
  if (!youVersionReady(config)) throw Error("scripture_reader_unavailable");
  const id = gospelPassageId(reference);
  const root = `https://api.youversion.com/v1/bibles/${config.bibleId}`;
  const get = async (url: string) => {
    const response = await request(url, {
      headers: { "X-YVP-App-Key": config.appKey, Accept: "application/json" },
      redirect: "error",
      signal: AbortSignal.timeout(8000),
    });
    if (response.status === 204)
      throw new YouVersionSourceError("scripture_no_content", 404);
    if (!response.ok) {
      const status = response.status;
      const delay =
        status === 429 || status >= 500
          ? sourceRetryDelay(
              response.headers.get("Retry-After"),
              status === 429 ? 60 : 5,
            )
          : undefined;
      await response.body?.cancel();
      const code =
        status === 401
          ? "scripture_source_key_unavailable"
          : status === 403
            ? "scripture_license_unavailable"
            : status === 404
              ? "scripture_passage_not_found"
              : status === 429
                ? "scripture_source_rate_limited"
                : "scripture_source_unavailable";
      throw new YouVersionSourceError(
        code,
        status === 429 ? 429 : status === 404 ? 404 : 503,
        delay,
      );
    }
    // Do not propagate upstream bodies, headers, keys, or private input.
    const body = await response.text();
    if (body.length > 100000) throw Error("invalid_scripture_response");
    return object(JSON.parse(body));
  };
  // The selected ID must first be discovered using this app key and licensed
  // catalog. Never assume Bible.com's NLT ID is available through Platform.
  const version = await get(root);
  if (
    String(version.id) !== config.bibleId ||
    !Array.isArray(version.books) ||
    !version.books.includes(id.slice(0, 3))
  )
    throw Error("scripture_version_unavailable");
  const abbreviation = text(version.abbreviation, 40);
  const copyright = text(
    typeof version.copyright === "string" && version.copyright.trim()
      ? version.copyright
      : version.promotional_content,
    12000,
  );
  const passage = await get(`${root}/passages/${id}?format=text`);
  if (passage.id !== id) throw Error("scripture_reference_mismatch");
  return {
    id,
    reference: text(passage.reference, 120),
    text: text(passage.content, 30000),
    bibleId: config.bibleId,
    version: abbreviation,
    copyright,
    sourceUrl: `https://www.bible.com/bible/${config.bibleId}/${id}`,
  };
}
/** Full selected verse/range only. No fuzzy, case, punctuation or substring acceptance. */
export function verifyScriptureQuote(
  quote: string,
  passage: ScripturePassage,
  reference: unknown,
  bibleId: string,
): "exact" | "not_exact" | "source_mismatch" {
  if (passage.id !== gospelPassageId(reference) || passage.bibleId !== bibleId)
    return "source_mismatch";
  const normalize = (s: string) =>
    s.normalize("NFC").replace(/\s+/gu, " ").trim();
  return !!quote.trim() && normalize(quote) === normalize(passage.text)
    ? "exact"
    : "not_exact";
}
