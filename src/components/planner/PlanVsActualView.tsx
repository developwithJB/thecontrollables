import { useMemo, useState } from "react";
import { format, addDays, startOfWeek, isToday, isBefore, startOfDay, isAfter } from "date-fns";
import { cn } from "@/lib/utils";
import { Check, Circle, Minus, Calendar, ChevronLeft, ChevronRight, Heart, Moon, Activity, Brain, TrendingUp, TrendingDown, ArrowRight, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { HealthMetrics } from "@/hooks/useHealthData";
import type { Project } from "@/hooks/useProjects";

type PvAStatus = "done" | "partial" | "missed" | "planned";

export interface PvAItem {
  id: string;
  title: string;
  plannedTime?: string;
  actualTime?: string;
  status: PvAStatus;
  type: "task" | "time_block" | "routine_instance" | "external_event";
  project_id?: string | null;
}

interface PvADay {
  date: Date;
  items: PvAItem[];
  health?: HealthMetrics | null;
}

interface PlanVsActualViewProps {
  days: PvADay[];
  onPushToCalendar?: () => void;
  view?: "day" | "week";
  isWearableConnected?: boolean;
  syntheses?: Record<string, string>;
  projects?: Project[];
}

const statusConfig: Record<PvAStatus, { icon: React.ReactNode; className: string; label: string }> = {
  done: {
    icon: <Check className="w-3.5 h-3.5" />,
    className: "bg-perspective/15 text-perspective border-perspective/30",
    label: "Done",
  },
  partial: {
    icon: <Minus className="w-3.5 h-3.5" />,
    className: "bg-awareness/15 text-awareness border-awareness/30",
    label: "Partial",
  },
  missed: {
    icon: <Circle className="w-3.5 h-3.5" />,
    className: "bg-muted text-muted-foreground border-border",
    label: "Incomplete",
  },
  planned: {
    icon: <Circle className="w-3.5 h-3.5" />,
    className: "bg-muted text-muted-foreground border-border",
    label: "Planned",
  },
};

const CONTROLLABLE_COLORS: Record<string, string> = {
  awareness: "text-awareness",
  perspective: "text-perspective",
  habit: "text-habit",
  wellness: "text-wellness",
  environment: "text-environment",
};

function formatSleep(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return `${h}h ${m}m`;
}

// ─── Project View types ───
interface ProjectStats {
  project: Project | null; // null = unassigned
  items: PvAItem[];
  scheduled: number;
  withData: number;
  done: number;
  total: number;
  avgRecovery: number | null;
  momentum: "up" | "down" | "stable";
  latestSynthesis: string | null;
  dayBreakdown: { date: Date; items: PvAItem[]; health?: HealthMetrics | null }[];
}

function computeProjectStats(
  project: Project | null,
  days: PvADay[],
  syntheses: Record<string, string>,
): ProjectStats {
  const projectId = project?.id ?? null;

  const filteredDays = days.map(d => ({
    date: d.date,
    items: d.items.filter(i => (i.project_id ?? null) === projectId),
    health: d.health,
  })).filter(d => d.items.length > 0);

  const allItems = filteredDays.flatMap(d => d.items);
  const scheduled = allItems.length;
  const done = allItems.filter(i => i.status === "done").length;

  // Days with health data that also have items for this project
  const daysWithHealth = filteredDays.filter(d => d.health?.recovery !== null && d.health?.recovery !== undefined);
  const avgRecovery = daysWithHealth.length > 0
    ? Math.round(daysWithHealth.reduce((s, d) => s + (d.health!.recovery ?? 0), 0) / daysWithHealth.length)
    : null;

  // Momentum: compare first half vs second half of the week
  const midpoint = Math.floor(filteredDays.length / 2) || 1;
  const firstHalf = filteredDays.slice(0, midpoint).flatMap(d => d.items);
  const secondHalf = filteredDays.slice(midpoint).flatMap(d => d.items);
  const firstRate = firstHalf.length > 0 ? firstHalf.filter(i => i.status === "done").length / firstHalf.length : 0;
  const secondRate = secondHalf.length > 0 ? secondHalf.filter(i => i.status === "done").length / secondHalf.length : 0;
  const momentum: "up" | "down" | "stable" = secondRate > firstRate + 0.1 ? "up" : secondRate < firstRate - 0.1 ? "down" : "stable";

  // Latest synthesis — look up by date:projectId key first, fallback to date-only
  let latestSynthesis: string | null = null;
  for (let i = filteredDays.length - 1; i >= 0; i--) {
    const dateKey = format(filteredDays[i].date, "yyyy-MM-dd");
    const projectKey = projectId ? `${dateKey}:${projectId}` : dateKey;
    if (syntheses[projectKey]) { latestSynthesis = syntheses[projectKey]; break; }
    if (syntheses[dateKey]) { latestSynthesis = syntheses[dateKey]; break; }
  }

  return {
    project,
    items: allItems,
    scheduled,
    withData: daysWithHealth.length,
    done,
    total: scheduled,
    avgRecovery,
    momentum,
    latestSynthesis,
    dayBreakdown: filteredDays,
  };
}

const MomentumIcon = ({ direction }: { direction: "up" | "down" | "stable" }) => {
  if (direction === "up") return <TrendingUp className="w-3.5 h-3.5 text-perspective" />;
  if (direction === "down") return <TrendingDown className="w-3.5 h-3.5 text-destructive" />;
  return <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />;
};

// ─── Project Card ───
const ProjectCard = ({ stats, syntheses }: { stats: ProjectStats; syntheses: Record<string, string> }) => {
  const [open, setOpen] = useState(false);
  const p = stats.project;
  const borderColor = p?.color_hex ? p.color_hex : undefined;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div
        className="rounded-xl border border-border bg-card overflow-hidden"
        style={borderColor ? { borderLeftWidth: 3, borderLeftColor: borderColor } : undefined}
      >
        <CollapsibleTrigger className="w-full text-left p-3 flex items-start gap-2">
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-center gap-1.5 mb-1">
              {p ? (
                <>
                  <span className="text-base">{p.emoji}</span>
                  <span className="text-sm font-semibold text-foreground truncate">{p.name}</span>
                  {p.controllable && (
                    <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0 h-4", CONTROLLABLE_COLORS[p.controllable])}>
                      {p.controllable}
                    </Badge>
                  )}
                </>
              ) : (
                <span className="text-sm font-semibold text-muted-foreground">Unassigned</span>
              )}
            </div>

            {/* Stats row */}
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
              <span>{stats.scheduled} blocks</span>
              <span>·</span>
              <span>{stats.withData} with data</span>
              <span>·</span>
              <span className="text-foreground font-medium">{stats.done} done</span>
            </div>

            {/* Recovery + Momentum */}
            <div className="flex items-center gap-3 mt-1.5">
              {stats.avgRecovery !== null && (
                <div className="flex items-center gap-1 text-[11px]">
                  <Heart className="w-3 h-3 text-wellness" />
                  <span className="text-muted-foreground">Avg recovery</span>
                  <span className="font-mono text-foreground">{stats.avgRecovery}%</span>
                </div>
              )}
              <div className="flex items-center gap-1 text-[11px]">
                <MomentumIcon direction={stats.momentum} />
                <span className="text-muted-foreground">
                  {stats.momentum === "up" ? "Trending up" : stats.momentum === "down" ? "Trending down" : "Steady"}
                </span>
              </div>
            </div>

            {/* Synthesis */}
            {stats.latestSynthesis && (
              <div className="mt-1.5 pl-2 border-l-2 border-accent/40">
                <p className="text-[11px] text-muted-foreground italic line-clamp-2">{stats.latestSynthesis}</p>
              </div>
            )}
          </div>

          <ChevronDown className={cn("w-4 h-4 text-muted-foreground mt-1 transition-transform", open && "rotate-180")} />
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-3 pb-3 space-y-2 border-t border-border pt-2">
            {stats.dayBreakdown.map(({ date, items, health }) => (
              <div key={format(date, "yyyy-MM-dd")} className="space-y-1">
                <p className={cn("text-[10px] font-semibold uppercase tracking-wider", isToday(date) ? "text-accent" : "text-muted-foreground")}>
                  {isToday(date) ? "Today" : format(date, "EEE d")}
                </p>
                <div className="space-y-0.5">
                  {items.map(item => {
                    const config = statusConfig[item.status];
                    return (
                      <div key={item.id} className={cn("flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[11px]", config.className)}>
                        {config.icon}
                        <span className="flex-1 truncate font-medium">{item.title}</span>
                      </div>
                    );
                  })}
                </div>
                {health?.recovery !== null && health?.recovery !== undefined && (
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <Heart className="w-2.5 h-2.5 text-wellness" /> Recovery {Math.round(health.recovery)}%
                    {health.strain !== null && <> · Strain {health.strain.toFixed(1)}</>}
                  </div>
                )}
              </div>
            ))}
            {stats.dayBreakdown.length === 0 && (
              <p className="text-xs text-muted-foreground/60 py-1">No items this week</p>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};

// ─── Per-project summary chips for Day View ───
interface ProjectChipProps {
  project: Project | null;
  done: number;
  total: number;
  selected: boolean;
  onClick: () => void;
}

const ProjectChip = ({ project, done, total, selected, onClick }: ProjectChipProps) => (
  <button
    onClick={onClick}
    className={cn(
      "flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium border whitespace-nowrap transition-colors",
      selected
        ? "bg-primary/10 border-primary/30 text-primary"
        : "bg-muted border-border text-muted-foreground hover:text-foreground"
    )}
    style={project?.color_hex && selected ? { borderColor: project.color_hex, color: project.color_hex } : undefined}
  >
    {project ? <span>{project.emoji}</span> : null}
    <span>{project?.name ?? "Unassigned"}: {done}/{total}</span>
  </button>
);

// ─── Main Component ───
export const PlanVsActualView = ({
  days,
  onPushToCalendar,
  view: initialView = "day",
  isWearableConnected = false,
  syntheses = {},
  projects = [],
}: PlanVsActualViewProps) => {
  const [mode, setMode] = useState<"project" | "day">(projects.length > 0 ? "project" : "day");
  const [weekOffset, setWeekOffset] = useState(0);
  const [showAllCalEvents, setShowAllCalEvents] = useState(false);
  const [selectedProjectFilter, setSelectedProjectFilter] = useState<string | null>(null); // null = all

  const today = useMemo(() => startOfDay(new Date()), []);

  const currentWeekStart = useMemo(
    () => addDays(startOfWeek(today, { weekStartsOn: 1 }), weekOffset * 7),
    [today, weekOffset]
  );

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const date = addDays(currentWeekStart, i);
      const dayData = days.find(
        (d) => format(d.date, "yyyy-MM-dd") === format(date, "yyyy-MM-dd")
      );
      return {
        date,
        items: dayData?.items || [],
        health: dayData?.health,
      };
    });
  }, [currentWeekStart, days]);

  const filterItems = (items: PvAItem[]): PvAItem[] => {
    let filtered = items;
    if (!showAllCalEvents) filtered = filtered.filter(item => item.type !== "external_event");
    if (mode === "day" && selectedProjectFilter !== null) {
      filtered = filtered.filter(item => (item.project_id ?? "__unassigned") === selectedProjectFilter);
    }
    return filtered;
  };

  // ─── Project View data ───
  const projectStats = useMemo(() => {
    if (mode !== "project") return [];

    const activeProjects = projects.filter(p => p.status === "active");
    const allItems = weekDays.flatMap(d => d.items);
    const hasUnassigned = allItems.some(i => !i.project_id);

    const stats: ProjectStats[] = activeProjects.map(p =>
      computeProjectStats(p, weekDays, syntheses)
    ).filter(s => s.items.length > 0);

    if (hasUnassigned) {
      stats.push(computeProjectStats(null, weekDays, syntheses));
    }

    return stats;
  }, [mode, projects, weekDays, syntheses]);

  // ─── Per-project summary for Day View ───
  const projectSummaryChips = useMemo(() => {
    const allItems = weekDays.flatMap(d => filterItems(d.items));
    const grouped: Record<string, { project: Project | null; done: number; total: number }> = {};

    for (const item of allItems) {
      const key = item.project_id ?? "__unassigned";
      if (!grouped[key]) {
        const proj = projects.find(p => p.id === item.project_id) ?? null;
        grouped[key] = { project: proj, done: 0, total: 0 };
      }
      grouped[key].total++;
      if (item.status === "done") grouped[key].done++;
    }

    return Object.entries(grouped).map(([key, v]) => ({ key, ...v }));
  }, [weekDays, projects, showAllCalEvents, selectedProjectFilter]);

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Project Health</h3>
          <p className="text-xs text-muted-foreground">
            {format(currentWeekStart, "MMM d")} – {format(addDays(currentWeekStart, 6), "MMM d")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-muted rounded-md p-0.5 text-xs">
            <button
              onClick={() => setMode("project")}
              className={cn(
                "px-2 py-1 rounded transition-colors",
                mode === "project" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"
              )}
            >
              Project
            </button>
            <button
              onClick={() => { setMode("day"); setSelectedProjectFilter(null); }}
              className={cn(
                "px-2 py-1 rounded transition-colors",
                mode === "day" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"
              )}
            >
              Day
            </button>
          </div>
          {onPushToCalendar && (
            <Button variant="ghost" size="sm" onClick={onPushToCalendar} className="gap-1 text-xs">
              <Calendar className="w-3 h-3" /> Export
            </Button>
          )}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {mode === "project" ? (
          /* ─── PROJECT VIEW ─── */
          <motion.div
            key="project-view"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-2"
          >
            {projectStats.length === 0 ? (
              <p className="text-xs text-muted-foreground/60 py-4 text-center">
                No project activity this week. Assign tasks to projects in the planner.
              </p>
            ) : (
              projectStats.map(stats => (
                <ProjectCard
                  key={stats.project?.id ?? "unassigned"}
                  stats={stats}
                  syntheses={syntheses}
                />
              ))
            )}
          </motion.div>
        ) : (
          /* ─── DAY VIEW ─── */
          <motion.div
            key={`day-view-${weekOffset}`}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="space-y-3"
          >
            {/* Calendar filter */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                <Switch
                  checked={showAllCalEvents}
                  onCheckedChange={setShowAllCalEvents}
                  className="scale-75 origin-left"
                />
                Show all calendar events
              </label>
            </div>

            {/* Project filter chips */}
            {projectSummaryChips.length > 1 && (
              <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
                <button
                  onClick={() => setSelectedProjectFilter(null)}
                  className={cn(
                    "flex items-center px-2 py-1 rounded-full text-[11px] font-medium border whitespace-nowrap transition-colors",
                    selectedProjectFilter === null
                      ? "bg-primary/10 border-primary/30 text-primary"
                      : "bg-muted border-border text-muted-foreground hover:text-foreground"
                  )}
                >
                  All
                </button>
                {projectSummaryChips.map(chip => (
                  <ProjectChip
                    key={chip.key}
                    project={chip.project}
                    done={chip.done}
                    total={chip.total}
                    selected={selectedProjectFilter === chip.key}
                    onClick={() => setSelectedProjectFilter(selectedProjectFilter === chip.key ? null : chip.key)}
                  />
                ))}
              </div>
            )}

            {/* Week navigation */}
            <div className="flex items-center justify-between">
              <button onClick={() => setWeekOffset(o => o - 1)} className="p-1 text-muted-foreground hover:text-foreground">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="text-xs text-muted-foreground">
                {(() => {
                  const allFiltered = weekDays.flatMap(d => filterItems(d.items));
                  const doneCount = allFiltered.filter(i => i.status === "done").length;
                  const remaining = allFiltered.length - doneCount;
                  return remaining === 0 && allFiltered.length > 0
                    ? <span className="text-perspective">All done</span>
                    : <span>{doneCount} completed · {remaining} remaining</span>;
                })()}
              </div>
              <button onClick={() => setWeekOffset(o => o + 1)} className="p-1 text-muted-foreground hover:text-foreground">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Day-by-day breakdown */}
            {weekDays.map(({ date, items: rawItems, health }) => {
              const isPast = isBefore(date, today) && !isToday(date);
              const isFuture = isAfter(date, today) && !isToday(date);
              const items = filterItems(rawItems);

              if (items.length === 0 && !health) return null;

              return (
                <div key={format(date, "yyyy-MM-dd")}>
                  <div className={cn(
                    "text-xs font-medium mb-1.5",
                    isToday(date) ? "text-accent" : "text-muted-foreground"
                  )}>
                    {isToday(date) ? "Today" : format(date, "EEE d")}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {/* Planned */}
                    <div>
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Planned</p>
                      {items.length === 0 ? (
                        <p className="text-xs text-muted-foreground/60 py-1">
                          {isPast ? "Nothing tracked" : "Nothing planned"}
                        </p>
                      ) : (
                        <div className="space-y-1">
                          {items.map(item => {
                            const config = statusConfig[item.status];
                            return (
                              <div key={item.id} className={cn("flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[11px]", config.className)}>
                                {config.icon}
                                <span className="flex-1 truncate font-medium">{item.title}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Actual */}
                    <div>
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Actual</p>
                      {health && (health.recovery !== null || health.sleepMinutes !== null) ? (
                        <div className="space-y-1">
                          {health.recovery !== null && (
                            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-border bg-muted/30 text-[11px]">
                              <Heart className="w-3 h-3 text-wellness" />
                              <span className="text-foreground font-medium">Recovery</span>
                              <span className="ml-auto font-mono text-muted-foreground">{Math.round(health.recovery)}%</span>
                            </div>
                          )}
                          {health.sleepMinutes !== null && (
                            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-border bg-muted/30 text-[11px]">
                              <Moon className="w-3 h-3 text-accent" />
                              <span className="text-foreground font-medium">Sleep</span>
                              <span className="ml-auto font-mono text-muted-foreground">{formatSleep(health.sleepMinutes)}</span>
                            </div>
                          )}
                          {health.hrv !== null && (
                            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-border bg-muted/30 text-[11px]">
                              <Brain className="w-3 h-3 text-awareness" />
                              <span className="text-foreground font-medium">HRV</span>
                              <span className="ml-auto font-mono text-muted-foreground">{Math.round(health.hrv)}ms</span>
                            </div>
                          )}
                          {health.strain !== null && (
                            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-border bg-muted/30 text-[11px]">
                              <Activity className="w-3 h-3 text-habit" />
                              <span className="text-foreground font-medium">Strain</span>
                              <span className="ml-auto font-mono text-muted-foreground">{health.strain.toFixed(1)}</span>
                            </div>
                          )}
                        </div>
                      ) : isFuture ? null : !isWearableConnected ? (
                        <p className="text-xs text-muted-foreground/60 py-1">
                          Connect WHOOP, Oura, or Fitbit to see your body data here.{" "}
                          <Link to="/integrations" className="underline text-muted-foreground hover:text-foreground">Set up</Link>
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground/60 py-1">Wearable data will appear here once synced</p>
                      )}
                    </div>
                  </div>

                  {/* Synthesis */}
                  {(() => {
                    const dateKey = format(date, "yyyy-MM-dd");
                    const synthesisText = syntheses[dateKey];
                    if (synthesisText) {
                      return (
                        <div className="mt-1.5 pl-3 border-l-2 border-accent/40 py-1">
                          <p className="text-[11px] text-muted-foreground italic">{synthesisText}</p>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
