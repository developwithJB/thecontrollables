import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CalendarHeart,
  Check,
  CheckCircle2,
  HeartHandshake,
  Mail,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Logo } from "@/components/Logo";
import { onboardingQuickStartEnabled } from "@/lib/featureFlags";
import {
  getOnboardingQuickStartDraft,
  saveOnboardingQuickStartDraft,
} from "@/lib/onboardingQuickStartDraft";
import {
  READING_STATUS_DESCRIPTIONS,
  READING_STATUS_LABELS,
  type ReadingStatus,
} from "@/lib/readAlong";
import {
  isTrainingTrack,
  TRACK_DESCRIPTIONS,
  TRACK_LABELS,
  TRAINING_TRACKS,
  type TrainingTrack,
} from "@/domain/formation/circuits";
import { useAnalytics, usePageViewTracking } from "@/hooks/useAnalytics";
import { cn } from "@/lib/utils";
import { formatFormationEmailSchedule, getDeviceTimezone } from "@/lib/formationEnrollmentConfig";

type QuickStartStep = "book" | "path" | "account";

const STEPS: Array<{ id: QuickStartStep; label: string }> = [
  { id: "book", label: "Book context" },
  { id: "path", label: "Formation path" },
  { id: "account", label: "Your first day" },
];

const READING_STATUSES = Object.keys(READING_STATUS_LABELS) as ReadingStatus[];

const TRACK_META: Record<TrainingTrack, {
  icon: typeof BookOpen;
  bestFor: string;
  commitment: string;
  missPolicy: string;
}> = {
  read_along: {
    icon: BookOpen,
    bestFor: "Reading, rereading, or leading others through The Controllables.",
    commitment: "No deadline · one meaningful practice at a time",
    missPolicy: "Nothing resets. Continue where you left off.",
  },
  charge_40: {
    icon: CalendarHeart,
    bestFor: "A structured season with room for honest partial progress and recovery.",
    commitment: "40 days · progress is recorded without perfection pressure",
    missPolicy: "A missed circuit never deletes work you already recorded.",
  },
  fully_charged_75: {
    icon: ShieldCheck,
    bestFor: "Someone freely choosing exact daily requirements and strict accountability.",
    commitment: "75 consecutive days · every assigned practice is required",
    missPolicy: "An incomplete day ends that attempt; its history remains intact.",
  },
};

function recommendedTrackFor(status: ReadingStatus | null): TrainingTrack {
  if (status === "finished") return "charge_40";
  return "read_along";
}

function BookContextStep({
  readingStatus,
  onSelect,
}: {
  readingStatus: ReadingStatus | null;
  onSelect: (status: ReadingStatus) => void;
}) {
  return (
    <section aria-labelledby="quick-start-book-heading" className="space-y-5">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Start where you are</p>
        <h1 id="quick-start-book-heading" className="mt-2 font-display text-3xl font-semibold leading-tight text-foreground">
          Where are you with the book?
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          This keeps your experience spoiler-aware and helps us recommend a path. You can change it later.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {READING_STATUSES.map((status) => {
          const selected = readingStatus === status;
          return (
            <button
              key={status}
              type="button"
              aria-pressed={selected}
              onClick={() => onSelect(status)}
              className={cn(
                "min-h-28 rounded-2xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                selected ? "border-primary/60 bg-primary/10" : "border-border/65 bg-background/55 hover:border-primary/35 hover:bg-muted/35",
              )}
            >
              <span className="flex items-center justify-between gap-3 text-base font-semibold text-foreground">
                {READING_STATUS_LABELS[status]}
                {selected ? <CheckCircle2 className="h-5 w-5 text-primary" /> : null}
              </span>
              <span className="mt-2 block text-xs leading-5 text-muted-foreground">
                {READING_STATUS_DESCRIPTIONS[status]}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function PathStep({
  track,
  readingStatus,
  strictAcknowledged,
  dailyEmailEnabled,
  timezone,
  onChange,
  onStrictAcknowledged,
  onDailyEmailEnabled,
}: {
  track: TrainingTrack;
  readingStatus: ReadingStatus | null;
  strictAcknowledged: boolean;
  dailyEmailEnabled: boolean;
  timezone: string;
  onChange: (track: TrainingTrack) => void;
  onStrictAcknowledged: (checked: boolean) => void;
  onDailyEmailEnabled: (enabled: boolean) => void;
}) {
  const recommended = recommendedTrackFor(readingStatus);

  return (
    <section aria-labelledby="quick-start-path-heading" className="space-y-5">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Choose your path</p>
        <h1 id="quick-start-path-heading" className="mt-2 font-display text-3xl font-semibold leading-tight text-foreground">
          How deeply do you want to train right now?
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Choose the pace you can enter honestly. Your choice starts the path and its morning email.
        </p>
      </div>

      <div className="grid gap-3">
        {TRAINING_TRACKS.map((candidate) => {
          const selected = candidate === track;
          const meta = TRACK_META[candidate];
          const Icon = meta.icon;
          return (
            <button
              key={candidate}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(candidate)}
              className={cn(
                "rounded-2xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                selected ? "border-primary/60 bg-primary/10" : "border-border/65 bg-background/55 hover:border-primary/35 hover:bg-muted/35",
              )}
            >
              <span className="flex items-start gap-3">
                <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border", selected ? "border-primary/35 bg-primary/10 text-primary" : "border-border/65 bg-muted/35 text-muted-foreground")}>
                  <Icon className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-base font-semibold text-foreground">{TRACK_LABELS[candidate]}</span>
                    {candidate === recommended ? (
                      <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary-foreground">Recommended</span>
                    ) : null}
                  </span>
                  <span className="mt-1 block text-sm leading-5 text-muted-foreground">{meta.bestFor}</span>
                  <span className="mt-3 block text-xs font-semibold text-foreground">{meta.commitment}</span>
                  <span className="mt-1 block text-xs leading-5 text-muted-foreground">If you miss: {meta.missPolicy}</span>
                </span>
                {selected ? <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-primary" /> : null}
              </span>
            </button>
          );
        })}
      </div>

      {track === "fully_charged_75" ? (
        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm leading-6">
          <input
            type="checkbox"
            checked={strictAcknowledged}
            onChange={(event) => onStrictAcknowledged(event.target.checked)}
            className="mt-1 h-4 w-4 rounded border-border accent-primary"
          />
          <span>
            <strong className="block text-foreground">I understand this is the strict path.</strong>
            <span className="text-muted-foreground">Every assigned practice is required. Adaptations allowed by the path are valid; optional proof never completes a requirement.</span>
          </span>
        </label>
      ) : null}

      <MorningEmailCard
        enabled={dailyEmailEnabled}
        timezone={timezone}
        track={track}
        onEnabledChange={onDailyEmailEnabled}
      />
    </section>
  );
}

function MorningEmailCard({
  enabled,
  timezone,
  track,
  onEnabledChange,
}: {
  enabled: boolean;
  timezone: string;
  track: TrainingTrack;
  onEnabledChange: (enabled: boolean) => void;
}) {
  return (
    <div className={cn(
      "overflow-hidden rounded-2xl border transition-colors",
      enabled ? "border-cyan-400/35 bg-cyan-400/[0.07]" : "border-border/65 bg-background/45",
    )}>
      <div className="flex items-start gap-3 p-4 sm:p-5">
        <span className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border",
          enabled ? "border-cyan-400/35 bg-cyan-400/10 text-cyan-300" : "border-border/65 bg-muted/30 text-muted-foreground",
        )}>
          <Mail className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-cyan-300">Your daily loop</p>
              <h2 className="mt-1 text-base font-semibold text-foreground">Bring my path to my inbox.</h2>
            </div>
            <Switch
              checked={enabled}
              onCheckedChange={onEnabledChange}
              aria-label="Daily formation email"
            />
          </div>
          <p className="mt-2 text-sm leading-5 text-muted-foreground">
            {enabled
              ? `Every morning around ${formatFormationEmailSchedule(timezone)}, get your ${TRACK_LABELS[track]} day, five circuits, and first honest move.`
              : "No daily email. Your formation path will still be ready inside The Dashboard."}
          </p>
        </div>
      </div>
      {enabled ? (
        <div className="grid grid-cols-3 border-t border-cyan-400/15 bg-background/30 text-center text-[10px] font-semibold text-muted-foreground">
          <span className="px-2 py-3">Day + season</span>
          <span className="border-x border-cyan-400/15 px-2 py-3">Five circuits</span>
          <span className="px-2 py-3">One clear CTA</span>
        </div>
      ) : null}
    </div>
  );
}

function AccountStep({
  readingStatus,
  track,
  dailyEmailEnabled,
  timezone,
}: {
  readingStatus: ReadingStatus;
  track: TrainingTrack;
  dailyEmailEnabled: boolean;
  timezone: string;
}) {
  const meta = TRACK_META[track];

  return (
    <section aria-labelledby="quick-start-account-heading" className="space-y-5">
      <div className="rounded-2xl border border-primary/25 bg-primary/10 p-5">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Your first day is ready</p>
        <h1 id="quick-start-account-heading" className="mt-2 font-display text-3xl font-semibold leading-tight text-foreground">
          {TRACK_LABELS[track]}
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{TRACK_DESCRIPTIONS[track]}</p>
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <span className="rounded-full border border-primary/25 bg-background/55 px-3 py-1.5 text-foreground">{READING_STATUS_LABELS[readingStatus]}</span>
          <span className="rounded-full border border-primary/25 bg-background/55 px-3 py-1.5 text-foreground">{meta.commitment}</span>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <ValueCard icon={BookOpen} title="Clear today" copy="Open one place and see the five practices for this path." />
        <ValueCard
          icon={Mail}
          title={dailyEmailEnabled ? "Morning email on" : "Morning email off"}
          copy={dailyEmailEnabled ? `Arrives around ${formatFormationEmailSchedule(timezone)}. Turn it off anytime.` : "You can enable it later in Settings."}
        />
        <ValueCard icon={RotateCcw} title="Honest recovery" copy={meta.missPolicy} />
      </div>

      <div className="flex items-start gap-3 rounded-2xl border border-border/65 bg-muted/20 p-4">
        <HeartHandshake className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <p className="text-sm leading-6 text-muted-foreground">
          You are not earning God’s love or competing with anyone. You are choosing a practical rhythm for living from what you believe.
        </p>
      </div>
    </section>
  );
}

function ValueCard({ icon: Icon, title, copy }: { icon: typeof BookOpen; title: string; copy: string }) {
  return (
    <div className="rounded-2xl border border-border/65 bg-background/50 p-4">
      <Icon className="h-5 w-5 text-primary" />
      <p className="mt-3 text-sm font-semibold text-foreground">{title}</p>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{copy}</p>
    </div>
  );
}

export default function QuickStart() {
  usePageViewTracking("QuickStart");
  const { trackEvent } = useAnalytics();
  const [searchParams] = useSearchParams();
  const draft = useMemo(() => getOnboardingQuickStartDraft(), []);
  const queryTrack = searchParams.get("path");
  const requestedTrack = isTrainingTrack(queryTrack) ? queryTrack : null;
  const initialStep = draft?.currentStep === "path" || draft?.currentStep === "account" ? draft.currentStep : "book";
  const [step, setStep] = useState<QuickStartStep>(initialStep);
  const [readingStatus, setReadingStatus] = useState<ReadingStatus | null>(draft?.readingStatus ?? null);
  const [track, setTrack] = useState<TrainingTrack>(requestedTrack ?? draft?.formationTrack ?? recommendedTrackFor(draft?.readingStatus ?? null));
  const [dailyEmailEnabled, setDailyEmailEnabled] = useState(draft?.dailyEmailEnabled ?? true);
  const [timezone] = useState(() => draft?.timezone || getDeviceTimezone());
  const [strictAcknowledged, setStrictAcknowledged] = useState(false);
  const [trackWasChosen, setTrackWasChosen] = useState(Boolean(requestedTrack ?? draft?.formationTrack));
  const stepCardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    saveOnboardingQuickStartDraft({
      currentStep: step,
      readingStatus,
      formationTrack: track,
      dailyEmailEnabled,
      timezone,
      snapshotId: null,
      snapshotName: null,
    });
  }, [dailyEmailEnabled, readingStatus, step, timezone, track]);

  if (!onboardingQuickStartEnabled()) {
    return <Navigate to="/auth?mode=signup" replace />;
  }

  const stepIndex = STEPS.findIndex((candidate) => candidate.id === step);
  const canContinue = step === "book"
    ? Boolean(readingStatus)
    : step === "path"
      ? track !== "fully_charged_75" || strictAcknowledged
      : true;

  const chooseReadingStatus = (status: ReadingStatus) => {
    setReadingStatus(status);
    if (!trackWasChosen) setTrack(recommendedTrackFor(status));
    void trackEvent("onboarding", "book_status_selected", { reading_status: status });
  };

  const chooseTrack = (nextTrack: TrainingTrack) => {
    setTrack(nextTrack);
    setTrackWasChosen(true);
    if (nextTrack !== "fully_charged_75") setStrictAcknowledged(false);
    void trackEvent("onboarding", "path_selected", { track: nextTrack });
  };

  const goBack = () => {
    if (stepIndex <= 0) return;
    setStep(STEPS[stepIndex - 1].id);
    requestAnimationFrame(() => stepCardRef.current?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      block: "start",
    }));
  };

  const goForward = () => {
    if (!canContinue || stepIndex >= STEPS.length - 1) return;
    setStep(STEPS[stepIndex + 1].id);
    requestAnimationFrame(() => stepCardRef.current?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      block: "start",
    }));
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_15%_5%,hsl(var(--primary)/0.18),transparent_34%),radial-gradient(circle_at_85%_15%,hsl(var(--wellness)/0.10),transparent_28%)]" />

      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5 md:px-8">
        <Link to="/" aria-label="Return to The Dashboard home"><Logo /></Link>
        <Button asChild variant="ghost" size="sm">
          <Link to="/auth?returnTo=%2Fformation%2Ftoday">Already a member? Sign in</Link>
        </Button>
      </header>

      <main className="relative z-10 mx-auto grid w-full max-w-6xl gap-3 px-4 pb-10 pt-1 sm:gap-6 sm:px-6 md:pt-8 lg:grid-cols-[0.62fr_1fr] lg:items-start lg:px-8">
        <aside className="min-w-0 rounded-2xl border border-border/60 bg-card/65 p-4 backdrop-blur-xl lg:sticky lg:top-6 lg:rounded-3xl lg:p-6">
          <div className="lg:hidden">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">Two-minute start</p>
                <p className="mt-1 text-sm font-semibold text-foreground">{STEPS[stepIndex].label}</p>
              </div>
              <span className="text-xs font-semibold text-muted-foreground">{stepIndex + 1} / {STEPS.length}</span>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted/55" aria-hidden="true">
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-300 motion-reduce:transition-none"
                style={{ width: `${((stepIndex + 1) / STEPS.length) * 100}%` }}
              />
            </div>
          </div>

          <div className="hidden lg:block">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Two-minute start</p>
            <h2 className="mt-3 font-display text-3xl font-semibold leading-tight">Know what to do today.</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Choose your path, know what arrives each morning, and open your first day. No birthday or private reflection required.
            </p>

            <ol className="mt-6 space-y-2" aria-label="Quick start progress">
              {STEPS.map((candidate, index) => {
                const active = index === stepIndex;
                const complete = index < stepIndex;
                return (
                  <li key={candidate.id} className={cn("flex items-center gap-3 rounded-2xl border px-4 py-3", active ? "border-primary/45 bg-primary/10" : "border-border/55 bg-background/35")}>
                    <span className={cn("flex h-7 w-7 items-center justify-center rounded-full border text-xs font-bold", active || complete ? "border-primary/40 bg-primary text-primary-foreground" : "border-border text-muted-foreground")}>
                      {complete ? <Check className="h-4 w-4" /> : index + 1}
                    </span>
                    <span className={cn("text-sm font-semibold", active ? "text-foreground" : "text-muted-foreground")}>{candidate.label}</span>
                  </li>
                );
              })}
            </ol>

            <div className="mt-6 rounded-2xl border border-primary/20 bg-primary/5 p-4 text-xs leading-5 text-muted-foreground">
              <strong className="block text-foreground">The Controllables + Christian formation</strong>
              Put Jesus first. Train what you can control. Keep your word. Steward your body. Serve others.
            </div>
          </div>
        </aside>

        <div ref={stepCardRef} className="min-w-0 scroll-mt-4 rounded-3xl border border-primary/20 bg-card/85 p-5 shadow-[0_30px_100px_-55px_hsl(var(--primary)/0.65)] backdrop-blur-xl sm:p-7">
          <div className="mb-6 flex items-center justify-between gap-4">
            {stepIndex > 0 ? (
              <button type="button" onClick={goBack} className="inline-flex h-11 items-center gap-2 rounded-xl px-2 text-sm font-semibold text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
            ) : (
              <Link to="/" className="inline-flex h-11 items-center gap-2 rounded-xl px-2 text-sm font-semibold text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-4 w-4" /> Home
              </Link>
            )}
            <span className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">Step {stepIndex + 1} of {STEPS.length}</span>
          </div>

          {step === "book" ? <BookContextStep readingStatus={readingStatus} onSelect={chooseReadingStatus} /> : null}
          {step === "path" ? (
            <PathStep
              track={track}
              readingStatus={readingStatus}
              strictAcknowledged={strictAcknowledged}
              dailyEmailEnabled={dailyEmailEnabled}
              timezone={timezone}
              onChange={chooseTrack}
              onStrictAcknowledged={setStrictAcknowledged}
              onDailyEmailEnabled={setDailyEmailEnabled}
            />
          ) : null}
          {step === "account" && readingStatus ? (
            <AccountStep
              readingStatus={readingStatus}
              track={track}
              dailyEmailEnabled={dailyEmailEnabled}
              timezone={timezone}
            />
          ) : null}

          <div className="mt-7">
            {step === "account" ? (
              <Button asChild variant="glow" size="lg" className="h-14 w-full px-3 text-sm font-semibold sm:px-8 sm:text-base">
                <Link
                  to="/auth?mode=signup"
                  onClick={() => void trackEvent("cta", "quick_start_create_account_clicked", { reading_status: readingStatus, track })}
                >
                  Create account & start my daily loop <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <Button variant="glow" size="lg" className="h-14 w-full text-base font-semibold" onClick={goForward} disabled={!canContinue}>
                {step === "book" ? "Choose my formation path" : "Review my first day"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
