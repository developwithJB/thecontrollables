import { motion } from "framer-motion";
import { Battery, BatteryLow, BatteryMedium } from "lucide-react";
import type { HealthMetrics } from "@/hooks/useHealthData";
import type { CalendarIntelligence } from "@/lib/calendarIntelligence";
import { useGameSignals } from "@/hooks/useGameSignals";
import type { ChargeState, SupportMode } from "@/lib/signalInterpreter";

interface TodaySignalCardProps {
  userId?: string;
  health: HealthMetrics | null;
  plannerCount: number;
  wearableConnected: boolean;
  calendarConnected: boolean;
  trend?: HealthMetrics[];
  calendarIntel?: CalendarIntelligence | null;
}

function formatChargeState(chargeState: ChargeState | undefined): string {
  switch (chargeState) {
    case "undercharged":
      return "Undercharged";
    case "strong":
      return "Strong";
    default:
      return "Stable";
  }
}

function formatSupportMode(mode: SupportMode | undefined): string {
  switch (mode) {
    case "recover":
      return "Recover Mode";
    case "protect":
      return "Protect Mode";
    case "stretch":
      return "Stretch Mode";
    default:
      return "Normal Mode";
  }
}

function getChargeDescription(chargeState: ChargeState | undefined): string {
  switch (chargeState) {
    case "undercharged":
      return "Protect the next small move.";
    case "strong":
      return "Spend the charge cleanly.";
    default:
      return "Stay charged and avoid scatter.";
  }
}

function ChargeIcon({ chargeState }: { chargeState: ChargeState | undefined }) {
  if (chargeState === "undercharged") {
    return <BatteryLow className="w-5 h-5 text-amber-500" />;
  }
  if (chargeState === "strong") {
    return <Battery className="w-5 h-5 text-emerald-500" />;
  }
  return <BatteryMedium className="w-5 h-5 text-primary/70" />;
}

export function TodaySignalCard({
  userId,
  health,
  plannerCount,
  wearableConnected,
  calendarConnected,
  trend,
  calendarIntel,
}: TodaySignalCardProps) {
  const { signals } = useGameSignals({
    userId,
    wearable: wearableConnected
      ? {
          connected: true,
          recovery: health?.recovery ?? null,
          sleepMinutes: health?.sleepMinutes ?? null,
          strain: health?.strain ?? trend?.[0]?.strain ?? null,
        }
      : null,
    calendar: calendarConnected
      ? {
          connected: true,
          plannerCount,
          meetingCount: calendarIntel?.meetingCount ?? 0,
          meetingMinutes: calendarIntel?.meetingMinutes ?? 0,
          longestFocusBlock: calendarIntel?.longestFocusBlock ?? 0,
          contextSwitches: calendarIntel?.contextSwitches ?? 0,
          dayType: calendarIntel?.dayType ?? null,
          overloadedPeriod: calendarIntel?.overloadedPeriod ?? null,
        }
      : null,
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="rounded-2xl border border-border/30 bg-card px-5 py-5 space-y-3"
    >
      <div className="flex items-center gap-2">
        <ChargeIcon chargeState={signals?.chargeState} />
        <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Charge State
        </span>
      </div>

      <div className="space-y-1">
        <h2 className="font-display text-xl font-semibold text-foreground">
          {formatChargeState(signals?.chargeState)}
        </h2>
        <p className="text-sm text-muted-foreground">
          {formatSupportMode(signals?.supportMode)}
        </p>
      </div>

      <p className="text-sm text-foreground leading-relaxed">
        {getChargeDescription(signals?.chargeState)}
      </p>
    </motion.div>
  );
}
