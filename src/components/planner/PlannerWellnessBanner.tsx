import { useWhoopData } from "@/hooks/useWhoopData";
import { Activity, Battery, BedDouble, Zap } from "lucide-react";

interface PlannerWellnessBannerProps {
  userId: string | undefined;
}

export function PlannerWellnessBanner({ userId }: PlannerWellnessBannerProps) {
  const { isConnected, latestRecovery, latestSleep, latestCycle } = useWhoopData(userId);

  if (!isConnected || !latestRecovery) return null;

  const recovery = latestRecovery.recovery_score;
  const sleepPerf = latestSleep?.sleep_performance_pct;
  const strain = latestCycle?.strain;

  let message = "";
  let Icon = Activity;
  let colorClass = "text-muted-foreground";
  let bgClass = "bg-muted/50";

  if (recovery !== null && recovery < 33) {
    message = "Recovery is low — consider a lighter schedule today";
    Icon = Battery;
    colorClass = "text-destructive";
    bgClass = "bg-destructive/10";
  } else if (sleepPerf !== null && sleepPerf < 70) {
    message = "Sleep was short — protect your morning focus window";
    Icon = BedDouble;
    colorClass = "text-orange-500";
    bgClass = "bg-orange-500/10";
  } else if (strain !== null && strain > 14 && recovery !== null && recovery < 50) {
    message = "High strain detected — add recovery buffer";
    Icon = Activity;
    colorClass = "text-orange-500";
    bgClass = "bg-orange-500/10";
  } else if (recovery !== null && recovery >= 67) {
    message = "Recovery is strong — good day for deep work";
    Icon = Zap;
    colorClass = "text-green-500";
    bgClass = "bg-green-500/10";
  } else {
    return null;
  }

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium ${bgClass} ${colorClass}`}>
      <Icon className="h-3.5 w-3.5 flex-shrink-0" />
      <span>{message}</span>
      {recovery !== null && (
        <span className="ml-auto text-[10px] opacity-70 font-mono">{recovery}%</span>
      )}
    </div>
  );
}
