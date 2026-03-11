import { motion } from "framer-motion";
import { Heart, Moon, Calendar, Activity, Wifi } from "lucide-react";
import { Link } from "react-router-dom";
import type { HealthMetrics } from "@/hooks/useHealthData";

interface TodayReadinessBarProps {
  health: HealthMetrics | null;
  plannerCount: number;
  wearableConnected: boolean;
  calendarConnected: boolean;
}

function formatSleep(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return `${h}h ${m}m`;
}

function getDayType(recovery: number | null, plannerCount: number): string {
  if (recovery === null) {
    if (plannerCount === 0) return "Open";
    if (plannerCount <= 3) return "Light";
    if (plannerCount <= 6) return "Moderate";
    return "Heavy";
  }
  const isHeavy = plannerCount > 5;
  const isLight = plannerCount <= 2;
  if (recovery >= 67) return isHeavy ? "Demanding" : isLight ? "Recovery window" : "Strong";
  if (recovery >= 34) return isHeavy ? "Stretch" : "Moderate";
  return isHeavy ? "Caution" : "Conserve";
}

export function TodayReadinessBar({ health, plannerCount, wearableConnected, calendarConnected }: TodayReadinessBarProps) {
  const hasAnyData = wearableConnected || calendarConnected;

  if (!hasAnyData) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-lg border border-border/40 bg-muted/30 px-4 py-3 text-center"
      >
        <p className="text-xs text-muted-foreground">
          Connect{" "}
          <Link to="/planner" className="text-primary hover:underline">Calendar</Link>
          {" + "}
          <Link to="/wellness" className="text-primary hover:underline">Wearable</Link>
          {" "}to unlock your daily read.
        </p>
      </motion.div>
    );
  }

  const dayType = getDayType(health?.recovery ?? null, plannerCount);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border border-border/40 bg-card/60 px-3 py-2.5"
    >
      <div className="flex items-center gap-3 overflow-x-auto scrollbar-none">
        {/* Recovery */}
        {wearableConnected && health?.recovery !== null && health?.recovery !== undefined && (
          <div className="flex items-center gap-1.5 shrink-0">
            <Heart className="w-3.5 h-3.5 text-wellness" />
            <span className="text-xs text-muted-foreground">Recovery</span>
            <span className="text-xs font-mono font-semibold text-foreground">{Math.round(health.recovery)}%</span>
          </div>
        )}

        {/* Sleep */}
        {wearableConnected && health?.sleepMinutes !== null && health?.sleepMinutes !== undefined && (
          <>
            <span className="text-border/60 shrink-0">·</span>
            <div className="flex items-center gap-1.5 shrink-0">
              <Moon className="w-3.5 h-3.5 text-accent/70" />
              <span className="text-xs text-muted-foreground">Sleep</span>
              <span className="text-xs font-mono font-semibold text-foreground">{formatSleep(health.sleepMinutes)}</span>
            </div>
          </>
        )}

        {/* Plan load */}
        {calendarConnected && (
          <>
            {wearableConnected && <span className="text-border/60 shrink-0">·</span>}
            <div className="flex items-center gap-1.5 shrink-0">
              <Calendar className="w-3.5 h-3.5 text-primary/70" />
              <span className="text-xs text-muted-foreground">Plan</span>
              <span className="text-xs font-mono font-semibold text-foreground">{plannerCount} items</span>
            </div>
          </>
        )}

        {/* Day type */}
        <span className="text-border/60 shrink-0">·</span>
        <div className="flex items-center gap-1.5 shrink-0">
          <Activity className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs font-medium text-foreground">{dayType}</span>
        </div>

        {/* Connect nudge */}
        {!wearableConnected && (
          <>
            <span className="text-border/60 shrink-0">·</span>
            <Link to="/wellness" className="flex items-center gap-1 shrink-0 text-[10px] text-primary/70 hover:text-primary transition-colors">
              <Wifi className="w-3 h-3" /> + Wearable
            </Link>
          </>
        )}
        {!calendarConnected && (
          <>
            <span className="text-border/60 shrink-0">·</span>
            <Link to="/planner" className="flex items-center gap-1 shrink-0 text-[10px] text-primary/70 hover:text-primary transition-colors">
              <Calendar className="w-3 h-3" /> + Calendar
            </Link>
          </>
        )}
      </div>
    </motion.div>
  );
}
