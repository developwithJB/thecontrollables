import type React from "react";
import { BatteryCharging, Dumbbell, Target, Zap } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { useLifeOSUser } from "@/hooks/useLifeOSAuth";
import { usePageViewTracking } from "@/hooks/useAnalytics";
import { DailyOperatorBrief } from "@/components/dashboard/DailyOperatorBrief";
import { DailyRings } from "@/components/dashboard/DailyRings";
import { ControllableChargeStrip } from "@/components/dashboard/ControllableChargeStrip";
import { ControllableLevelsCard } from "@/components/dashboard/ControllableLevelsCard";
import { getControllableGuide, isControllableGuideId } from "@/lib/controllables";

export default function Train() {
  usePageViewTracking("Train");
  const user = useLifeOSUser();
  const [searchParams] = useSearchParams();
  const target = searchParams.get("controllable");
  const targetGuide = isControllableGuideId(target) ? getControllableGuide(target) : null;

  return (
    <div className="mx-auto max-w-5xl space-y-4 pb-24">
      <header className="dashboard-os-surface rounded-[2rem] p-5 sm:p-6">
        <div className="relative z-10">
          <div className="pointer-events-none absolute inset-x-0 top-0 grid grid-cols-12 gap-px opacity-60">
            {Array.from({ length: 12 }).map((_, index) => (
              <span key={index} className={index < 7 ? "h-px bg-primary" : "h-px bg-border"} />
            ))}
          </div>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-[inset_0_0_22px_hsl(var(--primary)/0.1)]">
                <Dumbbell className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Charging Bay</p>
                <h1 className="dashboard-neon-accent font-display text-4xl font-bold leading-tight">Train</h1>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <TrainChip icon={<Target className="h-3.5 w-3.5" />} label={targetGuide ? `${targetGuide.emoji} ${targetGuide.name}` : "Mission Ready"} />
              <TrainChip icon={<Zap className="h-3.5 w-3.5" />} label="Charge progress" />
              <TrainChip icon={<BatteryCharging className="h-3.5 w-3.5" />} label="Stay Charged" />
            </div>
          </div>
        </div>
      </header>

      <DailyOperatorBrief userId={user.id} />
      <ControllableChargeStrip userId={user.id} />
      <DailyRings userId={user.id} />
      <ControllableLevelsCard userId={user.id} />
    </div>
  );
}

function TrainChip({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-foreground shadow-[0_0_16px_hsl(var(--primary)/0.08)]">
      <span className="text-primary">{icon}</span>
      {label}
    </span>
  );
}
