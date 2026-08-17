import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ONBOARDING_QUICK_START_DRAFT_VERSION,
  clearOnboardingQuickStartDraft,
  getOnboardingQuickStartDraft,
  getQuickStartCompletionRoute,
  saveOnboardingQuickStartDraft,
} from "@/lib/onboardingQuickStartDraft";
import { APP_ROUTES } from "@/lib/appRoutes";

const createMemoryStorage = (): Storage => {
  let values: Record<string, string> = {};

  return {
    get length() {
      return Object.keys(values).length;
    },
    clear: () => {
      values = {};
    },
    getItem: (key: string) => values[key] ?? null,
    key: (index: number) => Object.keys(values)[index] ?? null,
    removeItem: (key: string) => {
      delete values[key];
    },
    setItem: (key: string, value: string) => {
      values[key] = value;
    },
  };
};

describe("onboarding quick start draft", () => {
  let storage: Storage;

  beforeEach(() => {
    storage = createMemoryStorage();
    vi.stubGlobal("window", {
      localStorage: storage,
      sessionStorage: storage,
    });
  });

  afterEach(() => {
    clearOnboardingQuickStartDraft();
    vi.unstubAllGlobals();
  });

  it("saves drafts with the current onboarding version", () => {
    saveOnboardingQuickStartDraft({
      birthday: "1994-02-10",
      readingStatus: "reading_now",
      formationTrack: "charge_40",
      dailyEmailEnabled: true,
      timezone: "America/Chicago",
      mission: "Keep one honest promise",
      snapshotId: "rebuild-confidence-agb",
      snapshotName: "Rebuild Confidence",
    });

    expect(getOnboardingQuickStartDraft()).toMatchObject({
      version: ONBOARDING_QUICK_START_DRAFT_VERSION,
      birthday: "1994-02-10",
      readingStatus: "reading_now",
      formationTrack: "charge_40",
      dailyEmailEnabled: true,
      timezone: "America/Chicago",
      mission: "Keep one honest promise",
      snapshotId: "rebuild-confidence-agb",
    });
  });

  it("clears stale drafts from the old onboarding experience", () => {
    storage.setItem(
      "onboarding_quick_start_draft",
      JSON.stringify({
        birthday: "1994-02-10",
        mission: "Old partial onboarding",
        snapshotId: "rebuild-confidence-agb",
        snapshotName: "Rebuild Confidence",
        updatedAt: "2026-06-17T00:00:00.000Z",
      }),
    );

    expect(getOnboardingQuickStartDraft()).toBeNull();
    expect(storage.getItem("onboarding_quick_start_draft")).toBeNull();
  });

  it("normalizes invalid reading status values", () => {
    storage.setItem(
      "onboarding_quick_start_draft",
      JSON.stringify({
        version: ONBOARDING_QUICK_START_DRAFT_VERSION,
        readingStatus: "somewhere_else",
        snapshotId: null,
        snapshotName: null,
        updatedAt: "2026-06-21T00:00:00.000Z",
      }),
    );

    expect(getOnboardingQuickStartDraft()?.readingStatus).toBe("reading_now");
  });

  it("drops an invalid formation path instead of trusting persisted input", () => {
    storage.setItem(
      "onboarding_quick_start_draft",
      JSON.stringify({
        version: ONBOARDING_QUICK_START_DRAFT_VERSION,
        readingStatus: "reading_now",
        formationTrack: "unlimited_streak",
        updatedAt: "2026-08-01T00:00:00.000Z",
      }),
    );

    expect(getOnboardingQuickStartDraft()?.formationTrack).toBeNull();
  });

  it("routes quick-start completion by reading status", () => {
    expect(getQuickStartCompletionRoute("reading_now")).toBe(APP_ROUTES.readAlong);
    expect(getQuickStartCompletionRoute("rereading_or_leading")).toBe(APP_ROUTES.readAlong);
    expect(getQuickStartCompletionRoute("finished")).toBe(APP_ROUTES.home);
    expect(getQuickStartCompletionRoute("not_started")).toBe(APP_ROUTES.myControllables);
    expect(getQuickStartCompletionRoute(null)).toBe(APP_ROUTES.home);
    expect(getQuickStartCompletionRoute("reading_now", "read_along")).toBe(APP_ROUTES.formationToday);
    expect(getQuickStartCompletionRoute("finished", "charge_40")).toBe(APP_ROUTES.formationToday);
    expect(getQuickStartCompletionRoute("not_started", "fully_charged_75")).toBe(APP_ROUTES.formationToday);
  });
});
