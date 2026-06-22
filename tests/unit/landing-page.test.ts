import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const landingSource = () => readFileSync(resolve(process.cwd(), "src/pages/Landing.tsx"), "utf8");

describe("landing page copy", () => {
  it("renders the primary scan CTA and expected happy path", () => {
    const source = landingSource();

    expect(source).toContain("Start Your Scan");
    expect(source).toContain("How it works in 5 minutes a day");
    expect(source).toContain("One read. One promise. One proof.");
    expect(source).toContain("Get your read");
    expect(source).toContain("Choose your Controllable");
    expect(source).toContain("Add private proof");
    expect(source).toContain("How The Dashboard Helps");
    expect(source).toContain("Practice the book in real life.");
    expect(source).toContain("find your starting point");
    expect(source).toContain("Read Along Training");
    expect(source).toContain("Daily Charge");
    expect(source).toContain("Promise Ledger");
    expect(source).toContain("Proof Loop");
    expect(source).toContain("Start today grounded");
    expect(source).toContain("Take Starting Charge");
    expect(source).toContain("Get your focus");
    expect(source).toContain("Do Daily Charge");
    expect(source).toContain("Watch Self-Trust move");
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
    expect(source).not.toMatch(/actually advertise/i);
    expect(source).not.toMatch(/sticky flows/i);
  });
});
