export const OPERATOR_DAY_TYPES = [
  "Focus day",
  "Busy / chaotic",
  "Low energy",
  "Reset day",
  "Big opportunity",
] as const;

export const OPERATOR_CONTROL_LEVELS = [
  "Full control",
  "Some meetings",
  "Back-to-back",
  "Survival mode",
] as const;

export const OPERATOR_PROTECTION_FOCUS_OPTIONS = [
  "Focus",
  "Energy",
  "Confidence",
  "Relationships",
  "Time",
  "Peace",
] as const;

export type OperatorDayType = (typeof OPERATOR_DAY_TYPES)[number];
export type OperatorControlLevel = (typeof OPERATOR_CONTROL_LEVELS)[number];
export type OperatorProtectionFocus = (typeof OPERATOR_PROTECTION_FOCUS_OPTIONS)[number];

export interface DailyOperatorOnboardingAnswers {
  dayType: OperatorDayType;
  controlLevel: OperatorControlLevel;
  mattersToday: string;
  protectFocus?: OperatorProtectionFocus;
  completedAt: string;
}

export const normalizeOperatorOnboardingAnswers = (value: unknown): DailyOperatorOnboardingAnswers | null => {
  if (!value || typeof value !== "object") return null;
  const source = value as Record<string, unknown>;
  const dayType = source.dayType;
  const controlLevel = source.controlLevel;
  const protectFocus = source.protectFocus;
  const mattersToday = typeof source.mattersToday === "string" ? source.mattersToday.trim() : "";
  const completedAt = typeof source.completedAt === "string" ? source.completedAt : "";

  if (!OPERATOR_DAY_TYPES.includes(dayType as OperatorDayType)) return null;
  if (!OPERATOR_CONTROL_LEVELS.includes(controlLevel as OperatorControlLevel)) return null;
  if (protectFocus !== undefined && !OPERATOR_PROTECTION_FOCUS_OPTIONS.includes(protectFocus as OperatorProtectionFocus)) return null;
  if (!mattersToday) return null;

  return {
    dayType: dayType as OperatorDayType,
    controlLevel: controlLevel as OperatorControlLevel,
    mattersToday: mattersToday.slice(0, 160),
    ...(protectFocus ? { protectFocus: protectFocus as OperatorProtectionFocus } : {}),
    completedAt,
  };
};
