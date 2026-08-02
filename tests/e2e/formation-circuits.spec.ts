import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/formation/today");
  await expect(page.getByRole("heading", { name: "Practice what you can control." })).toBeVisible();
});

test("shows five distinct circuit experiences across track policies", async ({ page }) => {
  await expect(page.getByRole("heading", { name: "Daily circuits" })).toBeVisible();
  for (const circuit of ["Awareness", "Perspective", "Habit", "Wellness", "Environment"]) {
    await expect(page.getByRole("button", { name: `Open ${circuit}` })).toBeVisible();
  }

  await page.getByRole("button", { name: /Fully Charged: 75 Days/ }).click();
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

test("keeps prayer private and allows partial 40-Day progress", async ({ page }) => {
  await page.getByRole("button", { name: /40-Day Charge/ }).click();
  await page.getByRole("button", { name: "Open Perspective" }).click();
  await expect(page.getByText("Prayer text is never required")).toBeVisible();

  await page.getByRole("button", { name: /^Prayer/ }).click();
  await page.getByLabel("One concrete gratitude").fill("A quiet morning.");
  await page.getByRole("button", { name: /Save progress/ }).click();
  await expect(page.getByText("Practice recorded").first()).toBeVisible();
  await expect(page.getByText(/Partial progress remains honest progress/)).toBeVisible();
});

test("does not complete a promise from optional photo proof and supports deletion", async ({ page }) => {
  await page.getByRole("button", { name: /Fully Charged: 75 Days/ }).click();
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
