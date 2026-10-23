const unscopedPrivateKeys = new Set([
  "onboarding_quick_start_draft",
  "formation_completion_preview_reflections_v1",
  "starting_charge_profile_local",
  "my_controllables_profile_guest",
  "controllables_dex_guest",
  "local_mission_drop_guest",
  "read_along_progress_guest",
  "formation_selected_track_guest",
  "dashboard-intelligence-cache",
  "controllables_focus_mode",
  "growth_event_buffer",
]);
/** Browser caches are disposable UI state, never account or completion authority. */
export function clearSignedOutState(userId: string, stores?: Storage[]) {
  let targets = stores;
  try {
    targets ??= [window.localStorage, window.sessionStorage];
  } catch {
    return;
  }
  for (const storage of targets) {
    try {
      const keys = Array.from({ length: storage.length }, (_, i) =>
        storage.key(i),
      ).filter((key): key is string => key !== null);
      for (const key of keys) {
        const owned =
          userId &&
          (key.endsWith(`_${userId}`) ||
            key.endsWith(`:${userId}`) ||
            key.includes(`:${userId}:`) ||
            key.includes(`_${userId}_`));
        if (
          owned ||
          unscopedPrivateKeys.has(key) ||
          key.startsWith("control_release_move_guest_") ||
          key.startsWith("dev_mock_")
        )
          storage.removeItem(key);
      }
    } catch {
      /* Restricted storage must not prevent signing out. */
    }
  }
}
