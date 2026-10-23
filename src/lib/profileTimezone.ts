/** A missing edit history is not evidence that an existing timezone was never chosen. */
export function resolveProfileTimezone(
  profile: {
    timezone?: string | null;
    created_at?: string;
    updated_at?: string;
  } | null,
  browserTimezone: string,
) {
  const saved = profile?.timezone;
  if (!saved) return browserTimezone;
  const untouched =
    profile?.created_at &&
    profile?.updated_at &&
    profile.created_at === profile.updated_at;
  return saved === "America/Chicago" && untouched ? browserTimezone : saved;
}
