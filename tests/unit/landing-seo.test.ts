import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const index = readFileSync(resolve(process.cwd(), "index.html"), "utf8");
const manifest = readFileSync(resolve(process.cwd(), "public/manifest.webmanifest"), "utf8");
const robots = readFileSync(resolve(process.cwd(), "public/robots.txt"), "utf8");
const socialImagePath = resolve(process.cwd(), "public/og-image-fully-charged-75-v1.png");

describe("landing SEO and social metadata", () => {
  it("uses one consistent canonical Fully Charged 75 narrative", () => {
    expect(index).toContain("The Dashboard | Five Controllables. Fully Charged 75.");
    expect(index).toContain('rel="canonical" href="https://thedashboard.agbcoaching.com/"');
    expect(index).toContain('property="og:title" content="Five Controllables. Seventy-five days. | The Dashboard"');
    expect(index).toContain('name="twitter:title" content="Five Controllables. Seventy-five days. | The Dashboard"');
    expect(index).toContain('type="application/ld+json"');
    expect(index).not.toContain("storage.googleapis.com/gpt-engineer-file-uploads");
    expect(manifest).toContain("Fully Charged 75-day path");
    expect(robots).toContain("https://thedashboard.agbcoaching.com/sitemap.xml");
  });

  it("ships a project-owned 1200 by 630 sharing image", () => {
    const image = readFileSync(socialImagePath);
    expect(image.subarray(1, 4).toString("ascii")).toBe("PNG");
    expect(image.readUInt32BE(16)).toBe(1200);
    expect(image.readUInt32BE(20)).toBe(630);
    expect(statSync(socialImagePath).size).toBeGreaterThan(100_000);
    expect(index).toContain("https://thedashboard.agbcoaching.com/og-image-fully-charged-75-v1.png");
  });
});
