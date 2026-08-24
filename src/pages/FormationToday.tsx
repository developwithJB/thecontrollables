import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
  CircleDashed,
  Compass,
  History,
  LockKeyhole,
  Sparkles,
  Trophy,
} from "lucide-react";
import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { FutureChip, FutureHero, FuturePanel } from "@/components/ui/future";
import { TrackSelector } from "@/components/formation/TrackSelector";
import { useLifeOSUser } from "@/hooks/useLifeOSAuth";
import { useFormationTrack } from "@/hooks/useFormationTrack";
import { useFormationCircuits } from "@/hooks/useFormationCircuits";
import {
  CIRCUIT_DEFINITIONS,
  CIRCUIT_TYPES,
  TRACK_LABELS,
  createEmptyCircuitDraft,
  type CircuitType,
} from "@/domain/formation/circuits";
import { evaluateCircuit, getActionLabel, getLocalDate } from "@/domain/formation/circuitRules";
import { CONTROLLABLE_GUIDES, getControllableGuideClasses } from "@/lib/controllables";
import { APP_ROUTES } from "@/lib/appRoutes";
import { cn } from "@/lib/utils";
import { useFormationAnalytics } from "@/hooks/useFormationAnalytics";
import { useFullyChargedJourney } from "@/hooks/useFullyChargedJourney";
import { FullyChargedJourneyPanel } from "@/components/formation/FullyChargedJourneyPanel";
import { getLocalDateInTimezone } from "@/domain/formation/fullyChargedJourney";

export default function FormationToday() {
  const user = useLifeOSUser();
  const navigate = useNavigate();
  const localDate = getLocalDate();
  const { track, setTrack } = useFormationTrack(user.id);
  const { history, isLoading, error, localOnly } = useFormationCircuits(user.id, track);
  const strictJourney = useFullyChargedJourney(user.id, track === "fully_charged_75");
  const trackFormation = useFormationAnalytics();
  const strictLocalToday = strictJourney.journey
    ? getLocalDateInTimezone(strictJourney.journey.startTimezone)
    : localDate;
  const strictDayOpen =
    track !== "fully_charged_75" ||
    (strictJourney.journey?.attemptStatus === "active" &&
      strictJourney.journey.dayStatus === "open" &&
      strictJourney.journey.localDate === strictLocalToday);
  const practiceLocalDate =
    track === "fully_charged_75" && strictJourney.journey?.localDate
      ? strictJourney.journey.localDate
      : localDate;

  useEffect(() => {
    void trackFormation("formation_day_opened", { track, source: "formation_today" });
  }, [track, trackFormation]);

  const circuits = useMemo(
    () =>
      CIRCUIT_TYPES.map((circuit) => {
        const entry = history.find((candidate) => candidate.localDate === practiceLocalDate && candidate.circuit === circuit);
        const draft = entry?.draft ?? createEmptyCircuitDraft();
        return { circuit, entry, evaluation: evaluateCircuit(track, circuit, draft) };
      }),
    [history, practiceLocalDate, track],
  );

  const satisfiedCount = circuits.filter(({ evaluation }) => evaluation.isSatisfiedForTrack).length;
  const progress = (satisfiedCount / CIRCUIT_TYPES.length) * 100;

  return (
    <div className="ph-no-capture mx-auto max-w-5xl space-y-5 pb-24" data-sentry-mask>
      <FutureHero
        eyebrow="Today's Formation"
        title="Practice what you can control."
        icon={<Compass className="h-5 w-5" />}
        chips={
          <>
            <FutureChip icon={<BookOpen className="h-3.5 w-3.5" />} label={TRACK_LABELS[track]} />
            <FutureChip icon={<LockKeyhole className="h-3.5 w-3.5" />} label="Private by default" />
            {localOnly ? <FutureChip icon={<Sparkles className="h-3.5 w-3.5" />} label="Local QA data" /> : null}
          </>
        }
        side={
          <div className="space-y-3">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">{strictDayOpen ? "Today's practice" : "Next practice"}</p>
                <p className="mt-1 font-display text-3xl font-semibold text-foreground">{satisfiedCount}<span className="text-base text-muted-foreground"> / 5</span></p>
              </div>
              <span className="text-xs font-medium text-muted-foreground">{formatDisplayDate(practiceLocalDate)}</span>
            </div>
            <Progress value={progress} className="h-2" aria-label={`${satisfiedCount} of 5 circuits recorded`} />
            <p className="text-xs leading-relaxed text-muted-foreground">
              Completion records a practice. It does not measure your standing with God.
            </p>
          </div>
        }
      >
        <p className="text-sm leading-relaxed text-muted-foreground">
          Five distinct circuits, one honest day. Open a circuit to see what your selected path requires or recommends.
        </p>
      </FutureHero>

      <FuturePanel className="p-4 sm:p-5">
        <TrackSelector
          track={track}
          onChange={(nextTrack) => {
            setTrack(nextTrack);
            void trackFormation("path_selected", { track: nextTrack, source: "formation_today" });
          }}
        />
      </FuturePanel>

      {track === "fully_charged_75" ? (
        <FullyChargedJourneyPanel
          userId={user.id}
          journey={strictJourney.journey}
          history={history}
          isLoading={strictJourney.isLoadingJourney}
          isStarting={strictJourney.isStartingAttempt}
          isClosing={strictJourney.isClosingDay || strictJourney.isCancellingAttempt}
          localOnly={localOnly}
          error={strictJourney.journeyError ?? strictJourney.startError ?? strictJourney.closeError ?? strictJourney.cancelError}
          onStart={strictJourney.startAttempt}
          onClose={strictJourney.closeDay}
          onCancel={strictJourney.cancelAttempt}
        />
      ) : null}

      {error ? (
        <div role="alert" className="rounded-2xl border border-destructive/35 bg-destructive/8 p-4 text-sm">
          <p className="font-semibold">Today's formation could not be loaded.</p>
          <p className="mt-1 text-muted-foreground">Your existing data has not been changed. Refresh or try again later.</p>
        </div>
      ) : null}

      <section aria-labelledby="daily-circuits-title">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <p className="future-eyebrow">Five Controllables</p>
            <h2 id="daily-circuits-title" className="mt-1 font-display text-xl font-semibold">Daily circuits</h2>
          </div>
          <span className="text-xs text-muted-foreground">{isLoading ? "Loading…" : `${satisfiedCount} recorded`}</span>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {circuits.map(({ circuit, evaluation }) => (
            <CircuitSummaryCard
              key={circuit}
              circuit={circuit}
              evaluation={evaluation}
              disabled={!strictDayOpen}
              onOpen={() => navigate(`${APP_ROUTES.formationToday}/${circuit}`)}
            />
          ))}
        </div>
      </section>

      <FuturePanel className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Trophy className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div>
            <p className="text-sm font-semibold">
              {track === "fully_charged_75" && strictJourney.journey?.attemptStatus === "completed"
                ? "Your journey completion is ready."
                : "Test the journey completion experience."}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {track === "fully_charged_75" && strictJourney.journey?.attemptStatus === "completed" && !localOnly
                ? "View the immutable count record, add a private closing reflection, and create a privacy-safe milestone."
                : "Preview counts, private closing reflection, next steps, and a privacy-safe milestone. The preview never claims a real journey completion."}
            </p>
          </div>
        </div>
        <Button variant="futureOutline" onClick={() => navigate(APP_ROUTES.formationCompletion)} className="shrink-0 gap-2">
          {track === "fully_charged_75" && strictJourney.journey?.attemptStatus === "completed" && !localOnly ? "View completion" : "Preview completion"} <ArrowRight className="h-4 w-4" />
        </Button>
      </FuturePanel>

      <FuturePanel className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <History className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <div>
            <p className="text-sm font-semibold">Your Life OS history remains available.</p>
            <p className="mt-1 text-xs text-muted-foreground">Existing reflections, proof, snapshots, promises, and activities are not converted or deleted by this test experience.</p>
          </div>
        </div>
        <Button variant="futureOutline" onClick={() => navigate(APP_ROUTES.home)} className="shrink-0 gap-2">
          Legacy dashboard <ArrowRight className="h-4 w-4" />
        </Button>
      </FuturePanel>
    </div>
  );
}

function CircuitSummaryCard({
  circuit,
  evaluation,
  onOpen,
  disabled,
}: {
  circuit: CircuitType;
  evaluation: ReturnType<typeof evaluateCircuit>;
  onOpen: () => void;
  disabled?: boolean;
}) {
  const definition = CIRCUIT_DEFINITIONS[circuit];
  const guide = CONTROLLABLE_GUIDES[circuit];
  const classes = getControllableGuideClasses(circuit);
  const statusComplete = evaluation.isSatisfiedForTrack;
  const recordedPercent = evaluation.totalCount ? (evaluation.recordedCount / evaluation.totalCount) * 100 : 0;

  return (
    <article className={cn("relative overflow-hidden rounded-2xl border p-4", classes.cardClass)}>
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-current/10 bg-background/70 text-2xl" aria-hidden="true">{guide.emoji}</span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="future-eyebrow">{guide.role}</p>
              <h3 className="mt-1 font-display text-lg font-semibold text-foreground">{definition.name}</h3>
            </div>
            <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold", statusComplete ? "bg-primary/12 text-primary" : "bg-background/65 text-muted-foreground")}>
              {statusComplete ? <Check className="h-3.5 w-3.5" /> : <CircleDashed className="h-3.5 w-3.5" />}
              {evaluation.statusLabel}
            </span>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{definition.purpose}</p>
        </div>
      </div>

      <div className="mt-4 space-y-2 border-t border-current/10 pt-3">
        <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
          <span>{evaluation.statusDescription}</span>
          <span className="shrink-0 font-semibold">{evaluation.recordedCount}/{evaluation.totalCount}</span>
        </div>
        <Progress
          value={recordedPercent}
          className="h-1.5 bg-background/70"
          aria-label={`${definition.name}: ${evaluation.recordedCount} of ${evaluation.totalCount} practices recorded`}
        />
      </div>

      {evaluation.missingRequiredActionIds.length ? (
        <div className="mt-3 rounded-xl bg-background/60 px-3 py-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.13em] text-muted-foreground">Still open</p>
          <p className="mt-1 text-xs text-foreground">
            {evaluation.missingRequiredActionIds.slice(0, 2).map((id) => getActionLabel(circuit, id)).join(" · ")}
            {evaluation.missingRequiredActionIds.length > 2 ? ` · +${evaluation.missingRequiredActionIds.length - 2} more` : ""}
          </p>
        </div>
      ) : null}

      <Button variant="ghost" onClick={onOpen} disabled={disabled} className="mt-3 w-full justify-between rounded-xl bg-background/45 px-3">
        {disabled ? "Available on the active day" : `Open ${definition.name}`} <ChevronRight className="h-4 w-4" />
      </Button>
    </article>
  );
}

function formatDisplayDate(localDate: string): string {
  return new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${localDate}T00:00:00Z`));
}
