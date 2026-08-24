import { ArrowLeft, CheckCircle2, LockKeyhole, Save, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { FutureChip, FutureHero, FuturePanel } from "@/components/ui/future";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  AwarenessCircuitEditor,
  EnvironmentCircuitEditor,
  HabitCircuitEditor,
  PerspectiveCircuitEditor,
  WellnessCircuitEditor,
  type CircuitEditorProps,
} from "@/components/formation/CircuitEditors";
import { useToast } from "@/hooks/use-toast";
import { useLifeOSUser } from "@/hooks/useLifeOSAuth";
import { useFormationTrack } from "@/hooks/useFormationTrack";
import { useFormationCircuits } from "@/hooks/useFormationCircuits";
import {
  CIRCUIT_DEFINITIONS,
  TRACK_LABELS,
  createEmptyCircuitDraft,
  isCircuitType,
  type FormationCircuitDraft,
} from "@/domain/formation/circuits";
import { evaluateCircuit, getActionLabel, getLocalDate } from "@/domain/formation/circuitRules";
import { CONTROLLABLE_GUIDES } from "@/lib/controllables";
import { APP_ROUTES } from "@/lib/appRoutes";
import { useFormationAnalytics } from "@/hooks/useFormationAnalytics";
import { useFullyChargedJourney } from "@/hooks/useFullyChargedJourney";
import { useQuery } from "@tanstack/react-query";
import { loadPublishedFormationContentForDay } from "@/data/formation/contentRepository";
import { getLocalDateInTimezone } from "@/domain/formation/fullyChargedJourney";

const CIRCUIT_EDITORS: Record<keyof typeof CIRCUIT_DEFINITIONS, (props: CircuitEditorProps) => JSX.Element> = {
  awareness: AwarenessCircuitEditor,
  perspective: PerspectiveCircuitEditor,
  habit: HabitCircuitEditor,
  wellness: WellnessCircuitEditor,
  environment: EnvironmentCircuitEditor,
};

export default function FormationCircuit() {
  const { circuitId } = useParams();
  if (!isCircuitType(circuitId)) return <Navigate to={APP_ROUTES.formationToday} replace />;
  return <FormationCircuitExperience circuit={circuitId} />;
}

function FormationCircuitExperience({ circuit }: { circuit: keyof typeof CIRCUIT_DEFINITIONS }) {
  const user = useLifeOSUser();
  const navigate = useNavigate();
  const { toast } = useToast();
  const today = getLocalDate();
  const { track } = useFormationTrack(user.id);
  const strictJourney = useFullyChargedJourney(user.id, track === "fully_charged_75");
  const strictLocalToday = strictJourney.journey
    ? getLocalDateInTimezone(strictJourney.journey.startTimezone)
    : today;
  const localDate =
    track === "fully_charged_75" && strictJourney.journey?.localDate
      ? strictJourney.journey.localDate
      : today;
  const { history, isLoading, error, saveCircuit, isSaving, localOnly } = useFormationCircuits(user.id, track);
  const dayContent = useQuery({
    queryKey: [
      "formation-day-content",
      "fully_charged_75",
      strictJourney.journey?.attemptId,
      strictJourney.journey?.dayNumber,
    ],
    queryFn: () => loadPublishedFormationContentForDay("fully_charged_75", strictJourney.journey!.dayNumber!),
    enabled: track === "fully_charged_75" && !localOnly && Boolean(strictJourney.journey?.dayNumber),
    staleTime: 0,
  });
  const trackFormation = useFormationAnalytics();
  const trackedCompletion = useRef(false);
  const trackedRecovery = useRef(false);
  const entry = history.find((candidate) => candidate.localDate === localDate && candidate.circuit === circuit);
  const persistedDraft = entry?.draft;
  const [draft, setDraft] = useState<FormationCircuitDraft>(() => entry?.draft ?? createEmptyCircuitDraft());

  useEffect(() => {
    setDraft(persistedDraft ?? createEmptyCircuitDraft());
  }, [circuit, persistedDraft, track]);

  useEffect(() => {
    trackedCompletion.current = false;
    trackedRecovery.current = false;
  }, [circuit, track]);

  useEffect(() => {
    void trackFormation("circuit_started", { track, circuit, source: "formation_today" });
  }, [circuit, track, trackFormation]);

  const evaluation = useMemo(() => evaluateCircuit(track, circuit, draft), [track, circuit, draft]);
  const definition = CIRCUIT_DEFINITIONS[circuit];
  const guide = CONTROLLABLE_GUIDES[circuit];
  const Editor = CIRCUIT_EDITORS[circuit];
  const strictDayUnavailable =
    track === "fully_charged_75" &&
    (!strictJourney.journey ||
      strictJourney.journey.attemptStatus !== "active" ||
      strictJourney.journey.dayStatus !== "open" ||
      strictJourney.journey.localDate !== strictLocalToday);

  if (track === "fully_charged_75" && strictJourney.isLoadingJourney) {
    return (
      <FuturePanel className="mx-auto h-56 max-w-4xl animate-pulse" aria-label="Loading Fully Charged day">
        <span className="sr-only">Loading Fully Charged day</span>
      </FuturePanel>
    );
  }

  if (strictDayUnavailable) {
    return <Navigate to={APP_ROUTES.formationToday} replace />;
  }

  const persistDraft = async (nextDraft = draft, quiet = false) => {
    if (track === "fully_charged_75" && !localOnly && !dayContent.data?.id) {
      throw new Error("Today's reviewed content version is unavailable. Progress was not changed.");
    }
    const saved = await saveCircuit({
      localDate,
      circuit,
      draft: nextDraft,
      contentVersionId: dayContent.data?.id ?? null,
    });
    setDraft(saved.draft);
    if (!quiet) {
      const savedEvaluation = evaluateCircuit(track, circuit, saved.draft);
      if (savedEvaluation.isSatisfiedForTrack && !trackedCompletion.current) {
        trackedCompletion.current = true;
        void trackFormation("circuit_completed", { track, circuit, outcome: savedEvaluation.state });
      }
      if (saved.draft.fields.recoveryReflection?.trim() && !trackedRecovery.current) {
        trackedRecovery.current = true;
        void trackFormation("recovery_win_recorded", { track, circuit: "habit", is_recovery: true });
      }
      toast({
        title: savedEvaluation.statusLabel,
        description: savedEvaluation.isSatisfiedForTrack
          ? `${definition.name} is recorded for today.`
          : `${savedEvaluation.missingRequiredActionIds.length} required ${savedEvaluation.missingRequiredActionIds.length === 1 ? "practice remains" : "practices remain"}. Your progress is saved.`,
      });
    }
  };

  const handleSave = async () => {
    try {
      await persistDraft(draft);
    } catch (saveError) {
      toast({ title: "Progress was not saved", description: saveError instanceof Error ? saveError.message : "Try again.", variant: "destructive" });
    }
  };

  return (
    <div className="ph-no-capture mx-auto max-w-4xl space-y-5 pb-28" data-sentry-mask>
      <Button variant="ghost" onClick={() => navigate(APP_ROUTES.formationToday)} className="-ml-2 gap-2">
        <ArrowLeft className="h-4 w-4" /> Return to Today
      </Button>

      <FutureHero
        eyebrow={`${guide.role} · ${TRACK_LABELS[track]}`}
        title={definition.name}
        icon={<span className="text-xl" aria-hidden="true">{guide.emoji}</span>}
        chips={
          <>
            <FutureChip icon={<LockKeyhole className="h-3.5 w-3.5" />} label="Private by default" />
            <FutureChip icon={<ShieldCheck className="h-3.5 w-3.5" />} label={evaluation.statusLabel} />
          </>
        }
        side={
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Today's purpose</p>
            <p className="text-sm font-semibold leading-relaxed text-foreground">{definition.purpose}</p>
            <p className="text-xs leading-relaxed text-muted-foreground">{definition.invitation}</p>
          </div>
        }
      >
        <p className="text-sm text-muted-foreground">{evaluation.statusDescription}</p>
      </FutureHero>

      {definition.privacyNote ? (
        <div className="flex items-start gap-3 rounded-2xl border border-primary/15 bg-primary/5 p-4 text-sm">
          <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div>
            <p className="font-semibold">Privacy in this circuit</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{definition.privacyNote}</p>
          </div>
        </div>
      ) : null}

      {track === "fully_charged_75" && evaluation.missingRequiredActionIds.length ? (
        <FuturePanel className="p-4">
          <div aria-live="polite">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Still open today</p>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {evaluation.missingRequiredActionIds.map((actionId) => (
                <li key={actionId} className="flex items-center gap-2 rounded-xl bg-background/65 px-3 py-2 text-sm">
                  <span className="h-2 w-2 rounded-full bg-primary/55" aria-hidden="true" />
                  {getActionLabel(circuit, actionId)}
                </li>
              ))}
            </ul>
          </div>
        </FuturePanel>
      ) : null}

      {error ? <div role="alert" className="rounded-2xl border border-destructive/35 bg-destructive/8 p-4 text-sm">This circuit could not be loaded. Existing data has not been changed.</div> : null}
      {dayContent.error ? <div role="alert" className="rounded-2xl border border-destructive/35 bg-destructive/8 p-4 text-sm">Today's reviewed assignment could not be loaded. Strict progress is temporarily read-only.</div> : null}

      <FuturePanel className="p-4 sm:p-5">
        {isLoading || (track === "fully_charged_75" && !localOnly && dayContent.isLoading) ? (
          <div className="space-y-3" aria-label="Loading circuit"><div className="h-20 animate-pulse rounded-2xl bg-muted" /><div className="h-28 animate-pulse rounded-2xl bg-muted" /></div>
        ) : track === "fully_charged_75" && !localOnly && !dayContent.data ? (
          <p className="text-sm text-muted-foreground">This strict circuit is read-only until today's reviewed content version is available.</p>
        ) : (
          <Editor
            userId={user.id}
            localDate={localDate}
            track={track}
            draft={draft}
            evaluation={evaluation}
            history={history}
            localOnly={localOnly}
            onChange={setDraft}
            onPersist={(nextDraft) => persistDraft(nextDraft, true).then(() => undefined)}
          />
        )}
      </FuturePanel>

      <FuturePanel className="p-4">
        <details>
          <summary className="cursor-pointer text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Optional private reflection</summary>
          <div className="mt-4 space-y-2">
            <Label htmlFor="circuit-reflection">What do you want to remember?</Label>
            <p id="circuit-reflection-description" className="text-xs text-muted-foreground">Private by default. This text is not sent through formation analytics.</p>
            <Textarea
              id="circuit-reflection"
              aria-describedby="circuit-reflection-description"
              value={draft.reflection}
              onChange={(event) => setDraft({ ...draft, reflection: event.target.value.slice(0, 4000) })}
              placeholder="Optional reflection…"
              className="min-h-[120px]"
            />
          </div>
        </details>
      </FuturePanel>

      <div className="sticky bottom-20 z-20 rounded-2xl border border-primary/20 bg-background/90 p-3 shadow-xl backdrop-blur-xl md:bottom-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-sm font-semibold"><CheckCircle2 className="h-4 w-4 text-primary" />{evaluation.statusLabel}</p>
            <p className="mt-1 truncate text-xs text-muted-foreground">{localOnly ? "Local QA data only" : "Saved privately to your account"} · idempotent daily record</p>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => navigate(APP_ROUTES.formationToday)}>Return to Today</Button>
            <Button variant="future" onClick={handleSave} disabled={isSaving || isLoading || (track === "fully_charged_75" && !localOnly && !dayContent.data)} className="gap-2"><Save className="h-4 w-4" />{isSaving ? "Saving…" : "Save progress"}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
