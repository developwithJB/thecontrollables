import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import type { HealthMetrics } from "@/hooks/useHealthData";
import type { CalendarIntelligence } from "@/lib/calendarIntelligence";

interface TodaySignalCardProps {
  health: HealthMetrics | null;
  plannerCount: number;
  wearableConnected: boolean;
  calendarConnected: boolean;
  trend?: HealthMetrics[];
  calendarIntel?: CalendarIntelligence | null;
}

function getSignal(
  recovery: number | null,
  sleepMin: number | null,
  plannerCount: number,
  calendarIntel?: CalendarIntelligence | null,
): string {
  const isHeavy = calendarIntel && (calendarIntel.dayType === "heavy" || calendarIntel.dayType === "admin_heavy");
  const isFragmented = calendarIntel?.dayType === "fragmented";
  const sleepShort = sleepMin !== null && sleepMin < 360;

  if (recovery !== null && recovery < 34 && isFragmented)
    return "Low recovery + fragmented schedule — protect your morning for what matters most.";
  if (recovery !== null && recovery < 34 && isHeavy)
    return "Low recovery + packed day — simplify where you can and protect downtime tonight.";
  if (recovery !== null && recovery < 34 && sleepShort)
    return "Low recovery and short sleep — keep it simple today and recharge tonight.";
  if (recovery !== null && recovery < 34)
    return "Your body is undercharged. Keep the day light and give yourself space.";
  if (recovery !== null && recovery >= 67 && calendarIntel?.dayType === "focus")
    return "Strong recovery + open calendar — conditions are right for your most important work.";
  if (recovery !== null && recovery >= 67 && sleepMin && sleepMin >= 420 && !isHeavy)
    return "Well rested + open day — ideal for deep, focused work.";
  if (recovery !== null && recovery >= 67 && isHeavy)
    return "Good recovery for a demanding day. Use the energy wisely.";
  if (recovery !== null && recovery >= 67)
    return "Strong readiness today. Lean into what matters most.";
  if (isFragmented)
    return "Fragmented schedule today — batch similar tasks and protect focus windows.";
  if (isHeavy)
    return "Full schedule today — protect breaks and cut optional commitments.";
  if (sleepShort)
    return "Shorter sleep than usual — front-load important work this morning.";

  if (recovery === null && calendarIntel) {
    switch (calendarIntel.dayType) {
      case "heavy": return `${calendarIntel.meetingCount} meetings today — protect your energy between them.`;
      case "fragmented": return "Fragmented schedule — guard your focus windows.";
      case "focus": return "Open calendar — a good day for deep work.";
      case "light": return "Light schedule — flexible day ahead.";
      case "recovery_window": return "Open schedule — use this space intentionally.";
      default: return `${calendarIntel.meetingCount} commitments today — stay intentional.`;
    }
  }

  return "Steady day ahead. Stay intentional with your energy.";
}

export function TodaySignalCard({ health, plannerCount, wearableConnected, calendarConnected, calendarIntel }: TodaySignalCardProps) {
  const hasAnyData = wearableConnected || calendarConnected;

  if (!hasAnyData) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-border/40 bg-muted/20 px-5 py-4 text-center"
      >
        <p className="text-sm text-muted-foreground leading-relaxed">
          Connect your{" "}
          <Link to="/planner" className="text-primary hover:underline">calendar</Link>
          {" and "}
          <Link to="/wellness" className="text-primary hover:underline">wearable</Link>
          {" "}to receive your daily signal.
        </p>
      </motion.div>
    );
  }

  const signal = getSignal(
    wearableConnected ? (health?.recovery ?? null) : null,
    wearableConnected ? (health?.sleepMinutes ?? null) : null,
    plannerCount,
    calendarIntel,
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="rounded-xl border border-border/30 bg-card/40 px-5 py-4"
    >
      <p className="text-sm text-foreground leading-relaxed">{signal}</p>
    </motion.div>
  );
}
