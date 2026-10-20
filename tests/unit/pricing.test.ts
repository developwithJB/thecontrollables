import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { PRICING, getPricing, formatPrice, getPlanLabel } from "@/lib/pricing";
import {
  matchesCheckoutPrice,
  checkoutOffer,
} from "../../supabase/functions/_shared/billingContract";
const price = {
  active: true,
  type: "recurring",
  currency: "usd",
  unit_amount: 11999,
  recurring: { interval: "year", interval_count: 1, usage_type: "licensed" },
  billing_scheme: "per_unit",
};
describe("subscription offer contract", () => {
  it("advertises the exact new annual and monthly contracts", () => {
    expect(PRICING.pro.annual).toBe(119.99);
    expect(PRICING.pro.monthly).toBe(14.99);
    expect(PRICING.plus.annual).toBe(79.99);
    expect(getPricing().pro.annual).toBe(
      checkoutOffer("pro", "year")!.amount / 100,
    );
    expect(formatPrice("pro")).toBe("$119.99/yr");
    expect(getPlanLabel("plus")).toBe("Plus");
    expect(
      Math.abs(PRICING.pro.monthlyEquivalent * 12 - PRICING.pro.annual),
    ).toBeLessThan(0.2);
  });
  it("accepts correct licensed annual and monthly prices", () => {
    expect(matchesCheckoutPrice(price, "pro", "year")).toBe(true);
    expect(
      matchesCheckoutPrice(
        {
          ...price,
          unit_amount: 1499,
          recurring: { ...price.recurring, interval: "month" },
        },
        "pro",
        "month",
      ),
    ).toBe(true);
  });
  it.each([
    { unit_amount: 999, recurring: { ...price.recurring, interval: "month" } },
    { active: false },
    { currency: "eur" },
    { type: "one_time" },
    { unit_amount: null },
    { recurring: { ...price.recurring, interval_count: 2 } },
    { recurring: { ...price.recurring, usage_type: "metered" } },
    { transform_quantity: { divide_by: 5 } },
  ])("rejects price mismatch %j", (change) =>
    expect(matchesCheckoutPrice({ ...price, ...change }, "pro", "year")).toBe(
      false,
    ),
  );
  it("fails closed instead of falling back to the legacy monthly ID", () => {
    const source = readFileSync(
      "supabase/functions/create-checkout/index.ts",
      "utf8",
    );
    expect(
      source.indexOf("matchesCheckoutPrice(price, tier, interval)"),
    ).toBeLessThan(source.indexOf("stripe.checkout.sessions.create"));
    expect(source).not.toContain('Deno.env.get("STRIPE_PRICE_ID_PRO")');
    expect(source).toContain("price_contract_mismatch");
    expect(source).toContain("${tier}:${interval}:${priceId}");
    expect(source).not.toContain("payment_method_types:");
    expect(source).toContain("user.email_confirmed_at");
    expect(readFileSync("src/lib/pricing.ts", "utf8")).not.toContain(
      "price_1Sty37",
    );
  });
});
