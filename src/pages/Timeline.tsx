import { useMemo, useState } from "react";
import { addDays, format, isToday, parseISO, subDays } from "date-fns";
import { motion } from "framer-motion";
import {
  BatteryCharging,
  CalendarCheck2,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Dumbbell,
  Eye,
  Footprints,
  Gauge,
  HeartPulse,
  History,
  Leaf,
  Plus,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Trash2,
  Utensils,
} from "lucide-react";
import { useLifeOSUser } from "@/hooks/useLifeOSAuth";
import { useTimelineDay, useTimelineMutations } from "@/hooks/useTimeline";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CONTROLLABLE_LABELS,
  MANUAL_MOMENT_TYPES,
  TIMELINE_CONTROLLABLES,
  getEventNetImpact,
  getTimelineEventLabel,
  getTimelineNextMove,
  isTimelineAssessmentEvent,
  type TimelineAssessment,
  type TimelineControllable,
  type TimelineEvent,
} from "@/lib/timeline";
import { cn } from "@/lib/utils";

const CONTROLLABLE_STYLES: Record<TimelineControllable, { color: string; bar: string }> = {
  awareness: { color: "text-sky-300", bar: "bg-sky-400" },
  perspective: { color: "text-emerald-300", bar: "bg-emerald-400" },
  habit: { color: "text-blue-300", bar: "bg-blue-400" },
  wellness: { color: "text-fuchsia-300", bar: "bg-fuchsia-400" },
  environment: { color: "text-orange-300", bar: "bg-orange-400" },
};

const EVENT_ICONS: Record<string, React.ElementType> = {
  action_completed: Sparkles,
  awareness_checkin: Eye,
  daily_practice: Gauge,
  goal_training: Footprints,
  meal: Utensils,
  meal_logged: Utensils,
  mission_completed: Sparkles,
  planner_completed: CalendarCheck2,
  planner_skipped: RotateCcw,
  promise_kept: ShieldCheck,
  promise_made: ShieldCheck,
  promise_unkept: CircleHelp,
  recovery: Leaf,
  recovery_recorded: HeartPulse,
  sleep_recorded: HeartPulse,
  workout: Dumbbell,
};

const SOURCE_LABELS: Record<string, string> = {
  awareness: "Check-in",
  calendar: "Calendar",
  daily_practice: "The Dashboard",
  goal: "Active Goal",
  manual: "Manual",
  meal: "Meal Log",
  mission: "Mission Drop",
  planner: "Planner",
  promise: "Promise Ledger",
  wearable: "Wearable",
  wellness: "Wellness",
};

const defaultMomentTitle: Record<string, string> = {
  workout: "Workout complete",
  promise_kept: "Promise kept",
  recovery: "Recovery protected",
  environment_reset: "Environment reset",
  reflection: "Reflection complete",
  meal: "Meal logged",
  manual_note: "Moment recorded",
};

const localTimezone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

const formatImpact = (delta: number) => `${delta > 0 ? "+" : ""}${delta}`;

const EventImpactPill = ({ controllable, delta }: { controllable: TimelineControllable; delta: number }) => (
  <span
    className={cn(
      "inline-flex min-h-6 items-center rounded-md border px-2 text-[11px] font-semibold",
      delta > 0
        ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-200"
        : "border-rose-400/20 bg-rose-400/10 text-rose-200",
    )}
  >
    {formatImpact(delta)} {CONTROLLABLE_LABELS[controllable]}
  </span>
);

const TimelineEventRow = ({ event, onOpen }: { event: TimelineEvent; onOpen: () => void }) => {
  const Icon = EVENT_ICONS[event.eventType] ?? History;
  const eventNet = getEventNetImpact(event);
  const time = format(parseISO(event.occurredAt), "h:mm a");

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      onClick={onOpen}
      className="group relative grid w-full min-w-0 grid-cols-[54px_28px_minmax(0,1fr)] gap-2 text-left"
    >
      <time className="pt-2 text-right font-mono text-[10px] text-muted-foreground">{time}</time>
      <span className="relative flex justify-center">
        <span className="absolute bottom-[-18px] top-7 w-px bg-border/60 group-last:hidden" />
        <span className="relative z-10 mt-1.5 flex h-7 w-7 items-center justify-center rounded-lg border border-border/70 bg-background text-muted-foreground">
          <Icon className="h-3.5 w-3.5" />
        </span>
      </span>
      <span className="min-w-0 rounded-lg border border-border/60 bg-card/65 px-3 py-2.5 transition-colors group-hover:border-primary/30 group-hover:bg-card">
        <span className="flex min-w-0 items-start justify-between gap-2">
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-foreground">{event.title}</span>
            <span className="mt-0.5 block text-[10px] uppercase text-muted-foreground">
              {SOURCE_LABELS[event.sourceType] ?? event.sourceType}
            </span>
          </span>
          {eventNet !== 0 ? (
            <span className={cn("shrink-0 text-xs font-bold", eventNet > 0 ? "text-emerald-300" : "text-rose-300")}>
              {formatImpact(eventNet)}
            </span>
          ) : null}
        </span>
        <span className="mt-2 flex flex-wrap gap-1.5">
          {event.scoringStatus === "needs_confirmation" ? (
            <span className="inline-flex min-h-6 items-center rounded-md border border-amber-400/20 bg-amber-400/10 px-2 text-[11px] font-semibold text-amber-200">
              Honest read needed
            </span>
          ) : event.scoringStatus === "excluded" ? (
            <span className="inline-flex min-h-6 items-center rounded-md border border-border px-2 text-[11px] text-muted-foreground">
              Excluded
            </span>
          ) : event.impacts.length ? (
            event.impacts.map((impact) => (
              <EventImpactPill key={impact.id} controllable={impact.controllable} delta={impact.delta} />
            ))
          ) : (
            <span className="text-[11px] text-muted-foreground">Neutral</span>
          )}
        </span>
      </span>
    </motion.button>
  );
};

export default function Timeline() {
  const user = useLifeOSUser();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [momentType, setMomentType] = useState("workout");
  const [targetControllable, setTargetControllable] = useState<TimelineControllable>("wellness");
  const [title, setTitle] = useState(defaultMomentTitle.workout);
  const [time, setTime] = useState(() => format(new Date(), "HH:mm"));
  const localDate = format(selectedDate, "yyyy-MM-dd");
  const { events, snapshot, isLoading, isError, refetch } = useTimelineDay(user.id, localDate);
  const { createMoment, assessEvent, setIncluded, deleteMoment } = useTimelineMutations(user.id);
  const nextMove = useMemo(() => getTimelineNextMove(snapshot, events), [snapshot, events]);

  const handleMomentTypeChange = (value: string) => {
    setMomentType(value);
    const option = MANUAL_MOMENT_TYPES.find((item) => item.value === value);
    if (option) {
      setTargetControllable(option.controllable);
      setTitle(defaultMomentTitle[value] ?? option.label);
    }
  };

  const handleCreate = async () => {
    try {
      const occurredAt = new Date(`${localDate}T${time}:00`).toISOString();
      await createMoment.mutateAsync({
        title: title.trim(),
        eventType: momentType,
        targetControllable,
        occurredAt,
        localDate,
        timezone: localTimezone(),
      });
      setAddOpen(false);
      toast({ title: "Moment added", description: "Daily Charge recalculated." });
    } catch (error) {
      toast({
        title: "Could not add moment",
        description: error instanceof Error ? error.message : "Try again.",
        variant: "destructive",
      });
    }
  };

  const handleAssessment = async (assessment: TimelineAssessment) => {
    if (!selectedEvent) return;
    try {
      await assessEvent.mutateAsync({ event: selectedEvent, assessment });
      setSelectedEvent(null);
      toast({ title: "Impact updated", description: "Your read, not an algorithm's judgment." });
    } catch (error) {
      toast({ title: "Could not update impact", description: error instanceof Error ? error.message : "Try again.", variant: "destructive" });
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4 pb-24">
      <header className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">Your Day</p>
          <h1 className="mt-1 text-2xl font-semibold text-foreground">What moved the Dashboard</h1>
        </div>
        <Button size="icon" onClick={() => setAddOpen(true)} className="h-10 w-10 shrink-0 rounded-xl" title="Add moment">
          <Plus className="h-4 w-4" />
        </Button>
      </header>

      <div className="dashboard-os-card overflow-hidden rounded-xl border border-border/70 bg-card/70">
        <div className="flex items-center justify-between border-b border-border/60 px-3 py-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedDate((date) => subDays(date, 1))} title="Previous day">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <button type="button" onClick={() => setSelectedDate(new Date())} className="text-center">
            <span className="block text-sm font-semibold">{isToday(selectedDate) ? "Today" : format(selectedDate, "EEEE")}</span>
            <span className="block text-[10px] uppercase text-muted-foreground">{format(selectedDate, "MMM d, yyyy")}</span>
          </button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedDate((date) => addDays(date, 1))} disabled={isToday(selectedDate)} title="Next day">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid gap-4 p-4 md:grid-cols-[150px_minmax(0,1fr)] md:items-center">
          <div className="flex items-center gap-3 md:block md:text-center">
            <div
              className="relative grid h-20 w-20 shrink-0 place-items-center rounded-full md:mx-auto md:h-24 md:w-24"
              style={{ background: `conic-gradient(hsl(var(--primary)) ${snapshot.overallScore * 3.6}deg, hsl(var(--muted)) 0deg)` }}
            >
              <div className="grid h-[68px] w-[68px] place-items-center rounded-full bg-card md:h-[82px] md:w-[82px]">
                <div>
                  <p className="text-center text-2xl font-bold tabular-nums">{snapshot.overallScore}</p>
                  <p className="text-center text-[9px] uppercase text-muted-foreground">Charge</p>
                </div>
              </div>
            </div>
            <div className="md:mt-2">
              <p className={cn("text-sm font-bold", snapshot.netImpact >= 0 ? "text-emerald-300" : "text-rose-300")}>
                {formatImpact(snapshot.netImpact)} today
              </p>
              <p className="text-xs text-muted-foreground">{snapshot.eventCount} scored moment{snapshot.eventCount === 1 ? "" : "s"}</p>
            </div>
          </div>

          <div className="grid grid-cols-5 gap-2">
            {TIMELINE_CONTROLLABLES.map((controllable) => {
              const style = CONTROLLABLE_STYLES[controllable];
              const score = snapshot.categoryScores[controllable];
              return (
                <div key={controllable} className="min-w-0 text-center">
                  <div className="mx-auto flex h-24 w-2 items-end overflow-hidden rounded-full bg-muted/80">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${score}%` }}
                      transition={{ duration: 0.45, ease: "easeOut" }}
                      className={cn("w-full rounded-full", style.bar)}
                    />
                  </div>
                  <p className={cn("mt-1.5 text-xs font-bold tabular-nums", style.color)}>{score}</p>
                  <p className="truncate text-[9px] text-muted-foreground">{CONTROLLABLE_LABELS[controllable]}</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex items-start gap-2 border-t border-border/60 bg-primary/5 px-4 py-3">
          <BatteryCharging className={cn("mt-0.5 h-4 w-4 shrink-0", CONTROLLABLE_STYLES[nextMove.controllable].color)} />
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase text-muted-foreground">Next honest move</p>
            <p className="mt-0.5 text-sm font-medium text-foreground">{nextMove.title}</p>
          </div>
        </div>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Timeline</h2>
          <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={cn("mr-1.5 h-3.5 w-3.5", isLoading && "animate-spin")} />
            Sync
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((item) => <div key={item} className="h-20 animate-pulse rounded-lg bg-muted/50" />)}
          </div>
        ) : isError ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-muted-foreground">
            Timeline data is not available yet. Refresh after the database migration is deployed.
          </div>
        ) : events.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-8 text-center">
            <History className="mx-auto h-7 w-7 text-muted-foreground" />
            <p className="mt-3 text-sm font-semibold">No moments recorded</p>
            <p className="mt-1 text-xs text-muted-foreground">Complete a mission or add one real-life rep.</p>
            <Button size="sm" className="mt-4" onClick={() => setAddOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" /> Add moment
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {events.map((event) => (
              <TimelineEventRow key={event.id} event={event} onOpen={() => setSelectedEvent(event)} />
            ))}
          </div>
        )}
      </section>

      <p className="flex items-center justify-center gap-1.5 text-center text-[10px] text-muted-foreground">
        <ShieldCheck className="h-3 w-3" /> Private by default. Daily Charge never subtracts XP or Self-Trust.
      </p>

      <Drawer open={addOpen} onOpenChange={setAddOpen}>
        <DrawerContent className="mx-auto max-w-xl">
          <DrawerHeader>
            <DrawerTitle>Add a moment</DrawerTitle>
            <DrawerDescription>Record the rep. The score stays explainable.</DrawerDescription>
          </DrawerHeader>
          <div className="space-y-4 px-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Moment</label>
              <Select value={momentType} onValueChange={handleMomentTypeChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MANUAL_MOMENT_TYPES.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">What happened?</label>
              <Input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={120} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Controllable</label>
                <Select value={targetControllable} onValueChange={(value) => setTargetControllable(value as TimelineControllable)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIMELINE_CONTROLLABLES.map((controllable) => <SelectItem key={controllable} value={controllable}>{CONTROLLABLE_LABELS[controllable]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Time</label>
                <Input type="time" value={time} onChange={(event) => setTime(event.target.value)} />
              </div>
            </div>
          </div>
          <DrawerFooter>
            <Button onClick={handleCreate} disabled={!title.trim() || createMoment.isPending}>
              {createMoment.isPending ? "Adding..." : "Add to timeline"}
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      <Drawer open={Boolean(selectedEvent)} onOpenChange={(open) => !open && setSelectedEvent(null)}>
        <DrawerContent className="mx-auto max-w-xl">
          {selectedEvent ? (
            <>
              <DrawerHeader>
                <p className="text-[10px] font-semibold uppercase text-primary">{getTimelineEventLabel(selectedEvent.eventType)}</p>
                <DrawerTitle>{selectedEvent.title}</DrawerTitle>
                <DrawerDescription>
                  {format(parseISO(selectedEvent.occurredAt), "h:mm a")} · {SOURCE_LABELS[selectedEvent.sourceType] ?? selectedEvent.sourceType}
                </DrawerDescription>
              </DrawerHeader>
              <div className="max-h-[48vh] space-y-3 overflow-y-auto px-4">
                {selectedEvent.impacts.map((impact) => (
                  <div key={impact.id} className="rounded-lg border border-border/70 bg-card p-3">
                    <EventImpactPill controllable={impact.controllable} delta={impact.delta} />
                    <p className="mt-2 text-sm text-foreground">{impact.explanation}</p>
                    <p className="mt-1 text-[10px] text-muted-foreground">Rule {impact.ruleVersion} · {Math.round(impact.confidence * 100)}% confidence</p>
                  </div>
                ))}

                {selectedEvent.scoringStatus === "needs_confirmation" && isTimelineAssessmentEvent(selectedEvent) ? (
                  <div className="rounded-lg border border-amber-400/20 bg-amber-400/5 p-3">
                    <p className="text-sm font-semibold">How did this affect the plan you chose?</p>
                    <div className="mt-3 grid gap-2 sm:grid-cols-3">
                      <Button variant="outline" size="sm" onClick={() => handleAssessment("supported")}>Supported it</Button>
                      <Button variant="outline" size="sm" onClick={() => handleAssessment("neutral")}>Neutral</Button>
                      <Button variant="outline" size="sm" onClick={() => handleAssessment("worked_against_plan")}>Worked against it</Button>
                    </div>
                  </div>
                ) : null}

                {!selectedEvent.impacts.length && selectedEvent.scoringStatus !== "needs_confirmation" ? (
                  <p className="rounded-lg border border-border/70 p-3 text-sm text-muted-foreground">Recorded without a score impact.</p>
                ) : null}
              </div>
              <DrawerFooter>
                <Button
                  variant="outline"
                  onClick={async () => {
                    await setIncluded.mutateAsync({ event: selectedEvent, included: selectedEvent.scoringStatus === "excluded" });
                    setSelectedEvent(null);
                  }}
                >
                  {selectedEvent.scoringStatus === "excluded" ? "Include in score" : "Exclude from score"}
                </Button>
                {selectedEvent.sourceType === "manual" ? (
                  <Button
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={async () => {
                      await deleteMoment.mutateAsync(selectedEvent);
                      setSelectedEvent(null);
                    }}
                  >
                    <Trash2 className="mr-1.5 h-4 w-4" /> Delete moment
                  </Button>
                ) : null}
              </DrawerFooter>
            </>
          ) : null}
        </DrawerContent>
      </Drawer>
    </div>
  );
}
