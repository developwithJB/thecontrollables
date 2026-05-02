import { motion } from "framer-motion";
import { MoveRight } from "lucide-react";
import type { CalendarIntelligence } from "@/lib/calendarIntelligence";
import type { HealthMetrics } from "@/hooks/useHealthData";
import { useGameSignals } from "@/hooks/useGameSignals";
import { getControllableRosterProfile } from "@/lib/controllableRoster";
import type { GameSignals } from "@/lib/signalInterpreter";

interface PrimaryGuidanceCardProps {
  signals?: GameSignals | null;
  userId?: string;
  health: HealthMetrics | null;
  calendarIntel: CalendarIntelligence | null;
  wearableConnected: boolean;
  plannerCount?: number;
  calendarConnected?: boolean;
}

export function PrimaryGuidanceCard({
  signals,
  userId,
  health,
  calendarIntel,
  wearableConnected,
  plannerCount = 0,
  calendarConnected,
}: PrimaryGuidanceCardProps) {
  const resolvedCalendarConnected = calendarConnected ?? (!!calendarIntel || plannerCount > 0);
  const { signals: fetchedSignals } = useGameSignals({
    enabled: signals === undefined,
    userId,
    wearable: {
      connected: wearableConnected,
      recovery: health?.recovery ?? null,
      sleepMinutes: health?.sleepMinutes ?? null,
      strain: health?.strain ?? null,
    },
    calendar: {
      connected: resolvedCalendarConnected,
      plannerCount,
      meetingCount: calendarIntel?.meetingCount ?? 0,
      meetingMinutes: calendarIntel?.meetingMinutes ?? 0,
      longestFocusBlock: calendarIntel?.longestFocusBlock ?? 0,
      contextSwitches: calendarIntel?.contextSwitches ?? 0,
      dayType: calendarIntel?.dayType ?? null,
      overloadedPeriod: calendarIntel?.overloadedPeriod ?? null,
    },
  });
  const resolvedSignals = signals ?? fetchedSignals;

  const supportControllable = resolvedSignals
    ? resolvedSignals.supportMode === "stretch"
      ? resolvedSignals.likelyControllableOpportunity
      : resolvedSignals.likelyControllableAtRisk
    : null;
  const rosterProfile = supportControllable ? getControllableRosterProfile(supportControllable) : null;

  const supportMove =
    resolvedSignals?.suggestedSupportMove ??
    "Choose one small move that makes the rest of the day easier to carry.";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="rounded-2xl border border-border/30 bg-card px-5 py-5 space-y-3"
    >
      <div className="flex items-center gap-2">
        <MoveRight className="w-4 h-4 text-primary/60" />
        <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          One Support Move
        </span>
      </div>

      <p className="text-base leading-relaxed text-foreground">{supportMove}</p>

      {rosterProfile ? (
        <p className="text-sm leading-relaxed text-muted-foreground">
          {resolvedSignals?.bossBattle
            ? `Let the ${rosterProfile.roleLabel.toLowerCase()} steady the day while you protect your footing.`
            : `Let the ${rosterProfile.roleLabel.toLowerCase()} carry this assist so your main quest can stay dominant.`}
        </p>
      ) : (
        <p className="text-sm leading-relaxed text-muted-foreground">
          One assist is enough. The point is support, not a second agenda.
        </p>
      )}
    </motion.div>
  );
}
