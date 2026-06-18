import { useEffect, useRef } from "react";
import type React from "react";
import { motion } from "framer-motion";
import { BatteryCharging, ShieldCheck, Target, Zap } from "lucide-react";
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

  if (isLoading || !levels) {
    return (
      <section className="dashboard-os-card space-y-4 rounded-2xl p-4">
        <div className="h-12 w-48 animate-pulse rounded-xl bg-muted/60" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {ALL_CONTROLLABLES.map((type) => (
            <div key={type} className="h-56 animate-pulse rounded-2xl bg-muted/45" />
          ))}
        </div>
      </section>
    );
  }

  const orderedLevels = ALL_CONTROLLABLES.map(
    (type) => levels.find((level) => level.type === type) ?? { type, totalXp: 0, level: 1, current: 0, next: 25, progress: 0 },
  );
  const clampedProgress = orderedLevels.map((level) => Math.max(0, Math.min(level.progress, 1)));
  const chargedCount = clampedProgress.filter((progress) => progress >= 0.34).length;
  const totalXp = orderedLevels.reduce((sum, level) => sum + level.totalXp, 0);
  const averageCharge = Math.round(
    (clampedProgress.reduce((sum, progress) => sum + progress, 0) / Math.max(clampedProgress.length, 1)) * 100,
  );

  const handleStartMission = (type: ControllableType) => {
    navigate(`${APP_ROUTES.train}?controllable=${type}`);
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="dashboard-os-card space-y-4 overflow-hidden rounded-2xl p-4"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-[inset_0_0_22px_hsl(var(--primary)/0.1)]">
            <BatteryCharging className="h-4 w-4" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Charge Stage</p>
            <h3 className="dashboard-neon-accent font-display text-2xl font-bold">My Controllables</h3>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 lg:min-w-[360px]">
          <RosterMetric icon={<ShieldCheck className="h-3.5 w-3.5" />} label="Charged" value={`${chargedCount}/5`} />
          <RosterMetric icon={<Zap className="h-3.5 w-3.5" />} label="XP" value={totalXp.toLocaleString()} />
          <RosterMetric icon={<Target className="h-3.5 w-3.5" />} label="Circuit" value={`${averageCharge}%`} />
        </div>
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

function RosterMetric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-primary/20 bg-background/55 px-3 py-2 shadow-[inset_0_0_18px_hsl(var(--primary)/0.04)]">
      <div className="flex items-center gap-1.5 text-primary">
        {icon}
        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</span>
      </div>
      <p className="mt-1 font-display text-lg font-semibold text-foreground">{value}</p>
    </div>
  );
}
