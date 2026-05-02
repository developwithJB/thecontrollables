import { describe, expect, it } from "vitest";
import {
  AI_CONSENT_KEYS,
  AI_DEPTH_LEVELS,
  getAIDepthCopy,
  getAIPlanConfidence,
  getAIPlanContextLine,
  getConsentCopy,
  isExecutableAIProposal,
  normalizeAIDepth,
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
