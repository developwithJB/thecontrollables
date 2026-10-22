import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
const id = "00000000-0000-4000-8000-000000000098";
const user = {
  id,
  email: "launch-qa@example.test",
  aud: "authenticated",
  role: "authenticated",
  email_confirmed_at: "2026-10-21T12:00:00Z",
  created_at: "2026-10-21T12:00:00Z",
  user_metadata: {},
  app_metadata: { provider: "email" },
};
const headers = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "*",
  "access-control-allow-methods": "POST,GET,OPTIONS",
};
const free = {
  enabled: true,
  plan: "free",
  repliesRemaining: 5,
  dailyRemaining: 5,
  budgetPercentRemaining: 100,
  resetsAt: null,
  byoActive: false,
  byoRemaining: 100,
};
function session() {
  const exp = Math.floor(Date.now() / 1000) + 365 * 86400;
  const token = [
    { alg: "HS256", typ: "JWT" },
    { sub: id, exp, role: "authenticated" },
    "synthetic",
  ]
    .map((v) =>
      Buffer.from(typeof v === "string" ? v : JSON.stringify(v)).toString(
        "base64url",
      ),
    )
    .join(".");
  return {
    user,
    access_token: token,
    refresh_token: "synthetic-local-only",
    expires_at: exp,
    expires_in: 365 * 86400,
    token_type: "bearer",
  };
}
function record(
  date: string,
  circuit = "awareness",
  action = "scripture_opened",
) {
  return {
    id: `${date}-${circuit}`,
    user_id: id,
    local_date: date,
    track: "read_along",
    circuit_type: circuit,
    rule_version: "formation-circuits-v1",
    completion_state: "recorded",
    completed_action_ids: [action],
    missing_required_action_ids: [],
    payload: {
      actions: { [action]: true },
      fields: { honestTruth: "PRIVATE_SYNTHETIC_REFLECTION" },
    },
    idempotency_key: `${date}-${circuit}`,
    created_at: `${date}T19:00:00Z`,
    updated_at: `${date}T19:00:00Z`,
    completed_at: `${date}T19:00:00Z`,
    content_version_id: null,
  };
}
async function harness(
  page: Page,
  options: { exhausted?: boolean; paid?: boolean } = {},
) {
  const events: Record<string, unknown>[] = [];
  const rows = [
    record("2026-10-21"),
    ...["awareness", "perspective", "habit", "wellness", "environment"].map(
      (c, i) =>
        record(
          "2026-10-27",
          c,
          [
            "scripture_opened",
            "prayer_practiced",
            "main_promise_completed",
            "sleep_preparation",
            "service_completed",
          ][i],
        ),
    ),
  ];
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (["localhost", "127.0.0.1"].includes(url.hostname))
      return route.continue();
    if (!url.hostname.endsWith(".supabase.co")) return route.abort();
    if (route.request().method() === "OPTIONS")
      return route.fulfill({ headers, body: "" });
    let data: unknown = [];
    if (url.pathname.includes("/auth/v1/token")) data = session();
    else if (url.pathname.includes("/auth/v1/user")) data = user;
    else if (url.pathname.includes("get_formation_entry_status"))
      data = {
        strictReady: false,
        reviewedDays: 0,
        emailDeliveryReady: false,
        sample: null,
      };
    else if (url.pathname.includes("check-payment"))
      data = {
        isPaid: options.paid === true,
        plan_tier: options.paid ? "pro" : null,
      };
    else if (url.pathname.includes("get_hosted_ai_allowance"))
      data = {
        ...free,
        ...(options.exhausted
          ? { repliesRemaining: 0, dailyRemaining: 0 }
          : {}),
        ...(options.paid
          ? { plan: "pro", repliesRemaining: 190, dailyRemaining: 9 }
          : {}),
      };
    else if (url.pathname.includes("coach_providers_available")) data = true;
    else if (url.pathname.includes("get_hosted_coach_status"))
      data = {
        enabled: true,
        entitled: options.paid === true,
        selected: false,
      };
    else if (url.pathname.includes("coach_provider_settings")) data = null;
    else if (url.pathname.includes("formation_circuit_entries")) data = rows;
    else if (url.pathname.includes("/rest/v1/profiles"))
      data = { formation_track: "read_along" };
    else if (url.pathname.includes("ingest-telemetry")) {
      events.push(route.request().postDataJSON());
      data = { accepted: true };
    }
    return route.fulfill({ headers, json: data });
  });
  return events;
}
async function signedIn(page: Page) {
  await page.goto("/pricing");
  await page.evaluate(async (session) => {
    const path = "/src/integrations/supabase/client.ts";
    const { supabase } = await import(path);
    const { error } = await supabase.auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    });
    if (error) throw error;
  }, session());
}
async function noOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
}

async function captureOffer(page: Page, testId: string, filename: string) {
  const offer = page.getByTestId(testId);
  await expect
    .poll(() =>
      offer.evaluate((element) => {
        let opacity = 1;
        for (
          let node: Element | null = element;
          node;
          node = node.parentElement
        )
          opacity *= Number(getComputedStyle(node).opacity);
        return opacity;
      }),
    )
    .toBe(1);
  await offer.evaluate((element) =>
    element.scrollIntoView({ block: "center" }),
  );
  await offer.screenshot({
    path: `output/launch-funnel/${test.info().project.name}-${filename}.png`,
  });
}

test("anonymous growth never sends the public API key as a user session token", async ({
  page,
}) => {
  await harness(page);
  const landingRequest = page.waitForRequest(
    (request) =>
      request.url().includes("/functions/v1/ingest-telemetry") &&
      request.method() === "POST" &&
      request.postDataJSON()?.payload?.event_name === "landing_view",
  );
  await page.goto("/start?utm_source=qa&utm_campaign=anonymous_transport");
  const request = await landingRequest;
  expect((request.headers().authorization || "").trim()).toBe("");
  expect(request.headers().apikey).toBeTruthy();
  await expect(page).toHaveURL(/\/quick-start\?path=read_along/);
});

test("bio campaign survives the full public onboarding path into signup metadata", async ({
  page,
}) => {
  const events = await harness(page);
  await page.goto(
    "/start?utm_source=instagram&utm_campaign=first100&utm_content=episode01&returnTo=https://evil.invalid",
  );
  await expect(page).toHaveURL(/\/quick-start\?path=read_along/);
  await page.getByRole("button", { name: /Reading now/ }).click();
  await page.getByRole("button", { name: "Choose my formation path" }).click();
  await page.getByRole("button", { name: "Review my first day" }).click();
  await page
    .getByRole("link", { name: /Create account & start my daily loop/ })
    .click();
  await expect(page.locator("#password-help")).toContainText(
    "at least 8 characters",
  );
  await expect(page.getByTestId("auth-password-input")).toHaveAttribute(
    "minlength",
    "8",
  );
  const attribution = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("growth_first_touch")!),
  );
  expect(attribution).toMatchObject({
    utm_source: "instagram",
    utm_campaign: "first100",
    utm_content: "episode01",
    landing_path: "/start",
  });
  expect(JSON.stringify(attribution)).not.toContain("evil.invalid");
  await expect
    .poll(() =>
      events.some(
        (e) =>
          (e.payload as Record<string, unknown>)?.event_name === "landing_view",
      ),
    )
    .toBe(true);
  await page.screenshot({
    path: `output/launch-funnel/${test.info().project.name}-signup.png`,
    fullPage: true,
  });
  await noOverflow(page);
  let signupBody: Record<string, unknown> | undefined;
  await page.route("**/auth/v1/signup**", (route) => {
    if (route.request().method() === "OPTIONS")
      return route.fulfill({ headers, body: "" });
    signupBody = route.request().postDataJSON();
    return route.fulfill({ headers, json: { user, session: null } });
  });
  await page.reload();
  await page.getByTestId("auth-name-input").fill("Synthetic QA");
  await page.getByTestId("auth-email-input").fill("synthetic@example.test");
  await page.getByTestId("auth-password-input").fill("synthetic-only-password");
  await page.getByTestId("auth-submit-button").click();
  await expect(page.getByTestId("signup-confirmation")).toBeVisible();
  expect(signupBody?.data).toMatchObject({
    signup_source: "instagram",
    signup_campaign: "first100",
    signup_landing_path: "/start",
    signup_last_source: "instagram",
    signup_last_campaign: "first100",
    formation_track: "read_along",
  });
  await expect
    .poll(() =>
      events.some(
        (e) =>
          (e.payload as Record<string, unknown>)?.event_name ===
          "signup_submitted",
      ),
    )
    .toBe(true);
});

test("landing links the owner-supplied social accounts and canonical book destination", async ({
  page,
}) => {
  await harness(page);
  await page.goto("/");
  await expect(
    page.getByRole("link", { name: "@thecontrollables", exact: true }),
  ).toHaveAttribute("href", "https://www.instagram.com/thecontrollables/");
  await expect(
    page.getByRole("link", { name: "YouTube · @thcontrollables", exact: true }),
  ).toHaveAttribute("href", "https://www.youtube.com/@thcontrollables");
  await expect(
    page.getByRole("link", { name: "X · @developwithjb", exact: true }),
  ).toHaveAttribute("href", "https://x.com/developwithjb");
  await expect(
    page.locator(
      'a[href*="x.com/thcontrollables"], a[href*="x.com/thecontrollables"]',
    ),
  ).toHaveCount(0);
  await expect(
    page.locator('[data-book-placement="landing_hero"]'),
  ).toHaveAttribute("href", "https://a.co/d/1DGPGEV");
  await page
    .getByRole("link", { name: "X · @developwithjb", exact: true })
    .scrollIntoViewIfNeeded();
  await page.screenshot({
    path: `output/launch-funnel/${test.info().project.name}-social-footer.png`,
  });
  await noOverflow(page);
});

test("an exhausted sample presents Pro, BYO and a working free exit without inference", async ({
  page,
}) => {
  const events = await harness(page, { exhausted: true });
  let aiCalls = 0;
  await page.route("**/functions/v1/ai-chat", (route) => {
    aiCalls++;
    return route.abort();
  });
  await signedIn(page);
  await page.goto("/coach");
  const offer = page.getByTestId("pro-offer-sample_exhausted");
  await expect(offer).toBeVisible();
  await expect(offer).toContainText("$14.99/month or $119.99/year");
  await expect(offer).toContainText("does not reset");
  await expect(
    offer.getByRole("link", { name: "See Pro plans" }),
  ).toHaveAttribute("href", "/pricing");
  await captureOffer(page, "pro-offer-sample_exhausted", "sample-offer");
  const axe = await new AxeBuilder({ page })
    .include('[data-testid="pro-offer-sample_exhausted"]')
    .analyze();
  expect(
    axe.violations.filter((v) =>
      ["critical", "serious"].includes(v.impact ?? ""),
    ),
  ).toEqual([]);
  await offer.getByRole("button", { name: "Keep practicing free" }).click();
  await expect(offer).toHaveCount(0);
  await page.getByRole("link", { name: "Back to Today" }).click();
  await expect(
    page.getByRole("heading", { name: "Practice what you can control." }),
  ).toBeVisible();
  expect(aiCalls).toBe(0);
  expect(JSON.stringify(events)).not.toContain("PRIVATE_SYNTHETIC_REFLECTION");
  await noOverflow(page);
});

test("day-seven review shows a free-account offer and sends a private-data-free return event", async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date("2026-10-27T19:00:00Z"));
  const events = await harness(page);
  await signedIn(page);
  await page.goto("/formation/today");
  await expect(page.getByTestId("week-one-review")).toBeVisible();
  await expect(page.getByTestId("pro-offer-day7_review")).toBeVisible();
  await expect
    .poll(
      () =>
        events.filter(
          (e) =>
            (e.payload as Record<string, unknown>)?.event_name ===
            "day7_return",
        ).length,
    )
    .toBe(1);
  await page.reload();
  await expect(page.getByTestId("pro-offer-day7_review")).toBeVisible();
  expect(
    events.filter(
      (e) =>
        (e.payload as Record<string, unknown>)?.event_name === "day7_return",
    ),
  ).toHaveLength(1);
  expect(JSON.stringify(events)).not.toContain("PRIVATE_SYNTHETIC_REFLECTION");
  await captureOffer(page, "pro-offer-day7_review", "day7");
  await noOverflow(page);
});

test("paid customers do not receive either free-account offer", async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date("2026-10-27T19:00:00Z"));
  await harness(page, { paid: true });
  await signedIn(page);
  await page.goto("/formation/today");
  await expect(page.getByTestId("week-one-review")).toBeVisible();
  await expect(page.getByTestId("pro-offer-day7_review")).toHaveCount(0);
  await page.goto("/coach");
  await expect(
    page.getByRole("heading", { name: "Your AI allowance" }),
  ).toBeVisible();
  await expect(page.getByTestId("pro-offer-sample_exhausted")).toHaveCount(0);
});

test("checkout records request and URL-return events before a local navigation", async ({
  page,
}) => {
  const events = await harness(page);
  await signedIn(page);
  await page.route("**/functions/v1/create-checkout", (route) =>
    route.request().method() === "OPTIONS"
      ? route.fulfill({ headers, body: "" })
      : route.fulfill({
          headers,
          json: {
            url: "http://127.0.0.1:8092/__synthetic-checkout",
            plan_tier: "pro",
          },
        }),
  );
  await page.route("http://127.0.0.1:8092/__synthetic-checkout", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: "<h1>Local checkout stub</h1>",
    }),
  );
  await page.goto("/billing?interval=month");
  await page.getByRole("button", { name: "Choose Pro — monthly" }).click();
  await expect(page).toHaveURL(/__synthetic-checkout/);
  for (const name of ["checkout_requested", "checkout_opened"])
    expect(
      events.some(
        (e) => (e.payload as Record<string, unknown>)?.event_name === name,
      ),
    ).toBe(true);
  expect(
    events.some(
      (e) =>
        (e.payload as Record<string, unknown>)?.event_name ===
        "checkout_completed",
    ),
  ).toBe(false);
});

test("legacy app access with an exhausted hosted sample is not offered another subscription", async ({
  page,
}) => {
  await harness(page, { exhausted: true });
  await page.route("**/functions/v1/check-payment", (route) =>
    route.fulfill({
      headers,
      json: {
        isPaid: true,
        plan_tier: "pro",
        legacyAppAccess: true,
        subscriptionStatus: null,
      },
    }),
  );
  await signedIn(page);
  await page.goto("/coach");
  await expect(
    page.getByRole("heading", { name: "Your AI allowance" }),
  ).toBeVisible();
  await expect(
    page.getByText("0 sample replies left on this account", { exact: false }),
  ).toBeVisible();
  await expect(page.getByTestId("pro-offer-sample_exhausted")).toHaveCount(0);
});
