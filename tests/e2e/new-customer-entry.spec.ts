import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("landing states the value, guardrails, and next action", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Become someone whose yes can be trusted." })).toBeVisible();
  await expect(page.getByText("Private by default").first()).toBeVisible();
  await expect(page.getByText("No public rankings").first()).toBeVisible();
  await expect(page.getByText("Recovery without shame").first()).toBeVisible();
  await expect(page.getByText("Movement can adapt")).toBeVisible();

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
  await page.getByRole("button", { name: /40-Day Charge/ }).click();
  await expect(page.getByText("Bring my path to my inbox.")).toBeVisible();
  await expect(page.getByRole("switch", { name: "Daily formation email" })).toBeChecked();
  await page.getByRole("button", { name: "Review my first day" }).click();

  await expect(page.getByRole("heading", { name: "40-Day Charge" })).toBeVisible();
  await expect(page.getByText("Morning email on")).toBeVisible();
  await page.getByRole("link", { name: /Create account & start my daily loop/ }).click();

  await expect(page).toHaveURL(/\/auth\?mode=signup$/);
  await expect(page.getByText("Your 40-Day Charge path is ready.")).toBeVisible();
  await expect(page.getByText("Your morning formation email is on.")).toBeVisible();
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
  await expect(page.getByText("Start with Read Along, our flexible path.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Compare all three paths" })).toHaveAttribute("href", "/quick-start");
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
    "/proof",
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
    await page.goto(route);
    const expectedRoute = canonicalRoutes[route] ?? route;
    const expected = `/auth?returnTo=${encodeURIComponent(expectedRoute)}`;
    await expect(page, `direct entry ${route}`).toHaveURL(new RegExp(`${expected.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`));
  }
});
