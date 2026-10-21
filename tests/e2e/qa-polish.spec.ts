import {test,expect} from "@playwright/test";
import {BOOK_URL} from "../../src/lib/bookLinks";
test.use({reducedMotion:"reduce"});
async function settled(page: import("@playwright/test").Page, selector:string){ await expect.poll(()=>page.locator(selector).evaluate(el=>{let opacity=1;for(let n:Element|null=el;n;n=n.parentElement)opacity*=Number(getComputedStyle(n).opacity);return opacity;})).toBe(1); }
test("mobile Formation book links, sign out, copy, and signup-only guidance",async({page})=>{
 await page.route("**/*",route=>new URL(route.request().url()).hostname==="127.0.0.1"?route.continue():route.abort());
 const start=Date.now(); await page.goto("/formation/today"); await expect(page.getByRole("heading",{name:"Practice what you can control."})).toBeVisible(); console.log(`QA polish Today shell ${Date.now()-start}ms`);
 await expect(page.locator('[data-book-placement="formation_today"]')).toHaveAttribute("href",BOOK_URL);
 await expect(page.locator("body")).not.toContainText(/Life OS|idempotent/i);
 await page.getByRole("button",{name:"Profile menu"}).click(); await expect(page.getByRole("menuitem",{name:"Sign Out"})).toBeVisible(); await page.getByRole("menu",{name:"Profile menu"}).press("Escape"); await expect(page.getByRole("menu",{name:"Profile menu"})).toBeHidden();
 await expect(page.getByRole("button",{name:"Sign Out",exact:true})).toBeVisible();
 await page.getByRole("button",{name:"Open Awareness"}).click(); await expect(page.locator('[data-book-placement="formation_circuit"]')).toHaveAttribute("href",BOOK_URL); await expect(page.locator("body")).not.toContainText(/Life OS|idempotent/i);
 await page.goto("/formation/today");
 await page.evaluate(async()=>{
  const circuitsPath="/src/domain/formation/circuits.ts",repoPath="/src/data/formation/circuitRepository.ts",authPath="/src/lib/devMockAuth.ts",rulesPath="/src/domain/formation/circuitRules.ts";
  const {CIRCUIT_TYPES,createEmptyCircuitDraft}=await import(circuitsPath),{saveFormationCircuit}=await import(repoPath),{DEV_MOCK_USER_ID}=await import(authPath),{getLocalDate}=await import(rulesPath);
  const actions=["scripture_opened","prayer_practiced","main_promise_completed","sleep_preparation","service_completed"];
  for(const [i,circuit] of CIRCUIT_TYPES.entries()){const draft=createEmptyCircuitDraft();draft.actions[actions[i]]=true;await saveFormationCircuit({userId:DEV_MOCK_USER_ID,track:"read_along",circuit,localDate:getLocalDate(),draft,localOnly:true});}
 });
 await page.reload(); await expect(page.getByRole("progressbar",{name:"5 of 5 circuits recorded"})).toBeVisible(); await settled(page,"h1"); await page.screenshot({path:"docs/qa/pr2/today-mobile.png",fullPage:true});
 await page.getByRole("button",{name:"Sign Out",exact:true}).click(); await expect(page.getByTestId("cta-get-started")).toBeVisible(); await settled(page,'[data-testid="cta-get-started"]'); await page.screenshot({path:"docs/qa/pr2/landing-mobile.png"});
 await page.goto("/auth"); await expect(page.getByTestId("auth-form")).toBeVisible(); await expect(page.locator("#password-help")).toHaveCount(0); await expect(page.getByTestId("auth-password-input")).not.toHaveAttribute("aria-describedby","password-help"); await settled(page,'[data-testid="auth-form"]'); await page.screenshot({path:"docs/qa/pr2/auth-mobile.png",fullPage:true});
 await page.goto("/auth?mode=signup"); await expect(page.locator("#password-help")).toBeVisible(); await expect(page.getByTestId("auth-password-input")).toHaveAttribute("aria-describedby","password-help");
});


test("pricing and proof collection explain the product in plain language", async ({ page }) => {
  await page.route("**/*", route => new URL(route.request().url()).hostname === "127.0.0.1" ? route.continue() : route.abort());
  await page.goto("/pricing");
  await expect(page.getByRole("heading", { name: "Start free. Choose your support." })).toBeVisible();
  await expect(page.getByText("The source code is available on GitHub.", { exact: false })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Bring your own AI" })).toBeVisible();
  await page.screenshot({ path: "output/readability-cleanup-2026-10-21/pricing-mobile.png", fullPage: true });
  await page.goto("/proof/dex");
  await expect(page.getByRole("heading", { name: "Private proof collection", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Recent proof", exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  for (const name of ["Awareness", "Perspective", "Habit", "Wellness", "Environment"]) {
    const heading = page.getByRole("heading", { name, exact: true });
    await heading.scrollIntoViewIfNeeded();
    await expect(heading).toBeVisible();
    await expect.poll(() => heading.evaluate(el => {
      let opacity = 1;
      for (let node: Element | null = el; node; node = node.parentElement) opacity *= Number(getComputedStyle(node).opacity);
      return opacity;
    })).toBe(1);
  }
  await page.getByRole("heading", { name: "Recent proof", exact: true }).scrollIntoViewIfNeeded();
  await page.getByRole("heading", { name: "Private proof collection", exact: true }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: "output/readability-cleanup-2026-10-21/proof-collection-mobile.png", fullPage: true });
});
