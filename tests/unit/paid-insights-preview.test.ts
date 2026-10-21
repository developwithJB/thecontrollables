import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { paidHostedFeatureDenial } from "../../supabase/functions/_shared/hostedAiBudget";
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { CampaignHtmlPreview } from "../../src/components/admin/CampaignHtmlPreview";
describe("paid tool authority", () => {
  it.each(["free", null, "unrecognized"])(
    "denies non-paid or missing authority %s",
    async (tier) => {
      expect(
        await paidHostedFeatureDenial(
          async () => ({ data: tier, error: null }),
          "owner",
        ),
      ).not.toBeNull();
    },
  );
  it.each(["plus", "pro", "premium", "lifetime"])(
    "preserves existing paid tier %s",
    async (tier) => {
      expect(
        await paidHostedFeatureDenial(
          async () => ({ data: tier, error: null }),
          "owner",
        ),
      ).toBeNull();
    },
  );
  it("does not accept a failed paid lookup", async () =>
    expect(
      await paidHostedFeatureDenial(
        async () => ({ data: "pro", error: "unavailable" }),
        "owner",
      ),
    ).toEqual({ status: 503, code: "hosted_ai_authority_unavailable" }));
});
it("isolates campaign HTML from the parent admin origin and scripts", () => {
  const html = renderToStaticMarkup(
    React.createElement(CampaignHtmlPreview, {
      html: '<img src=x onerror="parent.alert(1)">',
    }),
  );
  expect(html).toContain('sandbox=""');
  expect(html).toContain('referrerPolicy="no-referrer"');
  expect(html).toContain("default-src");
  expect(
    readFileSync("src/components/admin/CampaignComposer.tsx", "utf8"),
  ).not.toContain("dangerouslySetInnerHTML");
});
