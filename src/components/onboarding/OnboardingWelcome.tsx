import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

interface OnboardingWelcomeProps {
  onContinue: () => void;
  onSkip: () => void;
}

export function OnboardingWelcome({ onContinue, onSkip }: OnboardingWelcomeProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="min-h-screen flex items-center justify-center px-6"
    >
      <div className="max-w-md w-full text-center space-y-8">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">AI Life Operating System</p>
          <h1 className="text-2xl font-bold tracking-tight text-foreground leading-snug">
            Teach your system how your life works.
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed pt-2">
            Connect a few signals — your calendar, your energy, what matters to you — and your Life OS will generate your first daily direction.
          </p>
        </div>

        <div className="space-y-3">
          <Button onClick={onContinue} size="lg" className="w-full gap-2">
            Let's get started <ArrowRight className="h-4 w-4" />
          </Button>

          <p className="text-xs text-muted-foreground/60">
            Takes about 2 minutes. No pressure.
          </p>
        </div>

        <button
          onClick={onSkip}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Skip setup for now
        </button>
      </div>
    </motion.div>
  );
}
