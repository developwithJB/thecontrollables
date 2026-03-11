import { useState } from "react";
import { useHealthData } from "@/hooks/useHealthData";
import { Activity, Battery, BedDouble, Zap, X } from "lucide-react";
import { isToday, addDays, startOfDay } from "date-fns";

interface PlannerWellnessBannerProps {
  userId: string | undefined;
  selectedDate?: Date;
}

export function PlannerWellnessBanner({ userId, selectedDate }: PlannerWellnessBannerProps) {
  const { isConnected, latest } = useHealthData(userId);
  const [dismissed, setDismissed] = useState(false);

  if (!isConnected || dismissed) return null;

  const recovery = latest.recovery;
  const sleepMins = latest.sleepMinutes;
  const strain = latest.strain;

  const tomorrow = addDays(startOfDay(new Date()), 1);
  const isViewingTomorrow = selectedDate && startOfDay(selectedDate).getTime() === tomorrow.getTime();
  const isViewingToday = !selectedDate || (selectedDate && isToday(selectedDate));

  let message = "";
  let Icon = Activity;
  let colorClass = "text-muted-foreground";
  let bgClass = "bg-muted/50";

  if (isViewingTomorrow && recovery !== null) {
    // Tomorrow-specific forecast messaging
    if (recovery >= 67) {
      message = `Recovery forecast: ${recovery}%. Good day for deep work — schedule high-focus tasks in the morning.`;
      Icon = Zap;
      colorClass = "text-green-500";
      bgClass = "bg-green-500/10";
    } else if (recovery < 33) {
      message = `Recovery forecast: ${recovery}%. Consider lighter tasks and shorter blocks. Protect your energy.`;
      Icon = Battery;
      colorClass = "text-destructive";
      bgClass = "bg-destructive/10";
    } else {
      message = `Recovery forecast: ${recovery}%. Schedule high-focus work in the morning, lighter tasks after 2pm.`;
      Icon = Activity;
      colorClass = "text-orange-500";
      bgClass = "bg-orange-500/10";
    }
  } else if (isViewingToday) {
    // Original today logic
    if (recovery !== null && recovery < 33) {
      message = "Recovery is low — consider a lighter schedule today";
      Icon = Battery;
      colorClass = "text-destructive";
      bgClass = "bg-destructive/10";
    } else if (sleepMins !== null && sleepMins < 360) {
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
  } else {
    return null;
  }

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium ${bgClass} ${colorClass}`}>
      <Icon className="h-3.5 w-3.5 flex-shrink-0" />
      <span className="flex-1">{message}</span>
      {recovery !== null && !isViewingTomorrow && (
        <span className="text-[10px] opacity-70 font-mono">{recovery}%</span>
      )}
      <button
        onClick={() => setDismissed(true)}
        className="ml-1 p-0.5 rounded hover:bg-background/50 transition-colors"
        title="Dismiss"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}