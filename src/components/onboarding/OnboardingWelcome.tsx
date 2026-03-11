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
        <div className="space-y-4">
          <h1 className="text-2xl font-bold tracking-tight text-foreground leading-snug">
            Your calendar knows what you planned.{" "}
            <span className="text-muted-foreground">Your wearable knows what happened.</span>{" "}
            <span className="text-primary">The Dashboard connects the two.</span>
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Setup takes 2 minutes. Connect your calendar and wearable and The Dashboard starts working immediately.
          </p>
        </div>

        <Button onClick={onContinue} size="lg" className="w-full gap-2">
          Let's connect your tools <ArrowRight className="h-4 w-4" />
        </Button>

        <button
          onClick={onSkip}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          You can skip and add these later — but the app is most useful with them.
        </button>
      </div>
    </motion.div>
  );
}
