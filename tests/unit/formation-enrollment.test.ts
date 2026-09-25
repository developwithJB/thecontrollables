import { describe, expect, it } from "vitest";
import {
  buildFormationSignupMetadata,
  formatFormationEmailSchedule,
  isStartableFormationTrack,
} from "@/lib/formationEnrollmentConfig";

describe("formation enrollment", () => {
  it("stores the selected path, explicit email choice, and timezone in signup metadata", () => {
    expect(buildFormationSignupMetadata({
      track: "fully_charged_75",
      dailyEmailEnabled: true,
      timezone: "America/Chicago",
    })).toEqual({
      formation_track: "fully_charged_75",
      formation_email_enabled: true,
      formation_timezone: "America/Chicago",
    });
  });

  it("formats the disclosed morning delivery time without exposing location detail", () => {
    expect(formatFormationEmailSchedule("America/Los_Angeles")).toBe("7:00 AM Los Angeles time");
  });

  it("keeps 40-Day Charge from being started", () => {
    expect(isStartableFormationTrack("fully_charged_75")).toBe(true);
    expect(isStartableFormationTrack("read_along")).toBe(true);
    expect(isStartableFormationTrack("charge_40")).toBe(false);
  });
});
