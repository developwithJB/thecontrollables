import { BatteryCharging } from "lucide-react";
import { useLifeOSUser } from "@/hooks/useLifeOSAuth";
import { usePageViewTracking } from "@/hooks/useAnalytics";
import { ControllableLevelsCard } from "@/components/dashboard/ControllableLevelsCard";
import { ControllableChargeStrip } from "@/components/dashboard/ControllableChargeStrip";
import { SelfTrustChargeStrip } from "@/components/dashboard/SelfTrustChargeStrip";

export default function MyControllables() {
  usePageViewTracking("My Controllables");
  const user = useLifeOSUser();

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <header className="flex items-center gap-3">
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <BatteryCharging className="h-5 w-5" />
        </span>
        <div>
          <h1 className="font-display text-2xl font-semibold text-foreground">My Controllables</h1>
          <p className="text-sm text-muted-foreground">Charge your Controllables.</p>
        </div>
      </header>

      <ControllableChargeStrip userId={user.id} />
      <SelfTrustChargeStrip userId={user.id} />
      <ControllableLevelsCard userId={user.id} />
    </div>
  );
}
