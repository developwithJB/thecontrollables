import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw } from "lucide-react";

interface OnboardingRecoveryProps {
  onRetry: () => void;
  isRetrying?: boolean;
}

export function OnboardingRecovery({ onRetry, isRetrying = false }: OnboardingRecoveryProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="min-h-screen flex flex-col items-center justify-center px-6"
    >
      <div className="max-w-sm w-full text-center space-y-6">
        {/* Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring" }}
          className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto"
        >
          <AlertCircle className="w-8 h-8 text-amber-500" />
        </motion.div>

        {/* Message */}
        <div className="space-y-2">
          <h2 className="font-display text-xl font-semibold text-foreground">
            Something got stuck
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            Your progress is saved. Please retry.
          </p>
        </div>

        {/* Retry button */}
        <Button
          onClick={onRetry}
          disabled={isRetrying}
          className="w-full"
          size="lg"
        >
          {isRetrying ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Retrying...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </>
          )}
        </Button>

        {/* Reassurance */}
        <p className="text-xs text-muted-foreground">
          Don't worry—nothing was lost.
        </p>
      </div>
    </motion.div>
  );
}
