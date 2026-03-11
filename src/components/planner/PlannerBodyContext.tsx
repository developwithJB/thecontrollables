import { motion } from "framer-motion";
import { Heart, Moon, Zap, Shield } from "lucide-react";
import type { HealthMetrics } from "@/hooks/useHealthData";

interface PlannerBodyContextProps {
  latest: HealthMetrics;
  trend: HealthMetrics[];
}

function getPlannerTip(latest: HealthMetrics, trend: HealthMetrics[]): { icon: typeof Heart; text: string; color: string } | null {
  const recovery = latest.recovery;
  const sleep = latest.sleepMinutes;

  if (recovery !== null && recovery < 34) {
    return { icon: Shield, text: "Low recovery today — reduce overload and add buffer time.", color: "text-red-400" };
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
    return { icon: Zap, text: "Strong readiness — good day for focused blocks and challenging work.", color: "text-green-500" };
  }

  if (recovery !== null && recovery >= 34) {
    return { icon: Heart, text: "Moderate recovery — pace your energy and protect the afternoon.", color: "text-yellow-500" };
  }

  return null;
}

export function PlannerBodyContext({ latest, trend }: PlannerBodyContextProps) {
  const tip = getPlannerTip(latest, trend);
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
