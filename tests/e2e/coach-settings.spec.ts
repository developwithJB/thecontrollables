import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test.beforeEach(async ({ page }) => {
  // Fixture has no reason to contact any remote service.
  await page.route(/^https?:\/\/(?!127\.0\.0\.1:8094)/, (route) =>
    route.abort(),
  );
});
test("requires client visibility and independent server availability", async ({
  page,
}) => {
  for (const flag of ["off", "serverOff"]) {
    await page.goto(`/tests/fixtures/coach-settings.html?${flag}`);
    await expect(
      page.getByText("Local QA — mocked settings only"),
    ).toBeVisible();
    await expect(
      page.getByRole("region", { name: "Coach settings" }),
    ).toHaveCount(0);
  }
});
test("writes, masks, changes preferences and removes a BYO key", async ({
  page,
}) => {
  await page.goto("/tests/fixtures/coach-settings.html");
  const card = page.getByRole("region", { name: "Coach settings" });
  await expect(card).toBeVisible();
  await page.getByLabel("Model ID").fill("test-model");
  await page.getByLabel("New API key").fill("synthetic-ui-key-1234");
  await page.getByRole("button", { name: "Save provider key" }).click();
  await expect(card).toContainText("OpenAI · key ending 1234");
  await expect(page.getByLabel("New API key")).toHaveValue("");
  await expect(card).not.toContainText("synthetic-ui-key");
  expect(
    await page.evaluate(() => JSON.stringify({ ...localStorage })),
  ).not.toContain("synthetic-ui-key");
  await page.getByLabel("Tone", { exact: true }).selectOption("warm");
  await page.getByLabel("Depth", { exact: true }).selectOption("concise");
  await page.getByRole("button", { name: "Save preferences" }).click();
  await expect(card.getByRole("status")).toHaveText("Saved.");
  const accessibility = await new AxeBuilder({ page })
    .include("main")
    .analyze();
  expect(
    accessibility.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical",
    ),
  ).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `artifacts/sequence-preview/d-${test.info().project.name}.png`,
    fullPage: true,
  });
  await page
    .getByLabel("Provider", { exact: true })
    .selectOption("https://api.anthropic.com");
  await page.getByLabel("Model ID").fill("different-provider-model");
  await page.getByRole("button", { name: "Save preferences" }).click();
  await expect(card.getByRole("status")).toHaveText("Saved.");
  await expect(card).toContainText("Current model: test-model");
  await page.getByRole("button", { name: "Remove key" }).click();
  await expect(card).toContainText("Existing app coach · no personal key");
});
test("clears the write-only input after a failed save without echoing it", async ({
  page,
}) => {
  await page.goto("/tests/fixtures/coach-settings.html?fail");
  await page.getByLabel("Model ID").fill("test-model");
  await page.getByLabel("New API key").fill("synthetic-ui-key-1234");
  await page.getByRole("button", { name: "Save provider key" }).click();
  await expect(page.getByRole("status")).toHaveText(
    "Could not save. Please try again.",
  );
  await expect(page.getByLabel("New API key")).toHaveValue("");
});

test("hosted coach stays hidden with either rollout switch off", async ({
  page,
}) => {
  for (const query of ["hosted&off", "hosted&serverOff"]) {
    await page.goto(`/tests/fixtures/coach-settings.html?${query}`);
    await expect(
      page.getByText("Local QA — mocked settings only"),
    ).toBeVisible();
    await expect(
      page.getByRole("region", { name: "Hosted coach", exact: true }),
    ).toHaveCount(0);
  }
});
test("free and Plus see only the existing billing upgrade link, with no TBD price", async ({
  page,
}) => {
  for (const tier of ["free", "plus"]) {
    await page.goto(`/tests/fixtures/coach-settings.html?hosted&tier=${tier}`);
    const card = page.getByRole("region", {
      name: "Hosted coach",
      exact: true,
    });
    await expect(card).toBeVisible();
    await expect(card).not.toContainText("TBD");
    await expect(
      card.getByRole("link", { name: "Explore Pro" }),
    ).toHaveAttribute("href", "/billing");
    await expect(
      card.getByRole("button", { name: "Use Pro coach" }),
    ).toHaveCount(0);
  }
});
test("Pro can select and deselect hosted coaching without entering a key", async ({
  page,
}) => {
  await page.goto("/tests/fixtures/coach-settings.html?hosted&tier=pro");
  const card = page.getByRole("region", { name: "Hosted coach", exact: true });
  await expect(card).toContainText("Included with Pro");
  await expect(card).not.toContainText("TBD");
  await card.getByRole("button", { name: "Use Pro coach" }).click();
  await expect(card).toContainText("Hosted coach selected.");
  await expect(
    card.getByRole("button", { name: "Use Pro coach" }),
  ).toBeDisabled();
  const accessibility = await new AxeBuilder({ page })
    .include("main")
    .analyze();
  expect(
    accessibility.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical",
    ),
  ).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `artifacts/sequence-preview/e-${test.info().project.name}.png`,
    fullPage: true,
  });
  await card.getByRole("button", { name: "Use previous coach" }).click();
  await expect(
    card.getByRole("button", { name: "Use Pro coach" }),
  ).toBeEnabled();
});
