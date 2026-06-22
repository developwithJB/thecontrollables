import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const readSource = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8");

describe("Controllable card deck UI wiring", () => {
  it("mounts the shareable card deck on Train and My Controllables", () => {
    const trainSource = readSource("src/pages/Train.tsx");
    const myControllablesSource = readSource("src/pages/MyControllables.tsx");

    expect(trainSource).toContain("ControllableCardsShowcase");
    expect(trainSource).toContain("Train Your Controllable Cards");
    expect(myControllablesSource).toContain("ControllableCardsShowcase");
    expect(myControllablesSource).toContain("My Controllable Cards");
  });

  it("keeps the daily charge strip positioned as a card deck", () => {
    const source = readSource("src/components/dashboard/ControllableChargeStrip.tsx");

    expect(source).toContain("Card Deck");
    expect(source).toContain("cards charged");
    expect(source).toContain("Deck {averageCharge}%");
  });

  it("keeps Train as the only full-width Controllable card CTA", () => {
    const source = readSource("src/components/dashboard/ControllableCardsShowcase.tsx");

    expect(source).toContain("aria-label={`Share ${card.name} card`}");
    expect(source).toContain("h-10 w-full");
    expect(source).not.toContain("Share Card");
  });
});
