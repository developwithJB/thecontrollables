import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { BatteryCharging } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ChargeMoment } from "@/components/dashboard/ChargeMoment";
import { ControllableChargeCard } from "@/components/dashboard/ControllableChargeVisual";
import { useControllableLevels } from "@/hooks/useControllableLevels";
import { ALL_CONTROLLABLES } from "@/lib/controllableTheme";
import { getControllableChargeStageState } from "@/lib/controllableRoster";
import { APP_ROUTES } from "@/lib/appRoutes";
import { useToast } from "@/hooks/use-toast";
import type { ControllableType } from "@/components/ControllableCard";

interface ControllableLevelsCardProps {
  userId: string | null;
}

export function ControllableLevelsCard({ userId }: ControllableLevelsCardProps) {
  const { data: levels, isLoading } = useControllableLevels(userId);
  const { toast } = useToast();
  const navigate = useNavigate();
  const initRef = useRef(false);

  useEffect(() => {
    if (!levels || !userId) return;

    const storageKey = `controllable_charge_stages_${userId}`;
    let saved: Record<string, number> = {};

    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) saved = JSON.parse(raw);
    } catch {
      // Ignore malformed local progress cache.
    }

    const updated: Record<string, number> = { ...saved };
    let changed = false;

    for (const controllableLevel of levels) {
      const chargeStage = getControllableChargeStageState(controllableLevel);
      const previousStageLevel = saved[controllableLevel.type] ?? 0;

      if (
        initRef.current &&
        previousStageLevel > 0 &&
        chargeStage.chargeStageLevel > previousStageLevel
      ) {
        toast({
          title: (
            <ChargeMoment
              type={controllableLevel.type}
              xpAwarded={40}
              progress={controllableLevel.progress}
              totalXp={controllableLevel.totalXp}
              level={controllableLevel.level}
            />
          ),
        });
      }

      if (chargeStage.chargeStageLevel !== updated[controllableLevel.type]) {
        updated[controllableLevel.type] = chargeStage.chargeStageLevel;
        changed = true;
      }
    }

    if (changed) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(updated));
      } catch {
        // Local storage can be unavailable in private or restricted contexts.
      }
    }

    initRef.current = true;
  }, [levels, userId, toast]);

  if (isLoading || !levels) return null;

  const orderedLevels = ALL_CONTROLLABLES.map(
    (type) => levels.find((level) => level.type === type) ?? { type, totalXp: 0, level: 1, current: 0, next: 25, progress: 0 },
  );

  const handleStartMission = (type: ControllableType) => {
    navigate(`${APP_ROUTES.train}?controllable=${type}`);
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="space-y-4 rounded-2xl border border-border/60 bg-card p-4"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <BatteryCharging className="h-4 w-4" />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-foreground">My Controllables</h3>
            <p className="text-xs text-muted-foreground">Charge Stage</p>
          </div>
        </div>
        <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
          Always Get Better
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {orderedLevels.map((level) => (
          <ControllableChargeCard
            key={level.type}
            level={level}
            onStartMission={handleStartMission}
          />
        ))}
      </div>
    </motion.section>
  );
}
