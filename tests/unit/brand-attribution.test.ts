import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (relativePath: string) => readFileSync(resolve(process.cwd(), relativePath), "utf8");

const logo = read("src/components/Logo.tsx");
const index = read("index.html");
const home = read("src/pages/Home.tsx");
const growth = read("src/pages/Growth.tsx");
const wellness = read("src/pages/Wellness.tsx");
const money = read("src/pages/Money.tsx");
const landing = read("src/pages/Landing.tsx");
const dailyHierarchy = read("docs/DAILY_HIERARCHY.md");

const FOOTERS: Array<[string, string]> = [
  ["Home", home],
  ["Growth", growth],
  ["Wellness", wellness],
  ["Money", money],
  ["Landing", landing],
];

describe("brand attribution", () => {
  it("puts The Controllables in the logo byline", () => {
    expect(logo).toContain("by The Controllables");
    expect(logo).not.toContain("by AGB Coaching");
  });

  it.each(FOOTERS)("puts The Controllables in the %s footer copyright", (_name, source) => {
    expect(source).toContain("© {new Date().getFullYear()} The Controllables");
    expect(source).not.toContain("AGB Coaching");
  });

  it("names The Controllables as the page author and schema publisher", () => {
    expect(index).toContain('<meta name="author" content="The Controllables" />');
    expect(index).toContain('"name": "The Controllables"');
    expect(index).not.toContain("AGB Coaching");
  });

  it("keeps the written product rule attributed to The Controllables", () => {
    expect(dailyHierarchy).toContain("The Dashboard by The Controllables");
    expect(dailyHierarchy).not.toContain("The Dashboard by AGB Coaching");
  });
});
