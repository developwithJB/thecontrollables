import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
const id = "00000000-0000-4000-8000-000000000099";
const user = {
  id,
  email: "billing-qa@local.invalid",
  aud: "authenticated",
  role: "authenticated",
  email_confirmed_at: "2026-10-20T00:00:00Z",
  created_at: "2026-10-20T00:00:00Z",
  user_metadata: {},
  app_metadata: { provider: "email" },
};
function syntheticSession() {
  const exp = Math.floor(Date.now() / 1000) + 86400;
  const token = [
    { alg: "HS256", typ: "JWT" },
    { sub: id, exp, role: "authenticated" },
    "synthetic",
  ]
    .map((p) =>
      Buffer.from(typeof p === "string" ? p : JSON.stringify(p)).toString(
        "base64url",
      ),
    )
    .join(".");
  return {
    user,
    access_token: token,
    refresh_token: "synthetic-local-test",
    expires_at: exp,
    expires_in: 86400,
    token_type: "bearer",
  };
}
const headers = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "*",
  "access-control-allow-methods": "POST,GET,OPTIONS",
};
test.beforeEach(async ({ page }) => {
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.hostname === "127.0.0.1" || url.hostname === "localhost")
      return route.continue();
    if (url.hostname.endsWith(".supabase.co")) {
      if (route.request().method() === "OPTIONS")
        return route.fulfill({ headers, body: "" });
      let data: unknown = [];
      if (url.pathname.includes("/auth/v1/token")) data = syntheticSession();
      else if (url.pathname.includes("/auth/v1/user")) data = user;
      else if (url.pathname.includes("/functions/v1/check-payment"))
        data = { isPaid: false, plan_tier: null };
      else if (url.pathname.includes("get_hosted_ai_allowance"))
        data = {
          enabled: true,
          plan: "free",
          repliesRemaining: 3,
          dailyRemaining: 3,
          budgetPercentRemaining: 90,
          resetsAt: null,
          byoActive: false,
          byoRemaining: 100,
        };
      else if (url.pathname.includes("coach_providers_available")) data = true;
      else if (url.pathname.includes("get_hosted_coach_status"))
        data = { enabled: true, entitled: false, selected: false };
      else if (url.pathname.includes("/coach_provider_settings")) data = null;
      return route.fulfill({ headers, json: data });
    }
    // No Stripe, production app, analytics, Google, or provider traffic.
    return route.abort();
  });
});
async function signedIn(page: import("@playwright/test").Page) {
  await page.goto("/pricing");
  await page.evaluate(async (user) => {
    const modulePath = "/src/integrations/supabase/client.ts";
    const { supabase } = await import(/* @vite-ignore */ modulePath);
    const exp = Math.floor(Date.now() / 1000) + 86400;
    const token = [
      { alg: "HS256", typ: "JWT" },
      { sub: user.id, exp, role: "authenticated" },
      "synthetic",
    ]
      .map((p) =>
        btoa(typeof p === "string" ? p : JSON.stringify(p))
          .replace(/=/g, "")
          .replace(/\+/g, "-")
          .replace(/\//g, "_"),
      )
      .join(".");
    const { error } = await supabase.auth.setSession({
      access_token: token,
      refresh_token: "synthetic-local-test",
    });
    if (error) throw error;
  }, user);
}

test("public freemium plans have exact prices, bounded AI and an independent book link", async ({
  page,
}, info) => {
  await page.goto("/pricing");
  await expect(
    page.getByRole("heading", { name: "Start free. Choose your support." }),
  ).toBeVisible();
  await expect(
    page.getByText("$119.99", { exact: false }).first(),
  ).toBeVisible();
  await page.getByLabel("Monthly", { exact: true }).check();
  await expect(page.getByText("$14.99", { exact: false })).toBeVisible();
  await expect(page.getByRole("link", { name: "Choose Pro" })).toHaveAttribute(
    "href",
    "/billing?interval=month",
  );
  await expect(
    page.getByText(/Up to 200 standard text coach replies/),
  ).toBeVisible();
  await expect(
    page.getByText(/No overage charges or unlimited AI/),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Get The Controllables book" }),
  ).toHaveAttribute("href", "https://a.co/d/1DGPGEV");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  const axe = await new AxeBuilder({ page }).analyze();
  expect(
    axe.violations.filter((v) =>
      ["critical", "serious"].includes(v.impact ?? ""),
    ),
  ).toEqual([]);
  await page.screenshot({
    path: `output/freemium-release/pricing-${info.project.name}.png`,
    fullPage: true,
  });
});
test("monthly checkout sends the server offer and uses same-tab navigation", async ({
  page,
}, info) => {
  await signedIn(page);
  let requested: Record<string, unknown> | undefined;
  await page.route("**/functions/v1/create-checkout", async (route) => {
    if (route.request().method() === "OPTIONS")
      return route.fulfill({ headers, body: "" });
    requested = route.request().postDataJSON();
    return route.fulfill({
      headers,
      json: { url: "http://127.0.0.1:8085/__mock-checkout", plan_tier: "pro" },
    });
  });
  await page.route("http://127.0.0.1:8085/__mock-checkout", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: "<h1>Local checkout mock</h1>",
    }),
  );
  await page.goto("/billing?interval=month");
  await expect(
    page.getByRole("heading", { name: "Your AI allowance" }),
  ).toBeVisible();
  await expect(
    page.getByText("3 sample replies left on this account", { exact: false }),
  ).toBeVisible();
  await page.screenshot({
    path: `output/freemium-release/billing-${info.project.name}.png`,
    fullPage: true,
  });
  await page.getByRole("button", { name: "Choose Pro — monthly" }).click();
  await expect(page).toHaveURL(/__mock-checkout/);
  expect(requested).toMatchObject({
    tier: "pro",
    interval: "month",
    source: "billing_freemium",
  });
  expect(requested).not.toHaveProperty("price_id");
});
test("a price mismatch blocks navigation and gives a useful retry message", async ({
  page,
}) => {
  await signedIn(page);
  await page.route("**/functions/v1/create-checkout", (route) =>
    route.request().method() === "OPTIONS"
      ? route.fulfill({ headers, body: "" })
      : route.fulfill({
          headers,
          status: 503,
          json: {
            error:
              "Checkout is temporarily unavailable while we verify pricing.",
            error_code: "price_contract_mismatch",
          },
        }),
  );
  await page.goto("/billing");
  await page.getByRole("button", { name: "Choose Pro — annual" }).click();
  await expect(
    page.getByText(
      "Checkout is temporarily unavailable while we verify pricing.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/billing$/);
});

test("verified free customers can reach an optional coach and read a JSON reply", async ({
  page,
}, info) => {
  await signedIn(page);
  let calls = 0;
  await page.route("**/functions/v1/ai-chat", (route) => {
    if (route.request().method() === "OPTIONS")
      return route.fulfill({ headers, body: "" });
    calls++;
    return route.fulfill({
      headers,
      json: {
        message:
          "A synthetic local coach reply. Your practice is still yours to record.",
      },
    });
  });
  await page.goto("/coach");
  await expect(
    page.getByRole("heading", { name: "Optional AI coach" }),
  ).toBeVisible();
  await expect(
    page.getByText("3 sample replies left on this account", { exact: false }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Habit: give me the next move" })
    .click();
  await expect(
    page.getByText(
      "A synthetic local coach reply. Your practice is still yours to record.",
    ),
  ).toBeVisible();
  expect(calls).toBe(1);
  const coachAxe=await new AxeBuilder({page}).include('[data-testid="optional-coach"]').analyze();
  expect(coachAxe.violations.filter(v=>["serious","critical"].includes(v.impact??""))).toEqual([]);

  await page.evaluate(() => {
    window.scrollTo(0, 0);
    document.querySelectorAll("main").forEach((m) => m.scrollTo(0, 0));
  });
  await page.screenshot({
    path: `output/freemium-release/coach-${info.project.name}.png`,
    fullPage: true,
  });
});

test("a success URL alone never claims a confirmed subscription", async ({
  page,
}) => {
  await signedIn(page);
  await page.goto("/billing?payment=success&interval=month");
  await expect(
    page.getByText("Confirming your subscription…", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Your subscription is confirmed", { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Choose Pro — monthly" }),
  ).toBeVisible();
  await expect(page).toHaveURL(/interval=month/);
});

test("legacy app access is clearly separate from hosted Pro and free samples",async({page},info)=>{
  await page.route("**/functions/v1/check-payment",route=>route.fulfill({headers,json:{isPaid:true,plan_tier:"pro",legacyAppAccess:true,subscriptionStatus:null,purchasedAt:"2026-01-15T00:00:00Z"}}));
  await signedIn(page);
  await page.goto("/billing?interval=month");
  await expect(page.getByRole("heading",{name:"Legacy app access",exact:true})).toBeVisible();
  await expect(page.getByText("Access granted",{exact:true})).toBeVisible();
  await expect(page.getByText(/3 sample replies left/)).toBeVisible();
  await expect(page.getByText(/No recurring subscription is verified/)).toBeVisible();
  await expect(page.getByRole("button",{name:"Manage Subscription",exact:true})).toHaveCount(0);
  await expect(page.getByText("Active",{exact:true})).toHaveCount(0);
  await expect(page.getByRole("link",{name:"Set up my provider"})).toHaveCount(0);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  const screenshot=`docs/screenshots/release-2026-10-21/billing-legacy-${info.project.name}.png`;
  await page.screenshot({path:screenshot,fullPage:true});
  await info.attach("legacy-billing",{path:screenshot,contentType:"image/png"});
});
