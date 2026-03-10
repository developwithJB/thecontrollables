import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus, Activity, Shield, Gauge, AlertTriangle, Flame, EyeOff } from "lucide-react";
import type { DashboardIntelligence, DashboardSignal } from "@/hooks/useDashboardIntelligence";

interface AISignalsRowProps {
  signals: DashboardIntelligence["signals"] | undefined;
  isLoading: boolean;
}

const RING_LABELS: Record<string, string> = {
  notice: "Notice", choose: "Choose", prove: "Prove", charge: "Charge", align: "Align",
  awareness: "Notice", perspective: "Choose", habit: "Prove", wellness: "Charge", environment: "Align",
};

const DirectionIcon = ({ direction }: { direction: string }) => {
  if (direction === "up") return <TrendingUp className="w-2.5 h-2.5 text-green-400" />;
  if (direction === "down") return <TrendingDown className="w-2.5 h-2.5 text-red-400" />;
  return <Minus className="w-2.5 h-2.5 text-muted-foreground" />;
};

interface PillProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  signal?: DashboardSignal;
  index: number;
}

const SignalPill = ({ icon, label, value, signal, index }: PillProps) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.05 }}
    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border/50 bg-card/50 backdrop-blur-sm shrink-0"
  >
    <span className="text-muted-foreground/70">{icon}</span>
    <div className="flex flex-col">
      <span className="text-[9px] text-muted-foreground/60 uppercase tracking-wider leading-none">{label}</span>
      <div className="flex items-center gap-1">
        <span className="text-[11px] font-medium text-foreground leading-tight">{value}</span>
        {signal && <DirectionIcon direction={signal.direction} />}
      </div>
    </div>
  </motion.div>
);

export const AISignalsRow = ({ signals, isLoading }: AISignalsRowProps) => {
  if (isLoading || !signals) {
    return (
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-10 w-28 rounded-lg bg-muted/30 animate-pulse shrink-0" />
        ))}
      </div>
    );
  }

  const pills = [
    { icon: <Activity className="w-3 h-3" />, label: "Energy", value: signals.energy_trend.label, signal: signals.energy_trend },
    { icon: <Shield className="w-3 h-3" />, label: "Confidence", value: signals.confidence_signal.label, signal: signals.confidence_signal },
    { icon: <Gauge className="w-3 h-3" />, label: "Stress", value: signals.stress_load.label, signal: signals.stress_load },
    { icon: <AlertTriangle className="w-3 h-3" />, label: "Drift Risk", value: signals.drift_risk.label, signal: signals.drift_risk },
    { icon: <Flame className="w-3 h-3" />, label: "Strongest", value: RING_LABELS[signals.strongest_today] || signals.strongest_today },
    { icon: <EyeOff className="w-3 h-3" />, label: "Neglected", value: RING_LABELS[signals.most_neglected_week] || signals.most_neglected_week },
  ];

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none -mx-2 px-2">
      {pills.map((pill, i) => (
        <SignalPill key={pill.label} {...pill} index={i} />
      ))}
    </div>
  );
};
