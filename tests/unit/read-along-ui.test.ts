import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const readSource = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8");

describe("read along UI wiring", () => {
  it("registers /read-along inside the Life OS layout", () => {
    const appSource = readSource("src/App.tsx");
    const routesSource = readSource("src/lib/appRoutes.ts");

    expect(routesSource).toContain('readAlong: "/read-along"');
    expect(appSource).toContain("path={APP_ROUTES.readAlong}");
    expect(appSource).toContain("element={<ReadAlong />}");
  });

  it("opens Read Along from the header book icon", () => {
    const source = readSource("src/components/layout/LifeOSLayout.tsx");

    expect(source).toContain("navigate(APP_ROUTES.readAlong)");
    expect(source).toContain('title="Read Along Training"');
    expect(source).not.toContain('href="https://a.co/d/1DGPGEV"');
  });

  it("keeps the external book link inside the Read Along page", () => {
    const source = readSource("src/pages/ReadAlong.tsx");

    expect(source).toContain("https://a.co/d/1DGPGEV");
    expect(source).toContain("Spoiler-safe path");
    expect(source).toContain("Do today's rep");
  });
});
