import { motion } from "framer-motion";
import { BatteryCharging, Zap } from "lucide-react";
import { ControllableChargeTile } from "@/components/dashboard/ControllableChargeVisual";
import { useControllableLevels } from "@/hooks/useControllableLevels";
import { ALL_CONTROLLABLES } from "@/lib/controllableTheme";

interface ControllableChargeStripProps {
  userId: string | null;
}

export function ControllableChargeStrip({ userId }: ControllableChargeStripProps) {
  const { data: levels, isLoading } = useControllableLevels(userId);

  if (isLoading || !levels) {
    return (
      <section className="dashboard-os-card rounded-2xl px-4 py-4">
        <div className="mb-3 h-8 w-40 animate-pulse rounded-lg bg-muted/70" />
        <div className="grid grid-cols-5 gap-2">
          {ALL_CONTROLLABLES.map((type) => (
            <div key={type} className="h-24 animate-pulse rounded-xl bg-muted/50" />
          ))}
        </div>
      </section>
    );
  }

  const clampedProgress = levels.map((level) => Math.max(0, Math.min(level.progress, 1)));
  const chargedCount = clampedProgress.filter((progress) => progress >= 0.34).length;
  const averageCharge = Math.round(
    (clampedProgress.reduce((sum, progress) => sum + progress, 0) / Math.max(clampedProgress.length, 1)) * 100,
  );

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="dashboard-os-card overflow-hidden rounded-2xl px-4 py-4"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-[inset_0_0_18px_hsl(var(--primary)/0.08)]">
            <BatteryCharging className="h-4 w-4" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              My Controllables
            </p>
            <p className="text-sm font-semibold text-foreground">{chargedCount}/5 charged</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold text-primary">
          <Zap className="h-3 w-3" />
          {averageCharge}%
        </span>
      </div>

      <div className="grid grid-cols-5 gap-2">
        {ALL_CONTROLLABLES.map((type) => {
          const level = levels.find((item) => item.type === type);

          return (
            <ControllableChargeTile
              key={type}
              level={level ?? { type, totalXp: 0, level: 1, current: 0, next: 25, progress: 0 }}
            />
          );
        })}
      </div>
      <div className="mt-3 grid h-1.5 grid-cols-12 gap-1">
        {Array.from({ length: 12 }).map((_, index) => (
          <span
            key={index}
            className={index < Math.round((averageCharge / 100) * 12) ? "rounded-full bg-primary" : "rounded-full bg-muted/70"}
          />
        ))}
      </div>
    </motion.section>
  );
}
