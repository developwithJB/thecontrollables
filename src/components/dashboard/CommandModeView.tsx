import { useState, useMemo, useCallback } from "react";
import { FocusedActionCard, type FocusedAction } from "./FocusedActionCard";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  UtensilsCrossed,
  CalendarDays,
  BarChart3,
  DollarSign,
  Compass,
  Brain,
} from "lucide-react";

interface CommandModeViewProps {
  userId?: string;
  hasActiveSession: boolean;
  todayResetCompleted: boolean;
  todayTimeLogged: boolean;
  todayPromiseMade: boolean;
  pendingPromisesCount: number;
  hasActiveQuest: boolean;
  wellnessLoggedToday: boolean;
  askGuideCompleted: boolean;
  // Callbacks
  onOpenReset: () => void;
  onOpenTimeLog: () => void;
  onOpenPromises: () => void;
  onOpenAIGuide: () => void;
  onOpenWellness: () => void;
  onOpenMealPlan: () => void;
  onOpenPlanner: () => void;
  onOpenMoney: () => void;
  onOpenBuild: () => void;
  onSwitchToControl: () => void;
}

export const CommandModeView = ({
  hasActiveSession,
  todayResetCompleted,
  todayTimeLogged,
  todayPromiseMade,
  pendingPromisesCount,
  hasActiveQuest,
  wellnessLoggedToday,
  askGuideCompleted,
  onOpenReset,
  onOpenTimeLog,
  onOpenPromises,
  onOpenAIGuide,
  onOpenWellness,
  onOpenMealPlan,
  onOpenPlanner,
  onOpenMoney,
  onOpenBuild,
  onSwitchToControl,
}: CommandModeViewProps) => {
  const [skippedIds, setSkippedIds] = useState<Set<string>>(new Set());
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());

  // Build priority queue of actions
  const allActions: FocusedAction[] = useMemo(() => {
    const actions: FocusedAction[] = [];

    // 1. Daily reset check-in (highest priority)
    if (hasActiveSession && !todayResetCompleted) {
      actions.push({
        id: "daily-reset",
        type: "checkin",
        title: "Complete Today's Reset",
        subtitle: "Your daily foundation practice. Read, reflect, commit.",
        emoji: "🧱",
        controllable: "awareness",
        xp: 25,
        onAction: onOpenReset,
        actionLabel: "Start Reset",
      });
    }

    // 2. Wellness log
    if (!wellnessLoggedToday) {
      actions.push({
        id: "wellness-log",
        type: "wellness",
        title: "Log Your Fuel",
        subtitle: "How did you sleep, move, and eat today?",
        emoji: "🛡️",
        controllable: "wellness",
        xp: 10,
        onAction: onOpenWellness,
        actionLabel: "Log Wellness",
      });
    }

    // 3. Time log
    if (!todayTimeLogged) {
      actions.push({
        id: "time-log",
        type: "time_log",
        title: "Account for Your Time",
        subtitle: "How much time did you invest vs waste today?",
        emoji: "⏳",
        controllable: "habit",
        xp: 10,
        onAction: onOpenTimeLog,
        actionLabel: "Log Time",
      });
    }

    // 4. Promise review
    if (pendingPromisesCount > 0) {
      actions.push({
        id: "promise-review",
        type: "promise",
        title: "Review Pending Promises",
        subtitle: `You have ${pendingPromisesCount} promise${pendingPromisesCount > 1 ? "s" : ""} to follow up on.`,
        emoji: "🤝",
        controllable: "perspective",
        xp: 15,
        onAction: onOpenPromises,
        actionLabel: "Review Promises",
      });
    }

    // 5. Ask the guide
    if (!askGuideCompleted) {
      actions.push({
        id: "ask-guide",
        type: "guide",
        title: "Ask The Controllables",
        subtitle: "Get guidance on what to focus on today.",
        emoji: "🧭",
        xp: 5,
        onAction: onOpenAIGuide,
        actionLabel: "Open Guide",
      });
    }

    return actions;
  }, [
    hasActiveSession, todayResetCompleted, wellnessLoggedToday,
    todayTimeLogged, pendingPromisesCount, askGuideCompleted,
    onOpenReset, onOpenWellness, onOpenTimeLog, onOpenPromises, onOpenAIGuide,
  ]);

  // Filter out skipped and completed
  const activeActions = useMemo(
    () => allActions.filter((a) => !skippedIds.has(a.id) && !completedIds.has(a.id)),
    [allActions, skippedIds, completedIds]
  );

  const currentAction = activeActions[0] || null;

  const handleSkip = useCallback(() => {
    if (currentAction) {
      setSkippedIds((prev) => new Set(prev).add(currentAction.id));
    }
  }, [currentAction]);

  const handleAction = useCallback(() => {
    if (currentAction) {
      currentAction.onAction();
      setCompletedIds((prev) => new Set(prev).add(currentAction.id));
    }
  }, [currentAction]);

  // Quick-access "I want to..." buttons
  const quickActions = [
    { icon: UtensilsCrossed, label: "Eat", onClick: onOpenMealPlan },
    { icon: CalendarDays, label: "Plan", onClick: onOpenPlanner },
    { icon: BarChart3, label: "Review", onClick: onSwitchToControl },
    { icon: DollarSign, label: "Money", onClick: onOpenMoney },
    { icon: Brain, label: "Build", onClick: onOpenBuild },
    { icon: Compass, label: "Explore", onClick: onSwitchToControl },
  ];

  // Wrap action to mark completed then fire
  const wrappedAction = currentAction
    ? { ...currentAction, onAction: handleAction }
    : null;

  return (
    <div className="flex flex-col min-h-[60vh] justify-center">
      <FocusedActionCard
        action={wrappedAction}
        queueLength={activeActions.length}
        completedCount={completedIds.size}
        onSkip={handleSkip}
      />

      {/* Quick-access bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mt-8"
      >
        <p className="text-xs text-muted-foreground text-center mb-3">I want to...</p>
        <div className="flex justify-center gap-2 flex-wrap">
          {quickActions.map(({ icon: Icon, label, onClick }) => (
            <Button
              key={label}
              variant="outline"
              size="sm"
              onClick={onClick}
              className="gap-1.5 text-xs"
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </Button>
          ))}
        </div>
      </motion.div>
    </div>
  );
};
