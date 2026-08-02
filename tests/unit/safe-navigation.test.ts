import { describe, expect, it } from "vitest";
import { getAuthRedirectPath, toSafeInternalPath } from "../../src/lib/safeNavigation";

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

  it("builds an encoded sign-in route that preserves the full internal destination", () => {
    expect(getAuthRedirectPath({ pathname: "/reset", search: "?mode=review", hash: "#day" }))
      .toBe("/auth?returnTo=%2Freset%3Fmode%3Dreview%23day");
  });
});
