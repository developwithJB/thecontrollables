import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import type { DashboardIntelligence } from "@/hooks/useDashboardIntelligence";

interface WhyFullyChargedCardProps {
  data: DashboardIntelligence | null;
}

export const WhyFullyChargedCard = ({ data }: WhyFullyChargedCardProps) => {
  if (!data?.why_fully_charged?.length) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-accent/20 bg-accent/5 p-4"
    >
      <h3 className="text-[10px] font-semibold uppercase tracking-wider text-accent/80 mb-2">
        Why You Were Fully Charged
      </h3>
      <div className="space-y-1.5">
        {data.why_fully_charged.map((reason, i) => (
          <div key={i} className="flex items-start gap-2">
            <CheckCircle2 className="w-3 h-3 text-accent mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground leading-relaxed">{reason}</p>
          </div>
        ))}
      </div>
    </motion.div>
  );
};
