export interface OnboardingQuickStartDraft {
  mission: string;
  snapshotId: string | null;
  snapshotName: string | null;
  updatedAt: string;
}

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
    return JSON.parse(raw) as OnboardingQuickStartDraft;
  } catch {
    return null;
  }
};

export const saveOnboardingQuickStartDraft = (
  draft: Omit<OnboardingQuickStartDraft, "updatedAt">,
): OnboardingQuickStartDraft => {
  const payload: OnboardingQuickStartDraft = {
    ...draft,
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
