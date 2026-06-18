import { motion } from "framer-motion";
import { Play } from "lucide-react";
import type { CalendarIntelligence } from "@/lib/calendarIntelligence";
import type { HealthMetrics } from "@/hooks/useHealthData";
import type { GameSignals } from "@/lib/signalInterpreter";

interface NextMoveCardProps {
  signals?: GameSignals | null;
  health: HealthMetrics | null;
  calendarIntel: CalendarIntelligence | null;
  wearableConnected: boolean;
}

function getChargeCheckMove(hour: number): string {
  if (hour < 10) {
    return "Start gently: water, light, and one small promise before you ask for much more.";
  }
  if (hour < 14) {
    return "Protect the next hour from extra pressure and do only the smallest necessary thing.";
  }
  if (hour < 18) {
    return "Close one loop, leave the rest smaller, and give tonight some recovery space.";
  }
  return "Shut the day down early and make tomorrow easier to re-enter.";
}

function getNextMove(
  recovery: number | null,
  calendarIntel: CalendarIntelligence | null,
): string {
  const hour = new Date().getHours();
  const isHeavy = calendarIntel && (calendarIntel.dayType === "heavy" || calendarIntel.dayType === "admin_heavy");
  const lowRecovery = recovery !== null && recovery < 40;
  const highRecovery = recovery !== null && recovery >= 65;

  if (hour < 10) {
    if (lowRecovery) return "Start slow — hydrate, get daylight, and ease into the morning.";
    if (highRecovery) return "Open your calendar and block time for your most important task.";
    return "Pick one thing to finish before lunch — start there.";
  }
  if (hour < 14) {
    if (lowRecovery) return "Take a 10-minute walk before your next commitment.";
    if (isHeavy) return "Review your afternoon — cancel what isn't necessary.";
    return "Do the next small thing on your list. Momentum beats motivation.";
  }
  if (hour < 18) {
    if (lowRecovery) return "Wrap up what you can. Give yourself permission to stop early.";
    return "Close open loops — one short task, then shift to wind-down.";
  }
  return "Your day is winding down. Set one intention for tomorrow, then rest.";
}

export function NextMoveCard({ signals, health, calendarIntel, wearableConnected }: NextMoveCardProps) {
  const hour = new Date().getHours();
  const move = signals?.chargeCheck
    ? getChargeCheckMove(hour)
    : getNextMove(
        wearableConnected ? (health?.recovery ?? null) : null,
        calendarIntel,
      );

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35 }}
      className="rounded-2xl border border-border/30 bg-card px-5 py-5 space-y-3"
    >
      <div className="flex items-center gap-2">
        <Play className="w-4 h-4 text-primary/60" />
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {signals?.chargeCheck ? "Next steady move" : "Next best move"}
        </span>
      </div>
      <p className="text-sm text-foreground leading-relaxed">{move}</p>
    </motion.div>
  );
}
