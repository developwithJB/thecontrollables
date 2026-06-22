import type { ControllableType } from "@/components/ControllableCard";
import type { ControllableChargeStageInput } from "@/lib/controllableRoster";
import {
  getControllableChargeVisual,
  type ControllableChargeVisual,
} from "@/lib/controllableVisuals";

export type ControllableCardRarity = "Starter" | "Uncommon" | "Rare" | "Epic" | "Fully Charged";

export interface ControllableCardStat {
  label: string;
  value: number;
}

export interface ControllableTrainingCard {
  id: ControllableType;
  cardNumber: string;
  name: string;
  icon: string;
  level: number;
  rarity: ControllableCardRarity;
  stageLabel: string;
  stateLabel: ControllableChargeVisual["stateLabel"];
  xp: number;
  progressPercent: number;
  nextStageLabel: string;
  color: string;
  softColor: string;
  stats: ControllableCardStat[];
  shareText: string;
}

const CARD_NUMBERS: Record<ControllableType, string> = {
  awareness: "001",
  perspective: "002",
  habit: "003",
  wellness: "004",
  environment: "005",
};

const CARD_STATS: Record<ControllableType, [string, string, string]> = {
  awareness: ["Clarity", "Truth Read", "Pattern Sense"],
  perspective: ["Reframe", "Patience", "Gratitude"],
  habit: ["Integrity", "Consistency", "Follow-Through"],
  wellness: ["Energy", "Recovery", "Readiness"],
  environment: ["Friction Clear", "Support", "Stewardship"],
};

const FORBIDDEN_CARD_SHARE_PATTERNS = [
  /\bprivate reflections?\b/i,
  /\bwellness details?\b/i,
  /\bmoney\b/i,
  /\bcalendar\b/i,
  /\bjournal\b/i,
  /\bai guidance\b/i,
  /\bexact location\b/i,
  /\bGPS\b/i,
  /\bcaption\b/i,
  /\bcustom promise\b/i,
  /\brelease text\b/i,
];

function clampStat(value: number): number {
  return Math.min(Math.max(Math.round(value), 1), 99);
}

function getRarity(visual: ControllableChargeVisual): ControllableCardRarity {
  if (visual.stage === "fully charged") return "Fully Charged";
  if (visual.stage === "charged" && visual.level >= 10) return "Epic";
  if (visual.stage === "charged") return "Rare";
  if (visual.totalXp > 0 || visual.level >= 3) return "Uncommon";
  return "Starter";
}

function buildStats(visual: ControllableChargeVisual): ControllableCardStat[] {
  const [primary, secondary, tertiary] = CARD_STATS[visual.type];
  const base = visual.totalXp <= 0 ? 7 : visual.level * 7 + visual.progressPercent * 0.42;
  const stageBonus = (visual.stageLevel - 1) * 9;

  return [
    { label: primary, value: clampStat(base + stageBonus + 8) },
    { label: secondary, value: clampStat(base + stageBonus * 0.75 + 2) },
    { label: tertiary, value: clampStat(base + visual.totalXp / 55 + 5) },
  ];
}

export function buildControllableCardShareText(card: Omit<ControllableTrainingCard, "shareText">): string {
  const statLine = card.stats.map((stat) => `${stat.label} ${stat.value}`).join(" · ");

  return [
    `${card.icon} ${card.name} Card`,
    `Level ${card.level} · ${card.rarity}`,
    card.stageLabel,
    `${card.xp.toLocaleString()} XP · ${card.progressPercent}% charged`,
    statLine,
    "",
    "Control the Controllables one day at a time.",
    "The Dashboard",
    "thedashboard.agbcoaching.com",
    "#TheDashboard",
  ].join("\n");
}

export function buildControllableTrainingCard(input: ControllableChargeStageInput): ControllableTrainingCard {
  const visual = getControllableChargeVisual(input);
  const cardWithoutShareText: Omit<ControllableTrainingCard, "shareText"> = {
    id: visual.type,
    cardNumber: CARD_NUMBERS[visual.type],
    name: visual.name,
    icon: visual.icon,
    level: visual.level,
    rarity: getRarity(visual),
    stageLabel: visual.displayLabel,
    stateLabel: visual.stateLabel,
    xp: visual.totalXp,
    progressPercent: visual.progressPercent,
    nextStageLabel: visual.nextStageLabel,
    color: visual.color,
    softColor: visual.softColor,
    stats: buildStats(visual),
  };

  return {
    ...cardWithoutShareText,
    shareText: buildControllableCardShareText(cardWithoutShareText),
  };
}

export function isPrivacySafeControllableCardShareText(text: string): boolean {
  return !FORBIDDEN_CARD_SHARE_PATTERNS.some((pattern) => pattern.test(text));
}

