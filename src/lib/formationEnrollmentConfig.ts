import type { TrainingTrack } from "@/domain/formation/circuits";

export const FORMATION_EMAIL_LOCAL_HOUR = 7;

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
  const city = timezone.split("/").pop()?.replaceAll("_", " ") || timezone;
  return `${FORMATION_EMAIL_LOCAL_HOUR}:00 AM ${city} time`;
}

export function buildFormationSignupMetadata(input: FormationEnrollmentInput) {
  return {
    formation_track: input.track,
    formation_email_enabled: input.dailyEmailEnabled,
    formation_timezone: input.timezone,
  };
}
