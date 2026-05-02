import { describe, expect, it } from "vitest";
import {
  AI_CONSENT_KEYS,
  AI_CONTROLLABLE_GUIDES,
  AI_DEPTH_LEVELS,
  AI_GUIDE_LENS_OPTIONS,
  buildAIAdjustmentRequestBody,
  deriveSafeEgoCheck,
  getAIDepthCopy,
  getAIGuideLensOption,
  getAIPlanConfidence,
  getAIPlanContextLine,
  getConsentCopy,
  isExecutableAIProposal,
  normalizeAIDailyPlanData,
  normalizeAIDepth,
  normalizeAIGuideLens,
  normalizeAIConsents,
  shouldSuggestDeeperPass,
} from "@/lib/aiOperator";

describe("aiOperator utilities", () => {
  it("normalizes missing consents to false", () => {
    const consents = normalizeAIConsents({
      calendar_context: true,
      memory_enabled: "yes",
      money_context: false,
    });

    expect(consents.calendar_context).toBe(true);
    expect(consents.memory_enabled).toBe(false);
    expect(consents.money_context).toBe(false);
    expect(consents.body_context).toBe(false);
  });

  it("keeps consent copy defined for every key", () => {
    for (const key of AI_CONSENT_KEYS) {
      const copy = getConsentCopy(key);
      expect(copy.label.length).toBeGreaterThan(0);
      expect(copy.description.length).toBeGreaterThan(0);
    }
  });

  it("only treats safe v1 proposals as executable", () => {
    expect(isExecutableAIProposal("planner_create_item")).toBe(true);
    expect(isExecutableAIProposal("daily_checkin_prompt")).toBe(true);
    expect(isExecutableAIProposal("planner_reschedule_item")).toBe(false);
    expect(isExecutableAIProposal("nudge_schedule")).toBe(false);
  });

  it("normalizes AI depth to cheap quick mode by default", () => {
    expect(normalizeAIDepth("deep")).toBe("deep");
    expect(normalizeAIDepth("balanced")).toBe("balanced");
    expect(normalizeAIDepth("expensive")).toBe("quick");
    expect(normalizeAIDepth(undefined)).toBe("quick");
  });

  it("keeps AI depth copy defined for every level", () => {
    for (const depth of AI_DEPTH_LEVELS) {
      const copy = getAIDepthCopy(depth);
      expect(copy.label.length).toBeGreaterThan(0);
      expect(copy.description.length).toBeGreaterThan(0);
    }
  });

  it("keeps internal depth values stable while using human labels", () => {
    expect(AI_DEPTH_LEVELS).toEqual(["quick", "balanced", "deep"]);
    expect(getAIDepthCopy("quick").label).toBe("Quick answer");
    expect(getAIDepthCopy("balanced").label).toBe("Think it through");
    expect(getAIDepthCopy("deep").label).toBe("Go deeper");
  });

  it("defines guide lens options with Full Dashboard as the default", () => {
    expect(AI_GUIDE_LENS_OPTIONS[0].id).toBe("full_dashboard");
    expect(getAIGuideLensOption("awareness").example).toBe("What am I not seeing clearly?");
    expect(getAIGuideLensOption("environment").emoji).toBe("🚀");
  });

  it("normalizes missing or unknown guide lenses to Full Dashboard", () => {
    expect(normalizeAIGuideLens("habit")).toBe("habit");
    expect(normalizeAIGuideLens("full_dashboard")).toBe("full_dashboard");
    expect(normalizeAIGuideLens("ego")).toBe("full_dashboard");
    expect(normalizeAIGuideLens(undefined)).toBe("full_dashboard");
  });

  it("builds adjustment request payloads with selected guide metadata", () => {
    expect(buildAIAdjustmentRequestBody({
      prompt: "What is the smallest next action?",
      aiDepth: "balanced",
      selectedGuide: "habit",
      localDate: "2026-05-02",
      timezone: "America/Chicago",
    })).toEqual({
      mode: "adjust",
      prompt: "What is the smallest next action?",
      aiDepth: "balanced",
      selectedGuide: "habit",
      localDate: "2026-05-02",
      timezone: "America/Chicago",
      forceRefresh: true,
    });
  });

  it("defaults adjustment request payloads to the Full Dashboard lens", () => {
    const body = buildAIAdjustmentRequestBody({
      prompt: "Replan my afternoon.",
      aiDepth: "expensive" as never,
      localDate: "2026-05-02",
      timezone: "America/Chicago",
    });

    expect(body.selectedGuide).toBe("full_dashboard");
    expect(body.aiDepth).toBe("quick");
  });

  it("derives plan confidence from available context sources", () => {
    expect(getAIPlanConfidence(["planner"])).toBe("Low");
    expect(getAIPlanConfidence(["planner", "growth", "first-day setup"])).toBe("Medium");
    expect(getAIPlanConfidence(["planner", "growth", "calendar", "body", "memory"])).toBe("High");
  });

  it("uses graceful context copy when source depth is limited", () => {
    expect(getAIPlanContextLine(["planner"])).toContain("signals available");
    expect(getAIPlanContextLine(["planner", "first-day setup"])).toContain("first-day setup");
    expect(getAIPlanContextLine(["planner", "growth", "body"])).toContain("priorities");
  });

  it("normalizes new guide-aware daily plan fields", () => {
    const plan = normalizeAIDailyPlanData({
      day_type: "focus opportunity",
      summary: "The day has room for deep work.",
      matters_most: "Finish the deck.",
      protect: "Protect the first focus block.",
      next_move: "Open the deck before inbox.",
      fallback: "Close one slide if the day gets noisy.",
      sources_used: ["planner", "growth", "body"],
      generated_by: "ai",
      day_signal: "Focus day with real energy.",
      main_priority: "Finish the deck before adding new loops.",
      protect_this: "Protect your first 90 minutes.",
      next_actions: ["Open the deck.", "Finish the first rough pass."],
      guide_insights: [{
        guide_id: "habit",
        guide_name: "Habit",
        guide_emoji: "🦈",
        role_label: "Build the next repeat",
        insight: "The first rep is the plan.",
        recommended_action: "Start with the smallest deck action.",
        confidence: "High",
        source_context_optional: "planner",
      }],
      ego_warning_optional: {
        signal: "Overplanning could delay the first rep.",
        recommended_response: "Start before refining.",
        confidence: "Medium",
      },
      fully_charged_focus: "End with one kept promise.",
      confidence: "High",
    });

    expect(plan.day_signal).toBe("Focus day with real energy.");
    expect(plan.main_priority).toBe("Finish the deck before adding new loops.");
    expect(plan.next_actions).toHaveLength(2);
    expect(plan.guide_insights[0].guide_id).toBe("habit");
    expect(plan.ego_warning_optional?.recommended_response).toBe("Start before refining.");
    expect(plan.confidence).toBe("High");
  });

  it("adds guide fallbacks when guide_insights are missing", () => {
    const plan = normalizeAIDailyPlanData({
      day_type: "busy day",
      summary: "Today is crowded.",
      matters_most: "Protect the client call.",
      protect: "Protect transition space.",
      next_move: "Prep the call notes.",
      fallback: "Drop optional admin.",
      sources_used: ["planner"],
      generated_by: "rules",
    });

    expect(plan.guide_insights.map((guide) => guide.guide_id)).toEqual([...AI_CONTROLLABLE_GUIDES]);
    expect(plan.guide_insights[0].insight).toBe("Today is crowded.");
    expect(plan.guide_insights[2].recommended_action).toBe("Prep the call notes.");
    expect(plan.confidence).toBe("Low");
  });

  it("adds a deterministic Ego Check only for safe day signals", () => {
    const busyPlan = normalizeAIDailyPlanData({
      day_type: "Busy / chaotic",
      summary: "Today is crowded.",
      matters_most: "Protect the client call.",
      protect: "Protect transition space.",
      next_move: "Prep the call notes.",
      fallback: "Drop optional admin.",
      sources_used: ["planner"],
      generated_by: "rules",
    });

    const steadyPlan = normalizeAIDailyPlanData({
      day_type: "steady execution",
      summary: "Keep the plan narrow and executable.",
      matters_most: "Choose one win.",
      protect: "Protect one focus block.",
      next_move: "Add one 25-minute focus block.",
      fallback: "Return to one task and one close-out.",
      sources_used: ["planner"],
      generated_by: "ai",
    });

    expect(busyPlan.ego_warning_optional?.signal).toBe("Watch for overcommitting to catch up.");
    expect(steadyPlan.ego_warning_optional).toBeNull();
  });

  it("derives request-language Ego Checks without accepting unsafe guide ids", () => {
    expect(deriveSafeEgoCheck({ user_adjustment_request: "I keep reacting to pressure" }, "Low")?.signal)
      .toBe("Pause before reacting to pressure.");
    expect(deriveSafeEgoCheck({ user_adjustment_request: "Help me compare options" }, "Medium")?.recommended_response)
      .toContain("scorecard");
    expect(deriveSafeEgoCheck({ user_adjustment_request: "Replan my lunch" }, "Medium")).toBeNull();
  });

  it("renders cached old daily plan responses through the new contract", () => {
    const oldCachedPlan = normalizeAIDailyPlanData({
      day_type: "steady execution",
      summary: "Keep the plan narrow and executable.",
      matters_most: "Choose one win.",
      protect: "Protect one focus block.",
      next_move: "Add one 25-minute focus block.",
      fallback: "Return to one task and one close-out.",
      sources_used: ["planner", "growth", "first-day setup"],
      generated_by: "ai",
    });

    expect(oldCachedPlan.day_signal).toBe("steady execution");
    expect(oldCachedPlan.main_priority).toBe("Choose one win.");
    expect(oldCachedPlan.protect_this).toBe("Protect one focus block.");
    expect(oldCachedPlan.next_actions).toEqual(["Add one 25-minute focus block."]);
    expect(oldCachedPlan.guide_insights).toHaveLength(5);
    expect(oldCachedPlan.fully_charged_focus).toContain("kept promise");
  });

  it("suggests a deeper pass for complex quick adjustments", () => {
    const signal = shouldSuggestDeeperPass({
      prompt: "What should I drop before my weekly review?",
      currentDepth: "quick",
      confidence: "Medium",
      adjustmentCount: 0,
    });

    expect(signal.shouldSuggest).toBe(true);
    expect(signal.reasons).toContain("complex planning request");
    expect(signal.reasons).toContain("quick mode may be too light");
  });

  it("suggests a deeper pass for low confidence or repeated loops", () => {
    expect(shouldSuggestDeeperPass({
      prompt: "Replan again",
      currentDepth: "quick",
      confidence: "Low",
      adjustmentCount: 0,
    }).shouldSuggest).toBe(true);

    expect(shouldSuggestDeeperPass({
      prompt: "Move things around",
      currentDepth: "balanced",
      confidence: "High",
      adjustmentCount: 2,
    }).shouldSuggest).toBe(true);
  });

  it("does not suggest a deeper pass when already deep or prompt is simple", () => {
    expect(shouldSuggestDeeperPass({
      prompt: "Make this lighter",
      currentDepth: "quick",
      confidence: "Medium",
      adjustmentCount: 0,
    }).shouldSuggest).toBe(false);

    expect(shouldSuggestDeeperPass({
      prompt: "I feel overwhelmed",
      currentDepth: "deep",
      confidence: "Low",
      adjustmentCount: 4,
    }).shouldSuggest).toBe(false);
  });
});
