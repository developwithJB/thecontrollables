import { BatteryCharging, Dumbbell, Target, Zap } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { useLifeOSUser } from "@/hooks/useLifeOSAuth";
import { usePageViewTracking } from "@/hooks/useAnalytics";
import { DailyOperatorBrief } from "@/components/dashboard/DailyOperatorBrief";
import { DailyRings } from "@/components/dashboard/DailyRings";
import { ControllableCardsShowcase } from "@/components/dashboard/ControllableCardsShowcase";
import { FutureChip, FutureHero, FutureMetric } from "@/components/ui/future";
import { getControllableGuide, isControllableGuideId } from "@/lib/controllables";

export default function Train() {
  usePageViewTracking("Train");
  const user = useLifeOSUser();
  const [searchParams] = useSearchParams();
  const target = searchParams.get("controllable");
  const targetGuide = isControllableGuideId(target) ? getControllableGuide(target) : null;

  return (
    <div className="mx-auto max-w-5xl space-y-4 pb-24">
      <FutureHero
        eyebrow="Charging Bay"
        title="Train"
        icon={<Dumbbell className="h-5 w-5" />}
        chips={
          <>
            <FutureChip icon={<Target className="h-3.5 w-3.5" />} label={targetGuide ? `${targetGuide.emoji} ${targetGuide.name}` : "Mission Ready"} />
            <FutureChip icon={<Zap className="h-3.5 w-3.5" />} label="Charge progress" />
            <FutureChip icon={<BatteryCharging className="h-3.5 w-3.5" />} label="Stay Charged" />
          </>
        }
        side={
          <div className="grid grid-cols-3 gap-2">
            <FutureMetric label="Flows" value="5" />
            <FutureMetric label="Deck" value="Live" />
            <FutureMetric label="Mode" value="Daily" />
          </div>
        }
      />

      <ControllableCardsShowcase
        userId={user.id}
        title="Train Your Controllable Cards"
        subtitle="Level the five cards through real reps, kept promises, recovery wins, and proof you choose to share."
      />

      <DailyOperatorBrief userId={user.id} />
      <DailyRings userId={user.id} />
    </div>
  );
}
