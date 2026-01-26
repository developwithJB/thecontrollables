import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lightbulb, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";

interface GameRule {
  statement: string;
  explanation: string;
}

// Simplified to 3 core principles
const CORE_PRINCIPLES: GameRule[] = [
  {
    statement: "Control what you can. Release what you cannot.",
    explanation: "Focus on your inputs—your thoughts, actions, and responses. Other people's behavior, timing, and outcomes aren't yours to carry.",
  },
  {
    statement: "You level up through reps, not talent.",
    explanation: "Progress comes from showing up consistently, not from being gifted. Small actions compound into real change.",
  },
  {
    statement: "Confidence comes from kept promises.",
    explanation: "Self-trust is built through small commitments honored. Under-promise and over-deliver—to yourself first.",
  },
];

// Extended rules for those who want more
const EXTENDED_RULES: GameRule[] = [
  {
    statement: "Time is your only real currency.",
    explanation: "Every hour spent is an investment or a withdrawal. Spend wisely, not perfectly.",
  },
  {
    statement: "Missing a day doesn't reset your progress.",
    explanation: "Life isn't a streak app. Recovery is part of the game. Return without guilt.",
  },
  {
    statement: "Two minutes is enough to start.",
    explanation: "You don't need motivation. You need movement. Start small.",
  },
];

export function GameRulesSection() {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const visibleRules = isExpanded ? [...CORE_PRINCIPLES, ...EXTENDED_RULES] : CORE_PRINCIPLES;
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="mb-8"
    >
      {/* Section Header */}
      <div className="flex items-center gap-2 mb-4">
        <Lightbulb className="w-4 h-4 text-primary" />
        <h2 className="font-display text-lg font-semibold text-foreground">
          Core Principles
        </h2>
      </div>
      
      <p className="text-sm text-muted-foreground mb-6">
        Three rules to remember when you're stuck.
      </p>

      {/* Rules */}
      <div className="space-y-3">
        <AnimatePresence mode="wait">
          {visibleRules.map((rule, index) => (
            <motion.div
              key={rule.statement}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, delay: index * 0.03 }}
              className="p-4 rounded-xl bg-card border transition-colors hover:border-primary/30"
            >
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-medium flex items-center justify-center">
                  {index + 1}
                </span>
                
                <div className="flex-1 min-w-0">
                  <p className="font-display font-medium text-foreground text-sm leading-snug mb-2">
                    "{rule.statement}"
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {rule.explanation}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Expand/Collapse Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full mt-4 text-muted-foreground hover:text-foreground"
      >
        {isExpanded ? (
          <>
            <ChevronUp className="w-4 h-4 mr-2" />
            Show Core 3
          </>
        ) : (
          <>
            <ChevronDown className="w-4 h-4 mr-2" />
            See More Rules
          </>
        )}
      </Button>
    </motion.div>
  );
}
