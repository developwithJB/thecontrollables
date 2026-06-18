import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const landingSource = () => readFileSync(resolve(process.cwd(), "src/pages/Landing.tsx"), "utf8");

describe("landing page copy", () => {
  it("renders the primary scan CTA and expected happy path", () => {
    const source = landingSource();

    expect(source).toContain("Start Your Scan");
    expect(source).toContain("Find Your Starting Charge");
    expect(source).toContain("Choose Your Journey");
    expect(source).toContain("Complete Mission 001");
    expect(source).toContain("Build Your Dex");
  });

  it("keeps proof and sharing privacy-first", () => {
    const source = landingSource();

    expect(source).toContain("Private by default");
    expect(source).toContain("One photo at a time");
    expect(source).toContain("No background scanning");
    expect(source).toContain("No exact location sharing");
    expect(source).toContain("Share the proof, not the private work.");
  });

  it("does not show old landing language", () => {
    const source = landingSource();

    expect(source).not.toMatch(/Daily Controllables Brief/i);
    expect(source).not.toMatch(/\bevolution\b/i);
  });
});
