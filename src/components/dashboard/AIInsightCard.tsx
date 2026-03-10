import { motion } from "framer-motion";
import { Sparkles, RefreshCw, Loader2, TrendingUp, Target, Zap, CloudSun } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DashboardIntelligence } from "@/hooks/useDashboardIntelligence";

interface AIInsightCardProps {
  data: DashboardIntelligence | null;
  isLoading: boolean;
  onRefresh: () => void;
}

const SECTIONS = [
  { key: "pattern_detected", label: "Pattern Detected", icon: TrendingUp },
  { key: "why_it_matters", label: "Why It Matters", icon: Target },
  { key: "best_next_move", label: "Best Next Move", icon: Zap },
  { key: "tomorrow_forecast", label: "Tomorrow Forecast", icon: CloudSun },
] as const;

export const AIInsightCard = ({ data, isLoading, onRefresh }: AIInsightCardProps) => {
  if (isLoading && !data) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border bg-gradient-to-br from-accent/5 to-transparent shadow-sm p-5"
      >
        <div className="flex items-center gap-2 mb-4">
          <Loader2 className="w-4 h-4 animate-spin text-accent" />
          <span className="text-xs text-muted-foreground">Analyzing your signals...</span>
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-10 rounded-lg bg-muted/50 animate-pulse" />
          ))}
        </div>
      </motion.div>
    );
  }

  if (!data) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border bg-gradient-to-br from-accent/5 to-transparent shadow-sm p-5"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Sparkles className="w-4 h-4 text-accent" />
            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">AI Insight</h3>
            <p className="text-[10px] text-muted-foreground/60">Generated from today's signals</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onRefresh} disabled={isLoading}>
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <div className="space-y-3">
        {SECTIONS.map(({ key, label, icon: Icon }) => (
          <div key={key} className="flex gap-2.5">
            <div className="mt-0.5 shrink-0">
              <Icon className="w-3.5 h-3.5 text-accent/70" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-accent/80 mb-0.5">{label}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{data[key]}</p>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
};
