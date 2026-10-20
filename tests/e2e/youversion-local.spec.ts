import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test.beforeEach(async ({ page }) => {
  await page.route("**/*", (route) =>
    ["127.0.0.1", "localhost"].includes(new URL(route.request().url()).hostname)
      ? route.continue()
      : route.abort(),
  );
});
test("the Gospel companion works without keys, account creation, external traffic or circuit credit", async ({
  page,
}, info) => {
  const sourceRequests: string[] = [];
  page.on("request", (req) => {
    if (/scripture-passage|api.youversion.com/.test(req.url()))
      sourceRequests.push(req.url());
  });
  await page.goto("/scripture?reference=John%2013%3A1-17");
  await expect(
    page.getByRole("heading", { name: "Read the source. Notice Jesus." }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Read John 13:1-17 in the NLT/ }),
  ).toHaveAttribute("href", "https://www.bible.com/bible/116/JHN.13.1-17");
  await expect(page.getByRole("listitem")).toHaveCount(3);
  await expect(
    page.getByRole("button", { name: "Read passage here" }),
  ).toHaveCount(0);
  await expect(
    page.getByText(/does not record or complete a circuit/),
  ).toBeVisible();
  expect(sourceRequests).toEqual([]);
  const axe = await new AxeBuilder({ page }).analyze();
  expect(
    axe.violations.filter((v) =>
      ["serious", "critical"].includes(v.impact ?? ""),
    ),
  ).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `docs/screenshots/youversion-2026-10-20/${info.project.name}.png`,
    fullPage: true,
  });
});
test("reference errors retain a working source link and valid choices update it", async ({
  page,
}) => {
  await page.goto("/scripture?reference=%3Cscript%3E");
  await page.getByLabel("Gospel passage").fill("John 22:1");
  await page.getByRole("button", { name: "Choose passage" }).click();
  await expect(page.getByRole("alert")).toContainText("Use a Gospel passage");
  await expect(
    page.getByRole("link", { name: /Read Matthew 4:18-22/ }),
  ).toHaveAttribute("href", "https://www.bible.com/bible/116/MAT.4.18-22");
  await page.getByLabel("Gospel passage").fill("Luke 10:25-37");
  await page.getByRole("button", { name: "Choose passage" }).click();
  await expect(
    page.getByRole("link", { name: /Read Luke 10:25-37/ }),
  ).toHaveAttribute("href", "https://www.bible.com/bible/116/LUK.10.25-37");
  await expect(page.getByRole("alert")).toHaveCount(0);
});
