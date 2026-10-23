import { test, expect } from "@playwright/test";
test.beforeEach(async ({ page }) => {
  await page.route("**/*", route => ["127.0.0.1", "localhost"].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort());
});
test("all five saved practices give a visible close receipt and retain separate rewards", async ({ page }, info) => {
  await page.goto("/formation/today");
  const entries = [
    ["Awareness", "One honest truth", "Synthetic QA: pause before reacting."],
    ["Perspective", "One concrete gratitude", "Synthetic QA: grateful for a quiet start."],
    ["Habit", "One Main Promise", "Synthetic QA: make the call I agreed to and prepare for the next meaningful step.\nKeep the promise small and clear."],
    ["Wellness", "", ""],
    ["Environment", "Remove one source of friction", "Synthetic QA: set out tomorrow's notebook."],
  ];
  for (const [name, label, value] of entries) {
    await page.getByRole("button", { name: `Open ${name}`, exact: true }).click();
    if (label) await page.getByLabel(label, { exact: true }).fill(value);
    else {
      // A private reflection alone is saved but is not a completed practice.
      await page.getByText("Optional private reflection", { exact: true }).click();
      await page.getByLabel("What do you want to remember?", { exact: true }).fill("Synthetic QA: checking the save feedback.");
      await page.getByRole("button", { name: "Save progress", exact: true }).click();
      await expect(page.getByText(/Your notes are saved\. Complete one practice above/)).toBeVisible();
      await page.getByRole("button", { name: /Sleep preparation/ }).click();
    }
    if (name === "Habit") {
      const promise = page.getByLabel(label, { exact: true });
      expect(await promise.evaluate(el => el.tagName)).toBe("TEXTAREA");
      await page.screenshot({ path: `output/qa-second-pass-2026-10-23/${info.project.name}-promise.png`, fullPage: true });
    }
    await page.getByRole("button", { name: "Save progress", exact: true }).click();
    await expect(page.getByText(`${name} is recorded for today.`, { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Return to Today", exact: true }).first().click();
  }
  await page.reload();
  await expect(page.getByRole("progressbar", { name: "5 of 5 circuits recorded", exact: true })).toBeVisible();
  await expect(page.getByTestId("practice-day-receipt")).toContainText("Day complete");
  await page.getByRole("button", { name: "Close today", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Today closed", exact: true })).toBeVisible();
  await expect(page.getByRole("status").filter({ hasText: "Saved on this browser" })).toBeVisible();
  await page.getByTestId("practice-day-receipt").screenshot({ path: `output/qa-second-pass-2026-10-23/${info.project.name}-receipt.png` });
  await page.reload();
  await expect(page.getByRole("heading", { name: "Today closed", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Today acknowledged" })).toBeDisabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  if (info.project.name === "phone") {
    const signout = page.getByRole("button", { name: "Sign Out", exact: true });
    await expect(signout).toBeVisible();
    expect((await signout.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  }
  await page.screenshot({ path: `output/qa-second-pass-2026-10-23/${info.project.name}-closed.png`, fullPage: true });
  await page.goto("/train");
  await expect(page.getByText("Days with all five circuits recorded:", { exact: false })).toContainText("1");
  await expect(page.getByText("Formation practices recorded: 5", { exact: true })).toBeVisible();
  await expect(page.getByText("Formation practices recorded: 1", { exact: true })).toHaveCount(5);
  await expect(page.getByText("Ready", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Legacy move open", { exact: true })).toHaveCount(5);
  await page.goto("/my-controllables");
  await expect(page.getByText("0 XP", { exact: true })).toBeVisible();
  await expect(page.getByText("Formation practices recorded: 5", { exact: true })).toBeVisible();
});
test("optional coach restores the same guide only after tab-cache opt-in", async ({ page }) => {
  await page.route("**/src/hooks/useHostedAiAllowance.ts", route => route.fulfill({ contentType: "application/javascript", body: 'export function useHostedAiAllowance(){return {data:{enabled:true,plan:"free",repliesRemaining:5,dailyRemaining:5,budgetPercentRemaining:100,byoActive:false,byoRemaining:100},refetch:async()=>({})};}' }));
  await page.route("**/functions/v1/ai-chat", route => route.fulfill({ contentType: "application/json", body: JSON.stringify({ reply: "Synthetic local coach response." }) }));
  await page.goto("/coach");
  await page.getByLabel("Keep this conversation in this tab", { exact: true }).check();
  await page.getByRole("textbox", { name: "Message to your coach" }).fill("Synthetic: I feel scattered today");
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  await expect(page.getByText("Synthetic local coach response.", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText("Synthetic local coach response.", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Keep this conversation in this tab", { exact: true })).toBeChecked();
  await page.getByRole("button", { name: "New conversation", exact: true }).click();
  await expect(page.getByText("Synthetic local coach response.", { exact: true })).toHaveCount(0);
});

test("Home retains content when the settings modal is dismissed", async ({ page }) => {
  await page.goto("/home?settings=profile");
  await expect(page.getByRole("heading", { name: "Profile Settings", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
  await expect(page.locator("main")).not.toBeEmpty();
  await expect(page).not.toHaveURL(/settings=profile/);
});
