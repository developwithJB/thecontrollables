import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { DashboardIntelligence } from "@/hooks/useDashboardIntelligence";

interface AIRecommendedActionsProps {
  data: DashboardIntelligence | null;
  fallbackActions?: React.ReactNode;
}

const RING_COLORS: Record<string, string> = {
  notice: "bg-[hsl(var(--awareness))]",
  choose: "bg-[hsl(var(--perspective))]",
  prove: "bg-[hsl(var(--habit))]",
  charge: "bg-[hsl(var(--wellness))]",
  align: "bg-[hsl(var(--environment))]",
};

const RING_ROUTES: Record<string, string> = {
  notice: "/growth",
  choose: "/growth",
  prove: "/growth",
  charge: "/wellness",
  align: "/planner",
};

export const AIRecommendedActions = ({ data, fallbackActions }: AIRecommendedActionsProps) => {
  const navigate = useNavigate();

  if (!data?.recommended_actions?.length) {
    return <>{fallbackActions}</>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="space-y-2"
    >
      <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider text-center">Recommended Next</p>
      <div className="space-y-1.5">
        {data.recommended_actions.slice(0, 4).map((action, i) => (
          <motion.button
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.35 + i * 0.05 }}
            onClick={() => navigate(RING_ROUTES[action.ring] || "/growth")}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg border border-border/50 bg-card/50 hover:bg-muted/50 transition-colors text-left group"
          >
            <span className={`w-2 h-2 rounded-full shrink-0 ${RING_COLORS[action.ring] || "bg-accent"}`} />
            <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors flex-1">{action.text}</span>
            <ArrowRight className="w-3 h-3 text-muted-foreground/40 group-hover:text-accent transition-colors" />
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
};
