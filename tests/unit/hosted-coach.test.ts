import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  hostedCoachAccess,
  readCoachPlanTier,
} from "../../supabase/functions/_shared/coachPlan";
import { canAccessFeature, PAID_FEATURES } from "@/lib/entitlements";
import { DEFAULT_FEATURE_FLAGS } from "@/lib/featureFlags";
import {
  getHostedCoachPriceDisplay,
  HOSTED_COACH_PRICE_DISPLAY,
} from "@/lib/pricing";

describe("Pro hosted coach", () => {
  it.each(["free", "plus", "pro"] as const)(
    "enforces %s on client presentation and the server path",
    (tier) => {
      expect(PAID_FEATURES.hostedCoach).toBe("pro");
      expect(canAccessFeature("hostedCoach", tier)).toBe(tier === "pro");
      expect(hostedCoachAccess(true, true, tier)).toBe(
        tier === "pro" ? "active" : "upgrade",
      );
      expect(hostedCoachAccess(true, false, tier)).toBe("disabled");
      expect(hostedCoachAccess(false, true, tier)).toBe("legacy");
    },
  );
  it.each(["premium", "lifetime"])(
    "recognizes legacy higher-tier billing projection %s",
    async (tier) => {
      expect(
        await readCoachPlanTier(async () => ({
          data: { plan_tier: tier },
          error: null,
        })),
      ).toBe("pro");
    },
  );
  it("publishes the priced offer while server rollout remains authoritative", () => {
    expect(DEFAULT_FEATURE_FLAGS.hosted_coach_enabled).toBe(true);
    expect(HOSTED_COACH_PRICE_DISPLAY).toBe("$119.99/year or $14.99/month");
    expect(getHostedCoachPriceDisplay()).toBe(HOSTED_COACH_PRICE_DISPLAY);
  });
  it("checks server selection and profile before reserving or making a paid request", () => {
    const edge = readFileSync("supabase/functions/ai-chat/index.ts", "utf8");
    expect(edge).toContain("personaSettings?.hosted_coach_selected === true");
    expect(edge).toContain("providerRollout?.hosted_coach_enabled === true");
    expect(edge.indexOf("hostedAccess === 'disabled'")).toBeLessThan(
      edge.indexOf("createCoachProvider(credential"),
    );
    expect(edge.indexOf("createCoachProvider(credential")).toBeLessThan(
      edge.indexOf("provider.complete("),
    );
    expect(edge).not.toContain("user_metadata?.plan_tier");
    const migration = readFileSync(
      "supabase/migrations/20261020000300_hosted_coach_entitlement.sql",
      "utf8",
    );
    expect(migration).toContain("IF used_count>=25");
    expect(migration).toContain("public.coach_hosted_usage");
    expect(migration).toContain(
      "REVOKE ALL ON public.coach_hosted_usage FROM PUBLIC, anon, authenticated",
    );
    expect(migration).toContain("FROM PUBLIC, anon, authenticated");
    expect(migration).not.toContain("GRANT UPDATE (hosted_coach_selected)");
  });
});
