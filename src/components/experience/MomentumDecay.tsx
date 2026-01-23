import { motion } from "framer-motion";
import { AlertTriangle, Flame, Clock, TrendingDown, RefreshCw, Zap } from "lucide-react";
import { differenceInDays, differenceInHours } from "date-fns";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useMemo } from "react";
import { CollapsibleCard } from "./CollapsibleCard";

interface MomentumDecayProps {
  lastActivity?: string | null;
  currentStreak?: number;
  hasActiveQuest?: boolean;
  hasActiveReset?: boolean;
  onStartReset?: () => void;
}

export function MomentumDecay({ 
  lastActivity, 
  currentStreak = 0, 
  hasActiveQuest,
  hasActiveReset,
  onStartReset 
}: MomentumDecayProps) {
  // Use state to force re-renders for live updates
  const [now, setNow] = useState(() => new Date());

  // Update the timer every minute for live display
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  const lastActiveDate = useMemo(() => 
    lastActivity ? new Date(lastActivity) : null, 
    [lastActivity]
  );
  
  const daysSinceActivity = lastActiveDate ? differenceInDays(now, lastActiveDate) : null;
  const hoursSinceActivity = lastActiveDate ? differenceInHours(now, lastActiveDate) : null;

  // Momentum status
  const getMomentumStatus = () => {
    if (!lastActiveDate || daysSinceActivity === null) {
      return { 
        status: "dormant", 
        label: "No Activity Yet", 
        color: "text-muted-foreground",
        bgColor: "bg-muted",
        message: "Start building momentum",
        decay: 0 
      };
    }
    if (daysSinceActivity === 0) {
      return { 
        status: "active", 
        label: "Momentum Active", 
        color: "text-green-500",
        bgColor: "bg-green-500/20",
        message: "You're on fire today",
        decay: 0 
      };
    }
    if (daysSinceActivity === 1) {
      return { 
        status: "cooling", 
        label: "Momentum Cooling", 
        color: "text-amber-500",
        bgColor: "bg-amber-500/20",
        message: "Act today to maintain streak",
        decay: 25 
      };
    }
    if (daysSinceActivity <= 3) {
      return { 
        status: "fading", 
        label: "Momentum Fading", 
        color: "text-orange-500",
        bgColor: "bg-orange-500/20",
        message: "Recovery still possible",
        decay: 50 
      };
    }
    if (daysSinceActivity <= 7) {
      return { 
        status: "critical", 
        label: "Momentum Critical", 
        color: "text-red-500",
        bgColor: "bg-red-500/20",
        message: "Significant effort needed",
        decay: 75 
      };
    }
    return { 
      status: "lost", 
      label: "Momentum Lost", 
      color: "text-red-600",
      bgColor: "bg-red-600/20",
      message: "Full recovery required",
      decay: 100 
    };
  };

  const momentum = getMomentumStatus();
  const showWarning = momentum.status !== "active" && momentum.status !== "dormant";

  return (
    <CollapsibleCard
      icon={
        <div className={`w-8 h-8 rounded-full ${momentum.bgColor} flex items-center justify-center`}>
          {showWarning ? (
            <AlertTriangle className={`w-4 h-4 ${momentum.color}`} />
          ) : (
            <Flame className="w-4 h-4 text-green-500" />
          )}
        </div>
      }
      title="Cost of Inaction"
      subtitle="Gravity beats motivation"
      headerGradient={
        showWarning 
          ? "bg-gradient-to-r from-red-500/10 to-amber-500/10" 
          : "bg-gradient-to-r from-green-500/10 to-transparent"
      }
      defaultOpen={false}
    >
      <div className="p-4 space-y-4">
        {/* Current Momentum Status */}
        <div className={`p-4 rounded-xl ${momentum.bgColor} border border-current/10`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`font-medium ${momentum.color}`}>{momentum.label}</span>
            {currentStreak > 0 && (
              <div className="flex items-center gap-1 text-amber-500">
                <Flame className="w-4 h-4" />
                <span className="text-sm font-medium">{currentStreak} day streak</span>
              </div>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{momentum.message}</p>
          
          {/* Decay meter */}
          {momentum.decay > 0 && (
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-muted-foreground">Momentum Decay</span>
                <span className={momentum.color}>{momentum.decay}%</span>
              </div>
              <div className="h-2 bg-background/50 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${momentum.decay}%` }}
                  transition={{ duration: 0.5 }}
                  className={`h-full rounded-full ${
                    momentum.decay >= 75 ? "bg-red-500" :
                    momentum.decay >= 50 ? "bg-orange-500" :
                    "bg-amber-500"
                  }`}
                />
              </div>
            </div>
          )}
        </div>

        {/* Time since last activity */}
        {lastActiveDate && daysSinceActivity !== null && (
          <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30">
            <Clock className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium text-foreground">
                {daysSinceActivity === 0 
                  ? `${hoursSinceActivity}h ago`
                  : daysSinceActivity === 1 
                  ? "Yesterday"
                  : `${daysSinceActivity} days ago`}
              </p>
              <p className="text-xs text-muted-foreground">Last activity</p>
            </div>
          </div>
        )}

        {/* Inaction Consequences */}
        <div className="p-3 rounded-xl bg-muted/20 border border-dashed border-border">
          <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
            Doing nothing is a choice
          </p>
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <TrendingDown className="w-3 h-3" />
              <span>Momentum pauses after 24h</span>
            </li>
            <li className="flex items-center gap-2">
              <TrendingDown className="w-3 h-3" />
              <span>Streak breaks after 48h</span>
            </li>
            <li className="flex items-center gap-2">
              <TrendingDown className="w-3 h-3" />
              <span>Recovery cost increases daily</span>
            </li>
          </ul>
        </div>

        {/* Recovery Action */}
        {showWarning && !hasActiveReset && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            <Button 
              onClick={onStartReset}
              className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Start Recovery Reset
            </Button>
          </motion.div>
        )}

        {/* Active status encouragement */}
        {momentum.status === "active" && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-green-500/10 border border-green-500/20">
            <Zap className="w-4 h-4 text-green-500" />
            <p className="text-sm text-green-600 dark:text-green-400">
              Keep going! Every action compounds.
            </p>
          </div>
        )}
      </div>
    </CollapsibleCard>
  );
}
