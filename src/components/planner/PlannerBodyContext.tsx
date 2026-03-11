import { motion } from "framer-motion";
import { Heart, Moon, Zap, Shield, Calendar } from "lucide-react";
import type { HealthMetrics } from "@/hooks/useHealthData";
import type { CalendarIntelligence } from "@/lib/calendarIntelligence";

interface PlannerBodyContextProps {
  latest: HealthMetrics;
  trend: HealthMetrics[];
  calendarIntel?: CalendarIntelligence | null;
}

function getPlannerTip(latest: HealthMetrics, trend: HealthMetrics[], calendarIntel?: CalendarIntelligence | null): { icon: typeof Heart; text: string; color: string } | null {
  const recovery = latest.recovery;
  const sleep = latest.sleepMinutes;
  const isHeavy = calendarIntel && (calendarIntel.dayType === "heavy" || calendarIntel.dayType === "admin_heavy");
  const isFragmented = calendarIntel?.dayType === "fragmented";
  const isFocus = calendarIntel?.dayType === "focus" || calendarIntel?.dayType === "light" || calendarIntel?.dayType === "recovery_window";
  const overloadedAfternoon = calendarIntel?.overloadedPeriod === "afternoon";

  // Combined body + calendar insights (strongest signals first)
  if (recovery !== null && recovery < 34 && isHeavy) {
    return { icon: Shield, text: "Low recovery on a packed day — cut what you can and protect breaks.", color: "text-destructive" };
  }

  if (recovery !== null && recovery >= 67 && isFocus) {
    return { icon: Zap, text: "Strong readiness + open schedule — ideal for deep work.", color: "text-primary" };
  }

  if (isFragmented) {
    return { icon: Calendar, text: "High context-switching risk today — batch similar tasks and minimize transitions.", color: "text-yellow-500" };
  }

  if (overloadedAfternoon) {
    return { icon: Calendar, text: "Afternoon is dense with meetings — front-load focus work this morning.", color: "text-orange-400" };
  }

  // Body-only signals
  if (recovery !== null && recovery < 34) {
    return { icon: Shield, text: "Low recovery today — reduce overload and add buffer time.", color: "text-destructive" };
  }

  if (sleep !== null && sleep < 360) {
    return { icon: Moon, text: "Short sleep — consider moving deep work earlier or simplifying expectations.", color: "text-yellow-500" };
  }

  // Elevated strain streak
  const recentStrain = trend.slice(0, 3).filter(t => t.strain !== null && t.strain > 14);
  if (recentStrain.length >= 2) {
    return { icon: Heart, text: "Elevated strain recently — consider lighter effort windows and recovery time.", color: "text-orange-400" };
  }

  if (recovery !== null && recovery >= 67) {
    return { icon: Zap, text: "Strong readiness — good day for focused blocks and challenging work.", color: "text-primary" };
  }

  // Calendar-only fallback
  if (isHeavy && calendarIntel) {
    return { icon: Calendar, text: `${calendarIntel.meetingCount} meetings today — protect energy between blocks.`, color: "text-orange-400" };
  }

  if (recovery !== null && recovery >= 34) {
    return { icon: Heart, text: "Moderate recovery — pace your energy and protect the afternoon.", color: "text-yellow-500" };
  }

  // Calendar tip as last resort
  if (calendarIntel?.plannerTip) {
    return { icon: Calendar, text: calendarIntel.plannerTip, color: "text-muted-foreground" };
  }

  return null;
}

export function PlannerBodyContext({ latest, trend, calendarIntel }: PlannerBodyContextProps) {
  const tip = getPlannerTip(latest, trend, calendarIntel);
  if (!tip) return null;

  const Icon = tip.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-2 rounded-md bg-muted/40 border border-border/30 px-3 py-2 mx-4 mb-1"
    >
      <Icon className={`w-3.5 h-3.5 shrink-0 ${tip.color}`} />
      <p className="text-[11px] text-muted-foreground leading-snug">{tip.text}</p>
    </motion.div>
  );
}
