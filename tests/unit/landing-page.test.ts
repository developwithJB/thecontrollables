import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const landingSource = () => readFileSync(resolve(process.cwd(), "src/pages/Landing.tsx"), "utf8");

describe("landing page copy", () => {
  it("states the covenant promise and makes the first-day path explicit", () => {
    const source = landingSource();

    expect(source).toContain("Become someone whose yes can be trusted.");
    expect(source).toContain("Begin my covenant");
    expect(source).toContain("A 75-Day Christian Covenant");
    expect(source).toContain("Know exactly what happens next.");
    expect(source).toContain("Choose the right path");
    expect(source).toContain("Create your private space");
    expect(source).toContain("Open today’s practice");
  });

  it("advertises the three real paths with clear miss rules", () => {
    const source = landingSource();

    expect(source).toContain("Read Along");
    expect(source).toContain("40-Day Charge");
    expect(source).toContain("75-Day Covenant");
    expect(source).toContain("If you miss:");
    expect(source).toContain("75 consecutive days");
    expect(source).toContain("history remains");
  });

  it("keeps formation private, adaptable, and free from public scoring", () => {
    const source = landingSource();

    expect(source).toContain("Private by default");
    expect(source).toContain("No public rankings");
    expect(source).toContain("Recovery without shame");
    expect(source).toContain("Adaptable movement");
    expect(source).toContain("Optional proof never replaces a required practice.");
  });

  it("does not show old landing language", () => {
    const source = landingSource();

    expect(source).not.toMatch(/Daily Controllables Brief/i);
    expect(source).not.toMatch(/\bevolution\b/i);
    expect(source).not.toMatch(/actually advertise/i);
    expect(source).not.toMatch(/sticky flows/i);
    expect(source).not.toMatch(/Mission 001/i);
    expect(source).not.toMatch(/Habit XP/i);
  });
});
