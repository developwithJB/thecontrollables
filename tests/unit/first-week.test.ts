import { describe, it, expect, vi, afterEach } from "vitest";
import { weekOneRecords, nextSabbathDate, formatCloseoutDeadline, formationErrorMessage } from "@/domain/formation/firstWeek";
import { normalizeEntryStatus } from "@/hooks/useFormationEntryStatus";
import { createEmptyCircuitDraft, type FormationCircuitEntry } from "@/domain/formation/circuits";
import { addLocalCalendarDays } from "@/domain/formation/fullyChargedJourney";
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
const record = (date: string, updated = date, fields = {}): FormationCircuitEntry => ({ id: date, userId: "test", localDate: date, track: "fully_charged_75", circuit: "environment", ruleVersion: "v2_sabbath", completionState: "complete", completedActionIds: [], missingRequiredActionIds: [], draft: { ...createEmptyCircuitDraft(), fields }, idempotencyKey: date, createdAt: date, updatedAt: updated, completedAt: date, localOnly: true });
afterEach(() => vi.useRealTimers());
describe("first-week trust boundaries", () => {
  it("fails closed on incomplete or malformed readiness and never treats pending content as a sample", () => {
    expect(normalizeEntryStatus(null)).toEqual({ strictReady: false, reviewedDays: 0, emailDeliveryReady: false, sample: null });
    expect(normalizeEntryStatus({ strictReady: true, reviewedDays: 74, emailDeliveryReady: "true" }).strictReady).toBe(false);
    expect(normalizeEntryStatus({ strictReady: true, reviewedDays: 75 }).strictReady).toBe(true);
    expect(normalizeEntryStatus({ sample: { title: "unusable" } }).sample).toBeNull();
  });
  it("counts each saved circuit once within seven calendar days, excluding earlier attempts and future entries", () => {
    const records = Array.from({ length: 9 }, (_, i) => record(addLocalCalendarDays("2027-03-13", i)));
    records.push(record("2027-03-14", "2027-03-14T23:00", { weekOneLearning: "Private learning" }));
    const week = weekOneRecords(records, "2027-03-14");
    expect(week).toHaveLength(7);
    expect(week.find(e => e.localDate === "2027-03-14")?.draft.fields.weekOneLearning).toBe("Private learning");
    expect(week.some(e => e.localDate === "2027-03-21")).toBe(false);
  });
  it("previews the chosen Sabbath across DST and year boundaries", () => {
    expect(nextSabbathDate("2027-03-13", 0)).toBe("2027-03-14");
    expect(nextSabbathDate("2027-11-07", 0)).toBe("2027-11-07");
    expect(nextSabbathDate("2026-12-31", 0)).toBe("2027-01-03");
  });
  it("renders the actual fixed-zone close boundary and a safe fallback", () => {
    expect(formatCloseoutDeadline("2027-03-15T07:00:00Z", "America/Los_Angeles")).toContain("Mar 15");
    expect(formatCloseoutDeadline(null, "America/Los_Angeles")).toContain("before midnight");
    expect(formationErrorMessage({ message: "reviewed_75_day_content_bundle_not_ready" })).toContain("no strict attempt was started");
    expect(formationErrorMessage(new Error("private server detail"))).not.toContain("private server detail");
  });
});
