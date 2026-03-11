import { motion } from "framer-motion";
import { Scan } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import type { HealthMetrics } from "@/hooks/useHealthData";

interface BodyStateGuidanceProps {
  userId: string;
  latest: HealthMetrics;
}

type ComparisonResult = {
  message: string;
  type: "aligned" | "mismatch_high" | "mismatch_low" | "neutral";
};

function compare(selfEnergy: number, recovery: number | null): ComparisonResult {
  if (recovery === null) return { message: "Connect a wearable to compare how you feel with how your body is performing.", type: "neutral" };

  const selfHigh = selfEnergy >= 4;
  const selfLow = selfEnergy <= 2;
  const bodyHigh = recovery >= 60;
  const bodyLow = recovery < 40;

  if (selfHigh && bodyLow) return { message: "You reported high energy, but recovery is low — your body may need more than you feel.", type: "mismatch_high" };
  if (selfLow && bodyHigh) return { message: "Your body looks more recovered than you feel. The drag may be emotional or mental, not physical.", type: "mismatch_low" };
  if (selfLow && bodyLow) return { message: "Your body and self-report agree — today is a lighter day. Honour that.", type: "aligned" };
  if (selfHigh && bodyHigh) return { message: "Your body and self-report are aligned today. Strong foundation.", type: "aligned" };

  return { message: "Mixed signals — stay aware of what your body needs as the day unfolds.", type: "neutral" };
}

export function BodyStateGuidance({ userId, latest }: BodyStateGuidanceProps) {
  const today = format(new Date(), "yyyy-MM-dd");

  const { data: wellnessLog } = useQuery({
    queryKey: ["wellness-log-today", userId, today],
    queryFn: async () => {
      const { data } = await supabase
        .from("wellness_logs")
        .select("sleep_score, movement_score, nutrition_score")
        .eq("user_id", userId)
        .eq("log_date", today)
        .maybeSingle();
      return data as { sleep_score: number; movement_score: number; nutrition_score: number } | null;
    },
    enabled: !!userId,
    staleTime: 60_000,
  });

  if (!wellnessLog) return null;

  const selfEnergy = Math.round(((wellnessLog.sleep_score || 3) + (wellnessLog.movement_score || 3) + (wellnessLog.nutrition_score || 3)) / 3);
  const { message, type } = compare(selfEnergy, latest.recovery);

  const borderColor = type === "aligned" ? "border-green-500/30" : type === "mismatch_high" || type === "mismatch_low" ? "border-yellow-500/30" : "border-border/40";

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
      <Card className={`${borderColor} bg-card/60`}>
        <CardContent className="p-3 flex items-start gap-2.5">
          <Scan className="w-4 h-4 mt-0.5 shrink-0 text-accent" />
          <div>
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-0.5">Body vs. Self-Report</p>
            <p className="text-xs text-foreground/90 leading-relaxed">{message}</p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
