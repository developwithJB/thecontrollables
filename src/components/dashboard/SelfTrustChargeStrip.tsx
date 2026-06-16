import type React from "react";
import { motion } from "framer-motion";
import { BatteryCharging, ShieldCheck, Zap } from "lucide-react";
import { useControllableLevels } from "@/hooks/useControllableLevels";

interface SelfTrustChargeStripProps {
  userId: string | null;
}

export function SelfTrustChargeStrip({ userId }: SelfTrustChargeStripProps) {
  const { data: levels, isLoading } = useControllableLevels(userId);

  if (isLoading || !levels) return null;

  const averageCharge = Math.round(
    levels.reduce((sum, level) => sum + level.progress, 0) / Math.max(levels.length, 1) * 100,
  );
  const chargedCount = levels.filter((level) => level.progress >= 0.34).length;
  const totalXp = levels.reduce((sum, level) => sum + level.totalXp, 0);

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border/50 bg-card px-4 py-4"
    >
      <div className="grid grid-cols-3 gap-2">
        <MetricCell
          icon={<ShieldCheck className="h-4 w-4" />}
          label="Self-Trust"
          value="+10"
        />
        <MetricCell
          icon={<BatteryCharging className="h-4 w-4" />}
          label="Charge"
          value={`${chargedCount}/5`}
        />
        <MetricCell
          icon={<Zap className="h-4 w-4" />}
          label="XP"
          value={totalXp.toLocaleString()}
        />
      </div>
      <div className="mt-4 grid h-2 grid-cols-12 gap-1">
        {Array.from({ length: 12 }).map((_, index) => {
          const active = index < Math.round((averageCharge / 100) * 12);
          return (
            <span
              key={index}
              className={`rounded-full ${active ? "bg-primary" : "bg-muted"}`}
            />
          );
        })}
      </div>
    </motion.section>
  );
}

function MetricCell({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-border/40 bg-background/50 px-3 py-3">
      <div className="mb-2 text-primary">{icon}</div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-lg font-semibold text-foreground">{value}</p>
    </div>
  );
}
