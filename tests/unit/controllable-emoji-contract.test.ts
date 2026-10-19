import { readFileSync, readdirSync } from "node:fs";
import { extname, join } from "node:path";
import { describe, expect, it } from "vitest";

import { ORDERED_CONTROLLABLE_GUIDES } from "@/lib/controllables";
import { CONTROLLABLE_VISUAL_ICONS } from "@/lib/controllableVisuals";

const CANONICAL_CONTROLLABLE_EMOJIS = {
  awareness: "🦉",
  perspective: "🐢",
  habit: "🦈",
  wellness: "🛰️",
  environment: "🚀",
};

const SOURCE_EXTENSIONS = new Set([".ts", ".tsx"]);

function sourceFiles(root: string): string[] {
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const path = join(root, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return SOURCE_EXTENSIONS.has(extname(path)) ? [path] : [];
  });
}

describe("canonical Controllable emoji contract", () => {
  it("uses the approved five-character mapping", () => {
    expect(CONTROLLABLE_VISUAL_ICONS).toEqual(CANONICAL_CONTROLLABLE_EMOJIS);
  });

  it("preserves canonical guide names and order", () => {
    expect(ORDERED_CONTROLLABLE_GUIDES.map(({ name, emoji }) => [name, emoji])).toEqual([
      ["Awareness", "🦉"], ["Perspective", "🐢"], ["Habit", "🦈"], ["Wellness", "🛰️"], ["Environment", "🚀"],
    ]);
  });

  it("does not reintroduce retired Perspective or Wellness mascots", () => {
    const retiredDinosaur = String.fromCodePoint(0x1f995);
    const retiredSurfer = String.fromCodePoint(0x1f3c4);
    const retiredMascotLanguage = new RegExp(`\\b${["dino", "saur"].join("")}\\b|\\b${["sauro", "pod"].join("")}\\b|\\b${["surf", "er"].join("")}\\b`, "i");
    const offenders = ["src", "supabase/functions"]
      .flatMap(sourceFiles)
      .filter((path) => {
        const source = readFileSync(path, "utf8");
        return source.includes(retiredDinosaur) || source.includes(retiredSurfer) || retiredMascotLanguage.test(source);
      });

    expect(offenders).toEqual([]);
  });
});
