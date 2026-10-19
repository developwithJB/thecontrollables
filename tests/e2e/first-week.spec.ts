import { expect, test } from "@playwright/test";
test.use({ reducedMotion: "reduce", timezoneId: "America/Los_Angeles" });
test("seven days persist, close explicitly, include Sabbath and protect private review", async ({ page }) => {
  test.setTimeout(90_000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.clock.setFixedTime(new Date("2027-03-13T20:00:00Z"));
  await page.goto("/formation/today");
  await page.getByRole("button", { name: /Fully Charged: 75 Days/ }).click();
  const panel = page.getByTestId("fully-charged-start-panel");
  await panel.getByLabel("Main Promise", { exact: true }).fill("Keep one honest promise.");
  await panel.getByLabel("Weekly Sabbath weekday").selectOption("0");
  for (const check of await panel.getByRole("checkbox").all()) await check.check();
  await panel.getByRole("button", { name: "Start Fully Charged" }).click();
  for (let day = 1; day <= 7; day++) {
    if (day > 1) {
      await page.clock.setFixedTime(new Date(`2027-03-${String(12 + day).padStart(2,"0")}T20:00:00Z`));
      await page.reload();
    }
    await expect(page.getByTestId("fully-charged-journey-panel")).toContainText(`Day ${day} of 75`);
    if (day === 2) await expect(page.getByTestId("sabbath-preview")).toContainText("Your Sabbath is today");
    // Use the real local repository to persist complete synthetic practices;
    // closeout itself is exercised through the actual UI on each of seven days.
    await page.evaluate(async ({ day }) => {
      const cPath = "/src/domain/formation/circuits.ts";
      const rPath = "/src/data/formation/circuitRepository.ts";
      const aPath = "/src/lib/devMockAuth.ts";
      const { createEmptyCircuitDraft, CIRCUIT_TYPES, CIRCUIT_DEFINITIONS } = await import(cPath);
      const { saveFormationCircuit } = await import(rPath);
      const { DEV_MOCK_USER_ID } = await import(aPath);
      const localDate = `2027-03-${String(12 + day).padStart(2,"0")}`;
      for (const circuit of CIRCUIT_TYPES) {
        const draft = createEmptyCircuitDraft();
        draft.actions = Object.fromEntries(CIRCUIT_DEFINITIONS[circuit].actions.map((action: { id: string }) => [action.id, true]));
        draft.actions.rest_or_walk = true;
        draft.fields = { honestTruth: "One true observation", gratitude: "A quiet moment", control: "My response", release: "The result", move: "One action", faithfulAction: "Listen", mainPromise: "Keep my word", frictionRemoved: "Cleared a space", tomorrowPrepared: "Set a cue", restOrWalk: "Gentle walk", ...(day === 7 ? { weekOneLearning: "Private week-one learning", weekOneIntention: "Private next-week intention" } : {}) };
        draft.movement.one = { completed: true, description: "Safe walk", outdoors: true, adaptation: "walking" };
        draft.movement.two = { completed: true, description: "Gentle mobility", outdoors: false, adaptation: "mobility" };
        await saveFormationCircuit({ userId: DEV_MOCK_USER_ID, localDate, track: "fully_charged_75", circuit, draft, localOnly: true });
      }
    }, { day });
    await page.reload();
    await expect(page.getByRole("button", { name: "Close today", exact: true })).toBeEnabled();
    if (day === 7) {
      await expect(page.getByTestId("week-one-review")).toContainText("35 recorded circuits across 7 practice days");
      await page.getByRole("button", { name: "Preview a share-safe week-one note" }).click();
      await expect(page.getByTestId("week-one-share-preview")).not.toContainText("Private week-one learning");
      await expect(page.getByTestId("week-one-share-preview")).not.toContainText("Private next-week intention");
    }
    await page.getByRole("button", { name: "Close today", exact: true }).click();
    await expect(page.getByTestId("day-closeout-receipt")).toContainText(`Day ${day} closed`);
    await page.reload();
    await expect(page.getByTestId("day-closeout-receipt")).toContainText(`Day ${day} closed`);
  }
  await expect.poll(() => page.getByTestId("week-one-review").evaluate(element => {
    let opacity = 1;
    for (let node: Element | null = element; node; node = node.parentElement) opacity *= Number(getComputedStyle(node).opacity);
    return opacity;
  })).toBe(1);
  await page.screenshot({ path: `artifacts/first-week/${test.info().project.name}-day7.png`, fullPage: true });
});
