import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  BirthdayOnboardingStep,
  LifePerspectiveReveal,
  LifeSeasonReveal,
  SeasonNeedStep,
  StarterTeamReveal,
} from "@/components/onboarding";
import { onboardingQuickStartEnabled } from "@/lib/featureFlags";
import {
  getOnboardingQuickStartDraft,
  saveOnboardingQuickStartDraft,
} from "@/lib/onboardingQuickStartDraft";
import {
  getAgeInYearsMonthsDays,
  formatAgeInYearsMonthsDays,
  getLifePercentage,
  getRegionForBucket,
  getSeasonOfLifeMapping,
  getWeeksLived,
  recommendSnapshotForSeasonNeed,
  type LifeSeasonMapping,
} from "@/lib/lifePerspective";
import { CONTROLLABLE_LIST } from "@/lib/controllableTheme";
import { SNAPSHOTS, type Controllable, type Snapshot } from "@/lib/snapshots";
import { usePageViewTracking, useAnalytics } from "@/hooks/useAnalytics";
import { useOnboardingAnalytics } from "@/hooks/useOnboardingAnalytics";

type QuickStartStep =
  | "birthday"
  | "perspective"
  | "season"
  | "team"
  | "need"
  | "snapshot"
  | "cta";

const STEP_ORDER: QuickStartStep[] = [
  "birthday",
  "perspective",
  "season",
  "team",
  "need",
  "snapshot",
  "cta",
];

const STEP_LABELS: Record<QuickStartStep, string> = {
  birthday: "Starting Point",
  perspective: "Perspective",
  season: "Season",
  team: "5 Controllables",
  need: "Training Need",
  snapshot: "7-Day Reset",
  cta: "Begin Practice",
};

const STEP_CTA_LABELS: Record<Exclude<QuickStartStep, "cta">, string> = {
  birthday: "Start with one honest read",
  perspective: "See my season",
  season: "Meet the 5 Controllables",
  team: "What this season needs",
  need: "See my reset path",
  snapshot: "Build my reset",
};

function isValidBirthday(value: string): boolean {
  const age = getAgeInYearsMonthsDays(value);
  return !!age && age.totalDays > 0;
}

function getInitialStep(): QuickStartStep {
  const draft = getOnboardingQuickStartDraft();
  if (!draft) return "birthday";
  if (!draft.birthday || !isValidBirthday(draft.birthday)) return "birthday";
  if (draft.currentStep && STEP_ORDER.includes(draft.currentStep as QuickStartStep)) {
    return draft.currentStep as QuickStartStep;
  }
  if (draft.snapshotId) return "cta";
  if (draft.seasonNeed) return "snapshot";
  if (draft.lifeSeasonKey) return "need";
  if (draft.birthday) return "perspective";
  return "birthday";
}

function getSnapshotOptions(
  season: LifeSeasonMapping | null,
  selectedNeed: Controllable | null,
) {
  if (!season || !selectedNeed) {
    return { recommended: null as Snapshot | null, alternatives: [] as Snapshot[] };
  }

  const recommendation = recommendSnapshotForSeasonNeed(season, selectedNeed);
  return {
    recommended: recommendation.snapshot,
    alternatives: recommendation.alternatives,
  };
}

function SnapshotRecommendationStep({
  season,
  selectedNeed,
  selectedSnapshotId,
  onSelectSnapshot,
}: {
  season: LifeSeasonMapping;
  selectedNeed: Controllable;
  selectedSnapshotId: string | null;
  onSelectSnapshot: (snapshotId: string) => void;
}) {
  const recommendation = recommendSnapshotForSeasonNeed(season, selectedNeed);
  const options = [recommendation.snapshot, ...recommendation.alternatives].slice(0, 6);
  const selectedNeedLabel =
    CONTROLLABLE_LIST.find((item) => item.type === selectedNeed)?.label ?? "this focus";

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          7-Day Reset Recommendation
        </p>
        <h1 className="font-display text-2xl font-semibold text-foreground">
          Begin in {recommendation.region.label}
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Based on this season, <span className="text-foreground font-medium">{selectedNeedLabel}</span> looks like the clearest place to train first. The book gave you the language. This is where you get the reps.
        </p>
      </div>

      <div className="rounded-2xl border border-primary/20 bg-primary/5 px-5 py-5">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-card text-2xl">
            {recommendation.snapshot.emoji}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-base font-semibold text-foreground">
                {recommendation.snapshot.name}
              </p>
              <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-medium text-primary-foreground">
                Starting point
              </span>
            </div>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              {recommendation.snapshot.tagline}
            </p>
            <p className="mt-3 text-xs leading-relaxed text-foreground">
              {recommendation.region.description}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {options.map((snapshot) => {
          const isSelected = selectedSnapshotId === snapshot.id;
          const region = getRegionForBucket(snapshot.bucketId);

          return (
            <button
              key={snapshot.id}
              type="button"
              onClick={() => onSelectSnapshot(snapshot.id)}
              className={`w-full rounded-xl border px-4 py-4 text-left transition-all ${
                isSelected
                  ? "border-primary bg-primary/5 shadow-[0_0_0_1px_hsl(var(--primary)/0.15)]"
                  : "border-border/60 bg-card hover:border-primary/30"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted/50 text-xl">
                  {snapshot.emoji}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-foreground">
                      {snapshot.name}
                    </p>
                    {snapshot.id === recommendation.snapshot.id ? (
                      <Sparkles className="h-3.5 w-3.5 text-primary" />
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {snapshot.tagline}
                  </p>
                  <p className="mt-2 text-[11px] uppercase tracking-wide text-muted-foreground">
                    {region.label}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CreateAccountStep({
  birthday,
  season,
  selectedNeed,
  selectedSnapshot,
}: {
  birthday: string;
  season: LifeSeasonMapping;
  selectedNeed: Controllable;
  selectedSnapshot: Snapshot | null;
}) {
  const selectedNeedLabel =
    CONTROLLABLE_LIST.find((item) => item.type === selectedNeed)?.label ?? "Need";
  const regionLabel = selectedSnapshot ? getRegionForBucket(selectedSnapshot.bucketId).label : null;
  const birthdayDisplay = new Date(`${birthday}T00:00:00`).toLocaleDateString(
    "en-US",
    {
      month: "long",
      day: "numeric",
      year: "numeric",
    },
  );

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Your 7-Day Reset
        </p>
        <h1 className="font-display text-2xl font-semibold text-foreground">
          Your Controllables Reset is ready
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Create your account and we&apos;ll keep this season, your starter team, and your first practice path ready for you.
        </p>
      </div>

      <div className="space-y-3 rounded-2xl border border-border/60 bg-card px-5 py-5">
        <div className="flex items-start justify-between gap-3 border-b border-border/50 pb-3">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Birthday
            </p>
            <p className="mt-1 text-sm font-medium text-foreground">
              {birthdayDisplay}
            </p>
          </div>
          <Check className="h-4 w-4 text-primary" />
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Season
            </p>
            <p className="mt-1 text-sm font-medium text-foreground">
              {season.label}
            </p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Focus
            </p>
            <p className="mt-1 text-sm font-medium text-foreground">
              {selectedNeedLabel}
            </p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Region
            </p>
            <p className="mt-1 text-sm font-medium text-foreground">
              {regionLabel ?? "Ready"}
            </p>
          </div>
        </div>

        {selectedSnapshot ? (
          <div className="rounded-xl bg-muted/30 px-4 py-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-card text-xl">
                {selectedSnapshot.emoji}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">
                  {selectedSnapshot.name}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {selectedSnapshot.tagline}
                </p>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function QuickStart() {
  usePageViewTracking("QuickStart");
  const { trackEvent } = useAnalytics();
  const { trackSnapshotSelected, trackStepChange } = useOnboardingAnalytics();

  const draft = useMemo(() => getOnboardingQuickStartDraft(), []);
  const [step, setStep] = useState<QuickStartStep>(getInitialStep);
  const [birthday, setBirthday] = useState(draft?.birthday ?? "");
  const [selectedNeed, setSelectedNeed] = useState<Controllable | null>(
    draft?.seasonNeed ??
      (draft?.birthday
        ? getSeasonOfLifeMapping(draft.birthday)?.recommendedControllable ?? null
        : null),
  );
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string | null>(
    draft?.snapshotId ?? null,
  );

  const age = useMemo(() => {
    if (!birthday) return null;
    return getAgeInYearsMonthsDays(birthday);
  }, [birthday]);

  const weeksLived = useMemo(() => {
    if (!birthday) return 0;
    return getWeeksLived(birthday);
  }, [birthday]);

  const lifePercentage = useMemo(() => {
    if (!birthday) return 0;
    return getLifePercentage(birthday);
  }, [birthday]);

  const season = useMemo(() => {
    if (!birthday) return null;
    return getSeasonOfLifeMapping(birthday);
  }, [birthday]);

  const { recommended, alternatives } = useMemo(
    () => getSnapshotOptions(season, selectedNeed),
    [season, selectedNeed],
  );

  const selectedSnapshot = useMemo(() => {
    if (!selectedSnapshotId) return recommended;
    return (
      SNAPSHOTS.find((snapshot) => snapshot.id === selectedSnapshotId) ||
      recommended ||
      null
    );
  }, [recommended, selectedSnapshotId]);

  const selectedNeedLabel = useMemo(
    () =>
      CONTROLLABLE_LIST.find((item) => item.type === selectedNeed)?.label ?? "",
    [selectedNeed],
  );

  const ageLabel = useMemo(() => {
    if (!age) return null;
    return formatAgeInYearsMonthsDays(age);
  }, [age]);

  useEffect(() => {
    if (!selectedNeed && season) {
      setSelectedNeed(season.recommendedControllable);
    }
  }, [season, selectedNeed]);

  useEffect(() => {
    if (!selectedSnapshotId && recommended) {
      setSelectedSnapshotId(recommended.id);
    }
  }, [recommended, selectedSnapshotId]);

  useEffect(() => {
    if (!recommended || !selectedNeed || !selectedSnapshotId) return;

    const currentSnapshot =
      SNAPSHOTS.find((snapshot) => snapshot.id === selectedSnapshotId) ?? null;
    const allowedIds = new Set([recommended.id, ...alternatives.map((snapshot) => snapshot.id)]);

    if (!currentSnapshot || !allowedIds.has(currentSnapshot.id)) {
      setSelectedSnapshotId(recommended.id);
    }
  }, [alternatives, recommended, selectedNeed, selectedSnapshotId]);

  useEffect(() => {
    if (!birthday && !selectedSnapshotId) return;

    const shouldPersistSnapshot = step === "snapshot" || step === "cta";

    saveOnboardingQuickStartDraft({
      currentStep: step,
      mission: selectedNeedLabel,
      birthday: birthday || null,
      ageLabel,
      weeksLived: weeksLived || null,
      lifePercentage: lifePercentage || null,
      lifeSeasonKey: season?.key ?? null,
      lifeSeasonLabel: season?.label ?? null,
      seasonNeed: selectedNeed ?? null,
      seasonNeedLabel: selectedNeedLabel || null,
      snapshotId: shouldPersistSnapshot ? selectedSnapshot?.id ?? null : null,
      snapshotName: shouldPersistSnapshot ? selectedSnapshot?.name ?? null : null,
      regionLabel:
        shouldPersistSnapshot && selectedSnapshot
          ? getRegionForBucket(selectedSnapshot.bucketId).label
          : null,
    });
  }, [
    ageLabel,
    birthday,
    lifePercentage,
    season?.key,
    season?.label,
    selectedNeed,
    selectedNeedLabel,
    selectedSnapshot,
    selectedSnapshotId,
    step,
    weeksLived,
  ]);

  if (!onboardingQuickStartEnabled()) {
    return <Navigate to="/auth?mode=signup" replace />;
  }

  const stepIndex = STEP_ORDER.indexOf(step);
  const canContinue =
    step === "birthday"
      ? isValidBirthday(birthday)
      : step === "snapshot"
        ? !!selectedSnapshot
        : step !== "cta";

  const goToStep = (nextStep: QuickStartStep) => {
    trackStepChange(step, nextStep);
    setStep(nextStep);
  };

  const handleBack = () => {
    if (stepIndex <= 0) return;
    setStep(STEP_ORDER[stepIndex - 1]);
  };

  const handleContinue = () => {
    if (step === "birthday" && !canContinue) return;
    if (step === "snapshot" && selectedSnapshot) {
      trackSnapshotSelected(
        selectedSnapshot.id,
        selectedSnapshot.name,
        selectedSnapshot.id === recommended?.id,
      );
    }

    const nextStep = STEP_ORDER[stepIndex + 1];
    if (!nextStep) return;
    goToStep(nextStep);
  };

  const handleSnapshotSelect = (snapshotId: string) => {
    const snapshot =
      SNAPSHOTS.find((candidate) => candidate.id === snapshotId) ?? null;
    setSelectedSnapshotId(snapshotId);

    if (snapshot) {
      trackEvent("onboarding", "quick_start_snapshot_preview_selected", {
        snapshot_id: snapshot.id,
        snapshot_name: snapshot.name,
        is_recommended: snapshot.id === recommended?.id,
      });
    }
  };

  const renderStep = () => {
    if (step === "birthday") {
      return (
        <BirthdayOnboardingStep
          birthday={birthday}
          onBirthdayChange={setBirthday}
        />
      );
    }

    if (step === "perspective" && age) {
      return (
        <LifePerspectiveReveal
          age={age}
          weeksLived={weeksLived}
          lifePercentage={lifePercentage}
        />
      );
    }

    if (step === "season" && season) {
      return <LifeSeasonReveal season={season} />;
    }

    if (step === "team" && season) {
      return (
        <StarterTeamReveal
          recommendedControllable={season.recommendedControllable}
        />
      );
    }

    if (step === "need" && season && selectedNeed) {
      return (
        <SeasonNeedStep
          season={season}
          selectedNeed={selectedNeed}
          onSelectNeed={setSelectedNeed}
        />
      );
    }

    if (step === "snapshot" && season && selectedNeed) {
      return (
        <SnapshotRecommendationStep
          season={season}
          selectedNeed={selectedNeed}
          selectedSnapshotId={selectedSnapshot?.id ?? null}
          onSelectSnapshot={handleSnapshotSelect}
        />
      );
    }

    if (step === "cta" && season && selectedNeed) {
      return (
        <CreateAccountStep
          birthday={birthday}
          season={season}
          selectedNeed={selectedNeed}
          selectedSnapshot={selectedSnapshot}
        />
      );
    }

    return null;
  };

  return (
    <div className="min-h-screen bg-background px-6 py-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-md items-center justify-center">
        <div className="w-full rounded-3xl border border-border/60 bg-card/95 p-6 shadow-sm backdrop-blur">
          <div className="mb-6 space-y-3">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={handleBack}
                className={`inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/60 text-muted-foreground transition-colors ${
                  stepIndex > 0
                    ? "hover:border-primary/30 hover:text-foreground"
                    : "pointer-events-none opacity-0"
                }`}
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                Step {stepIndex + 1} of {STEP_ORDER.length}
              </p>
            </div>
            <Progress
              value={((stepIndex + 1) / STEP_ORDER.length) * 100}
              className="h-1.5 bg-muted/60"
            />
            <p className="text-xs text-muted-foreground">
              {STEP_LABELS[step]}
            </p>
            <div className="rounded-2xl border border-primary/15 bg-primary/5 px-4 py-3">
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Chapter 2
              </p>
              <p className="mt-1 text-sm font-medium text-foreground">
                You finished the book. Now the practice begins.
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                You&apos;ve met the 5 Controllables. Start with one honest read of where you are today.
              </p>
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              {renderStep()}
            </motion.div>
          </AnimatePresence>

          {step === "cta" ? (
            <div className="mt-8 flex gap-3">
              <Button variant="outline" className="flex-1" onClick={handleBack}>
                Back
              </Button>
              <Link
                to="/auth?mode=signup"
                className="flex-1"
                onClick={() => {
                  trackEvent("cta", "quick_start_create_account_clicked", {
                    snapshot_id: selectedSnapshot?.id ?? null,
                    season_key: season?.key ?? null,
                    season_need: selectedNeed ?? null,
                  });
                }}
              >
                <Button className="w-full">
                  Start the practice
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          ) : (
            <div className="mt-8 flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleBack}
                disabled={stepIndex === 0}
              >
                Back
              </Button>
              <Button
                className="flex-1"
                onClick={handleContinue}
                disabled={!canContinue}
              >
                {STEP_CTA_LABELS[step as Exclude<QuickStartStep, "cta">]}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
