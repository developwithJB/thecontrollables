import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Check, Cross, Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { useCovenant } from "@/hooks/useCovenant";
import {
  COVENANT_DURATION_DAYS,
  COVENANT_PROMISE_DEFINITIONS,
  COVENANT_PROMISE_KEYS,
  createEmptyCovenantCheckin,
  getCovenantDayProgress,
  getCovenantPromiseDefinition,
  getTodayDateKey,
  isCovenantDayComplete,
  isCovenantPromiseComplete,
  type CovenantDailyCheckinRecord,
  type CovenantPromiseKey,
} from "@/lib/covenant";
import { cn } from "@/lib/utils";

interface CovenantCardProps {
  userId: string;
}

const EVIDENCE_PREVIEW = [
  { key: "jesusFirst", emoji: "🙏", label: "Jesus First" },
  { key: "bibleRead", emoji: "📖", label: "Bible Read" },
  { key: "alcoholFree", emoji: "🚫", label: "Alcohol Free" },
  { key: "workouts", emoji: "💪", label: "Workouts" },
] as const;

export function CovenantCard({ userId }: CovenantCardProps) {
  const covenant = useCovenant(userId);
  const [setupOpen, setSetupOpen] = useState(false);
  const [dailyOpen, setDailyOpen] = useState(false);
  const progress = covenant.activeChallenge
    ? getCovenantDayProgress(covenant.activeChallenge)
    : null;

  if (covenant.isLoading) {
    return <div className="dashboard-os-card h-64 animate-pulse rounded-[2rem] bg-muted/40" />;
  }

  return (
    <>
      <motion.section
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="dashboard-os-surface overflow-hidden rounded-[2rem] border-primary/25 p-5 sm:p-6"
        data-testid="covenant-card"
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent" />
        <div className="relative z-10 space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-primary">
                <Cross className="h-4 w-4" />
                <p className="text-[10px] font-bold uppercase tracking-[0.22em]">Your Covenant</p>
              </div>
              <div className="mt-3 flex items-end gap-3">
                <span className="font-display text-6xl font-bold leading-none text-foreground">
                  {covenant.evidence.promisesKept.toLocaleString()}
                </span>
                <span className="pb-1 text-sm font-semibold text-muted-foreground">Promises Kept</span>
              </div>
              <p className="mt-3 font-display text-base font-semibold text-foreground">
                “Confidence comes from kept promises.”
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Faithfulness does not earn grace. It becomes evidence of how grace is changing you.
              </p>
            </div>

            {covenant.activeChallenge && progress ? (
              <div className="shrink-0 rounded-2xl border border-primary/20 bg-primary/10 px-3 py-2 text-right">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">75-Day Covenant</p>
                <p className="font-display text-xl font-bold text-primary">Day {progress.dayNumber}</p>
              </div>
            ) : (
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <ShieldCheck className="h-5 w-5" />
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {EVIDENCE_PREVIEW.map((item) => (
              <div key={item.key} className="rounded-xl border border-border/60 bg-background/45 px-3 py-2.5">
                <p className="text-xs text-muted-foreground">{item.emoji} {item.label}</p>
                <p className="mt-1 font-display text-xl font-bold text-foreground">
                  {covenant.evidence[item.key].toLocaleString()}
                </p>
              </div>
            ))}
          </div>

          {covenant.activeChallenge && progress ? (
            <div className="rounded-2xl border border-primary/15 bg-background/50 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-foreground">{covenant.activeChallenge.title}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {covenant.activeChallenge.mission || "Become someone whose yes can be trusted."}
                  </p>
                </div>
                <span className="text-xs font-semibold text-primary">{Math.round(progress.progressPercent)}%</span>
              </div>
              <Progress value={progress.progressPercent} className="mt-3 h-1.5" />
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
                <span>{covenant.evidence.covenantDaysKept} covenant days kept</span>
                <span>{progress.daysRemaining} days remaining</span>
              </div>
            </div>
          ) : null}

          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-500" />
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-600 dark:text-amber-400">
                Today’s Opportunity
              </p>
            </div>
            <p className="mt-2 text-sm font-semibold text-foreground">
              Every promise you keep today becomes evidence you’ll carry forever.
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {(covenant.activeChallenge?.rules ?? COVENANT_PROMISE_KEYS).slice(0, 4).map((key) => {
                const definition = getCovenantPromiseDefinition(key);
                const complete = covenant.todayCheckin
                  ? isCovenantPromiseComplete(covenant.todayCheckin, key)
                  : false;
                return (
                  <span
                    key={key}
                    className={cn(
                      "rounded-full px-2.5 py-1 text-[10px] font-semibold",
                      complete ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-muted-foreground",
                    )}
                  >
                    {complete ? "✓" : "+1"} {definition.shortLabel}
                  </span>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            {covenant.activeChallenge ? (
              <Button onClick={() => setDailyOpen(true)} className="dashboard-primary-glow flex-1 gap-2">
                {covenant.todayCheckin?.day_complete ? <Check className="h-4 w-4" /> : null}
                {covenant.todayCheckin?.day_complete ? "Review Today’s Evidence" : "Keep Today’s Covenant"}
              </Button>
            ) : (
              <Button onClick={() => setSetupOpen(true)} className="dashboard-primary-glow flex-1">
                Begin the 75-Day Covenant
              </Button>
            )}
            <Button asChild variant="outline" className="gap-2">
              <Link to="/evidence">
                View Evidence
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </motion.section>

      <CovenantSetupDialog
        open={setupOpen}
        onOpenChange={setSetupOpen}
        onStart={covenant.startChallenge}
        isStarting={covenant.isStartingChallenge}
      />
      {covenant.activeChallenge ? (
        <CovenantDailyDialog
          open={dailyOpen}
          onOpenChange={setDailyOpen}
          challengeId={covenant.activeChallenge.id}
          userId={userId}
          rules={covenant.activeChallenge.rules}
          current={covenant.todayCheckin}
          onSave={covenant.saveToday}
          isSaving={covenant.isSavingToday}
        />
      ) : null}
    </>
  );
}

function CovenantSetupDialog({
  open,
  onOpenChange,
  onStart,
  isStarting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStart: (input: { title: string; mission?: string; rules: CovenantPromiseKey[] }) => Promise<unknown>;
  isStarting: boolean;
}) {
  const [title, setTitle] = useState("75-Day Covenant");
  const [mission, setMission] = useState("");
  const [rules, setRules] = useState<CovenantPromiseKey[]>([...COVENANT_PROMISE_KEYS]);

  const toggleRule = (key: CovenantPromiseKey) => {
    setRules((current) =>
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key],
    );
  };

  const handleStart = async () => {
    if (rules.length < 3) return;
    await onStart({ title, mission, rules });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Begin your 75-Day Covenant</DialogTitle>
          <DialogDescription>
            This is not a way to earn God’s love. It is a deliberate season for practicing faithful obedience with the grace to tell the truth and return.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="space-y-2">
            <Label htmlFor="covenant-title">Challenge name</Label>
            <Input id="covenant-title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={60} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="covenant-mission">What are these 75 days preparing you for?</Label>
            <Textarea
              id="covenant-mission"
              value={mission}
              onChange={(event) => setMission(event.target.value.slice(0, 180))}
              placeholder="Name the mission, season, race, calling, or person you want to become."
              className="min-h-20"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Daily promises</Label>
              <span className="text-[11px] text-muted-foreground">Choose at least 3</span>
            </div>
            <div className="space-y-2">
              {COVENANT_PROMISE_DEFINITIONS.map((definition) => {
                const selected = rules.includes(definition.key);
                return (
                  <button
                    key={definition.key}
                    type="button"
                    onClick={() => toggleRule(definition.key)}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors",
                      selected ? "border-primary/40 bg-primary/5" : "border-border bg-background/40",
                    )}
                  >
                    <span className="text-xl">{definition.emoji}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-foreground">{definition.label}</span>
                      <span className="block text-[11px] leading-relaxed text-muted-foreground">{definition.description}</span>
                    </span>
                    <span className={cn("mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border", selected && "border-primary bg-primary text-primary-foreground")}>
                      {selected ? <Check className="h-3 w-3" /> : null}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-muted/35 p-3 text-xs leading-relaxed text-muted-foreground">
            <strong className="text-foreground">The rule of return:</strong> missed days are recorded honestly. They do not erase prior evidence or God’s grace. Return the next day and keep walking.
          </div>

          <Button onClick={handleStart} disabled={isStarting || rules.length < 3} className="dashboard-primary-glow w-full">
            {isStarting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Start {COVENANT_DURATION_DAYS} Days
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CovenantDailyDialog({
  open,
  onOpenChange,
  challengeId,
  userId,
  rules,
  current,
  onSave,
  isSaving,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  challengeId: string;
  userId: string;
  rules: CovenantPromiseKey[];
  current: CovenantDailyCheckinRecord | null;
  onSave: (updates: Partial<CovenantDailyCheckinRecord>) => Promise<unknown>;
  isSaving: boolean;
}) {
  const [draft, setDraft] = useState<CovenantDailyCheckinRecord>(() =>
    current ?? createEmptyCovenantCheckin(challengeId, userId, getTodayDateKey()),
  );

  useEffect(() => {
    if (open) {
      setDraft(current ?? createEmptyCovenantCheckin(challengeId, userId, getTodayDateKey()));
    }
  }, [challengeId, current, open, userId]);

  const dayComplete = useMemo(() => isCovenantDayComplete(draft, rules), [draft, rules]);

  const togglePromise = (key: CovenantPromiseKey) => {
    setDraft((value) => {
      const complete = isCovenantPromiseComplete(value, key);
      switch (key) {
        case "jesus_first": return { ...value, jesus_first: !complete };
        case "bible_read": return { ...value, bible_read: !complete };
        case "alcohol_free": return { ...value, alcohol_free: !complete };
        case "workout": return { ...value, workout_count: complete ? 0 : 1 };
        case "nutrition": return { ...value, nutrition_kept: !complete };
        case "water": return { ...value, water_goal: !complete };
        case "service": return { ...value, service_count: complete ? 0 : 1 };
      }
    });
  };

  const handleSave = async () => {
    await onSave(draft);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Today’s Covenant</DialogTitle>
          <DialogDescription>
            Tell the truth about today. Every honest check becomes part of your lifetime evidence.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          {rules.map((key) => {
            const definition = getCovenantPromiseDefinition(key);
            const complete = isCovenantPromiseComplete(draft, key);
            return (
              <button
                key={key}
                type="button"
                onClick={() => togglePromise(key)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all",
                  complete ? "border-emerald-500/30 bg-emerald-500/10" : "border-border bg-background/40",
                )}
              >
                <span className="text-xl">{definition.emoji}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-foreground">{definition.label}</span>
                  <span className="block text-[11px] text-muted-foreground">{definition.description}</span>
                </span>
                <span className={cn("flex h-6 w-6 items-center justify-center rounded-full border", complete && "border-emerald-500 bg-emerald-500 text-white")}>
                  {complete ? <Check className="h-3.5 w-3.5" /> : null}
                </span>
              </button>
            );
          })}

          <div className="grid grid-cols-3 gap-2 pt-3">
            <MetricInput label="Miles" value={draft.miles} step="0.1" onChange={(value) => setDraft((currentValue) => ({ ...currentValue, miles: value }))} />
            <MetricInput label="Encouraged" value={draft.people_encouraged} onChange={(value) => setDraft((currentValue) => ({ ...currentValue, people_encouraged: value }))} />
            <MetricInput label="Verses" value={draft.scripture_memorized_count} onChange={(value) => setDraft((currentValue) => ({ ...currentValue, scripture_memorized_count: value }))} />
          </div>

          <button
            type="button"
            onClick={() => setDraft((value) => ({ ...value, journal_entry: !value.journal_entry }))}
            className={cn(
              "flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-sm",
              draft.journal_entry ? "border-primary/30 bg-primary/5 text-foreground" : "border-border text-muted-foreground",
            )}
          >
            <span>✍️ Journal entry written</span>
            {draft.journal_entry ? <Check className="h-4 w-4 text-primary" /> : null}
          </button>

          <Textarea
            value={draft.reflection ?? ""}
            onChange={(event) => setDraft((value) => ({ ...value, reflection: event.target.value.slice(0, 500) }))}
            placeholder="Where did you notice God’s help today?"
            className="mt-3 min-h-20"
          />

          <div className={cn("rounded-xl border p-3 text-xs", dayComplete ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "border-border bg-muted/30 text-muted-foreground")}>
            {dayComplete
              ? "Today’s covenant is complete. Save it as another day of kept promises."
              : "Save what is true now. You can return later for the promises still open."}
          </div>

          <Button onClick={handleSave} disabled={isSaving} className="dashboard-primary-glow mt-2 w-full">
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save Today’s Evidence
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function MetricInput({
  label,
  value,
  step = "1",
  onChange,
}: {
  label: string;
  value: number;
  step?: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="space-y-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
      <span>{label}</span>
      <Input
        type="number"
        min="0"
        step={step}
        value={value}
        onChange={(event) => onChange(Math.max(0, Number(event.target.value) || 0))}
        className="h-9 text-sm font-semibold text-foreground"
      />
    </label>
  );
}
