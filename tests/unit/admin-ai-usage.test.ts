import { describe, expect, it } from "vitest";
import {
  formatAIUsageCurrency,
  formatAIUsagePercent,
  getAIDepthAdminLabel,
  getAIModeAdminLabel,
  safeCostPerApprovedProposal,
} from "@/lib/adminAIUsage";

describe("admin AI usage helpers", () => {
  it("formats small AI costs with useful precision", () => {
    expect(formatAIUsageCurrency(0.012345)).toBe("$0.0123");
    expect(formatAIUsageCurrency(0.012345, 3)).toBe("$0.012");
    expect(formatAIUsageCurrency(12.345)).toBe("$12.35");
  });

  it("formats percentages and cost per approved proposal safely", () => {
    expect(formatAIUsagePercent(42.345)).toBe("42.3%");
    expect(safeCostPerApprovedProposal(10, 4)).toBe(2.5);
    expect(safeCostPerApprovedProposal(10, 0)).toBe(0);
  });

  it("keeps admin labels human-friendly without changing raw values", () => {
    expect(getAIDepthAdminLabel("balanced")).toBe("Think it through");
    expect(getAIModeAdminLabel("daily_brief")).toBe("Daily Operator Brief");
    expect(getAIDepthAdminLabel("unknown")).toBe("unknown");
  });
});
