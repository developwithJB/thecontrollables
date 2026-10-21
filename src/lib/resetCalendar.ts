/** Calendar dates, not elapsed24-hour periods: DST and travel must not shift a rep. */
export function resetDayNumber(
  startDate: string,
  timezone?: string | null,
  now = new Date(),
): number {
  const zone = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const today = new Intl.DateTimeFormat("sv-SE", { timeZone: zone }).format(
    now,
  );
  return Math.max(
    1,
    Math.floor(
      (Date.parse(today + "T00:00:00Z") -
        Date.parse(startDate + "T00:00:00Z")) /
        86400000,
    ) + 1,
  );
}
