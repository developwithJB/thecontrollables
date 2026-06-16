import { motion } from "framer-motion";
import { BatteryCharging } from "lucide-react";
import { ControllableChargeTile } from "@/components/dashboard/ControllableChargeVisual";
import { useControllableLevels } from "@/hooks/useControllableLevels";
import { ALL_CONTROLLABLES } from "@/lib/controllableTheme";

interface ControllableChargeStripProps {
  userId: string | null;
}

export function ControllableChargeStrip({ userId }: ControllableChargeStripProps) {
  const { data: levels, isLoading } = useControllableLevels(userId);

  if (isLoading || !levels) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border/60 bg-card px-4 py-4"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <BatteryCharging className="h-4 w-4" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              My Controllables
            </p>
          </div>
        </div>
        <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold text-primary">
          Stay Charged
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
    </motion.section>
  );
}
