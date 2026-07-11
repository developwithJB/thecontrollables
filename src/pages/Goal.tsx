import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  Circle,
  Flag,
  Fuel,
  Gauge,
  Info,
  Moon,
  Route,
  ShieldCheck,
  TimerReset,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useDatedGoal } from "@/hooks/useDatedGoal";
import { useLifeOSUser } from "@/hooks/useLifeOSAuth";
import { cn } from "@/lib/utils";
import {
  CHICAGO_MARATHON_WEEKS,
  getChicagoDayPrescription,
  getChicagoWeekDates,
  getGoalAdjustment,
  getGoalCountdownDays,
  getGoalNutritionTarget,
  type GoalLogStatus,
} from "@/lib/datedGoal";

const STATUS_COPY: Record<GoalLogStatus, string> = {
  completed: "Completed",
  modified: "Modified",
  skipped: "Skipped",
};

function booleanLabel(value: boolean | null): string {
  if (value === null) return "Not logged";
  return value ? "Yes" : "No";
}

export default function Goal() {
  const user = useLifeOSUser();
  const { toast } = useToast();
  const {
    goal,
    logs,
    healthRows,
    week,
    weekLogs,
    weeklyScore,
    drift,
    today,
    todayLog,
    isLoading,
    error,
    saveLog,
    isSaving,
  } = useDatedGoal(user.id);
  const [logOpen, setLogOpen] = useState(false);
  const [status, setStatus] = useState<GoalLogStatus>("completed");
  const [actualMiles, setActualMiles] = useState("");
  const [strengthCompleted, setStrengthCompleted] = useState(false);
  const [fuelingCompleted, setFuelingCompleted] = useState(false);
  const [painAffectingStride, setPainAffectingStride] = useState(false);
  const [bodyFeel, setBodyFeel] = useState<"good" | "normal" | "heavy" | "pain">("normal");

  const prescription = useMemo(() => getChicagoDayPrescription(today), [today]);
  const requiresFuelLog = ["quality", "long", "race"].includes(prescription.sessionType);
  const currentHealth = healthRows[0] ?? null;
  const adjustment = getGoalAdjustment(prescription, {
    recovery: currentHealth?.recovery_score ?? null,
    sleepMinutes: currentHealth?.sleep_minutes ?? null,
    recentRecoveries: healthRows.slice(0, 3).map((row) => row.recovery_score),
    painAffectingStride,
    legsFeelDead: bodyFeel === "heavy",
  });
  const nutrition = getGoalNutritionTarget(prescription);
  const countdown = goal ? getGoalCountdownDays(today, goal.event_date) : 0;
  const weekDates = week ? getChicagoWeekDates(week) : [];
  const milesCompleted = weekLogs.reduce((sum, log) => sum + (log.actualMiles ?? 0), 0);
  const mileageProgress = week ? Math.min(100, Math.round((milesCompleted / week.mileageMin) * 100)) : 0;

  useEffect(() => {
    if (!todayLog) return;
    setStatus(todayLog.status);
    setActualMiles(todayLog.actual_miles === null ? "" : String(todayLog.actual_miles));
    setStrengthCompleted(todayLog.strength_completed);
    setFuelingCompleted(todayLog.fueling_completed ?? false);
    setPainAffectingStride(todayLog.pain_affecting_stride);
    setBodyFeel((todayLog.body_feel as typeof bodyFeel) || "normal");
  }, [todayLog]);

  const handleSave = async () => {
    try {
      await saveLog({
        date: today,
        status,
        actualMiles: actualMiles ? Number(actualMiles) : null,
        strengthCompleted,
        fuelingCompleted: requiresFuelLog ? fuelingCompleted : null,
        painAffectingStride,
        bodyFeel,
      });
      setLogOpen(false);
      toast({ title: "Today logged", description: status === "skipped" ? "No catch-up work. Protect the next session." : "The plan now knows what actually happened." });
    } catch (saveError) {
      toast({ title: "Could not save", description: saveError instanceof Error ? saveError.message : "Try again.", variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3 pb-24">
        <div className="h-36 animate-pulse rounded-2xl bg-muted/50" />
        <div className="h-72 animate-pulse rounded-2xl bg-muted/40" />
      </div>
    );
  }

  if (error || !goal) {
    return (
      <div className="rounded-2xl border border-border/50 bg-card/70 p-6 text-center">
        <Flag className="mx-auto h-8 w-8 text-muted-foreground" />
        <h1 className="mt-3 font-display text-xl font-bold">No active dated goal</h1>
        <p className="mt-2 text-sm text-muted-foreground">When a finish line is locked, the daily operating plan will live here.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4 pb-24">
      <motion.header
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl border border-sky-400/20 bg-[radial-gradient(circle_at_top_right,hsl(199_90%_50%/.14),transparent_42%),linear-gradient(135deg,hsl(var(--card)),hsl(217_45%_10%))] p-5"
      >
        <div className="relative flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-300">
              <Route className="h-3.5 w-3.5" /> Goal operating system
            </p>
            <h1 className="mt-2 font-display text-2xl font-bold sm:text-3xl">{goal.title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{goal.target_result}</p>
          </div>
          <div className="shrink-0 text-right">
            <p className="font-display text-4xl font-bold leading-none text-sky-300">{countdown}</p>
            <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">days to go</p>
          </div>
        </div>

        {week ? (
          <div className="relative mt-5">
            <div className="mb-2 flex items-center justify-between text-xs">
              <span className="font-semibold text-foreground">Week {week.week} of 13</span>
              <span className="text-muted-foreground">{week.keyFocus}</span>
            </div>
            <Progress value={(week.week / 13) * 100} className="h-1.5 bg-white/10" />
          </div>
        ) : (
          <p className="relative mt-5 text-sm font-medium text-sky-200">Setup weekend. The build begins Monday.</p>
        )}

        <Dialog>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="relative mt-3 h-8 px-2 text-xs text-muted-foreground">
              <Info className="mr-1.5 h-3.5 w-3.5" /> Plan rules
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[86vh] overflow-y-auto sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Sub-4 operating rules</DialogTitle>
              <DialogDescription>The detail stays here. Today stays simple.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 text-sm sm:grid-cols-2">
              {[
                ["Five priorities", "Run 4-5x. One long run. One quality run. Strength 2x without soreness. Average 8+ hours in bed and fuel the build."],
                ["WHOOP rule", "Green: follow. Yellow: use body feel. Red: easy Zone 1-2 or rest. Two reds in three days: remove speed and lower-body strength; cut the week 20%."],
                ["Sleep", "Fixed wake time. Count back 8.5 hours. Add 45-75 minutes nightly. Caffeine stops 8-10 hours before bed."],
                ["Fuel", "150-170g protein daily. Carbohydrate rises from 250-325g on rest days to 425-550g on key days. Long runs build toward 60-75g/hour."],
                ["EBC recovery", "Sleep, calories, carbs, hydration, and easy movement come first. Compression 20-30 minutes. Sauna 10-20 minutes after easy work. Use cold selectively."],
                ["Pain", "Stop for pain that changes stride, localized bone pain, swelling, progressive pain, chest pain, fainting, unusual breathlessness, or heart irregularity."],
                ["Readiness by mid-September", "Four consecutive 30+ mile weeks. 18 miles without collapse. Six late miles near marathon pace. No persistent pain. Sleep toward 85%+. Fueling tolerated."],
                ["Race execution", "Target 3:58-3:59. Miles 1-3 at 9:15-9:20. Miles 4-20 at 9:05-9:10. Stay controlled through 24, then race."],
              ].map(([title, copy]) => (
                <div key={title} className="rounded-xl border border-border/50 bg-muted/20 p-3">
                  <p className="font-semibold text-foreground">{title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{copy}</p>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </motion.header>

      <div className="grid gap-4 lg:grid-cols-[1.35fr_.65fr]">
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-2xl border border-border/50 bg-card/75 p-4 shadow-[0_20px_70px_hsl(220_45%_3%/.18)]"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">Today · {prescription.dayName}</p>
              <h2 className="mt-1 font-display text-2xl font-bold">{prescription.title}</h2>
              <p className="mt-1 text-sm font-semibold text-sky-300">{prescription.distanceLabel}</p>
            </div>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" aria-label="View session details">
                  <Info className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>{prescription.title}</DialogTitle>
                  <DialogDescription>{prescription.instruction}</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 text-sm">
                  {prescription.details.length ? (
                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Session</p>
                      <ul className="space-y-2">
                        {prescription.details.map((detail) => <li key={detail} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{detail}</li>)}
                      </ul>
                    </div>
                  ) : null}
                  {prescription.strengthDetails.length ? (
                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Strength</p>
                      <ul className="space-y-2">
                        {prescription.strengthDetails.map((detail) => <li key={detail} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{detail}</li>)}
                      </ul>
                    </div>
                  ) : null}
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <p className="mt-4 text-sm leading-relaxed text-foreground">{prescription.instruction}</p>

          <Button
            onClick={() => setLogOpen(true)}
            className="mt-4 h-12 w-full bg-sky-400 font-semibold text-slate-950 hover:bg-sky-300"
          >
            {todayLog ? `Update · ${STATUS_COPY[todayLog.status]}` : "Log today's work"}
          </Button>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            <div className="rounded-xl border border-border/40 bg-background/35 p-3">
              <Gauge className="mb-2 h-4 w-4 text-emerald-300" />
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">WHOOP</p>
              <p className="mt-1 text-sm font-bold">{currentHealth?.recovery_score ?? "--"}{currentHealth?.recovery_score !== null && currentHealth?.recovery_score !== undefined ? "%" : ""}</p>
            </div>
            <div className="rounded-xl border border-border/40 bg-background/35 p-3">
              <Moon className="mb-2 h-4 w-4 text-violet-300" />
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Sleep</p>
              <p className="mt-1 text-sm font-bold">{currentHealth?.sleep_minutes ? `${Math.floor(currentHealth.sleep_minutes / 60)}h ${currentHealth.sleep_minutes % 60}m` : "--"}</p>
            </div>
            <div className="col-span-2 rounded-xl border border-border/40 bg-background/35 p-3 sm:col-span-1">
              <TimerReset className="mb-2 h-4 w-4 text-sky-300" />
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Tonight</p>
              <p className="mt-1 text-sm font-bold">{prescription.sleepTarget}</p>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-sky-400/15 bg-sky-400/5 p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Protein</p>
              <p className="mt-1 text-sm font-bold text-sky-200">{nutrition.protein}</p>
            </div>
            <div className="rounded-xl border border-sky-400/15 bg-sky-400/5 p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Carbohydrate</p>
              <p className="mt-1 text-sm font-bold text-sky-200">{nutrition.carbohydrates}</p>
            </div>
          </div>

          <div className={cn(
            "mt-3 rounded-xl border px-3 py-3",
            adjustment.mode === "stop" || adjustment.mode === "recover" ? "border-rose-400/20 bg-rose-400/8" :
              adjustment.mode === "reduce" || adjustment.mode === "check" ? "border-amber-400/20 bg-amber-400/8" :
                "border-emerald-400/20 bg-emerald-400/8",
          )}>
            <div className="flex gap-2">
              {adjustment.mode === "follow" ? <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />}
              <div>
                <p className="text-xs font-bold">{adjustment.label}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{adjustment.message}</p>
              </div>
            </div>
          </div>

          {prescription.fuelingCue ? (
            <div className="mt-3 flex items-start gap-2 rounded-xl border border-sky-400/15 bg-sky-400/5 px-3 py-3 text-xs text-muted-foreground">
              <Fuel className="mt-0.5 h-4 w-4 shrink-0 text-sky-300" />
              <span>{prescription.fuelingCue}</span>
            </div>
          ) : null}

          <Dialog open={logOpen} onOpenChange={setLogOpen}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
              <DialogHeader>
                <DialogTitle>What actually happened?</DialogTitle>
                <DialogDescription>One honest read. No catch-up debt.</DialogDescription>
              </DialogHeader>

              <div className="space-y-5">
                <div className="grid grid-cols-3 gap-2">
                  {(Object.keys(STATUS_COPY) as GoalLogStatus[]).map((option) => (
                    <Button
                      key={option}
                      type="button"
                      variant={status === option ? "default" : "outline"}
                      className="h-10 px-2 text-xs"
                      onClick={() => setStatus(option)}
                    >
                      {STATUS_COPY[option]}
                    </Button>
                  ))}
                </div>

                {prescription.isPlannedRun || actualMiles ? (
                  <div className="space-y-2">
                    <Label htmlFor="actual-miles">Actual miles</Label>
                    <Input id="actual-miles" type="number" min="0" max="30" step="0.1" inputMode="decimal" value={actualMiles} onChange={(event) => setActualMiles(event.target.value)} placeholder="0.0" />
                  </div>
                ) : null}

                <div>
                  <Label className="mb-2 block">Body feel</Label>
                  <div className="grid grid-cols-4 gap-2">
                    {(["good", "normal", "heavy", "pain"] as const).map((feel) => (
                      <button
                        key={feel}
                        type="button"
                        onClick={() => {
                          setBodyFeel(feel);
                          if (feel === "pain") setPainAffectingStride(true);
                        }}
                        className={cn("rounded-lg border px-2 py-2 text-xs font-medium capitalize", bodyFeel === feel ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground")}
                      >
                        {feel}
                      </button>
                    ))}
                  </div>
                </div>

                {prescription.strengthDetails.length ? (
                  <div className="flex items-center justify-between rounded-xl border border-border/50 p-3">
                    <Label htmlFor="strength-completed">Strength completed</Label>
                    <Switch id="strength-completed" checked={strengthCompleted} onCheckedChange={setStrengthCompleted} />
                  </div>
                ) : null}

                {requiresFuelLog ? (
                  <div className="flex items-center justify-between rounded-xl border border-border/50 p-3">
                    <Label htmlFor="fueling-completed">Fueling completed</Label>
                    <Switch id="fueling-completed" checked={fuelingCompleted} onCheckedChange={setFuelingCompleted} />
                  </div>
                ) : null}

                <div className="flex items-center justify-between rounded-xl border border-rose-400/20 bg-rose-400/5 p-3">
                  <div>
                    <Label htmlFor="pain-stride">Pain changed my stride</Label>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">This triggers a stop signal.</p>
                  </div>
                  <Switch id="pain-stride" checked={painAffectingStride} onCheckedChange={setPainAffectingStride} />
                </div>

                <Button onClick={handleSave} disabled={isSaving} className="h-12 w-full">
                  {isSaving ? "Saving..." : "Save today's read"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </motion.section>

        <div className="space-y-4">
          <section className="rounded-2xl border border-border/50 bg-card/70 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">This week</p>
                <h2 className="mt-1 font-display text-lg font-bold">{week?.mileageLabel ?? "Setup"}</h2>
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-9 text-xs">13 weeks <ChevronRight className="ml-1 h-3.5 w-3.5" /></Button>
                </DialogTrigger>
                <DialogContent className="max-h-[86vh] overflow-y-auto sm:max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>13-week progression</DialogTitle>
                    <DialogDescription>Do not jump ahead because you feel good.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-2">
                    {CHICAGO_MARATHON_WEEKS.map((planWeek) => (
                      <details key={planWeek.week} className={cn("group rounded-xl border p-3", week?.week === planWeek.week ? "border-primary/35 bg-primary/8" : "border-border/45")} open={week?.week === planWeek.week || undefined}>
                        <summary className="grid cursor-pointer list-none grid-cols-[40px_1fr_auto] items-center gap-3">
                          <span className="text-xs font-bold text-muted-foreground">W{planWeek.week}</span>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold">{planWeek.keyFocus}</p>
                            <p className="truncate text-xs text-muted-foreground">Long: {planWeek.longRunLabel}</p>
                          </div>
                          <span className="text-xs font-bold">{planWeek.mileageLabel}</span>
                        </summary>
                        <div className="mt-3 space-y-2 border-t border-border/40 pt-3 text-xs leading-relaxed text-muted-foreground">
                          <p><span className="font-semibold text-foreground">Tuesday:</span> {planWeek.qualityWorkout}</p>
                          <p><span className="font-semibold text-foreground">Saturday:</span> {planWeek.longRunWorkout}</p>
                        </div>
                      </details>
                    ))}
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {week ? (
              <>
                <div className="mt-4 flex items-end justify-between">
                  <p className="font-display text-3xl font-bold">{milesCompleted.toFixed(1)}</p>
                  <p className="pb-1 text-xs text-muted-foreground">miles logged</p>
                </div>
                <Progress value={mileageProgress} className="mt-2 h-1.5" />

                <div className="mt-4 grid grid-cols-7 gap-1">
                  {weekDates.map((date) => {
                    const dayLog = logs.find((log) => log.logDate === date);
                    const isToday = date === today;
                    return (
                      <div key={date} className={cn("flex flex-col items-center gap-1 rounded-lg py-2", isToday && "bg-primary/8")}>
                        <span className="text-[9px] uppercase text-muted-foreground">{new Date(`${date}T12:00:00`).toLocaleDateString("en-US", { weekday: "narrow" })}</span>
                        {dayLog ? (
                          dayLog.status === "skipped" ? <Circle className="h-4 w-4 text-rose-300" /> : <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                        ) : (
                          <Circle className={cn("h-4 w-4", isToday ? "text-primary" : "text-muted-foreground/35")} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            ) : null}
          </section>

          <section className={cn("rounded-2xl border p-4", drift.level === "drifting" ? "border-rose-400/25 bg-rose-400/7" : drift.level === "watch" ? "border-amber-400/25 bg-amber-400/7" : "border-emerald-400/20 bg-emerald-400/5")}>
            <div className="flex items-start gap-3">
              {drift.level === "on_track" ? <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-300" /> : <AlertTriangle className="h-5 w-5 shrink-0 text-amber-300" />}
              <div>
                <p className="text-sm font-bold">{drift.label}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{drift.message}</p>
                {drift.reasons.length ? (
                  <ul className="mt-2 space-y-1 text-xs text-foreground">
                    {drift.reasons.slice(0, 3).map((reason) => <li key={reason}>· {reason}</li>)}
                  </ul>
                ) : null}
              </div>
            </div>
          </section>
        </div>
      </div>

      {weeklyScore && week ? (
        <section className="rounded-2xl border border-border/50 bg-card/70 p-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Weekly scorecard</p>
              <h2 className="mt-1 font-display text-lg font-bold">{weeklyScore.wins}/6 signals</h2>
            </div>
            <p className="text-xs text-muted-foreground">Sunday truth, not judgment</p>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {[
              ["Runs", `${weeklyScore.completedRuns}/${weeklyScore.plannedRunsGoal}`, weeklyScore.completedRuns >= 4],
              ["Long run", booleanLabel(weeklyScore.longRunCompleted), weeklyScore.longRunCompleted],
              ["Strength", `${weeklyScore.strengthSessions}/2`, weeklyScore.strengthSessions >= (week.week >= 11 ? 1 : 2)],
              ["Sleep", weeklyScore.averageSleepPerformance === null ? "--" : `${weeklyScore.averageSleepPerformance}%`, (weeklyScore.averageSleepPerformance ?? 0) >= 85],
              ["Fuel", booleanLabel(weeklyScore.longRunFueled), weeklyScore.longRunFueled === true],
              ["Pain-free", booleanLabel(weeklyScore.painFree), weeklyScore.painFree],
            ].map(([label, value, passed]) => (
              <div key={String(label)} className="rounded-xl border border-border/40 bg-background/30 p-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
                <p className={cn("mt-1 text-sm font-bold", passed ? "text-emerald-300" : "text-foreground")}>{value}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <p className="px-2 text-center text-xs text-muted-foreground">
        Training guidance is not medical care. Stop for pain that changes your stride or concerning symptoms.
      </p>
    </div>
  );
}
