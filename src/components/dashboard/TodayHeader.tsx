import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { CalendarIntelligence } from "@/lib/calendarIntelligence";
import type { HealthMetrics } from "@/hooks/useHealthData";
import type { DriftAlignmentResult } from "@/lib/driftAlignment";

interface TodayHeaderProps {
  userId?: string;
  health: HealthMetrics | null;
  calendarIntel: CalendarIntelligence | null;
  wearableConnected: boolean;
  calendarConnected: boolean;
  drift?: Pick<
    DriftAlignmentResult,
    "alignmentScore" | "driftLevel" | "returnBonusApplied"
  > | null;
}

const DRIFT_LEVEL_COPY: Record<
  NonNullable<TodayHeaderProps["drift"]>["driftLevel"],
  { label: string; className: string }
> = {
  low: {
    label: "Low Drift",
    className: "border-emerald-500/20 bg-emerald-500/10 text-emerald-600",
  },
  moderate: {
    label: "Moderate Drift",
    className: "border-amber-500/20 bg-amber-500/10 text-amber-600",
  },
  high: {
    label: "High Drift",
    className: "border-rose-500/20 bg-rose-500/10 text-rose-600",
  },
};

function getDayTypeLabel(
  recovery: number | null,
  calendarIntel: CalendarIntelligence | null,
): string | null {
  const isHeavy = calendarIntel && (calendarIntel.dayType === "heavy" || calendarIntel.dayType === "admin_heavy");
  const lowRecovery = recovery !== null && recovery < 40;

  if (lowRecovery) return "Recovery Day";
  if (isHeavy) return "Build Day";
  if (calendarIntel?.dayType === "focus") return "Focus Day";
  if (calendarIntel?.dayType === "fragmented") return "Reset Day";
  if (calendarIntel?.dayType === "light") return "Momentum Day";
  if (calendarIntel?.dayType === "recovery_window") return "Reset Day";
  return null;
}

function getDaySummary(
  recovery: number | null,
  sleepMin: number | null,
  calendarIntel: CalendarIntelligence | null,
  hasData: boolean,
  driftLevel?: NonNullable<TodayHeaderProps["drift"]>["driftLevel"],
): string {
  if (!hasData) return "Signals offline";
  if (driftLevel === "high") return "Return to one grounded choice.";

  const isHeavy = calendarIntel && (calendarIntel.dayType === "heavy" || calendarIntel.dayType === "admin_heavy");
  const lowRecovery = recovery !== null && recovery < 40;
  const highRecovery = recovery !== null && recovery >= 65;
  const shortSleep = sleepMin !== null && sleepMin < 360;

  if (lowRecovery && isHeavy) return "Keep it light. Protect the vessel.";
  if (lowRecovery) return "Keep it light. Protect the vessel.";
  if (highRecovery && isHeavy) return "Strong charge. Spend it cleanly.";
  if (highRecovery) return "Strong charge. Choose the right rep.";
  if (isHeavy) return "Full schedule. Protect the space between.";
  if (shortSleep) return "Short sleep. Choose the next clean rep.";
  return "Steady charge. Stay intentional.";
}

export function TodayHeader({
  userId,
  health,
  calendarIntel,
  wearableConnected,
  calendarConnected,
  drift,
}: TodayHeaderProps) {
  const { data: profile } = useQuery({
    queryKey: ["user-profile", userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase.from("profiles").select("display_name").eq("id", userId).single();
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  };

  const displayName = profile?.display_name?.split(" ")[0] || "";
  const hasData = wearableConnected || calendarConnected;

  const dayLabel = getDayTypeLabel(
    wearableConnected ? (health?.recovery ?? null) : null,
    calendarIntel,
  );

  const summary = getDaySummary(
    wearableConnected ? (health?.recovery ?? null) : null,
    wearableConnected ? (health?.sleepMinutes ?? null) : null,
    calendarIntel,
    hasData,
    drift?.driftLevel,
  );
  const driftCopy = drift ? DRIFT_LEVEL_COPY[drift.driftLevel] : null;
  const modeLabel = dayLabel ?? (driftCopy ? driftCopy.label : "Daily Mode");

  const today = new Date();
  const dateStr = today.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  return (
    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-1 rounded-2xl border border-border/40 bg-card/60 px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{dateStr}</p>
          <h1 className="font-display text-2xl font-bold leading-tight text-foreground">
            {displayName ? `${getGreeting()}, ${displayName}` : getGreeting()}
          </h1>
        </div>
        <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
          {modeLabel}
        </span>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{summary}</p>
    </motion.div>
  );
}
