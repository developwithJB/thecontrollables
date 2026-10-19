import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

async function startStrictAttempt(page: Page) {
  await page.getByRole("button", { name: /Fully Charged: 75 Days/ }).click();
  const startPanel = page.getByTestId("fully-charged-start-panel");
  await expect(startPanel).toBeVisible();
  await startPanel.getByLabel("Main Promise", { exact: true }).fill("Practice one honest promise each day.");
  for (const checkbox of await startPanel.getByRole("checkbox").all()) await checkbox.check();
  await startPanel.getByRole("button", { name: "Start Fully Charged" }).click();
  await expect(page.getByTestId("fully-charged-journey-panel")).toContainText("Day 1 of 75");
}

test.beforeEach(async ({ page }) => {
  await page.goto("/formation/today");
  await expect(page.getByRole("heading", { name: "Practice what you can control." })).toBeVisible();
});

test("shows five distinct circuit experiences across track policies", async ({ page }) => {
  await expect(page.getByRole("heading", { name: "Daily circuits" })).toBeVisible();
  for (const circuit of ["Awareness", "Perspective", "Habit", "Wellness", "Environment"]) {
    await expect(page.getByRole("button", { name: `Open ${circuit}` })).toBeVisible();
  }

  await startStrictAttempt(page);
  await page.getByRole("button", { name: "Open Awareness" }).click();
  await expect(page.getByText("Still open today")).toBeVisible();
  await expect(page.getByText("Scripture opened", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: /Scripture before the phone/ }).click();
  await page.getByRole("button", { name: /Formation or book reading/ }).click();
  await page.getByLabel("One honest truth").fill("I need to receive the text before reacting to the day.");
  await page.getByRole("button", { name: /Save progress/ }).click();
  await expect(page.getByText("Circuit complete").first()).toBeVisible();

  await page.getByRole("button", { name: /Return to Today/ }).first().click();
  await expect(page.getByRole("button", { name: "Open Awareness" })).toBeVisible();
});

test("keeps prayer private and allows partial Read Along progress", async ({ page }) => {
  await expect(page.getByRole("button", { name: /40-Day Charge/ })).toBeDisabled();
  await page.getByRole("button", { name: /Read Along One meaningful/ }).click();
  await page.getByRole("button", { name: "Open Perspective" }).click();
  await expect(page.getByText("Prayer text is never required")).toBeVisible();

  await page.getByRole("button", { name: /^Prayer/ }).click();
  await page.getByLabel("One concrete gratitude").fill("A quiet morning.");
  await page.getByRole("button", { name: /Save progress/ }).click();
  await expect(page.getByText("Practice recorded").first()).toBeVisible();
  await expect(page.getByText(/saved this practice without creating a streak or deadline/)).toBeVisible();
});

test("does not complete a promise from optional photo proof and supports deletion", async ({ page }) => {
  await startStrictAttempt(page);
  await page.getByRole("button", { name: "Open Habit" }).click();
  await page.getByLabel("One Main Promise").fill("Send the message I promised to send.");

  const onePixelPng = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2n7sAAAAASUVORK5CYII=",
    "base64",
  );
  await page.locator('input[type="file"]').setInputFiles({ name: "proof.png", mimeType: "image/png", buffer: onePixelPng });
  await expect(page.getByText("Private to your account")).toBeVisible();
  await expect(page.getByText("Promise completed", { exact: true })).toBeVisible();
  await expect(page.getByText("Circuit complete", { exact: true })).toHaveCount(0);

  await page.getByRole("button", { name: /Delete photo/ }).click();
  await expect(page.getByText("Choose a photo")).toBeVisible();
});

test("allows a user to cancel a scheduled strict attempt before Day 1", async ({ page }) => {
  await page.getByRole("button", { name: /Fully Charged: 75 Days/ }).click();
  const startPanel = page.getByTestId("fully-charged-start-panel");
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  await startPanel.getByLabel("Start date").fill(tomorrow);
  await startPanel.getByLabel("Main Promise", { exact: true }).fill("Practice one honest promise each day.");
  for (const checkbox of await startPanel.getByRole("checkbox").all()) await checkbox.check();
  await startPanel.getByRole("button", { name: "Start Fully Charged" }).click();

  const journeyPanel = page.getByTestId("fully-charged-journey-panel");
  await expect(journeyPanel).toContainText(`scheduled for ${tomorrow}`);
  page.once("dialog", (dialog) => dialog.accept());
  await journeyPanel.getByRole("button", { name: "Cancel scheduled attempt" }).click();
  await expect(page.getByTestId("fully-charged-start-panel")).toBeVisible();
});

test("has no serious automated accessibility violations and supports keyboard entry", async ({ page }) => {
  const results = await new AxeBuilder({ page }).include("main").analyze();
  const serious = results.violations.filter((violation) => violation.impact === "serious" || violation.impact === "critical");
  expect(serious).toEqual([]);

  await page.keyboard.press("Tab");
  await expect(page.locator(":focus")).toBeVisible();
  await page.getByRole("button", { name: "Open Wellness" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Wellness" })).toBeVisible();
  await expect(page.getByText("Safe adapted movement is legitimate movement.")).toBeVisible();
  await expect(page.getByLabel("Movement type or adaptation").first()).toBeVisible();
});

test("keeps private completion reflection out of the share preview and downloads separate records", async ({ page }) => {
  await page.getByRole("button", { name: /Preview completion/ }).click();
  await expect(page.getByRole("heading", { name: "A reading milestone worth remembering." })).toBeVisible();
  await expect(page.getByText("Test preview only.")).toBeVisible();

  const privateAnswer = "This private relationship reflection must never enter the share asset.";
  await page.getByLabel("What changed in your relationship with Jesus?").fill(privateAnswer);
  await page.getByRole("button", { name: "Include a non-private quote I select" }).click();
  await page.getByLabel("Public quote").fill("Faithfulness practiced one honest day at a time.");

  const sharePreview = page.getByLabel("Share milestone preview");
  await expect(sharePreview).toContainText("Faithfulness practiced one honest day at a time.");
  await expect(sharePreview).not.toContainText(privateAnswer);

  const privateDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: /Download private record/ }).click();
  await expect((await privateDownload).suggestedFilename()).toMatch(/private-completion.*\.json$/);

  const milestoneDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: /Download share-safe milestone/ }).click();
  await expect((await milestoneDownload).suggestedFilename()).toMatch(/milestone.*\.svg$/);

  const results = await new AxeBuilder({ page }).include("main").analyze();
  expect(results.violations.filter((violation) => violation.impact === "serious" || violation.impact === "critical")).toEqual([]);
});

test("locks the chosen Sabbath weekday and records the rest-day minimum", async ({ page }) => {
  await page.getByRole("button", { name: /Fully Charged: 75 Days/ }).click();
  const startPanel = page.getByTestId("fully-charged-start-panel");
  const weekday = await page.evaluate(() => new Date().getDay());
  await startPanel.getByLabel("Weekly Sabbath weekday").selectOption(String(weekday));
  await startPanel.getByLabel("Main Promise", { exact: true }).fill("Keep one promise.");
  for (const checkbox of await startPanel.getByRole("checkbox").all()) await checkbox.check();
  await startPanel.getByRole("button", { name: "Start Fully Charged" }).click();
  await expect(page.getByTestId("fully-charged-journey-panel")).toContainText("(locked) · today");
  await page.getByRole("button", { name: "Open Wellness" }).click();
  await expect(page.getByText("Rest is obedience, not a loophole.", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: /I honored this personal nutrition covenant/ }).click();
  await page.getByRole("button", { name: /I honored this personal hydration covenant/ }).click();
  await page.getByLabel("Rest or a gentle walk", { exact: true }).fill("Quiet rest and a gentle walk.");
  await page.getByRole("button", { name: /Rest or walk completed/ }).click();
  await page.getByRole("button", { name: /Save progress/ }).click();
  await expect(page.getByText("Circuit complete").first()).toBeVisible();
  await expect(page.getByLabel("Movement type or adaptation")).toHaveCount(0);
  await page.screenshot({ path: `artifacts/sequence-preview/c-${test.info().project.name}.png`, fullPage: true });
  await page.getByRole("button", { name: /Return to Today/ }).first().click();
  const wellnessCard = page.getByRole("button", { name: "Open Wellness" }).locator("..");
  await expect(wellnessCard).toContainText("Circuit complete");
});
