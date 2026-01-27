import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

interface WelcomeBackScreenProps {
  onContinue: () => void;
  onViewHistory: () => void;
}

/**
 * Welcome Back Entry Screen
 * 
 * Full-screen calm welcome for users returning after 3+ days.
 * Philosophy: No shame, no metrics, just permission to restart.
 */
export function WelcomeBackScreen({ 
  onContinue, 
  onViewHistory 
}: WelcomeBackScreenProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-background flex flex-col items-center justify-center px-6"
    >
      <div className="max-w-sm text-center space-y-8">
        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-3xl font-display font-bold text-foreground"
        >
          Welcome back.
        </motion.h1>

        {/* Body copy - exact as specified */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-4"
        >
          <p className="text-lg text-foreground leading-relaxed">
            You didn't lose anything.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Life happens. This is a place to restart.
          </p>
        </motion.div>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-4 pt-4"
        >
          {/* Primary CTA */}
          <Button
            onClick={onContinue}
            className="w-full h-14 text-lg font-medium"
            size="lg"
          >
            Just do today
          </Button>

          {/* Secondary CTA - small text button */}
          <button
            onClick={onViewHistory}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            View Snapshot history
          </button>
        </motion.div>
      </div>
    </motion.div>
  );
}
