import { motion } from "framer-motion";
import { ArrowRight, CalendarDays, Gauge, Moon, Route } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useDatedGoal } from "@/hooks/useDatedGoal";
import { APP_ROUTES } from "@/lib/appRoutes";
import { getChicagoDayPrescription, getGoalCountdownDays } from "@/lib/datedGoal";

export function ActiveDatedGoalCard({ userId }: { userId: string }) {
  const navigate = useNavigate();
  const { goal, week, weekLogs, drift, today, todayLog, isLoading } = useDatedGoal(userId);

  if (isLoading || !goal) return null;

  const prescription = getChicagoDayPrescription(today);
  const countdown = getGoalCountdownDays(today, goal.event_date);
  const miles = weekLogs.reduce((total, log) => total + (log.actualMiles ?? 0), 0);
  const progress = week ? Math.min(100, Math.round((miles / week.mileageMin) * 100)) : 0;

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="overflow-hidden rounded-2xl border border-sky-400/25 bg-[linear-gradient(135deg,hsl(var(--card))_0%,hsl(205_70%_13%/.88)_100%)] shadow-[0_18px_60px_hsl(199_90%_45%/.08)]"
    >
      <div className="flex items-start justify-between gap-3 px-4 pb-3 pt-4">
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-sky-300">
            <Route className="h-3.5 w-3.5" />
            Goal locked
          </div>
          <h2 className="font-display text-xl font-bold text-foreground">{goal.title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {week ? `Week ${week.week}/13 · ${week.mileageLabel}` : "Setup weekend"}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-display text-3xl font-bold leading-none text-sky-300">{countdown}</p>
          <p className="mt-1 text-[9px] uppercase tracking-[0.15em] text-muted-foreground">days</p>
        </div>
      </div>

      <div className="border-y border-white/5 bg-black/10 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Today</p>
            <p className="mt-1 truncate text-sm font-semibold text-foreground">{prescription.title}</p>
          </div>
          <span className="rounded-full border border-sky-300/20 bg-sky-300/10 px-2.5 py-1 text-xs font-semibold text-sky-200">
            {todayLog ? todayLog.status : prescription.distanceLabel}
          </span>
        </div>
      </div>

      <div className="space-y-3 px-4 py-4">
        {week ? (
          <div>
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Weekly miles</span>
              <span className="font-semibold text-foreground">{miles.toFixed(1)} / {week.mileageLabel}</span>
            </div>
            <Progress value={progress} className="h-1.5 bg-white/10" />
          </div>
        ) : null}

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg border border-white/5 bg-black/10 px-2 py-2">
            <CalendarDays className="mx-auto mb-1 h-3.5 w-3.5 text-sky-300" />
            <p className="text-[10px] text-muted-foreground">Long run</p>
            <p className="text-xs font-semibold text-foreground">{week?.longRunLabel ?? "Monday"}</p>
          </div>
          <div className="rounded-lg border border-white/5 bg-black/10 px-2 py-2">
            <Moon className="mx-auto mb-1 h-3.5 w-3.5 text-violet-300" />
            <p className="text-[10px] text-muted-foreground">In bed</p>
            <p className="text-xs font-semibold text-foreground">8-8.5h</p>
          </div>
          <div className="rounded-lg border border-white/5 bg-black/10 px-2 py-2">
            <Gauge className="mx-auto mb-1 h-3.5 w-3.5 text-emerald-300" />
            <p className="text-[10px] text-muted-foreground">Status</p>
            <p className="truncate text-xs font-semibold text-foreground">{drift.label}</p>
          </div>
        </div>

        <Button onClick={() => navigate(APP_ROUTES.goal)} className="h-11 w-full bg-sky-400 font-semibold text-slate-950 hover:bg-sky-300">
          Open today&apos;s plan <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </motion.section>
  );
}
