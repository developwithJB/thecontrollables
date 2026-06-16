import type React from "react";
import { useEffect, useState } from "react";
import { BatteryCharging, RotateCcw, ShieldCheck, Sparkles, Target, Zap } from "lucide-react";
import { useLifeOSUser } from "@/hooks/useLifeOSAuth";
import { usePageViewTracking } from "@/hooks/useAnalytics";
import { ControllableLevelsCard } from "@/components/dashboard/ControllableLevelsCard";
import { ControllableChargeStrip } from "@/components/dashboard/ControllableChargeStrip";
import { SelfTrustChargeStrip } from "@/components/dashboard/SelfTrustChargeStrip";
import { StartingChargeFlow } from "@/components/dashboard/StartingChargeFlow";
import { useControllableLevels } from "@/hooks/useControllableLevels";
import { ALL_CONTROLLABLES } from "@/lib/controllableTheme";
import { getControllableChargeVisual } from "@/lib/controllableVisuals";
import {
  getStartingChargeResult,
  STARTING_CHARGE_EGO_SIGNAL_LABELS,
  type StartingChargeResult,
} from "@/lib/startingCharge";

export default function MyControllables() {
  usePageViewTracking("My Controllables");
  const user = useLifeOSUser();
  const { data: levels } = useControllableLevels(user.id);
  const [startingChargeResult, setStartingChargeResult] = useState<StartingChargeResult | null>(null);
  const [showStartingCharge, setShowStartingCharge] = useState(false);
  const roster = ALL_CONTROLLABLES.map((type) => {
    const level = levels?.find((item) => item.type === type) ?? { type, totalXp: 0, level: 1, current: 0, next: 25, progress: 0 };
    return getControllableChargeVisual(level);
  });
  const totalXp = roster.reduce((sum, visual) => sum + visual.totalXp, 0);
  const chargedCount = roster.filter((visual) => visual.stageLevel >= 2).length;
  const leadVisual = [...roster].sort((a, b) => b.progressPercent - a.progressPercent)[0];

  useEffect(() => {
    setStartingChargeResult(getStartingChargeResult(user.id));
  }, [user.id]);

  return (
    <div className="mx-auto max-w-6xl space-y-4 pb-24">
      <header className="dashboard-os-surface rounded-[2rem] p-5 sm:p-6">
        <div className="relative z-10">
        <div className="pointer-events-none absolute inset-x-0 top-0 grid grid-cols-5 gap-px opacity-70">
          {roster.map((visual) => (
            <span key={visual.type} className="h-px" style={{ backgroundColor: visual.color }} />
          ))}
        </div>
        <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-[inset_0_0_22px_hsl(var(--primary)/0.1)]">
                <BatteryCharging className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">The Dashboard</p>
                <h1 className="dashboard-neon-accent font-display text-4xl font-bold leading-tight">My Controllables</h1>
              </div>
            </div>
            <p className="max-w-xl text-sm font-medium text-muted-foreground">
              Charge your Controllables.
            </p>
            <div className="flex flex-wrap gap-2">
              <HeroChip icon={<ShieldCheck className="h-3.5 w-3.5" />} label={`${chargedCount}/5 Charged`} />
              <HeroChip icon={<Zap className="h-3.5 w-3.5" />} label={`${totalXp.toLocaleString()} XP`} />
              <HeroChip icon={<Sparkles className="h-3.5 w-3.5" />} label="The Continuous Upgrade" />
            </div>
          </div>

          <div className="dashboard-os-card rounded-2xl p-3">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Lead Charge</p>
              <span className="text-[10px] font-semibold text-primary">{leadVisual?.progressPercent ?? 0}%</span>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {roster.map((visual) => (
                <div key={visual.type} className="text-center">
                  <span
                    className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border text-2xl"
                    style={{
                      backgroundColor: visual.softColor,
                      borderColor: visual.stage === "base" ? "hsl(var(--border))" : visual.color,
                      boxShadow: visual.stage === "base" ? undefined : `0 0 18px ${visual.softColor}`,
                    }}
                    aria-hidden="true"
                  >
                    {visual.icon}
                  </span>
                  <span className="mt-1 block truncate text-[9px] font-semibold text-muted-foreground">{visual.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        </div>
      </header>

      {!startingChargeResult || showStartingCharge ? (
        <StartingChargeFlow
          userId={user.id}
          onSaved={(result) => {
            setStartingChargeResult(result);
            setShowStartingCharge(true);
          }}
        />
      ) : (
        <StartingChargeProfileCard
          result={startingChargeResult}
          onRetake={() => setShowStartingCharge(true)}
        />
      )}

      <ControllableChargeStrip userId={user.id} />
      <SelfTrustChargeStrip userId={user.id} />
      <ControllableLevelsCard userId={user.id} />
    </div>
  );
}

function HeroChip({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-foreground shadow-[0_0_16px_hsl(var(--primary)/0.08)]">
      <span className="text-primary">{icon}</span>
      {label}
    </span>
  );
}

function StartingChargeProfileCard({
  result,
  onRetake,
}: {
  result: StartingChargeResult;
  onRetake: () => void;
}) {
  const strongest = getControllableChargeVisual({
    type: result.strongestControllable,
    level: 1,
    totalXp: result.chargePercentages[result.strongestControllable],
    progress: result.chargePercentages[result.strongestControllable] / 100,
  });
  const charging = getControllableChargeVisual({
    type: result.chargingControllable,
    level: 1,
    totalXp: result.chargePercentages[result.chargingControllable],
    progress: result.chargePercentages[result.chargingControllable] / 100,
  });

  return (
    <section className="dashboard-os-card rounded-[2rem] p-4">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-primary/70" />
      <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <BatteryCharging className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Starting Charge</p>
              <h2 className="dashboard-neon-accent font-display text-2xl font-bold">Mission 001 ready</h2>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <HeroChip icon={<span aria-hidden="true">{strongest.icon}</span>} label={`Strongest: ${strongest.name}`} />
            <HeroChip icon={<span aria-hidden="true">{charging.icon}</span>} label={`Charging: ${charging.name}`} />
            <HeroChip icon={<Target className="h-3.5 w-3.5" />} label={result.firstMission.title} />
            <HeroChip icon={<Sparkles className="h-3.5 w-3.5" />} label={STARTING_CHARGE_EGO_SIGNAL_LABELS[result.egoSignal]} />
          </div>
        </div>
        <button
          type="button"
          onClick={onRetake}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-primary/30 bg-background/60 px-3 text-xs font-semibold text-foreground transition-colors hover:border-primary/60"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Retake scan
        </button>
      </div>
    </section>
  );
}
