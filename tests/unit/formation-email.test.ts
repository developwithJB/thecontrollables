import { describe, expect, it } from "vitest";
import {
  buildFormationDailyEmailPayload,
  getFormationSeason,
} from "../../supabase/functions/_shared/formation-email";

describe("daily formation email", () => {
  it("moves the 75-day story through its three formation seasons", () => {
    expect(getFormationSeason(1).name).toBe("Be With Jesus");
    expect(getFormationSeason(25).name).toBe("Be With Jesus");
    expect(getFormationSeason(26).name).toBe("Become Like Jesus");
    expect(getFormationSeason(51).name).toBe("Do What Jesus Did");
    expect(getFormationSeason(75).name).toBe("Do What Jesus Did");
  });

  it("surfaces the five circuits, progress, and one formation CTA for the strict path", () => {
    const payload = buildFormationDailyEmailPayload({
      displayName: "Jordan Builder",
      track: "fully_charged_75",
      dayNumber: 26,
      completedCircuits: ["awareness", "perspective"],
      appUrl: "https://thedashboard.agbcoaching.com/formation/today",
      settingsUrl: "https://thedashboard.agbcoaching.com/home?settings=email",
    });

    expect(payload.subject).toBe("Day 26 of 75: Become Like Jesus");
    expect(payload.previewText).toContain("2 of 5 recorded");
    expect(payload.html).toContain("Today&apos;s five circuits");
    expect(payload.html).toContain("Awareness");
    expect(payload.html).toContain("Perspective");
    expect(payload.html).toContain("Habit");
    expect(payload.html).toContain("Wellness");
    expect(payload.html).toContain("Environment");
    expect(payload.html).toContain("Open today&apos;s practice");
    expect(payload.text).toContain("[recorded] Awareness");
    expect(payload.text).toContain("[open] Habit");
  });

  it("keeps private formation content out of the email payload", () => {
    const payload = buildFormationDailyEmailPayload({
      displayName: "Jordan",
      track: "charge_40",
      dayNumber: 4,
      completedCircuits: [],
      appUrl: "https://example.com/today",
      settingsUrl: "https://example.com/settings",
    });

    for (const privateField of ["reflection", "caption", "prayer text", "exact location", "health detail"]) {
      expect(payload.html.toLowerCase()).not.toContain(privateField);
      expect(payload.text.toLowerCase()).not.toContain(privateField);
    }
  });
});
