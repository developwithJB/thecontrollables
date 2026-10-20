/** Reviewed against official platform-skills afa6236; no key or licensed text is bundled. */
export interface YouVersionConfig {
  enabled: boolean;
  commercialApproval: string;
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
    if (!response.ok) throw Error("scripture_source_unavailable");
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
  const copyright = text(version.copyright, 12000);
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
