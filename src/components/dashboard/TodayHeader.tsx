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
  if (isHeavy) return "Heavy Day";
  if (calendarIntel?.dayType === "focus") return "Focus Day";
  if (calendarIntel?.dayType === "fragmented") return "Admin Day";
  if (calendarIntel?.dayType === "light") return "Light Day";
  if (calendarIntel?.dayType === "recovery_window") return "Reset Day";
  return null;
}

function getDaySummary(
  recovery: number | null,
  sleepMin: number | null,
  calendarIntel: CalendarIntelligence | null,
  hasData: boolean,
): string {
  if (!hasData) return "Connect your signals to see your daily overview.";

  const isHeavy = calendarIntel && (calendarIntel.dayType === "heavy" || calendarIntel.dayType === "admin_heavy");
  const lowRecovery = recovery !== null && recovery < 40;
  const highRecovery = recovery !== null && recovery >= 65;
  const shortSleep = sleepMin !== null && sleepMin < 360;

  if (lowRecovery && isHeavy) return "Low energy meets a packed schedule. Simplify where you can.";
  if (lowRecovery) return "Your body needs space today. Keep it light.";
  if (highRecovery && isHeavy) return "Good energy for a full day. Use it on what matters.";
  if (highRecovery) return "Strong readiness. Lean into your most important work.";
  if (isHeavy) return "Full schedule ahead. Protect your breaks.";
  if (shortSleep) return "Short sleep — front-load important work.";
  return "Steady conditions. Stay intentional.";
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
  );
  const driftCopy = drift ? DRIFT_LEVEL_COPY[drift.driftLevel] : null;

  const today = new Date();
  const dateStr = today.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  return (
    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="space-y-1.5 mb-2">
      <p className="text-xs text-muted-foreground">{dateStr}</p>
      <div className="flex items-baseline gap-3">
        <h1 className="font-display text-2xl font-bold text-foreground">
          {getGreeting()}{displayName ? `, ${displayName}` : ""}
        </h1>
        {dayLabel && (
          <span className="text-xs font-medium text-muted-foreground bg-muted/50 px-2.5 py-0.5 rounded-full">
            {dayLabel}
          </span>
        )}
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed">{summary}</p>
      {drift && driftCopy ? (
        <div className="space-y-2 pt-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full border border-border/60 bg-background/70 px-2.5 py-1 text-[11px] font-medium text-foreground">
              Alignment {drift.alignmentScore}
            </span>
            <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium ${driftCopy.className}`}>
              {driftCopy.label}
            </span>
            {drift.returnBonusApplied ? (
              <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">
                Re-entry counts
              </span>
            ) : null}
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {drift.returnBonusApplied
              ? "Coming back with one honest move still strengthens alignment."
              : "Alignment reflects how closely your recent life matches what matters most in this season."}
          </p>
        </div>
      ) : null}
    </motion.div>
  );
}
