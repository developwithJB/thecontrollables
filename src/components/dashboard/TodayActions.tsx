import { motion } from "framer-motion";
import { Check, Clock, Circle, Target, MessageSquare, Scale, Timer } from "lucide-react";

interface TodayActionsProps {
  hasActiveQuest: boolean;
  hasActiveReset: boolean;
  todayResetCompleted: boolean;
  todayTimeLogged: boolean;
  pendingPromisesCount: number;
  todayXpEarned: number;
}

interface ActionItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  completed: boolean;
  timeEstimate: string;
}

export function TodayActions({
  hasActiveQuest,
  hasActiveReset,
  todayResetCompleted,
  todayTimeLogged,
  pendingPromisesCount,
  todayXpEarned,
}: TodayActionsProps) {
  // Build action items based on user state
  const actions: ActionItem[] = [];

  // Daily check-in (most important)
  if (hasActiveReset) {
    actions.push({
      id: "checkin",
      label: "Daily check-in",
      icon: <Circle className="w-4 h-4" />,
      completed: todayResetCompleted,
      timeEstimate: "5 min",
    });
  }

  // Time tracking
  actions.push({
    id: "time",
    label: "Log your time",
    icon: <Timer className="w-4 h-4" />,
    completed: todayTimeLogged,
    timeEstimate: "1 min",
  });

  // Pending promises
  if (pendingPromisesCount > 0) {
    actions.push({
      id: "promises",
      label: `Review ${pendingPromisesCount} promise${pendingPromisesCount > 1 ? "s" : ""}`,
      icon: <Scale className="w-4 h-4" />,
      completed: false,
      timeEstimate: "2 min",
    });
  }

  const completedCount = actions.filter((a) => a.completed).length;
  const totalActions = actions.length;
  const allCompleted = completedCount === totalActions;

  // Calculate total time remaining
  const timeRemaining = actions
    .filter((a) => !a.completed)
    .reduce((sum, a) => sum + parseInt(a.timeEstimate), 0);

  // If no actions or all completed with XP, show minimal state
  if (actions.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="rounded-xl bg-card/50 border border-border/50 p-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-foreground">Today's Actions</h3>
        {!allCompleted && timeRemaining > 0 && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span>~{timeRemaining} min left</span>
          </div>
        )}
        {allCompleted && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
            <Check className="w-3 h-3" />
            All done
          </span>
        )}
      </div>

      {/* Progress bar */}
      <div className="h-1.5 rounded-full bg-muted overflow-hidden mb-3">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${(completedCount / totalActions) * 100}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="h-full bg-primary rounded-full"
        />
      </div>

      {/* Action list */}
      <div className="space-y-2">
        {actions.map((action, index) => (
          <motion.div
            key={action.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 + index * 0.05 }}
            className={`flex items-center gap-3 py-1.5 ${
              action.completed ? "opacity-60" : ""
            }`}
          >
            {/* Status icon */}
            <div
              className={`flex items-center justify-center w-5 h-5 rounded-full ${
                action.completed
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {action.completed ? (
                <Check className="w-3 h-3" />
              ) : (
                <span className="text-[10px] font-medium">{index + 1}</span>
              )}
            </div>

            {/* Label */}
            <span
              className={`flex-1 text-sm ${
                action.completed
                  ? "text-muted-foreground line-through"
                  : "text-foreground"
              }`}
            >
              {action.label}
            </span>

            {/* Time estimate (only for incomplete) */}
            {!action.completed && (
              <span className="text-xs text-muted-foreground">{action.timeEstimate}</span>
            )}
          </motion.div>
        ))}
      </div>

      {/* XP earned today */}
      {todayXpEarned > 0 && (
        <div className="mt-3 pt-3 border-t border-border/50">
          <p className="text-xs text-muted-foreground">
            <span className="text-primary font-medium">+{todayXpEarned} XP</span> earned today
          </p>
        </div>
      )}
    </motion.div>
  );
}
