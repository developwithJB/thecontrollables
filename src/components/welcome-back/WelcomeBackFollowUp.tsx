import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

interface WelcomeBackFollowUpProps {
  currentSnapshotTitle?: string;
  onKeepCurrent: () => void;
  onChooseNew: () => void;
}

/**
 * Welcome Back Follow-up Screen
 * 
 * Optional lightweight choice after the entry screen.
 * Allows user to keep current Snapshot or choose a new one.
 * 
 * Rules:
 * - Skippable (both buttons proceed forward)
 * - No explanation required
 * - No forced decision
 */
export function WelcomeBackFollowUp({
  currentSnapshotTitle,
  onKeepCurrent,
  onChooseNew,
}: WelcomeBackFollowUpProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-background flex flex-col items-center justify-center px-6"
    >
      <div className="max-w-sm text-center space-y-8">
        {/* Prompt - exact as specified */}
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
      </div>
    </motion.div>
  );
}
