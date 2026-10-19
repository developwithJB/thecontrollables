import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route("https://*.supabase.co/**", route => route.fulfill({ status: 200, json: [] }));
  await page.route("**/rest/v1/rpc/get_formation_entry_status", route => route.fulfill({ headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "POST, OPTIONS" }, json: { strictReady: true, reviewedDays: 75, emailDeliveryReady: false, sample: null } }));
});

test("landing states the value, guardrails, and next action", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Become someone whose yes can be trusted." })).toBeVisible();
  await expect(page.getByText("Private by default").first()).toBeVisible();
  await expect(page.getByText("No public rankings").first()).toBeVisible();
  await expect(page.getByText("Recovery without shame").first()).toBeVisible();
  await expect(page.getByText("Movement can adapt")).toBeVisible();

  const roadmap = page.getByTestId("fully-charged-75-graphic");
  await expect(roadmap).toBeVisible();
  await page.getByRole("button", { name: "Explore all 75 days" }).click();
  const seasonThree = page.locator("details").filter({ hasText: "Days 51–75" }).first();
  await seasonThree.locator("summary").first().click();
  const day75 = seasonThree.locator("details").filter({ hasText: "Day 75" }).first();
  await expect(day75.getByText("Close with gratitude")).toBeVisible();
  await day75.locator("summary").click();
  await expect(day75.getByText(/Complete the final day honestly/)).toBeVisible();

  const results = await new AxeBuilder({ page }).include("main").analyze();
  expect(results.violations.filter((violation) => violation.impact === "serious" || violation.impact === "critical")).toEqual([]);

  await page.getByTestId("cta-get-started").click();
  await expect(page).toHaveURL(/\/quick-start\?path=fully_charged_75$/);
  await expect(page.getByRole("heading", { name: "Where are you with the book?" })).toBeVisible();
});

test("book context and path choice survive into account creation", async ({ page }) => {
  await page.goto("/quick-start");

  await page.getByRole("button", { name: /Reading now/ }).click();
  await page.getByRole("button", { name: "Choose my formation path" }).click();
  await expect(page.getByRole("heading", { name: "How deeply do you want to train right now?" })).toBeVisible();
  await expect(page.getByText("40-Day Charge is coming soon and cannot be started.")).toBeVisible();
  await page.getByRole("button", { name: /^Read Along/ }).click();
  await expect(page.getByText("Bring my path to my inbox.")).toBeVisible();
  await expect(page.getByRole("switch", { name: "Daily formation email" })).not.toBeChecked();
  await page.getByRole("switch", { name: "Daily formation email" }).click();
  await page.getByRole("button", { name: "Review my first day" }).click();

  await expect(page.getByRole("heading", { name: "Read Along" })).toBeVisible();
  await expect(page.getByText("Morning email requested")).toBeVisible();
  await page.getByRole("link", { name: /Create account & start my daily loop/ }).click();

  await expect(page).toHaveURL(/\/auth\?mode=signup$/);
  await expect(page.getByText("Your Read Along path is selected.")).toBeVisible();
  await expect(page.getByText("Morning email requested · not active yet.")).toBeVisible();
  await expect(page.getByTestId("auth-form")).toBeVisible();
  await expect(page.getByTestId("auth-submit-button")).toHaveText("Create account & start my daily loop");
});

test("strict path requires an explicit informed choice", async ({ page }) => {
  await page.goto("/quick-start?path=fully_charged_75");

  await page.getByRole("button", { name: /Finished it/ }).click();
  await page.getByRole("button", { name: "Choose my formation path" }).click();
  const review = page.getByRole("button", { name: "Review my first day" });
  await expect(review).toBeDisabled();
  await expect(page.getByText("An incomplete day ends that attempt; its history remains intact.")).toBeVisible();

  await page.getByLabel("I understand this is the strict path.").check();
  await expect(review).toBeEnabled();
});

test("protected entry points preserve where a returning user intended to go", async ({ page }) => {
  await page.goto("/formation/today");

  await expect(page).toHaveURL(/\/auth\?returnTo=%2Fformation%2Ftoday$/);
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  await expect(page.getByText("Sign in to continue where you left off.")).toBeVisible();
});

test("direct account, recovery, and unknown-link entries explain the next move", async ({ page }) => {
  await page.goto("/auth?mode=signup");
  await expect(page.getByRole("heading", { name: "Create your account" })).toBeVisible();
  await expect(page.getByText("Choose Fully Charged for a strict commitment")).toBeVisible();
  await expect(page.getByRole("link", { name: "Compare Fully Charged and Read Along" })).toHaveAttribute("href", "/quick-start");
  await expect(page.getByRole("link", { name: "Privacy" })).toHaveAttribute("href", "/privacy");
  await expect(page.getByRole("link", { name: "Terms" })).toHaveAttribute("href", "/terms");
  await expect(page.getByTestId("auth-submit-button")).toHaveText("Create account & start my daily loop");

  await page.goto("/auth?mode=forgot");
  await expect(page.getByRole("heading", { name: "Reset your password" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Send Reset Link" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Back to sign in" })).toBeVisible();

  await page.goto("/this-customer-link-does-not-exist");
  await expect(page.getByRole("heading", { name: "404" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Return to Home" })).toHaveAttribute("href", "/");
});

test("every customer-facing protected entry returns through sign-in", async ({ page }) => {
  test.setTimeout(60_000);
  const protectedRoutes = [
    "/home",
    "/formation/today",
    "/formation/today/awareness",
    "/formation/completion",
    "/timeline",
    "/read-along",
    "/goal",
    "/my-controllables",
    "/train",
    "/evidence",
    "/proof/dex",
    "/dex",
    "/wellness",
    "/planner",
    "/growth",
    "/reflect",
    "/wealth",
    "/reset?mode=review",
    "/billing",
    "/integrations",
    "/admin",
  ];

  const canonicalRoutes: Record<string, string> = {
    "/proof": "/evidence",
  };

  for (const route of protectedRoutes) {
    // Fully unmount the previous route before starting another direct-entry test.
    await page.goto("about:blank");
    await page.goto(route);
    const expectedRoute = canonicalRoutes[route] ?? route;
    const expected = `/auth?returnTo=${encodeURIComponent(expectedRoute)}`;
    await expect(page, `direct entry ${route}`).toHaveURL(new RegExp(`${expected.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`));
  }

  const legacyRedirects = new Map([
    ["/proof", "/evidence"],
  ]);

  for (const [legacyRoute, currentRoute] of legacyRedirects) {
    await page.goto(legacyRoute);
    const expected = `/auth?returnTo=${encodeURIComponent(currentRoute)}`;
    await expect(page, `legacy entry ${legacyRoute}`).toHaveURL(new RegExp(`${expected.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`));
  }
});

test("unavailable strict content offers Read Along before creating an account", async ({ page }) => {
  await page.route("**/rest/v1/rpc/get_formation_entry_status", route => route.fulfill({ headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "POST, OPTIONS" }, json: { strictReady: false, reviewedDays: 0, emailDeliveryReady: false, sample: null } }));
  await page.goto("/quick-start?path=fully_charged_75");
  await page.getByRole("button", { name: /Finished it/ }).click();
  await page.getByRole("button", { name: "Choose my formation path" }).click();
  await expect(page.getByTestId("formation-availability")).toContainText("Not open for new starts yet");
  await page.getByLabel("I understand this is the strict path.").check();
  await expect(page.getByRole("button", { name: "Review my first day" })).toBeDisabled();
  await page.getByRole("button", { name: /^Read Along/ }).click();
  await page.getByRole("button", { name: "Review my first day" }).click();
  const sample = page.getByTestId("scripture-practice");
  await expect(sample.getByRole("link", { name: /Read Matthew/ })).toHaveAttribute("href", "https://www.bible.com/bible/116/MAT.4.18-22");
  await sample.getByLabel("Try one response (optional)").fill("Private sample only");
  await sample.getByRole("button", { name: "Finish sample practice" }).click();
  await expect(sample.getByRole("status")).toContainText("read, notice, respond");
  await page.reload();
  await expect(page.getByLabel("Try one response (optional)")).toHaveValue("");
});
