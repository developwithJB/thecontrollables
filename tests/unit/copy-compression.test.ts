import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();

const COPY_SURFACES = [
  "src/components/dashboard/DailyOperatorBrief.tsx",
  "src/components/dashboard/DailyRings.tsx",
  "src/components/dashboard/RingActionCard.tsx",
  "src/components/dashboard/ProofEntryCard.tsx",
  "src/components/dashboard/ProofActionCard.tsx",
  "src/components/dashboard/TodayHeader.tsx",
  "src/components/dashboard/TodaySignalCard.tsx",
  "src/components/dashboard/ControllableChargeVisual.tsx",
  "src/components/experience/StreakCelebration.tsx",
  "src/components/experience/WellnessStreakHistory.tsx",
  "src/hooks/useDailyRings.ts",
  "src/pages/Landing.tsx",
  "supabase/functions/_shared/mission-of-the-day.ts",
  "supabase/functions/ai-orchestrator/index.ts",
  "supabase/functions/ai-briefing/index.ts",
];

const FORBIDDEN_VISIBLE_COPY = [
  /Evolution/i,
  /Evolved/i,
  /Train your companion/i,
  /Battle Ego/i,
  /Defeat Ego/i,
  /Streak broken/i,
  /You failed/i,
  /Try harder/i,
  /monster/i,
  /creature/i,
  /leaderboard/i,
  /hustle/i,
  /Share Streak/i,
  /Wellness Streak/i,
  /Choose your moves/i,
  /moves complete/i,
  /Mission bank/i,
  /Drop delayed/i,
  /Loading drop/i,
  /Heavy Day/i,
  /Admin Day/i,
  /Light Day/i,
  /Daily Controllables Brief/i,
];

describe("copy compression surfaces", () => {
  it("keeps high-traffic UI free of old or heavy copy", () => {
    const source = COPY_SURFACES.map((file) => readFileSync(resolve(ROOT, file), "utf8")).join("\n");

    for (const forbidden of FORBIDDEN_VISIBLE_COPY) {
      expect(source).not.toMatch(forbidden);
    }
  });
});
