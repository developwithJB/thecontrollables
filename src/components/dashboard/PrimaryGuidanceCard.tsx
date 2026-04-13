import { motion } from "framer-motion";
import { Compass } from "lucide-react";
import type { CalendarIntelligence } from "@/lib/calendarIntelligence";
import type { HealthMetrics } from "@/hooks/useHealthData";

interface PrimaryGuidanceCardProps {
  health: HealthMetrics | null;
  calendarIntel: CalendarIntelligence | null;
  wearableConnected: boolean;
}

function getGuidance(
  recovery: number | null,
  sleepMin: number | null,
  calendarIntel: CalendarIntelligence | null,
): { headline: string; explanation: string; recommendation: string } {
  const isHeavy = calendarIntel && (calendarIntel.dayType === "heavy" || calendarIntel.dayType === "admin_heavy");
  const isFocus = calendarIntel?.dayType === "focus";
  const lowRecovery = recovery !== null && recovery < 40;
  const highRecovery = recovery !== null && recovery >= 65;
  const shortSleep = sleepMin !== null && sleepMin < 360;

  if (lowRecovery && isHeavy) return {
    headline: "Simplify today",
    explanation: "Your energy is low and your schedule is full. Something needs to give.",
    recommendation: "Cancel or shorten one commitment that isn't essential.",
  };
  if (lowRecovery) return {
    headline: "Keep it light",
    explanation: "Your body needs space today. Pushing hard will cost you tomorrow.",
    recommendation: "Do the one thing that matters most, then protect the rest of your time.",
  };
  if (highRecovery && isFocus) return {
    headline: "Go deep on one thing",
    explanation: "Strong energy and an open schedule — rare conditions for real progress.",
    recommendation: "Block 90 minutes for your most important work this morning.",
  };
  if (highRecovery && isHeavy) return {
    headline: "Use your energy wisely",
    explanation: "Good recovery, but a packed day. Channel it into the commitments that matter.",
    recommendation: "Identify your #1 priority before the first meeting starts.",
  };
  if (isHeavy) return {
    headline: "Protect breaks today",
    explanation: "Full schedule ahead. Small gaps matter more than you think.",
    recommendation: "Take 5 minutes between commitments to reset — don't stack back to back.",
  };
  if (shortSleep) return {
    headline: "Front-load important work",
    explanation: "Short sleep means your sharpest hours are limited. Use them early.",
    recommendation: "Handle your hardest decision before noon.",
  };
  if (isFocus) return {
    headline: "An open day — choose one focus",
    explanation: "Flexible time is valuable. Don't let it scatter.",
    recommendation: "Pick one thing that would make today feel meaningful.",
  };

  return {
    headline: "Stay intentional",
    explanation: "Steady day ahead. Small choices compound.",
    recommendation: "Start with the thing you'd most like to finish by tonight.",
  };
}

export function PrimaryGuidanceCard({ health, calendarIntel, wearableConnected }: PrimaryGuidanceCardProps) {
  const guidance = getGuidance(
    wearableConnected ? (health?.recovery ?? null) : null,
    wearableConnected ? (health?.sleepMinutes ?? null) : null,
    calendarIntel,
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="rounded-2xl border border-border/30 bg-card px-5 py-5 space-y-3"
    >
      <div className="flex items-center gap-2">
        <Compass className="w-4 h-4 text-primary/60" />
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">What matters most</span>
      </div>
      <h2 className="font-display text-lg font-semibold text-foreground">{guidance.headline}</h2>
      <p className="text-sm text-muted-foreground leading-relaxed">{guidance.explanation}</p>
      <div className="rounded-xl bg-muted/30 px-4 py-3">
        <p className="text-sm text-foreground leading-relaxed">{guidance.recommendation}</p>
      </div>
    </motion.div>
  );
}
