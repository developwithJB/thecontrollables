import { motion } from "framer-motion";
import { Lightbulb } from "lucide-react";

interface GameRule {
  statement: string;
  explanation: string;
  action: string;
}

const GAME_RULES: GameRule[] = [
  {
    statement: "You level up through reps, not talent.",
    explanation: "Ability is malleable. Repetition beats potential. Progress comes from showing up, not from being gifted.",
    action: "What's one boring rep you can do today?"
  },
  {
    statement: "Time is your only real currency.",
    explanation: "Every hour spent is an investment or a withdrawal. There's no earning it back. Spend wisely, not perfectly.",
    action: "Where did your time go yesterday?"
  },
  {
    statement: "Your spawn point is random. Your build is not.",
    explanation: "You didn't choose your starting conditions. But you choose how to level up from here. Any build is viable.",
    action: "What's one modifier you can adjust this week?"
  },
  {
    statement: "Control what you can. Release what you cannot.",
    explanation: "Other people's actions, timing, outcomes—these are not yours to carry. Focus on your inputs, not the scoreboard.",
    action: "What are you holding onto that isn't yours?"
  },
  {
    statement: "Missing a day doesn't reset your progress.",
    explanation: "Life isn't a streak app. Pausing is not the same as quitting. Recovery is part of the game.",
    action: "When did you last show yourself grace?"
  },
  {
    statement: "Confidence comes from kept promises.",
    explanation: "Self-trust is built through small commitments honored. Under-promise and over-deliver—to yourself first.",
    action: "What's one promise you can keep today?"
  },
  {
    statement: "You define your own win condition.",
    explanation: "No one else gets to decide what winning means for you. Comparison is playing someone else's game.",
    action: "What does 'winning' actually look like for you?"
  },
  {
    statement: "Default mode is not neutral.",
    explanation: "If you don't choose a quest, the system assigns one. Drifting is still a direction. Choose or be chosen for.",
    action: "Are you playing intentionally or on autopilot?"
  },
  {
    statement: "Two minutes is enough to start.",
    explanation: "You don't need motivation. You need movement. Start small. Momentum builds itself.",
    action: "What can you do in the next two minutes?"
  },
  {
    statement: "This is single-player, not solo.",
    explanation: "You can't play someone else's game. But you can share the journey. Support others without comparing scores.",
    action: "Who's on your team, even if you're playing solo?"
  }
];

export function GameRulesSection() {
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
          The Rules of the Game
        </h2>
      </div>
      
      <p className="text-sm text-muted-foreground mb-6">
        Life is a game—whether you play intentionally or not.
      </p>

      {/* Scrollable Rules */}
      <div className="space-y-3">
        {GAME_RULES.map((rule, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            className="p-4 rounded-xl bg-card border transition-colors hover:border-primary/30"
          >
            {/* Rule Number */}
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-medium flex items-center justify-center">
                {index + 1}
              </span>
              
              <div className="flex-1 min-w-0">
                {/* Statement */}
                <p className="font-display font-medium text-foreground text-sm leading-snug mb-2">
                  "{rule.statement}"
                </p>
                
                {/* Explanation */}
                <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                  {rule.explanation}
                </p>
                
                {/* Action */}
                <div className="flex items-start gap-2 pt-2 border-t border-border/50">
                  <span className="text-primary text-xs">→</span>
                  <p className="text-xs text-foreground/80 italic">
                    {rule.action}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Philosophy Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="mt-6 p-4 rounded-xl bg-muted/30 border-l-2 border-primary/50"
      >
        <p className="text-xs text-muted-foreground italic leading-relaxed">
          These aren't motivational slogans. They're operating principles. 
          Return to them when you're stuck, lost, or starting over. 
          The game continues either way—play on purpose.
        </p>
      </motion.div>
    </motion.div>
  );
}
