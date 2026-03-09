import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Check, SkipForward, MessageCircle, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FocusedAction {
  id: string;
  type: "checkin" | "reset" | "time_log" | "promise" | "wellness" | "quest" | "guide" | "meal" | "planner" | "build";
  title: string;
  subtitle: string;
  emoji: string;
  controllable?: "awareness" | "perspective" | "habit" | "wellness" | "environment";
  xp?: number;
  onAction: () => void;
  actionLabel?: string;
}

interface FocusedActionCardProps {
  action: FocusedAction | null;
  queueLength: number;
  completedCount: number;
  onSkip: () => void;
  onTellMore?: () => void;
}

const controllableGradients: Record<string, string> = {
  awareness: "from-awareness/20 to-awareness/5 border-awareness/30",
  perspective: "from-perspective/20 to-perspective/5 border-perspective/30",
  habit: "from-habit/20 to-habit/5 border-habit/30",
  wellness: "from-wellness/20 to-wellness/5 border-wellness/30",
  environment: "from-environment/20 to-environment/5 border-environment/30",
};

export const FocusedActionCard = ({
  action,
  queueLength,
  completedCount,
  onSkip,
  onTellMore,
}: FocusedActionCardProps) => {
  if (!action) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center py-16 text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", delay: 0.2 }}
          className="w-16 h-16 rounded-full bg-perspective/20 flex items-center justify-center mb-4"
        >
          <Check className="w-8 h-8 text-perspective" />
        </motion.div>
        <h2 className="font-display text-xl font-semibold text-foreground mb-2">
          You're caught up.
        </h2>
        <p className="text-sm text-muted-foreground max-w-xs">
          Nothing needs your attention right now. Come back later or switch to Control mode to explore.
        </p>
        {completedCount > 0 && (
          <div className="flex items-center gap-1 mt-4 text-xs text-muted-foreground">
            <Zap className="w-3 h-3 text-accent" />
            {completedCount} action{completedCount !== 1 ? "s" : ""} completed today
          </div>
        )}
      </motion.div>
    );
  }

  const gradient = action.controllable
    ? controllableGradients[action.controllable]
    : "from-accent/10 to-primary/5 border-accent/20";

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={action.id}
        initial={{ opacity: 0, y: 30, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -30, scale: 0.97 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="flex flex-col items-center"
      >
        {/* Progress indicator */}
        <div className="flex items-center gap-1.5 mb-6">
          {Array.from({ length: queueLength + completedCount }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "w-2 h-2 rounded-full transition-all",
                i < completedCount
                  ? "bg-perspective"
                  : i === completedCount
                  ? "bg-accent w-6"
                  : "bg-muted"
              )}
            />
          ))}
        </div>

        {/* Main card */}
        <div
          className={cn(
            "w-full max-w-sm rounded-2xl border bg-gradient-to-b p-8 text-center",
            gradient
          )}
        >
          <span className="text-4xl mb-4 block">{action.emoji}</span>
          <h2 className="font-display text-lg font-semibold text-foreground mb-2">
            {action.title}
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            {action.subtitle}
          </p>

          {action.xp && (
            <div className="flex items-center justify-center gap-1 text-xs text-accent mb-4">
              <Zap className="w-3 h-3" />
              +{action.xp} XP
            </div>
          )}

          <Button
            onClick={action.onAction}
            className="w-full mb-3"
            size="lg"
          >
            {action.actionLabel || "Do it"}
          </Button>

          <div className="flex items-center justify-center gap-4">
            <button
              onClick={onSkip}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <SkipForward className="w-3 h-3" />
              Skip
            </button>
            {onTellMore && (
              <button
                onClick={onTellMore}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <MessageCircle className="w-3 h-3" />
                Tell me more
              </button>
            )}
          </div>
        </div>

        {/* Queue count */}
        {queueLength > 1 && (
          <p className="text-xs text-muted-foreground mt-4">
            {queueLength - 1} more action{queueLength > 2 ? "s" : ""} after this
          </p>
        )}
      </motion.div>
    </AnimatePresence>
  );
};
