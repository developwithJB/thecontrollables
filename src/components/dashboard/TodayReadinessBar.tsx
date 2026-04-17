import { useMemo } from "react";
import { motion } from "framer-motion";
import { Clock3 } from "lucide-react";
import { getISOWeek } from "date-fns";
import type { HealthMetrics } from "@/hooks/useHealthData";
import type { CalendarIntelligence } from "@/lib/calendarIntelligence";
import { getOnboardingQuickStartDraft } from "@/lib/onboardingQuickStartDraft";
import {
  formatAgeInYearsMonthsDays,
  getAgeInYearsMonthsDays,
  getSeasonOfLifeMapping,
  getWeeksLived,
} from "@/lib/lifePerspective";

interface TodayReadinessBarProps {
  userId?: string;
  health: HealthMetrics | null;
  plannerCount: number;
  wearableConnected: boolean;
  calendarConnected: boolean;
  trend?: HealthMetrics[];
  calendarIntel?: CalendarIntelligence | null;
}

export function TodayReadinessBar({
  health,
  plannerCount,
  wearableConnected,
  calendarConnected,
  calendarIntel,
}: TodayReadinessBarProps) {
  const hasConnectedSignals = wearableConnected || calendarConnected;
  const hasLiveInputs =
    hasConnectedSignals ||
    plannerCount > 0 ||
    (health?.recovery ?? null) !== null ||
    (health?.sleepMinutes ?? null) !== null ||
    !!calendarIntel;

  const lifeContext = useMemo(() => {
    const draft = getOnboardingQuickStartDraft();
    const birthday = draft?.birthday;
    if (!birthday) return null;

    const age = getAgeInYearsMonthsDays(birthday);
    const season = getSeasonOfLifeMapping(birthday);
    const weeksLived = getWeeksLived(birthday);

    if (!age || !season || !weeksLived) return null;

    return {
      weekLabel: `Life Week ${weeksLived.toLocaleString()}`,
      ageLabel: formatAgeInYearsMonthsDays(age),
      seasonLabel: season.label,
      seasonReflection: season.reflection,
      arcLabel: "Long-arc view open",
    };
  }, []);

  const fallbackContext = useMemo(() => {
    const today = new Date();
    const calendarWeek = getISOWeek(today);
    const dateLabel = today.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
    });

    return {
      weekLabel: `Week ${calendarWeek}`,
      ageLabel: dateLabel,
      seasonLabel: "Current Chapter",
      seasonReflection: hasLiveInputs
        ? "Real-world signals are connected, so the read below can stay grounded in the day you are actually living."
        : "The read below stays intentionally light until more of your signals are connected.",
      arcLabel: hasConnectedSignals ? "Live inputs connected" : "Add more signals over time",
    };
  }, [hasLiveInputs, hasConnectedSignals]);

  const context = lifeContext ?? fallbackContext;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border/40 bg-card/70 px-4 py-4 space-y-3"
    >
      <div className="flex items-center gap-2">
        <Clock3 className="w-4 h-4 text-primary/60" />
        <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Life Context
        </span>
      </div>

      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{context.weekLabel}</span>
          <span>·</span>
          <span>{context.ageLabel}</span>
          <span>·</span>
          <span>{context.seasonLabel}</span>
        </div>
        <p className="text-sm text-foreground leading-relaxed">{context.seasonReflection}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-muted/50 px-2.5 py-1 text-[11px] text-muted-foreground">
          {context.arcLabel}
        </span>
        {hasConnectedSignals ? (
          <span className="rounded-full bg-primary/8 px-2.5 py-1 text-[11px] text-primary/80">
            Live signals shaping today
          </span>
        ) : null}
      </div>
    </motion.div>
  );
}
