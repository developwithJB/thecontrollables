import { test, expect } from "@playwright/test";
test("route rendering keeps the existing friendly error boundary",async({page})=>{
 await page.route("**/src/pages/practice/TrainingPage.tsx",route=>route.fulfill({contentType:"application/javascript",body:'export default function Training(){throw new Error("synthetic-local-render-failure");}'}));
 await page.goto("/train");await expect(page.getByRole("heading",{name:"Something went wrong",exact:true})).toBeVisible();
 await expect(page.getByText("Unexpected Application Error!",{exact:true})).toHaveCount(0);
});
test("signed-in pricing uses account navigation and a plan CTA",async({page})=>{
 await page.route("**/src/hooks/useOptionalAccount.ts",route=>route.fulfill({contentType:"application/javascript",body:'export function useOptionalAccount(){return {user:{id:"synthetic"},isLoading:false};}'}));
 await page.goto("/pricing");
 await expect(page.getByRole("button",{name:"Profile menu"})).toBeVisible();
 await expect(page.getByRole("link",{name:"Sign in",exact:true})).toHaveCount(0);
 await expect(page.getByRole("link",{name:"View my plan",exact:true})).toHaveAttribute("href","/billing");
 await expect(page.locator("article").filter({has:page.getByRole("heading",{name:"Pro",exact:true})})).toContainText("$119.99");
 await page.screenshot({path:"output/ux-2026-10-23/pr-b-pricing.png",animations:"disabled"});
});
test.beforeEach(async ({ page }) => {
  await page.route("**/*", (route) => {
    const url = new URL(route.request().url());
    return ["127.0.0.1", "localhost"].includes(url.hostname)
      ? route.continue()
      : route.abort();
  });
});
test("unsaved text is protected on navigation and browser Back; save has a distinct state", async ({
  page,
}) => {
  await page.goto("/formation/today");
  await page
    .getByRole("button", { name: "Open Awareness", exact: true })
    .click();
  await page
    .getByLabel("One honest truth", { exact: true })
    .fill("Synthetic unsaved QA text.");
  await page
    .getByRole("button", { name: "Return to Today", exact: true })
    .first()
    .click();
  await expect(page.getByRole("alertdialog")).toBeVisible();
  await page.getByRole("alertdialog").screenshot({path:"output/ux-2026-10-23/pr-b-unsaved.png",animations:"disabled"});
  await page.getByRole("button", { name: "Keep editing" }).click();
  await expect(
    page.getByLabel("One honest truth", { exact: true }),
  ).toHaveValue("Synthetic unsaved QA text.");
  await page.goBack();
  await expect(page.getByRole("alertdialog")).toBeVisible();
  await page.getByRole("button", { name: "Keep editing" }).click();
  await page
    .getByRole("button", { name: "Save progress", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Saved ✓", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Return to Today", exact: true })
    .first()
    .click();
  await expect(
    page.getByRole("heading", { name: "Practice what you can control." }),
  ).toBeVisible();
  await expect(page.getByRole("alertdialog")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Open Awareness", exact: true })
    .click();
  await expect(
    page.getByLabel("One honest truth", { exact: true }),
  ).toHaveValue("Synthetic unsaved QA text.");
  for (const label of ["Observe:", "Understand:", "Respond:"])
    await expect(page.getByText(label, { exact: true })).toBeVisible();
});
test("settings route, header labels and account cleanup remain accessible", async ({
  page,
}) => {
  await page.goto("/settings");
  await expect(
    page.getByRole("heading", { name: "Profile Settings", exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Display Name",{exact:true})).toBeVisible();
  await page.getByRole("dialog").screenshot({path:"output/ux-2026-10-23/pr-b-settings.png",animations:"disabled"});
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Active Goal", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Read Along Training", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Active Goal", exact: true }).hover();
  await expect(
    page.getByRole("tooltip", { name: "Active Goal" }),
  ).toBeVisible();
  await page.evaluate(() => {
    localStorage.setItem(
      "formation-day-ack:00000000-0000-4000-8000-000000000001:2026-10-23",
      "synthetic",
    );
    localStorage.setItem("onboarding_quick_start_draft", "synthetic");
  });
  await page.getByRole("button", { name: "Profile menu" }).click();
  await page.getByRole("menuitem", { name: "Sign Out" }).click();
  await expect(page).toHaveURL(/\/$/);
  expect(
    await page.evaluate(() =>
      localStorage.getItem(
        "formation-day-ack:00000000-0000-4000-8000-000000000001:2026-10-23",
      ),
    ),
  ).toBeNull();
  expect(
    await page.evaluate(() =>
      localStorage.getItem("onboarding_quick_start_draft"),
    ),
  ).toBeNull();
  await expect(
    page.getByText("Example · not your saved progress", { exact: true }),
  ).toBeVisible();
});
test("Planner has one disconnected calendar prompt in each view", async ({
  page,
}) => {
  await page.goto("/planner");
  await expect(
    page.getByRole("button", { name: "Connect Google Calendar", exact: true }),
  ).toHaveCount(1);
  for (const view of ["week", "month", "day"]) {
    await page.getByRole("button", { name: view, exact: true }).click();
    await expect(
      page.getByRole("button", {
        name: "Connect Google Calendar",
        exact: true,
      }),
    ).toHaveCount(1);
  }
});
test("lazy route transition keeps a visible page skeleton", async ({
  page,
}) => {
  await page.goto("/formation/today");
  await expect(
    page.getByRole("heading", { name: "Practice what you can control." }),
  ).toBeVisible();
  let release!: () => void;
  const gate = new Promise<void>((resolve) => (release = resolve));
  await page.route("**/src/pages/practice/TrainingPage.tsx", async (route) => {
    await gate;
    await route.continue();
  });
  await page.getByRole("button", { name: "Train", exact: true }).click();
  await expect(
    page.getByRole("status", { name: "Loading page" }),
  ).toBeVisible();
  release();
  await expect(
    page.getByRole("heading", { name: "Train", exact: true }),
  ).toBeVisible();
  for (const path of ["/reflect", "/evidence", "/wellness", "/planner"]) {
    await page.goto(path);
    await expect(page.locator("main")).not.toBeEmpty();
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
  }
  await expect(
    page.getByText("Wellness Wellness", { exact: true }),
  ).toHaveCount(0);
});
