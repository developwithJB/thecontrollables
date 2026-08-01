const DEFAULT_FALLBACK = "/home";

/**
 * Accept only same-origin, root-relative application paths. This keeps dynamic
 * recommendations and database-backed actions from turning router navigation
 * into an external redirect, including backslash-based URL parser bypasses.
 */
export function toSafeInternalPath(value: unknown, fallback = DEFAULT_FALLBACK): string {
  if (typeof value !== "string") return fallback;

  const candidate = value.trim();
  if (!candidate.startsWith("/") || candidate.startsWith("//") || candidate.includes("\\")) {
    return fallback;
  }

  try {
    const parsed = new URL(candidate, "https://thecontrollables.local");
    if (parsed.origin !== "https://thecontrollables.local") return fallback;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}
