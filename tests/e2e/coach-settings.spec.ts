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
