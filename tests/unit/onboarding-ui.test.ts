import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const readSource = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8");

describe("onboarding UI", () => {
  it("uses a custom birthday input instead of the native date picker", () => {
    const source = readSource("src/components/onboarding/BirthdayOnboardingStep.tsx");

    expect(source).not.toMatch(/type=["']date["']/);
    expect(source).toContain("No calendar picker");
    expect(source).toContain("MM / DD / YYYY");
  });

  it("keeps quick start visually aligned with the Dashboard world", () => {
    const source = readSource("src/pages/QuickStart.tsx");

    expect(source).toContain("Where are you with the book?");
    expect(source).toContain("What kind of formation fits this season?");
    expect(source).toContain("Your first day is ready");
    expect(source).toContain("Step {stepIndex + 1} of {STEPS.length}");
  });

  it("removes unexplained intake and discloses the strict path before signup", () => {
    const source = readSource("src/pages/QuickStart.tsx");

    expect(source).not.toContain("BirthdayOnboardingStep");
    expect(source).toContain("No birthday, public score, or private reflection is required.");
    expect(source).toContain("I understand this is the strict path.");
    expect(source).toContain("optional proof never completes a requirement");
  });

  it("sets dark mode before React renders unless light is explicitly saved", () => {
    const source = readSource("index.html");

    expect(source).toContain('localStorage.getItem("theme") !== "light"');
    expect(source).toContain('document.documentElement.classList.add("dark")');
  });
});
