import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Brain, Check } from "lucide-react";

const INTRO_STORAGE_KEY = "ai_operator_intro_seen";

interface AIOperatorIntroProps {
  onDismiss: () => void;
}

export function AIOperatorIntro({ onDismiss }: AIOperatorIntroProps) {
  const handleDismiss = () => {
    localStorage.setItem(INTRO_STORAGE_KEY, "true");
    onDismiss();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="p-5 rounded-xl bg-gradient-to-br from-card to-muted/30 border shadow-soft"
    >
      <div className="flex items-start gap-3 mb-4">
        <div className="p-2 rounded-lg bg-primary/10">
          <Brain className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="font-display font-semibold text-foreground">
            Meet Your Operators
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            These are not generic chatbots.
          </p>
        </div>
      </div>

      <div className="space-y-3 mb-5">
        <p className="text-sm text-foreground leading-relaxed">
          These operators are AI-guided, trained on:
        </p>
        <ul className="space-y-2">
          {[
            "The Controllables philosophy",
            "JB's writing and frameworks",
            "Behavior change best practices",
          ].map((item, idx) => (
            <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
              <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <p className="text-sm text-foreground/80 italic pt-2">
          They guide, not diagnose.
        </p>
      </div>

      <Button onClick={handleDismiss} className="w-full">
        Got it
      </Button>
    </motion.div>
  );
}

export function useAIOperatorIntro() {
  const [hasSeenIntro, setHasSeenIntro] = useState(true); // Default to true to avoid flash
  
  useEffect(() => {
    const seen = localStorage.getItem(INTRO_STORAGE_KEY);
    setHasSeenIntro(seen === "true");
  }, []);

  const markAsSeen = () => {
    localStorage.setItem(INTRO_STORAGE_KEY, "true");
    setHasSeenIntro(true);
  };

  return { hasSeenIntro, markAsSeen };
}
