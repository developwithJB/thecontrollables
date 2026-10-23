type SettingsMarker = { status: "not_saved"; suggestedTimezone: string } | { status: "saved" };
const markerKey = (userId: string) => `profile-settings-state:${userId}`;

export function readProfileSettingsMarker(userId: string): SettingsMarker | null {
  try {
    const marker = JSON.parse(localStorage.getItem(markerKey(userId)) ?? "null");
    if (marker?.status === "saved") return { status: "saved" };
    if (marker?.status === "not_saved" && typeof marker.suggestedTimezone === "string")
      return marker;
  } catch { /* Missing/restricted storage is ambiguous, never proof of an untouched profile. */ }
  return null;
}

/** Only a successful new signup establishes never-saved settings. Repeat calls are idempotent. */
export function markNewProfileSettings(userId: string, browserTimezone: string) {
  try {
    if (!readProfileSettingsMarker(userId))
      localStorage.setItem(markerKey(userId), JSON.stringify({ status: "not_saved", suggestedTimezone: browserTimezone }));
  } catch { /* Settings still work without browser storage. */ }
}
export function markProfileSettingsSaved(userId: string) {
  try { localStorage.setItem(markerKey(userId), JSON.stringify({ status: "saved" })); }
  catch { /* Unknown history will preserve the server timezone next time. */ }
}

/** Timestamps cannot prove intent. Older/other-browser profiles keep their saved timezone. */
export function resolveProfileTimezone(
  profile: { timezone?: string | null } | null,
  browserTimezone: string,
  marker: SettingsMarker | null = null,
) {
  const saved = profile?.timezone;
  if (!saved) return browserTimezone;
  return saved === "America/Chicago" && marker?.status === "not_saved"
    ? marker.suggestedTimezone : saved;
}
