import type { ControllableType } from "@/components/ControllableCard";
import type { DailyMoveKey } from "@/hooks/useDailyRings";
import {
  getChargeStageLabel,
  type ControllableChargeStage,
} from "@/lib/controllableRoster";
import { getControllableVisualIcon } from "@/lib/controllableVisuals";

export type ShareVisibility = "private" | "anonymous" | "public";

export type ShareProofKind =
  | "tracking_started"
  | "controllable_charged"
  | "charge_stage"
  | "kept_promises"
  | "returned_from_drift"
  | "reset_completed"
  | "continuous_upgrade"
  | "fully_charged_day";

export interface ShareIdentityInput {
  visibility?: ShareVisibility;
  handle?: string | null;
  city?: string | null;
  state?: string | null;
  includeLocation?: boolean;
}

export interface ShareProofInput extends ShareIdentityInput {
  kind: ShareProofKind;
  controllable?: ControllableType;
  chargeStage?: ControllableChargeStage;
  xp?: number;
  level?: number;
  keptPromises?: number;
  completedDays?: number;
}

export interface ShareProofPayload {
  kind: ShareProofKind;
  headline: string;
  proofLine: string;
  icon: string;
  controllable?: ControllableType;
  chargeStageLabel?: string;
  xpLabel: string | null;
  levelLabel: string | null;
  progressLabel: string | null;
  brandTitle: "The Dashboard";
  brandSubtitle: "The Controllables";
  shareText: string;
  identityLine: string | null;
  localBoardEligible: boolean;
}

const CONTROLLABLE_NAMES: Record<ControllableType, string> = {
  awareness: "Awareness",
  perspective: "Perspective",
  habit: "Habit",
  wellness: "Wellness",
  environment: "Environment",
};

const DAILY_MOVE_CONTROLLABLES: Record<DailyMoveKey, ControllableType> = {
  notice: "awareness",
  choose: "perspective",
  prove: "habit",
  charge: "wellness",
  align: "environment",
};

const DAILY_MOVE_XP: Record<DailyMoveKey, number> = {
  notice: 30,
  choose: 30,
  prove: 40,
  charge: 30,
  align: 30,
};

const PRIVATE_COPY_PATTERNS = [
  /\bprivate reflections?\b/i,
  /\breflection text\b/i,
  /\bjournal\b/i,
  /\bcalendar\b/i,
  /\bmoney\b/i,
  /\bai guidance\b/i,
  /\bavoided promises?\b/i,
  /\brelease text\b/i,
  /\breset vision\b/i,
  /\bScout\b|\bSeer\b|\bWatchman\b|\bBuilder\b|\bFinisher\b/i,
  /\bscout\b|\btranslator\b|\bbuilder\b|\bprotector\b|\bcharger\b/i,
  /\bevolution\b|\bevolve\b|\bcreature\b|\bmonster\b|\bbattle\b/i,
];

function formatXpLabel(xp?: number): string | null {
  if (!Number.isFinite(xp) || xp == null || xp <= 0) return null;
  return `+${Math.round(xp)} XP`;
}

function formatLevelLabel(level?: number): string | null {
  if (!Number.isFinite(level) || level == null || level <= 0) return null;
  return `Level ${Math.round(level)}`;
}

export function shouldContributeToLocalBoard(visibility: ShareVisibility = "private"): boolean {
  return visibility !== "private";
}

export function getShareIdentityLine({
  visibility = "private",
  handle,
  city,
  state,
  includeLocation = false,
}: ShareIdentityInput): string | null {
  if (visibility !== "public") return null;

  const cleanHandle = handle?.trim();
  const location = includeLocation
    ? [city?.trim(), state?.trim()].filter(Boolean).join(", ")
    : "";

  if (cleanHandle && location) return `${cleanHandle} · ${location}`;
  if (cleanHandle) return cleanHandle;
  if (location) return location;
  return null;
}

function getProofLine(kind: ShareProofKind, controllable?: ControllableType): string {
  if (kind === "kept_promises") return "One kept promise at a time.";
  if (kind === "returned_from_drift") return "The Continuous Upgrade continues.";
  if (kind === "continuous_upgrade") return "Always Get Better.";
  if (kind === "controllable_charged" && controllable === "habit") return "One kept promise at a time.";
  return "Control the Controllables one day at a time.";
}

function getHeadline(input: ShareProofInput): string {
  const controllableName = input.controllable ? CONTROLLABLE_NAMES[input.controllable] : null;

  switch (input.kind) {
    case "tracking_started":
      return "I started tracking My Controllables.";
    case "controllable_charged":
      return controllableName ? `Today I charged ${controllableName}.` : "I charged a Controllable today.";
    case "charge_stage":
      if (input.controllable && input.chargeStage) {
        return `${getChargeStageLabel(input.controllable, input.chargeStage)}.`;
      }
      return "Charge Stage unlocked.";
    case "kept_promises":
      return `${input.keptPromises ?? 1} kept promise${input.keptPromises === 1 ? "" : "s"}.`;
    case "returned_from_drift":
      return "Returned from drift.";
    case "reset_completed":
      return "Completed the 7-Day Controllables Reset.";
    case "continuous_upgrade":
      return "The Continuous Upgrade continues.";
    case "fully_charged_day":
      return "Fully Charged.";
  }
}

function buildShareText(payload: Omit<ShareProofPayload, "shareText">): string {
  return [
    payload.headline,
    payload.proofLine,
    payload.xpLabel,
    payload.levelLabel,
    payload.progressLabel,
    "",
    payload.brandTitle,
    payload.brandSubtitle,
    "thedashboard.agbcoaching.com",
    "#TheDashboard",
  ]
    .filter((line) => line != null && line !== "")
    .join("\n");
}

export function buildShareProofPayload(input: ShareProofInput): ShareProofPayload {
  const icon = input.controllable ? getControllableVisualIcon(input.controllable) : "⚡";
  const chargeStageLabel =
    input.controllable && input.chargeStage
      ? getChargeStageLabel(input.controllable, input.chargeStage)
      : undefined;
  const xpLabel = formatXpLabel(input.xp);
  const levelLabel = formatLevelLabel(input.level);
  const progressLabel =
    input.completedDays && input.completedDays > 0
      ? `${Math.min(input.completedDays, 7)}/7 days`
      : null;

  const payloadWithoutShareText: Omit<ShareProofPayload, "shareText"> = {
    kind: input.kind,
    headline: getHeadline(input),
    proofLine: getProofLine(input.kind, input.controllable),
    icon,
    controllable: input.controllable,
    chargeStageLabel,
    xpLabel,
    levelLabel,
    progressLabel,
    brandTitle: "The Dashboard",
    brandSubtitle: "The Controllables",
    identityLine: getShareIdentityLine(input),
    localBoardEligible: shouldContributeToLocalBoard(input.visibility),
  };

  return {
    ...payloadWithoutShareText,
    shareText: buildShareText(payloadWithoutShareText),
  };
}

export function buildDailyMoveSharePayload(
  moveKey: DailyMoveKey | "fully_charged",
): ShareProofPayload {
  if (moveKey === "fully_charged") {
    return buildShareProofPayload({
      kind: "fully_charged_day",
      xp: 160,
      visibility: "anonymous",
    });
  }

  const controllable = DAILY_MOVE_CONTROLLABLES[moveKey];
  return buildShareProofPayload({
    kind: "controllable_charged",
    controllable,
    chargeStage: "charged",
    xp: DAILY_MOVE_XP[moveKey],
    visibility: "anonymous",
  });
}

export function buildResetProofSharePayload({
  completedDays,
  xp,
  visibility = "anonymous",
}: {
  completedDays?: number;
  xp?: number;
  visibility?: ShareVisibility;
} = {}): ShareProofPayload {
  return buildShareProofPayload({
    kind: completedDays && completedDays >= 7 ? "reset_completed" : "tracking_started",
    completedDays,
    xp,
    visibility,
  });
}

export function isPrivacySafeSharePayload(payload: ShareProofPayload): boolean {
  const visibleCopy = [
    payload.headline,
    payload.proofLine,
    payload.chargeStageLabel,
    payload.xpLabel,
    payload.levelLabel,
    payload.progressLabel,
    payload.shareText,
  ]
    .filter(Boolean)
    .join(" ");

  return !PRIVATE_COPY_PATTERNS.some((pattern) => pattern.test(visibleCopy));
}
