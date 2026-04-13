import { motion } from "framer-motion";
import { Shield } from "lucide-react";
import type { CalendarIntelligence } from "@/lib/calendarIntelligence";
import type { HealthMetrics } from "@/hooks/useHealthData";

interface ProtectEnergyCardProps {
  health: HealthMetrics | null;
  calendarIntel: CalendarIntelligence | null;
  wearableConnected: boolean;
}

function getProtection(
  recovery: number | null,
  sleepMin: number | null,
  calendarIntel: CalendarIntelligence | null,
): { watchOut: string; reduce: string } {
  const isHeavy = calendarIntel && (calendarIntel.dayType === "heavy" || calendarIntel.dayType === "admin_heavy");
  const isFragmented = calendarIntel?.dayType === "fragmented";
  const lowRecovery = recovery !== null && recovery < 40;
  const shortSleep = sleepMin !== null && sleepMin < 360;

  if (lowRecovery && isHeavy) return {
    watchOut: "Low energy + high demand — risk of burnout today.",
    reduce: "Remove one optional commitment from this afternoon.",
  };
  if (lowRecovery) return {
    watchOut: "Your body is running low. Avoid big decisions after 3pm.",
    reduce: "Skip anything non-essential and go to bed 30 minutes earlier.",
  };
  if (isFragmented) return {
    watchOut: "Fragmented schedule — constant context-switching will drain you.",
    reduce: "Batch similar tasks and protect at least one 60-minute focus window.",
  };
  if (isHeavy) return {
    watchOut: "Back-to-back commitments leave no recovery space.",
    reduce: "Build in a 10-minute buffer after your most draining meeting.",
  };
  if (shortSleep) return {
    watchOut: "Short sleep — energy will dip earlier than usual.",
    reduce: "Avoid caffeine after 2pm and wind down earlier tonight.",
  };

  return {
    watchOut: "No major drains detected. Stay aware of energy shifts through the afternoon.",
    reduce: "Keep your evening light — protect tomorrow's recovery.",
  };
}

export function ProtectEnergyCard({ health, calendarIntel, wearableConnected }: ProtectEnergyCardProps) {
  const protection = getProtection(
    wearableConnected ? (health?.recovery ?? null) : null,
    wearableConnected ? (health?.sleepMinutes ?? null) : null,
    calendarIntel,
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
      className="rounded-2xl border border-border/30 bg-card px-5 py-5 space-y-3"
    >
      <div className="flex items-center gap-2">
        <Shield className="w-4 h-4 text-muted-foreground/60" />
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Protect your energy</span>
      </div>
      <p className="text-sm text-foreground leading-relaxed">{protection.watchOut}</p>
      <div className="rounded-xl bg-muted/30 px-4 py-3">
        <p className="text-sm text-muted-foreground leading-relaxed">{protection.reduce}</p>
      </div>
    </motion.div>
  );
}
