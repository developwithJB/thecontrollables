import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarClock, CheckCircle2, Flag, LockKeyhole, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { FutureChip, FuturePanel } from "@/components/ui/future";
import type { FormationCircuitEntry } from "@/domain/formation/circuits";
import { getLocalDate } from "@/domain/formation/circuitRules";
import {
  FORMATION_SEASON_LABELS,
  FULLY_CHARGED_TOTAL_DAYS,
  addLocalCalendarDays,
  getFullyChargedDayGuide,
  getLocalDateInTimezone,
} from "@/domain/formation/fullyChargedJourney";
import { loadPublishedFormationContentForDay } from "@/data/formation/contentRepository";
import type { FullyChargedTodayState } from "@/data/formation/fullyChargedRepository";

interface FullyChargedJourneyPanelProps {
  userId: string;
  journey: FullyChargedTodayState | null;
  history: FormationCircuitEntry[];
  isLoading: boolean;
  isStarting: boolean;
  isClosing: boolean;
  localOnly: boolean;
  error: unknown;
  onStart: (input: {
    startLocalDate: string;
    timezone: string;
    mainPromise: string;
    strictOptIn: boolean;
    rulesAccepted: boolean;
    personalCovenantAccepted: boolean;
    environmentPrepared: boolean;
    privacySafetyAcknowledged: boolean;
    idempotencyKey: string;
    previousAttemptId?: string | null;
  }) => Promise<unknown>;
  onClose: (input: {
    attemptId: string;
    idempotencyKey: string;
    circuitHistory: FormationCircuitEntry[];
  }) => Promise<unknown>;
  onCancel: (input: { attemptId: string; reasonCode: "user_cancelled" | "health_safety" }) => Promise<unknown>;
}

export function FullyChargedJourneyPanel(props: FullyChargedJourneyPanelProps) {
  if (props.isLoading) {
    return (
      <FuturePanel className="h-48 animate-pulse" aria-label="Loading Fully Charged journey">
        <span className="sr-only">Loading Fully Charged journey</span>
      </FuturePanel>
    );
  }

  if (!props.journey || ["ended", "cancelled"].includes(props.journey.attemptStatus)) {
    return <StrictStartPanel {...props} previousAttemptId={props.journey?.attemptId ?? null} />;
  }

  if (props.journey.attemptStatus === "completed") {
    return (
      <FuturePanel className="p-5">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div>
            <p className="future-eyebrow">75 days complete</p>
            <h2 className="mt-1 font-display text-xl font-semibold">Your completion record is ready.</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              The record celebrates practices you completed. It does not measure your standing with God.
            </p>
          </div>
        </div>
      </FuturePanel>
    );
  }

  return <ActiveJourneyPanel {...props} journey={props.journey} />;
}

function ActiveJourneyPanel(
  props: FullyChargedJourneyPanelProps & { journey: FullyChargedTodayState },
) {
  const { journey, history, localOnly } = props;
  const guide = journey.dayNumber ? getFullyChargedDayGuide(journey.dayNumber) : null;
  const publishedContent = useQuery({
    queryKey: ["formation-day-content", "fully_charged_75", journey.attemptId, journey.dayNumber],
    queryFn: () => loadPublishedFormationContentForDay("fully_charged_75", journey.dayNumber!),
    enabled: !localOnly && Boolean(journey.dayNumber),
    staleTime: 0,
  });

  const completedCircuits = useMemo(
    () =>
      history.filter(
        (entry) =>
          entry.track === "fully_charged_75" &&
          entry.localDate === journey.localDate &&
          entry.completionState === "complete",
      ).length,
    [history, journey.localDate],
  );
  const canPracticeToday =
    journey.attemptStatus === "active" &&
    journey.dayStatus === "open" &&
    journey.localDate === getLocalDateInTimezone(journey.startTimezone);
  const canClose = canPracticeToday && completedCircuits === 5;
  const canCancel = journey.attemptStatus === "scheduled" || canPracticeToday;
  const title = localOnly ? guide?.title : publishedContent.data?.title.replace(/^Day \d+:\s*/i, "");
  const scriptureReference = localOnly ? guide?.scriptureReference : publishedContent.data?.scriptureReference;

  return (
    <FuturePanel className="space-y-5 p-5" data-testid="fully-charged-journey-panel">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap gap-2">
            <FutureChip icon={<Flag className="h-3.5 w-3.5" />} label={`Day ${journey.dayNumber ?? "—"} of 75`} />
            {journey.season ? <FutureChip label={FORMATION_SEASON_LABELS[journey.season]} /> : null}
            {localOnly ? <FutureChip icon={<Sparkles className="h-3.5 w-3.5" />} label="QA copy draft" /> : null}
          </div>
          <h2 className="mt-3 font-display text-2xl font-semibold">{title ?? "Today's formation"}</h2>
          {scriptureReference ? <p className="mt-1 text-sm font-semibold text-primary">{scriptureReference}</p> : null}
        </div>
        <div className="min-w-[150px]">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Journey progress</p>
          <p className="mt-1 text-2xl font-semibold">{journey.completedDays}<span className="text-sm text-muted-foreground"> / 75</span></p>
          <Progress value={(journey.completedDays / FULLY_CHARGED_TOTAL_DAYS) * 100} className="mt-2 h-1.5" />
        </div>
      </div>

      {canPracticeToday ? (
        <div className="rounded-2xl border border-primary/15 bg-primary/5 p-4">
          {localOnly && guide ? (
            <div className="space-y-3 text-sm leading-relaxed">
              <p>{guide.invitation}</p>
              <div><p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">Private reflection</p><p className="mt-1">{guide.reflectionPrompt}</p></div>
              <div><p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">Environment and service</p><p className="mt-1">{guide.servicePrompt}</p></div>
            </div>
          ) : publishedContent.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading today's reviewed assignment…</p>
          ) : publishedContent.data ? (
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{publishedContent.data.body}</p>
          ) : (
            <p role="alert" className="text-sm text-destructive">Today's reviewed content is unavailable. The day cannot be represented as ready.</p>
          )}
        </div>
      ) : (
        <div className="flex items-start gap-3 rounded-2xl border bg-muted/35 p-4">
          <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <div>
            <p className="text-sm font-semibold">Day {journey.dayNumber} is scheduled for {journey.localDate}.</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">The next day opens at its fixed {journey.startTimezone} calendar boundary. Future work cannot be pre-completed.</p>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold">{completedCircuits} of 5 circuits server-ready</p>
          <p className="mt-1 text-xs text-muted-foreground">The day completes only after all five circuits and an explicit closeout.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            disabled={props.isClosing || !canCancel}
            onClick={() => {
              const scheduled = journey.attemptStatus === "scheduled";
              const message = scheduled
                ? "Cancel this scheduled attempt? Its setup will remain in history, and this attempt cannot be reopened."
                : "End this attempt for health or safety? Completed history will remain, and this attempt cannot be reopened.";
              if (window.confirm(message)) {
                void props.onCancel({
                  attemptId: journey.attemptId,
                  reasonCode: scheduled ? "user_cancelled" : "health_safety",
                }).catch(() => undefined);
              }
            }}
          >
            {journey.attemptStatus === "scheduled" ? "Cancel scheduled attempt" : "End for health or safety"}
          </Button>
          <Button
            variant="future"
            disabled={!canClose || props.isClosing || (!localOnly && !publishedContent.data)}
            onClick={() => {
              void props.onClose({
                attemptId: journey.attemptId,
                idempotencyKey: `formation:${journey.attemptId}:day:${journey.dayNumber}:close`,
                circuitHistory: history,
              }).catch(() => undefined);
            }}
          >
            {props.isClosing ? "Closing…" : canClose ? "Close today" : `${completedCircuits}/5 complete`}
          </Button>
        </div>
      </div>
      {props.error ? <p role="alert" className="text-sm text-destructive">{errorMessage(props.error)}</p> : null}
    </FuturePanel>
  );
}

function StrictStartPanel(
  props: FullyChargedJourneyPanelProps & { previousAttemptId: string | null },
) {
  const today = getLocalDate();
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const [startLocalDate, setStartLocalDate] = useState(today);
  const [mainPromise, setMainPromise] = useState("");
  const [checks, setChecks] = useState({
    strictOptIn: false,
    rulesAccepted: false,
    personalCovenantAccepted: false,
    environmentPrepared: false,
    privacySafetyAcknowledged: false,
  });
  const ready = mainPromise.trim().length > 0 && Object.values(checks).every(Boolean);
  const previousEnded = props.journey?.attemptStatus === "ended";

  const toggle = (key: keyof typeof checks, value: boolean) => setChecks((current) => ({ ...current, [key]: value }));

  return (
    <FuturePanel className="space-y-5 p-5" data-testid="fully-charged-start-panel">
      <div className="flex items-start gap-3">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <div>
          <p className="future-eyebrow">{previousEnded ? "Begin again" : "Strict readiness"}</p>
          <h2 className="mt-1 font-display text-xl font-semibold">Choose 75 consecutive local days knowingly.</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Every day requires all five circuits and a server-confirmed closeout. An incomplete or unclosed day ends this attempt; history remains unchanged, and beginning again creates a new attempt.
          </p>
        </div>
      </div>

      {previousEnded ? (
        <div className="rounded-2xl border bg-muted/35 p-4 text-sm">
          <p className="font-semibold">Your previous attempt ended honestly.</p>
          <p className="mt-1 text-muted-foreground">
            Attempt {props.journey?.sequenceNumber} remains in history with {props.journey?.completedDays ?? 0} completed {props.journey?.completedDays === 1 ? "day" : "days"}. Complete readiness again only when the timing is right.
          </p>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="fully-charged-start-date">Start date</Label>
          <Input id="fully-charged-start-date" type="date" min={today} max={addLocalCalendarDays(today, 30)} value={startLocalDate} onChange={(event) => setStartLocalDate(event.target.value)} />
          <p className="text-xs text-muted-foreground">Fixed timezone: {timezone}</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="fully-charged-main-promise">Main Promise</Label>
          <Input id="fully-charged-main-promise" maxLength={1000} value={mainPromise} onChange={(event) => setMainPromise(event.target.value)} placeholder="One clear promise you can answer honestly" />
          <p className="text-xs text-muted-foreground">Private. Keep it specific and realistically completable.</p>
        </div>
      </div>

      <div className="space-y-3 rounded-2xl border p-4">
        <ReadinessCheck checked={checks.strictOptIn} onChange={(value) => toggle("strictOptIn", value)} label="I freely choose the strict 75-day path; it is not required or the default." />
        <ReadinessCheck checked={checks.rulesAccepted} onChange={(value) => toggle("rulesAccepted", value)} label="I understand that all five circuits and explicit closeout are required each local day." />
        <ReadinessCheck checked={checks.personalCovenantAccepted} onChange={(value) => toggle("personalCovenantAccepted", value)} label="My nutrition, hydration, and movement covenant is personal, safe, and consistent with relevant clinical guidance." />
        <ReadinessCheck checked={checks.environmentPrepared} onChange={(value) => toggle("environmentPrepared", value)} label="I prepared one physical, digital, calendar, or relational condition for Day 1." />
        <ReadinessCheck checked={checks.privacySafetyAcknowledged} onChange={(value) => toggle("privacySafetyAcknowledged", value)} label="I will keep prayer, wellness, proof, and service-recipient details private and adapt rather than override safety." />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-center gap-2 text-xs text-muted-foreground"><LockKeyhole className="h-3.5 w-3.5" />Private attempt and fixed-timezone day record</p>
        <Button
          variant="future"
          disabled={!ready || props.isStarting}
          onClick={() => {
            void props.onStart({
              startLocalDate,
              timezone,
              mainPromise,
              ...checks,
              idempotencyKey: `formation:${props.userId}:fully-charged:start:${startLocalDate}:${props.previousAttemptId ?? "first"}`,
              previousAttemptId: props.previousAttemptId,
            }).catch(() => undefined);
          }}
        >
          {props.isStarting ? "Creating 75 days…" : previousEnded ? "Begin a new attempt" : "Start Fully Charged"}
        </Button>
      </div>
      {props.error ? <p role="alert" className="text-sm text-destructive">{errorMessage(props.error)}</p> : null}
    </FuturePanel>
  );
}

function ReadinessCheck({ checked, onChange, label }: { checked: boolean; onChange: (value: boolean) => void; label: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed">
      <Checkbox checked={checked} onCheckedChange={(value) => onChange(value === true)} className="mt-0.5" />
      <span>{label}</span>
    </label>
  );
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") return error.message;
  return "The Fully Charged journey could not be updated. Try again.";
}
