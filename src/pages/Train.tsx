import { Dumbbell } from "lucide-react";
import { useLifeOSUser } from "@/hooks/useLifeOSAuth";
import { usePageViewTracking } from "@/hooks/useAnalytics";
import { DailyOperatorBrief } from "@/components/dashboard/DailyOperatorBrief";
import { DailyRings } from "@/components/dashboard/DailyRings";
import { ControllableLevelsCard } from "@/components/dashboard/ControllableLevelsCard";

export default function Train() {
  usePageViewTracking("Train");
  const user = useLifeOSUser();

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <header className="flex items-center gap-3">
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Dumbbell className="h-5 w-5" />
        </span>
        <div>
          <h1 className="font-display text-2xl font-semibold text-foreground">Train</h1>
          <p className="text-sm text-muted-foreground">One step, one habit, one choice at a time.</p>
        </div>
      </header>

      <DailyOperatorBrief userId={user.id} />
      <DailyRings userId={user.id} />
      <ControllableLevelsCard userId={user.id} />
    </div>
  );
}
