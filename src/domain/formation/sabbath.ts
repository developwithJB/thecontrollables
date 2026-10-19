export const SABBATH_RULE_VERSION = "v2_sabbath" as const;
export interface SabbathContext { rulesVersion: string; isRestDay: boolean }
export function isSabbath(context?: SabbathContext | null): boolean {
  return context?.rulesVersion === SABBATH_RULE_VERSION && context.isRestDay === true;
}
export function restDayForDate(localDate: string | null, weekday: number | null | undefined): boolean {
  return Boolean(localDate && Number.isInteger(weekday) && weekday! >= 0 && weekday! <= 6 &&
    new Date(`${localDate}T12:00:00Z`).getUTCDay() === weekday);
}
