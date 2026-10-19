import type { FormationCircuitEntry } from "./circuits";
import { addLocalCalendarDays } from "./fullyChargedJourney";
export function weekOneRecords(history: FormationCircuitEntry[], startDate: string) {
  const end = addLocalCalendarDays(startDate, 6);
  const unique = new Map<string, FormationCircuitEntry>();
  for (const entry of [...history].sort((a,b) => b.updatedAt.localeCompare(a.updatedAt))) {
    const key = `${entry.localDate}:${entry.circuit}`;
    if (entry.localDate >= startDate && entry.localDate <= end && entry.completionState !== "not_started" && !unique.has(key)) unique.set(key, entry);
  }
  return [...unique.values()];
}
export function nextSabbathDate(localDate: string, weekday: number) {
  const current = new Date(`${localDate}T12:00:00Z`).getUTCDay();
  return addLocalCalendarDays(localDate, (weekday - current + 7) % 7);
}
export function formatCloseoutDeadline(closesAt: string | null, timezone: string) {
  if (!closesAt || !Number.isFinite(Date.parse(closesAt))) return `before midnight in ${timezone}`;
  return new Intl.DateTimeFormat("en", { timeZone: timezone, month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" }).format(new Date(closesAt));
}
export function formationErrorMessage(error: unknown) {
  const message = error && typeof error === "object" && "message" in error ? String(error.message) : "";
  if (message.includes("reviewed_75_day_content_bundle_not_ready")) return "The 75-day assignments are still awaiting review. Choose Read Along to practice today; no strict attempt was started.";
  if (message.includes("after the previous local attempt day")) return "A new attempt can begin on the next local day. Your previous attempt remains in history.";
  return "We could not confirm that update. Your saved history remains available. Check your connection and try again.";
}
