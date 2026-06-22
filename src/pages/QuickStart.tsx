import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { InfoHint } from "@/components/ui/info-hint";
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
import {
  READING_STATUS_DESCRIPTIONS,
  READING_STATUS_LABELS,
  type ReadingStatus,
} from "@/lib/readAlong";
import { usePageViewTracking, useAnalytics } from "@/hooks/useAnalytics";
import { useOnboardingAnalytics } from "@/hooks/useOnboardingAnalytics";

type QuickStartStep =
  | "book"
  | "birthday"
  | "perspective"
  | "season"
  | "team"
  | "need"
  | "snapshot"
  | "cta";

const STEP_ORDER: QuickStartStep[] = [
  "book",
  "birthday",
  "perspective",
  "season",
  "team",
  "need",
  "snapshot",
  "cta",
];

const STEP_LABELS: Record<QuickStartStep, string> = {
  book: "Book Status",
  birthday: "Starting Point",
  perspective: "Perspective",
  season: "Season",
  team: "5 Controllables",
  need: "Training Need",
  snapshot: "7-Day Reset",
  cta: "Begin Practice",
};

const STEP_CTA_LABELS: Record<Exclude<QuickStartStep, "cta">, string> = {
  book: "Continue",
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
  if (!draft) return "book";
  if (!draft.readingStatus) return "book";
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

const readingStatusOptions = Object.keys(READING_STATUS_LABELS) as ReadingStatus[];

function BookStatusStep({
  readingStatus,
  onSelect,
}: {
  readingStatus: ReadingStatus | null;
  onSelect: (status: ReadingStatus) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
          The book handoff
        </p>
        <h1 className="mt-1 font-display text-2xl font-semibold leading-tight text-foreground">
          Where are you with the book?
        </h1>
        <InfoHint title="Book handoff" className="mt-2">
          The Dashboard meets you where you are and keeps the practice connected to the reading.
        </InfoHint>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {readingStatusOptions.map((status) => {
          const isSelected = readingStatus === status;
          return (
            <div
              key={status}
              className={`rounded-xl border px-4 py-3 text-left transition-all ${
                isSelected
                  ? "border-primary/60 bg-primary/10 shadow-[0_0_0_1px_hsl(var(--primary)/0.16)]"
                  : "border-border/60 bg-card/70 hover:border-primary/30"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => onSelect(status)}
                  className="min-w-0 flex-1 text-left text-sm font-semibold text-foreground"
                >
                  {READING_STATUS_LABELS[status]}
                </button>
                <div className="flex items-center gap-1.5">
                  <InfoHint title={`${READING_STATUS_LABELS[status]} details`} className="h-6 w-6">
                    {READING_STATUS_DESCRIPTIONS[status]}
                  </InfoHint>
                  {isSelected ? <CheckCircle2 className="h-4 w-4 text-primary" /> : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
        <div className="flex items-center gap-3">
          <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <p className="text-sm font-medium text-foreground">Book = language. App = reps.</p>
        </div>
      </div>
    </div>
  );
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
  const [showOptions, setShowOptions] = useState(false);
  const recommendation = recommendSnapshotForSeasonNeed(season, selectedNeed);
  const alternateOptions = recommendation.alternatives
    .filter((snapshot) => snapshot.id !== recommendation.snapshot.id)
    .slice(0, 5);
  const selectedSnapshot =
    [recommendation.snapshot, ...alternateOptions].find(
      (snapshot) => snapshot.id === selectedSnapshotId,
    ) ?? recommendation.snapshot;
  const selectedIsRecommended =
    selectedSnapshot.id === recommendation.snapshot.id;

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
          7-Day Reset
        </p>
        <h1 className="mt-1 font-display text-2xl font-semibold leading-tight text-foreground">
          Start in {recommendation.region.label}
        </h1>
      </div>

      <div
        className={`w-full rounded-xl border px-4 py-4 text-left transition-all ${
          selectedIsRecommended
            ? "border-primary/70 bg-primary/10 shadow-[0_0_0_1px_hsl(var(--primary)/0.18)]"
            : "border-primary/25 bg-primary/5 hover:border-primary/45"
        }`}
      >
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-background/70 text-2xl shadow-sm">
            {recommendation.snapshot.emoji}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => onSelectSnapshot(recommendation.snapshot.id)}
                className="text-left text-base font-semibold leading-tight text-foreground"
              >
                {recommendation.snapshot.name}
              </button>
              <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-[10px] font-semibold text-primary-foreground">
                <Sparkles className="h-3 w-3" />
                Recommended
              </span>
            </div>
            <InfoHint title={`${recommendation.snapshot.name} details`} className="mt-2">
              <div className="space-y-2">
                <p className="font-medium text-foreground">{recommendation.snapshot.tagline}</p>
                <p className="text-muted-foreground">{recommendation.region.description}</p>
              </div>
            </InfoHint>
            <div className="mt-3 inline-flex items-center gap-2 text-xs font-medium text-primary">
              <CheckCircle2 className="h-4 w-4" />
              {selectedIsRecommended ? "Selected for your start" : "Use recommended region"}
            </div>
          </div>
        </div>
      </div>

      {!selectedIsRecommended ? (
        <div className="rounded-lg border border-border/70 bg-muted/20 px-4 py-3">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-background text-lg">
              {selectedSnapshot.emoji}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                Selected Instead
              </p>
              <p className="mt-1 text-sm font-medium text-foreground">
                {selectedSnapshot.name}
              </p>
            </div>
            <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-primary" />
          </div>
        </div>
      ) : null}

      <div className="space-y-2">
        <button
          type="button"
          onClick={() => setShowOptions((current) => !current)}
          className="flex w-full items-center justify-between rounded-xl border border-border/60 bg-background/40 px-4 py-3 text-left text-sm font-medium text-foreground transition-colors hover:border-primary/35 hover:bg-muted/30"
          aria-expanded={showOptions}
        >
          <span className="inline-flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-primary" />
            View other regions
          </span>
          <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
            {alternateOptions.length}
            <ChevronDown
              className={`h-4 w-4 transition-transform ${
                showOptions ? "rotate-180" : ""
              }`}
            />
          </span>
        </button>

        {showOptions ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {alternateOptions.map((snapshot) => {
              const isSelected = selectedSnapshotId === snapshot.id;
              const region = getRegionForBucket(snapshot.bucketId);

              return (
                <div
                  key={snapshot.id}
                  className={`w-full rounded-xl border px-3 py-3 text-left transition-all ${
                    isSelected
                      ? "border-primary bg-primary/5 shadow-[0_0_0_1px_hsl(var(--primary)/0.15)]"
                      : "border-border/60 bg-card/70 hover:border-primary/30"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted/50 text-lg">
                      {snapshot.emoji}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <button
                          type="button"
                          onClick={() => onSelectSnapshot(snapshot.id)}
                          className="min-w-0 flex-1 text-left text-sm font-medium text-foreground"
                        >
                          {snapshot.name}
                        </button>
                        <div className="flex items-center gap-1.5">
                          <InfoHint title={`${snapshot.name} details`} className="h-6 w-6">
                            {snapshot.tagline}
                          </InfoHint>
                          {isSelected ? (
                            <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                          ) : null}
                        </div>
                      </div>
                      <p className="mt-2 text-[11px] uppercase tracking-wide text-muted-foreground">
                        {region.label}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function CreateAccountStep({
  readingStatus,
  birthday,
  season,
  selectedNeed,
  selectedSnapshot,
}: {
  readingStatus: ReadingStatus | null;
  birthday: string;
  season: LifeSeasonMapping;
  selectedNeed: Controllable;
  selectedSnapshot: Snapshot | null;
}) {
  const selectedNeedLabel =
    CONTROLLABLE_LIST.find((item) => item.type === selectedNeed)?.label ?? "Need";
  const regionLabel = selectedSnapshot ? getRegionForBucket(selectedSnapshot.bucketId).label : null;
  const readingStatusLabel = readingStatus ? READING_STATUS_LABELS[readingStatus] : "Ready";
  const birthdayDisplay = new Date(`${birthday}T00:00:00`).toLocaleDateString(
    "en-US",
    {
      month: "long",
      day: "numeric",
      year: "numeric",
    },
  );

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
          Your 7-Day Reset
        </p>
        <h1 className="mt-1 font-display text-2xl font-semibold leading-tight text-foreground">
          Your Controllables Reset is ready
        </h1>
      </div>

      <div className="space-y-3 rounded-2xl border border-border/60 bg-card/85 px-4 py-4">
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

        <div className="grid grid-cols-3 gap-2">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Season
            </p>
            <p className="mt-1 text-xs font-medium leading-5 text-foreground sm:text-sm">
              {season.label}
            </p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Focus
            </p>
            <p className="mt-1 text-xs font-medium leading-5 text-foreground sm:text-sm">
              {selectedNeedLabel}
            </p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Region
            </p>
            <p className="mt-1 text-xs font-medium leading-5 text-foreground sm:text-sm">
              {regionLabel ?? "Ready"}
            </p>
          </div>
        </div>

        <div className="rounded-xl bg-primary/5 px-3 py-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
            Book Path
          </p>
          <p className="mt-1 text-sm font-medium text-foreground">
            {readingStatusLabel}
          </p>
        </div>

        {selectedSnapshot ? (
          <div className="rounded-xl bg-muted/30 px-3 py-3">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-card text-lg">
                {selectedSnapshot.emoji}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">
                  {selectedSnapshot.name}
                </p>
                <InfoHint title={`${selectedSnapshot.name} details`} className="mt-1 h-6 w-6">
                  {selectedSnapshot.tagline}
                </InfoHint>
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
  const [readingStatus, setReadingStatus] = useState<ReadingStatus | null>(
    draft?.readingStatus ?? null,
  );
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
    if (!readingStatus && !birthday && !selectedSnapshotId) return;

    const shouldPersistSnapshot = step === "snapshot" || step === "cta";

    saveOnboardingQuickStartDraft({
      currentStep: step,
      readingStatus,
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
    readingStatus,
    lifePercentage,
    season?.key,
    season?.label,
    selectedNeed,
    selectedNeedLabel,
    selectedSnapshot,
    selectedSnapshot?.bucketId,
    selectedSnapshot?.id,
    selectedSnapshot?.name,
    selectedSnapshotId,
    step,
    weeksLived,
  ]);

  if (!onboardingQuickStartEnabled()) {
    return <Navigate to="/auth?mode=signup" replace />;
  }

  const stepIndex = STEP_ORDER.indexOf(step);
  const canContinue =
    step === "book"
      ? Boolean(readingStatus)
      : step === "birthday"
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
    if (step === "book") {
      return (
        <BookStatusStep
          readingStatus={readingStatus}
          onSelect={setReadingStatus}
        />
      );
    }

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
          readingStatus={readingStatus}
          birthday={birthday}
          season={season}
          selectedNeed={selectedNeed}
          selectedSnapshot={selectedSnapshot}
        />
      );
    }

    return null;
  };

  const progressValue = ((stepIndex + 1) / STEP_ORDER.length) * 100;

  return (
    <div className="relative min-h-screen overflow-hidden bg-background px-3 py-3 text-foreground sm:px-6 sm:py-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_12%,hsl(var(--primary)/0.18),transparent_34%),radial-gradient(circle_at_80%_0%,hsl(var(--wellness)/0.12),transparent_30%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(hsl(var(--primary)/0.045)_1px,transparent_1px),linear-gradient(90deg,hsl(var(--primary)/0.035)_1px,transparent_1px)] bg-[size:64px_64px] opacity-60" />

      <div className="relative mx-auto grid min-h-[calc(100vh-1.5rem)] w-full max-w-6xl items-center gap-5 lg:grid-cols-[0.78fr_1fr]">
        <aside className="hidden lg:block">
          <div className="dashboard-os-surface rounded-[2rem] p-6">
            <div className="relative z-10 space-y-7">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
                  Quick Start
                </p>
                <h2 className="mt-3 font-display text-4xl font-semibold leading-tight text-foreground">
                  Find your Starting Charge.
                </h2>
                <InfoHint title="Quick Start" className="mt-4">
                  A focused path from honest read to Mission 001.
                </InfoHint>
              </div>

              <div className="space-y-3">
                {STEP_ORDER.slice(0, 4).map((item, index) => (
                  <div
                    key={item}
                    className={`rounded-2xl border px-4 py-3 ${
                      index <= stepIndex
                        ? "border-primary/35 bg-primary/10"
                        : "border-border/50 bg-background/35"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold text-foreground">
                        {STEP_LABELS[item]}
                      </span>
                      <span className="font-mono text-xs text-muted-foreground">
                        0{index + 1}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="rounded-2xl border border-primary/20 bg-background/45 px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                  Chapter 2
                </p>
                <p className="mt-2 text-sm font-medium text-foreground">
                  You finished the book. Now the practice begins.
                </p>
              </div>
            </div>
          </div>
        </aside>

        <div className="mx-auto w-full max-w-2xl">
          <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-card/85 p-4 shadow-[0_32px_120px_-62px_hsl(var(--primary)/0.75)] backdrop-blur-2xl sm:p-5">
            <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent" />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,hsl(var(--primary)/0.10),transparent_42%)]" />
            <div className="relative z-10">
              <div className="mb-4 space-y-3">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={handleBack}
                    className={`inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-background/45 text-muted-foreground shadow-sm transition-colors ${
                      stepIndex > 0
                        ? "hover:border-primary/40 hover:text-foreground"
                        : "pointer-events-none opacity-0"
                    }`}
                    aria-label="Go back"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <div className="rounded-full border border-border/60 bg-background/45 px-3 py-1.5">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                      Step {stepIndex + 1} of {STEP_ORDER.length}
                    </p>
                  </div>
                </div>
                <Progress
                  value={progressValue}
                  className="h-2 bg-muted/70 [&>div]:bg-primary"
                />
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-foreground">
                    {STEP_LABELS[step]}
                  </p>
                  <div className="flex gap-1.5" aria-hidden="true">
                    {STEP_ORDER.map((item, index) => (
                      <span
                        key={item}
                        className={`h-1.5 w-6 rounded-full transition-colors ${
                          index <= stepIndex ? "bg-primary" : "bg-muted"
                        }`}
                      />
                    ))}
                  </div>
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
                <div className="mt-5 grid gap-2 sm:grid-cols-2">
                  <Button
                    variant="outline"
                    className="h-11 rounded-xl border-border/70 bg-background/45"
                    onClick={handleBack}
                  >
                    Back
                  </Button>
                    <Link
                      to="/auth?mode=signup"
                      onClick={() => {
                        trackEvent("cta", "quick_start_create_account_clicked", {
                          reading_status: readingStatus,
                          snapshot_id: selectedSnapshot?.id ?? null,
                        season_key: season?.key ?? null,
                        season_need: selectedNeed ?? null,
                      });
                    }}
                  >
                    <Button className="dashboard-primary-glow h-11 w-full rounded-xl">
                      Create account
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="mt-5 grid gap-2 sm:grid-cols-2">
                  <Button
                    variant="outline"
                    className="h-11 rounded-xl border-border/70 bg-background/45"
                    onClick={handleBack}
                    disabled={stepIndex === 0}
                  >
                    Back
                  </Button>
                  <Button
                    className="dashboard-primary-glow h-11 rounded-xl"
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
      </div>
    </div>
  );
}
