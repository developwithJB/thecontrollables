import { describe, expect, it } from "vitest";
import { toSafeInternalPath } from "../../src/lib/safeNavigation";

describe("safe internal navigation", () => {
  it("preserves root-relative application paths", () => {
    expect(toSafeInternalPath("/formation/today?day=2#practice")).toBe("/formation/today?day=2#practice");
  });

  it.each([
    "https://example.com/phish",
    "//example.com/phish",
    "/\\example.com/phish",
    "\\\\example.com/phish",
    "javascript:alert(1)",
  ])("rejects external or ambiguous destination %s", (destination) => {
    expect(toSafeInternalPath(destination)).toBe("/home");
  });

  it("uses the caller's explicit safe fallback", () => {
    expect(toSafeInternalPath(null, "/formation/today")).toBe("/formation/today");
  });
});
