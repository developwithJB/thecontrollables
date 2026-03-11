import { motion } from "framer-motion";
import { Brain } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import type { HealthMetrics } from "@/hooks/useHealthData";

interface GrowthBodyInsightProps {
  userId: string;
  latest: HealthMetrics;
  trend: HealthMetrics[];
}

function deriveInsight(latest: HealthMetrics, trend: HealthMetrics[], selfEnergy: number | null): string | null {
  const recovery = latest.recovery;

  // Mismatch detection
  if (selfEnergy !== null && recovery !== null) {
    if (selfEnergy >= 4 && recovery < 40) return "You feel strong but recovery is low — willpower may fade later. Build in margin.";
    if (selfEnergy <= 2 && recovery >= 60) return "Your body is more charged than you feel. The resistance may be mental — small action could shift it.";
  }

  // Sleep-growth pattern
  const sleepValues = trend.filter(t => t.sleepMinutes !== null).map(t => t.sleepMinutes!);
  if (sleepValues.length >= 5) {
    const avgSleep = sleepValues.reduce((a, b) => a + b, 0) / sleepValues.length;
    if (avgSleep >= 420) return "Your sleep average supports strong follow-through. Growth days tend to land better after solid rest.";
    if (avgSleep < 360) return "Sleep has been short this week. Low recovery can weaken consistency — protect tonight.";
  }

  // Recovery trend
  const recoveryValues = trend.filter(t => t.recovery !== null).map(t => t.recovery!);
  if (recoveryValues.length >= 3) {
    const avg = recoveryValues.reduce((a, b) => a + b, 0) / recoveryValues.length;
    if (avg < 40) return "Under-recovered trend this week. Lighter growth actions may stick better than ambitious ones.";
    if (avg >= 65) return "Consistent recovery this week — a strong foundation for building new habits.";
  }

  if (recovery !== null && recovery >= 67) return "Strong recovery supports the Charge ring today. Use this energy for what matters most.";
  if (recovery !== null && recovery < 34) return "Low recovery may affect follow-through. Keep growth actions small and achievable.";

  return null;
}

export function GrowthBodyInsight({ userId, latest, trend }: GrowthBodyInsightProps) {
  const today = format(new Date(), "yyyy-MM-dd");

  const { data: wellnessLog } = useQuery({
    queryKey: ["wellness-log-today-growth", userId, today],
    queryFn: async () => {
      const { data } = await supabase
        .from("wellness_logs")
        .select("sleep_rating, movement_rating, nutrition_rating")
        .eq("user_id", userId)
        .eq("log_date", today)
        .maybeSingle();
      return data as { sleep_rating: number | null; movement_rating: number | null; nutrition_rating: number | null } | null;
    },
    enabled: !!userId,
    staleTime: 60_000,
  });

  const selfEnergy = wellnessLog
    ? Math.round(((wellnessLog.sleep_rating ?? 3) + (wellnessLog.movement_rating ?? 3) + (wellnessLog.nutrition_rating ?? 3)) / 3)
    : null;

  const insight = deriveInsight(latest, trend, selfEnergy);
  if (!insight) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
      <Card className="border-border/40 bg-card/60">
        <CardContent className="p-3 flex items-start gap-2.5">
          <Brain className="w-4 h-4 mt-0.5 shrink-0 text-primary/70" />
          <div>
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-0.5">Body Intelligence</p>
            <p className="text-xs text-foreground/90 leading-relaxed">{insight}</p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
