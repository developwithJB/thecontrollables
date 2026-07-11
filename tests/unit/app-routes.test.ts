import { describe, expect, it } from "vitest";

import { APP_ROUTES, LIFE_OS_ROUTE_PATHS, PRIMARY_ENTRY_ROUTE_PATHS } from "@/lib/appRoutes";

describe("app route registry", () => {
  it("defines the QA entry routes", () => {
    expect(LIFE_OS_ROUTE_PATHS).toContain(APP_ROUTES.myControllables);
    expect(LIFE_OS_ROUTE_PATHS).toContain(APP_ROUTES.readAlong);
    expect(LIFE_OS_ROUTE_PATHS).toContain(APP_ROUTES.goal);
    expect(LIFE_OS_ROUTE_PATHS).toContain(APP_ROUTES.train);
    expect(LIFE_OS_ROUTE_PATHS).toContain(APP_ROUTES.proof);
  });

  it("keeps Today, Train, and Proof as primary entry points", () => {
    expect(PRIMARY_ENTRY_ROUTE_PATHS).toEqual([
      "/home",
      "/train",
      "/proof",
    ]);
  });
});
