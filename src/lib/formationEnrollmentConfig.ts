import type { TrainingTrack } from "@/domain/formation/circuits";

export const FORMATION_EMAIL_LOCAL_HOUR = 7;

export const STARTABLE_FORMATION_TRACKS = ["fully_charged_75", "read_along"] as const;
export type StartableFormationTrack = (typeof STARTABLE_FORMATION_TRACKS)[number];

export function isStartableFormationTrack(value: unknown): value is StartableFormationTrack {
  return value === "fully_charged_75" || value === "read_along";
}

export interface FormationEnrollmentInput {
  track: TrainingTrack;
  dailyEmailEnabled: boolean;
  timezone: string;
}

export function getDeviceTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "America/New_York";
  } catch {
    return "America/New_York";
  }
}

export function formatFormationEmailSchedule(timezone: string): string {
  const city = timezone.split("/").pop()?.replace(/_/g, " ") || timezone;
  return `${FORMATION_EMAIL_LOCAL_HOUR}:00 AM ${city} time`;
}

export function buildFormationSignupMetadata(input: FormationEnrollmentInput) {
  return {
    formation_track: input.track,
    formation_email_enabled: input.dailyEmailEnabled,
    formation_timezone: input.timezone,
  };
}
