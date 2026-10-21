/** Calendar dates, not elapsed 24-hour periods: DST and travel must not shift a rep. */
export function getResetDayNumber(
  startDate: string,
  timezone?: string | null,
  now = new Date(),
): number {
  const timeZone = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const todayLocalDate = new Intl.DateTimeFormat("sv-SE", {
    timeZone: timeZone,
  }).format(now);
  return Math.max(
    1,
    Math.floor(
      (Date.parse(todayLocalDate + "T00:00:00Z") -
        Date.parse(startDate + "T00:00:00Z")) /
        86400000,
    ) + 1,
  );
}
