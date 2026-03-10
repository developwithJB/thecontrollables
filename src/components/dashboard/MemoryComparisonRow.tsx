import { motion } from "framer-motion";
import type { DashboardIntelligence } from "@/hooks/useDashboardIntelligence";

interface MemoryComparisonRowProps {
  data: DashboardIntelligence | null;
}

export const MemoryComparisonRow = ({ data }: MemoryComparisonRowProps) => {
  if (!data?.memory_comparisons?.length) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.4 }}
      className="space-y-1"
    >
      {data.memory_comparisons.map((comparison, i) => (
        <div key={i} className="flex items-start gap-2 px-1">
          <span className="w-1 h-1 rounded-full bg-accent/40 mt-1.5 shrink-0" />
          <p className="text-[11px] text-muted-foreground/70 leading-relaxed">{comparison}</p>
        </div>
      ))}
    </motion.div>
  );
};
