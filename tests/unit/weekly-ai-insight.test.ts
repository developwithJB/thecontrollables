import { describe, expect, it } from "vitest";

import { generateWeeklyAIInsight, type WeeklyAIInsightInput } from "@/lib/weeklyAIInsight";

const baseInput = (overrides: Partial<WeeklyAIInsightInput> = {}): WeeklyAIInsightInput => ({
  dailyPlans: [],
  proposals: [],
  plannerItems: [],
  feedbackEvents: [],
  usageEvents: [],
  ...overrides,
});

describe("weekly AI insight generation", () => {
  it("returns no insight until there is enough weekly signal", () => {
    const insight = generateWeeklyAIInsight(
      baseInput({
        dailyPlans: [{ planDate: "2026-04-27", status: "generated" }],
        plannerItems: [
          { scheduledDate: "2026-04-27", status: "done" },
          { scheduledDate: "2026-04-28", status: "todo" },
        ],
      }),
    );

    expect(insight).toBeNull();
  });

  it("detects stronger morning follow-through without exposing item titles", () => {
    const inputWithExtraPrivateFields = baseInput({
      dailyPlans: [
        { planDate: "2026-04-27", status: "accepted" },
        { planDate: "2026-04-28", status: "accepted" },
        { planDate: "2026-04-29", status: "accepted" },
      ],
      plannerItems: [
        { scheduledDate: "2026-04-27", status: "done", startTime: "09:00" },
        { scheduledDate: "2026-04-28", status: "done", startTime: "10:00" },
        { scheduledDate: "2026-04-29", status: "todo", startTime: "14:00" },
        { scheduledDate: "2026-04-30", status: "todo", startTime: "15:00" },
      ],
    }) as WeeklyAIInsightInput & { plannerItems: Array<{ title?: string }> };
    inputWithExtraPrivateFields.plannerItems[0].title = "Private board meeting";

    const insight = generateWeeklyAIInsight(inputWithExtraPrivateFields);
    const renderedText = JSON.stringify(insight);

    expect(insight?.headline).toBe("You protected your mornings better than your afternoons.");
    expect(insight?.chargeLevel).toBe("Steady charge");
    expect(insight?.guideSections).toHaveLength(5);
    expect(insight?.guideSections.map((section) => section.guideName)).toEqual([
      "Awareness",
      "Perspective",
      "Habit",
      "Wellness",
      "Environment",
    ]);
    expect(insight?.egoCheck).toContain("overcommitting");
    expect(renderedText).not.toContain("Private board meeting");
  });

  it("keeps the weekly Ego Check short, neutral, and actionable", () => {
    const insight = generateWeeklyAIInsight(
      baseInput({
        dailyPlans: [
          { planDate: "2026-04-27", status: "accepted" },
          { planDate: "2026-04-28", status: "accepted" },
          { planDate: "2026-04-29", status: "accepted" },
        ],
        usageEvents: [
          { mode: "adjust" },
          { mode: "adjust" },
          { mode: "adjust" },
        ],
      }),
    );

    expect(insight?.egoCheck).toMatch(/^(Watch for|Pause before|Notice)/);
    expect(insight?.egoCheck.length).toBeLessThan(120);
  });

  it("detects that lower-load days executed better", () => {
    const insight = generateWeeklyAIInsight(
      baseInput({
        dailyPlans: [
          { planDate: "2026-04-27", status: "accepted" },
          { planDate: "2026-04-28", status: "accepted" },
          { planDate: "2026-04-29", status: "accepted" },
        ],
        plannerItems: [
          { scheduledDate: "2026-04-27", status: "done" },
          { scheduledDate: "2026-04-27", status: "done" },
          { scheduledDate: "2026-04-27", status: "todo" },
          { scheduledDate: "2026-04-28", status: "done" },
          { scheduledDate: "2026-04-28", status: "done" },
          { scheduledDate: "2026-04-28", status: "done" },
          { scheduledDate: "2026-04-29", status: "todo" },
          { scheduledDate: "2026-04-29", status: "todo" },
          { scheduledDate: "2026-04-29", status: "done" },
          { scheduledDate: "2026-04-29", status: "todo" },
          { scheduledDate: "2026-04-29", status: "todo" },
        ],
      }),
    );

    expect(insight?.headline).toBe("Your best execution days had fewer than 4 planned actions.");
    expect(insight?.confidence).toBe("solid");
    expect(insight?.chargeLevel).toBe("Steady charge");
    expect(insight?.guideSections.find((section) => section.guideId === "perspective")?.insight).toContain("smaller plan");
  });

  it("connects approved proposals to momentum", () => {
    const insight = generateWeeklyAIInsight(
      baseInput({
        dailyPlans: [
          { planDate: "2026-04-27", status: "accepted" },
          { planDate: "2026-04-28", status: "accepted" },
        ],
        proposals: [
          { status: "approved", proposalType: "planner_create_item" },
          { status: "executed", proposalType: "daily_checkin_prompt" },
        ],
      }),
    );

    expect(insight?.headline).toBe("You moved faster when you turned the brief into approved action.");
    expect(insight?.nextWeekFocus).toContain("Approve one small action");
  });
});
