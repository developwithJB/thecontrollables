import type { Controllable } from "./snapshots";
import type { LifeSeasonKey } from "./lifePerspective";
import { normalizeReadingStatus, type ReadingStatus } from "@/lib/readAlong";
import { APP_ROUTES } from "@/lib/appRoutes";
import { isTrainingTrack, type TrainingTrack } from "@/domain/formation/circuits";

export interface OnboardingQuickStartDraft {
  version: string;
  currentStep?: string | null;
  readingStatus?: ReadingStatus | null;
  formationTrack?: TrainingTrack | null;
  mission?: string;
  birthday?: string | null;
  ageLabel?: string | null;
  weeksLived?: number | null;
  lifePercentage?: number | null;
  lifeSeasonKey?: LifeSeasonKey | null;
  lifeSeasonLabel?: string | null;
  seasonNeed?: Controllable | null;
  seasonNeedLabel?: string | null;
  snapshotId: string | null;
  snapshotName: string | null;
  regionLabel?: string | null;
  updatedAt: string;
}

export const ONBOARDING_QUICK_START_DRAFT_VERSION = "2026-08-01-formation-entry-v1";
const DRAFT_KEY = "onboarding_quick_start_draft";

const getStorage = () => {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return window.sessionStorage;
  }
};

export const getOnboardingQuickStartDraft = (): OnboardingQuickStartDraft | null => {
  const storage = getStorage();
  if (!storage) return null;

  try {
    const raw = storage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<OnboardingQuickStartDraft>;
    if (parsed.version !== ONBOARDING_QUICK_START_DRAFT_VERSION) {
      storage.removeItem(DRAFT_KEY);
      return null;
    }

    return {
      version: ONBOARDING_QUICK_START_DRAFT_VERSION,
      mission: parsed.mission ?? "",
      currentStep: parsed.currentStep ?? null,
      readingStatus:
        parsed.readingStatus === null || parsed.readingStatus === undefined
          ? null
          : normalizeReadingStatus(parsed.readingStatus),
      formationTrack: isTrainingTrack(parsed.formationTrack) ? parsed.formationTrack : null,
      birthday: parsed.birthday ?? null,
      ageLabel: parsed.ageLabel ?? null,
      weeksLived: parsed.weeksLived ?? null,
      lifePercentage: parsed.lifePercentage ?? null,
      lifeSeasonKey: parsed.lifeSeasonKey ?? null,
      lifeSeasonLabel: parsed.lifeSeasonLabel ?? null,
      seasonNeed: parsed.seasonNeed ?? null,
      seasonNeedLabel: parsed.seasonNeedLabel ?? null,
      snapshotId: parsed.snapshotId ?? null,
      snapshotName: parsed.snapshotName ?? null,
      regionLabel: parsed.regionLabel ?? null,
      updatedAt: parsed.updatedAt ?? new Date(0).toISOString(),
    };
  } catch {
    return null;
  }
};

export const saveOnboardingQuickStartDraft = (
  draft: Partial<Omit<OnboardingQuickStartDraft, "updatedAt">>,
): OnboardingQuickStartDraft => {
  const existing = getOnboardingQuickStartDraft();
  const pick = <K extends keyof Omit<OnboardingQuickStartDraft, "updatedAt">>(
    key: K,
    fallback: OnboardingQuickStartDraft[K],
  ): OnboardingQuickStartDraft[K] => {
    if (Object.prototype.hasOwnProperty.call(draft, key)) {
      return (draft[key] ?? fallback) as OnboardingQuickStartDraft[K];
    }

    return (existing?.[key] ?? fallback) as OnboardingQuickStartDraft[K];
  };

  const payload: OnboardingQuickStartDraft = {
    version: ONBOARDING_QUICK_START_DRAFT_VERSION,
    mission: pick("mission", ""),
    currentStep: pick("currentStep", null),
    readingStatus: pick("readingStatus", null),
    formationTrack: pick("formationTrack", null),
    birthday: pick("birthday", null),
    ageLabel: pick("ageLabel", null),
    weeksLived: pick("weeksLived", null),
    lifePercentage: pick("lifePercentage", null),
    lifeSeasonKey: pick("lifeSeasonKey", null),
    lifeSeasonLabel: pick("lifeSeasonLabel", null),
    seasonNeed: pick("seasonNeed", null),
    seasonNeedLabel: pick("seasonNeedLabel", null),
    snapshotId: pick("snapshotId", null),
    snapshotName: pick("snapshotName", null),
    regionLabel: pick("regionLabel", null),
    updatedAt: new Date().toISOString(),
  };

  const storage = getStorage();
  storage?.setItem(DRAFT_KEY, JSON.stringify(payload));
  return payload;
};

export const clearOnboardingQuickStartDraft = () => {
  const storage = getStorage();
  storage?.removeItem(DRAFT_KEY);
};

export function getQuickStartCompletionRoute(
  readingStatus: ReadingStatus | null | undefined,
  formationTrack?: TrainingTrack | null,
): string {
  if (formationTrack && isTrainingTrack(formationTrack)) {
    return APP_ROUTES.formationToday;
  }
  if (readingStatus === "reading_now" || readingStatus === "rereading_or_leading") {
    return APP_ROUTES.readAlong;
  }

  if (readingStatus === "not_started") {
    return APP_ROUTES.myControllables;
  }

  return APP_ROUTES.home;
}
