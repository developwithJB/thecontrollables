import { motion } from "framer-motion";
import { Heart, Moon, Activity, Zap, TrendingDown, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { HealthMetrics } from "@/hooks/useHealthData";

interface BodyReadinessCardProps {
  latest: HealthMetrics;
  trend: HealthMetrics[];
}

function recoveryLevel(score: number | null): { label: string; color: string; icon: typeof Heart } {
  if (score === null) return { label: "No data", color: "text-muted-foreground", icon: Heart };
  if (score >= 67) return { label: "Strong recovery", color: "text-green-500", icon: Zap };
  if (score >= 34) return { label: "Moderate recovery", color: "text-yellow-500", icon: Heart };
  return { label: "Low recovery", color: "text-red-400", icon: TrendingDown };
}

function sleepInterpretation(latest: HealthMetrics, trend: HealthMetrics[]): string | null {
  if (latest.sleepMinutes === null) return null;
  const h = Math.floor(latest.sleepMinutes / 60);
  const m = Math.round(latest.sleepMinutes % 60);
  const sleepValues = trend.filter(t => t.sleepMinutes !== null).map(t => t.sleepMinutes!);
  if (sleepValues.length < 3) return `${h}h ${m}m sleep last night.`;
  const avg7 = sleepValues.reduce((a, b) => a + b, 0) / sleepValues.length;
  const avg3 = sleepValues.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
  const avgH = Math.floor(avg7 / 60);
  const avgM = Math.round(avg7 % 60);
  if (avg3 < avg7 * 0.9) return `${h}h ${m}m sleep — below your average of ${avgH}h ${avgM}m. Sleep debt may be building.`;
  if (avg3 > avg7 * 1.05) return `${h}h ${m}m sleep — trending above average. Good recovery support.`;
  return `${h}h ${m}m sleep — consistent with your recent pattern.`;
}

function strainInterpretation(trend: HealthMetrics[]): string | null {
  const strainValues = trend.filter(t => t.strain !== null).map(t => t.strain!);
  if (strainValues.length < 3) return null;
  const elevatedDays = strainValues.slice(0, 3).filter(s => s > 14).length;
  if (elevatedDays >= 3) return "Strain has been elevated for 3+ days. Recovery behaviors matter tonight.";
  if (elevatedDays >= 2) return "Strain is running high recently. Monitor recovery closely.";
  return null;
}

function readinessHeadline(recovery: number | null, sleepMin: number | null): string {
  if (recovery === null) return "Connect your wearable for body intelligence.";
  if (recovery >= 67 && sleepMin && sleepMin >= 420) return "Your body is well-charged today. Good day for effort.";
  if (recovery >= 67) return "Strong recovery — lean into what matters.";
  if (recovery >= 34 && sleepMin && sleepMin < 360) return "Moderate recovery, short sleep — pace yourself.";
  if (recovery >= 34) return "Moderate readiness. Be intentional with energy.";
  if (sleepMin && sleepMin < 360) return "Your body is undercharged. Protect energy and simplify.";
  return "Low recovery today. Prioritize energy protection.";
}

function bodyRecommendation(recovery: number | null, sleepMin: number | null, trend: HealthMetrics[]): string {
  if (recovery === null) return "Log wellness manually or connect a wearable for body-aware guidance.";
  const strainValues = trend.filter(t => t.strain !== null).map(t => t.strain!);
  const highStrainStreak = strainValues.slice(0, 3).filter(s => s > 14).length >= 2;
  if (recovery < 34 && highStrainStreak) return "Your body needs a reset. Reduce load, prioritize sleep, and skip optional commitments.";
  if (recovery < 34) return "Keep the day simple. Delay demanding work and protect downtime tonight.";
  if (recovery >= 67 && !highStrainStreak) return "Good day for deep work, training, or challenging conversations.";
  if (recovery >= 67 && highStrainStreak) return "Recovery is strong but strain is building. Use the energy wisely — don't over-extend.";
  if (sleepMin && sleepMin < 360) return "Short sleep — front-load important work while alertness is highest.";
  return "Steady day ahead. Stick to the plan and recharge well tonight.";
}

export function BodyReadinessCard({ latest, trend }: BodyReadinessCardProps) {
  const { label: recovLabel, color: recovColor } = recoveryLevel(latest.recovery);
  const headline = readinessHeadline(latest.recovery, latest.sleepMinutes);
  const sleepText = sleepInterpretation(latest, trend);
  const strainText = strainInterpretation(trend);
  const recommendation = bodyRecommendation(latest.recovery, latest.sleepMinutes, trend);

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="border-border/40 bg-card/80">
        <CardContent className="p-4 space-y-3">
          {/* Headline */}
          <div>
            <p className="text-sm font-semibold text-foreground">{headline}</p>
          </div>

          {/* Interpretations */}
          <div className="space-y-2">
            {/* Recovery */}
            {latest.recovery !== null && (
              <div className="flex items-start gap-2">
                <Heart className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${recovColor}`} />
                <p className="text-xs text-muted-foreground">
                  <span className={`font-medium ${recovColor}`}>{recovLabel}</span> at {Math.round(latest.recovery)}%.
                  {latest.recovery < 34 && " Prioritize energy protection."}
                  {latest.recovery >= 67 && " Good day for focused work or training."}
                </p>
              </div>
            )}

            {/* Sleep */}
            {sleepText && (
              <div className="flex items-start gap-2">
                <Moon className="w-3.5 h-3.5 mt-0.5 shrink-0 text-accent/70" />
                <p className="text-xs text-muted-foreground">{sleepText}</p>
              </div>
            )}

            {/* Strain */}
            {strainText && (
              <div className="flex items-start gap-2">
                <Activity className="w-3.5 h-3.5 mt-0.5 shrink-0 text-orange-400" />
                <p className="text-xs text-muted-foreground">{strainText}</p>
              </div>
            )}
          </div>

          {/* Recommendation */}
          <div className="rounded-md bg-muted/50 px-3 py-2">
            <p className="text-xs text-foreground/90 leading-relaxed">💡 {recommendation}</p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
