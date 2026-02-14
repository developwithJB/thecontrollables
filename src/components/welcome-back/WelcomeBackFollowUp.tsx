import { motion } from "framer-motion";
import { Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WelcomeBackFollowUpProps {
  currentSnapshotTitle?: string;
  onKeepCurrent: () => void;
  onChooseNew: () => void;
  isPaid?: boolean;
  nudgeEnabled?: boolean;
  onEnableDailyAlignment?: () => void;
}

/**
 * Welcome Back Follow-up Screen
 * 
 * Optional lightweight choice after the entry screen.
 * Allows user to keep current Snapshot or choose a new one.
 * For paid users who haven't enabled Daily Alignment, shows a soft suggestion.
 */
export function WelcomeBackFollowUp({
  currentSnapshotTitle,
  onKeepCurrent,
  onChooseNew,
  isPaid,
  nudgeEnabled,
  onEnableDailyAlignment,
}: WelcomeBackFollowUpProps) {
  const showDASuggestion = isPaid && !nudgeEnabled && onEnableDailyAlignment;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-background flex flex-col items-center justify-center px-6"
    >
      <div className="max-w-sm text-center space-y-8">
        {/* Prompt */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-xl text-foreground leading-relaxed"
        >
          Want to reset your focus for this week?
        </motion.p>

        {/* Current snapshot context (subtle) */}
        {currentSnapshotTitle && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-sm text-muted-foreground"
          >
            Current: {currentSnapshotTitle}
          </motion.p>
        )}

        {/* Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-3 pt-4"
        >
          <Button
            onClick={onKeepCurrent}
            variant="outline"
            className="w-full h-12 text-base font-medium"
          >
            Keep current Snapshot
          </Button>

          <Button
            onClick={onChooseNew}
            className="w-full h-12 text-base font-medium"
          >
            Choose a new Snapshot
          </Button>
        </motion.div>

        {/* Daily Alignment suggestion for paid users */}
        {showDASuggestion && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-left space-y-2"
          >
            <div className="flex items-center gap-2">
              <Sun className="w-4 h-4 text-primary" />
              <p className="text-sm text-foreground font-medium">
                Want a calm start each morning?
              </p>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Enable Daily Alignment — personalized scripture built from your progress.
            </p>
            <div className="flex items-center gap-2 pt-1">
              <Button size="sm" className="text-xs" onClick={onEnableDailyAlignment}>
                Enable
              </Button>
              <span className="text-xs text-muted-foreground">
                You can change this anytime in Settings.
              </span>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
