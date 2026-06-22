import { useEffect, useState } from "react";
import { BatteryCharging, RotateCcw, ShieldCheck, Sparkles, Target, Zap } from "lucide-react";
import { useLifeOSUser } from "@/hooks/useLifeOSAuth";
import { usePageViewTracking } from "@/hooks/useAnalytics";
import { ControllableCardsShowcase } from "@/components/dashboard/ControllableCardsShowcase";
import { SelfTrustChargeStrip } from "@/components/dashboard/SelfTrustChargeStrip";
import { StartingChargeFlow } from "@/components/dashboard/StartingChargeFlow";
import { InfoHint } from "@/components/ui/info-hint";
import { FutureChip, FutureHero, FutureMetric, FuturePanel } from "@/components/ui/future";
import { useControllableLevels } from "@/hooks/useControllableLevels";
import { useMyControllablesProfile } from "@/hooks/useMyControllablesProfile";
import { ALL_CONTROLLABLES } from "@/lib/controllableTheme";
import { getControllableChargeVisual } from "@/lib/controllableVisuals";
import { getBookControllable } from "@/lib/bookWorld";
import { getEgoPattern, type MyControllablesProfile, type SelfTrustStats } from "@/lib/myControllables";
import {
  getStartingChargeResult,
  STARTING_CHARGE_EGO_SIGNAL_LABELS,
  type StartingChargeResult,
} from "@/lib/startingCharge";

export default function MyControllables() {
  usePageViewTracking("My Controllables");
  const user = useLifeOSUser();
  const { data: levels } = useControllableLevels(user.id);
  const { profile, stats } = useMyControllablesProfile(user.id);
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
      <FutureHero
        eyebrow="The Dashboard"
        title="My Controllables"
        icon={<BatteryCharging className="h-5 w-5" />}
        chips={
          <>
            <FutureChip icon={<ShieldCheck className="h-3.5 w-3.5" />} label={`${chargedCount}/5 Charged`} />
            <FutureChip icon={<Zap className="h-3.5 w-3.5" />} label={`${totalXp.toLocaleString()} XP`} />
            <FutureChip icon={<Sparkles className="h-3.5 w-3.5" />} label={`Self-Trust Level ${stats.level}`} />
          </>
        }
        side={
          <div>
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="future-eyebrow">Lead Charge</p>
              <span className="text-xs font-semibold text-primary">{leadVisual?.progressPercent ?? 0}%</span>
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
        }
      >
        <InfoHint title="My Controllables">
          Your private Promise Ledger: Starting Charge, Self-Trust, kept promises, recovery wins, and the Controllable you are training now.
        </InfoHint>
      </FutureHero>

      {/* Preserve the color rail from the card deck as a compact signal bar. */}
      <div className="grid grid-cols-5 gap-px overflow-hidden rounded-xl border border-primary/10">
        {roster.map((visual) => (
          <span key={visual.type} className="h-1" style={{ backgroundColor: visual.color }} />
        ))}
      </div>

      {!startingChargeResult || showStartingCharge ? (
        <StartingChargeFlow
          userId={user.id}
          onSaved={(result) => {
            setStartingChargeResult(result);
            setShowStartingCharge(false);
          }}
        />
      ) : (
        <StartingChargeProfileCard
          result={startingChargeResult}
          onRetake={() => setShowStartingCharge(true)}
        />
      )}

      <PromiseLedgerSnapshot
        stats={stats}
        startingChargeResult={startingChargeResult}
        profile={profile}
      />

      <ControllableCardsShowcase
        userId={user.id}
        title="My Controllable Cards"
        subtitle="Your private card collection shows level, charge stage, XP, stats, and safe share copy for every Controllable."
      />

      <SelfTrustChargeStrip userId={user.id} />
    </div>
  );
}

function PromiseLedgerSnapshot({
  stats,
  startingChargeResult,
  profile,
}: {
  stats: SelfTrustStats;
  startingChargeResult: StartingChargeResult | null;
  profile: MyControllablesProfile;
}) {
  const strongest = profile.assessment
    ? getBookControllable(profile.assessment.strongest).name
    : startingChargeResult
      ? getBookControllable(startingChargeResult.strongestControllable).name
      : "Not read yet";
  const focus = profile.assessment
    ? getBookControllable(profile.assessment.growth).name
    : startingChargeResult
      ? getBookControllable(startingChargeResult.chargingControllable).name
      : "Start with the 60-second read";
  const egoPattern = profile.assessment
    ? getEgoPattern(profile.assessment.egoPattern).label
    : startingChargeResult
      ? STARTING_CHARGE_EGO_SIGNAL_LABELS[startingChargeResult.egoSignal]
      : "Not named yet";

  return (
    <FuturePanel>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="future-eyebrow">
            Promise Ledger
          </p>
          <div className="mt-1 flex items-center gap-2">
            <h2 className="font-display text-2xl font-bold text-foreground">
              Confidence Comes From Kept Promises.
            </h2>
            <InfoHint title="Promise Ledger">
              Private growth first. Public proof only when you choose it.
            </InfoHint>
          </div>
        </div>
        <div className="grid min-w-0 gap-2 sm:grid-cols-3 lg:min-w-[420px]">
          <FutureMetric label="Self-Trust" value={`Level ${stats.level}`} />
          <FutureMetric label="Kept promises" value={stats.keptPromises.toString()} />
          <FutureMetric label="Recovery wins" value={stats.recoveryWins.toString()} />
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <LedgerMetric label="Strongest Controllable" value={strongest} />
        <LedgerMetric label="Current training focus" value={focus} />
        <LedgerMetric label="Ego pattern" value={egoPattern} />
      </div>
    </FuturePanel>
  );
}

function LedgerMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/55 bg-background/60 px-3 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold leading-5 text-foreground">{value}</p>
    </div>
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
    <FuturePanel>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-primary/70" />
      <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="future-icon-frame">
              <BatteryCharging className="h-5 w-5" />
            </span>
            <div>
              <p className="future-eyebrow">Starting Charge</p>
              <h2 className="font-display text-2xl font-bold text-foreground">Mission 001 ready</h2>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <FutureChip icon={<span aria-hidden="true">{strongest.icon}</span>} label={`Strongest: ${strongest.name}`} />
            <FutureChip icon={<span aria-hidden="true">{charging.icon}</span>} label={`Charging: ${charging.name}`} />
            <FutureChip icon={<Target className="h-3.5 w-3.5" />} label={result.firstMission.title} />
            <FutureChip icon={<Sparkles className="h-3.5 w-3.5" />} label={STARTING_CHARGE_EGO_SIGNAL_LABELS[result.egoSignal]} />
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
    </FuturePanel>
  );
}
