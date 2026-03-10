import { motion } from "framer-motion";
import { Compass } from "lucide-react";
import type { DashboardIntelligence } from "@/hooks/useDashboardIntelligence";

interface TomorrowForecastCardProps {
  data: DashboardIntelligence | null;
}

export const TomorrowForecastCard = ({ data }: TomorrowForecastCardProps) => {
  if (!data) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border/50 bg-card/50 p-4"
    >
      <div className="flex items-center gap-2 mb-2">
        <Compass className="w-3.5 h-3.5 text-accent/70" />
        <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">Tomorrow Forecast</h3>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">{data.tomorrow_forecast}</p>
      <p className="text-[10px] text-muted-foreground/50 mt-2">Based on 7-day behavioral data</p>
    </motion.div>
  );
};
