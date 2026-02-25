import { motion } from "framer-motion";
import { Trophy, Zap, Calendar, ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface TrialCompleteCardProps {
  daysCompleted: number;
  totalXp: number;
  actionsCompleted: number;
  onUpgrade: () => void;
  isCheckingOut?: boolean;
}

export function TrialCompleteCard({
  daysCompleted,
  totalXp,
  actionsCompleted,
  onUpgrade,
  isCheckingOut = false,
}: TrialCompleteCardProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl bg-gradient-to-br from-primary/10 via-accent/10 to-primary/5 border border-primary/20 overflow-hidden"
    >
      <div className="p-5 relative">
        <button
          onClick={() => setDismissed(true)}
          className="absolute top-3 right-3 p-1 rounded-full hover:bg-muted/50 transition-colors text-muted-foreground"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="text-center mb-4">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="inline-flex p-3 rounded-full bg-primary/10 mb-3"
          >
            <Trophy className="w-6 h-6 text-primary" />
          </motion.div>
          <h3 className="font-display text-lg font-bold text-foreground">
            Your 7-Day Snapshot is complete.
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Here's what you built.
          </p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="text-center p-3 rounded-xl bg-card/50">
            <Calendar className="w-4 h-4 mx-auto mb-1 text-primary" />
            <p className="font-display font-bold text-lg text-foreground">{daysCompleted}</p>
            <p className="text-[10px] text-muted-foreground">Days Logged</p>
          </div>
          <div className="text-center p-3 rounded-xl bg-card/50">
            <Zap className="w-4 h-4 mx-auto mb-1 text-accent" />
            <p className="font-display font-bold text-lg text-foreground">{totalXp}</p>
            <p className="text-[10px] text-muted-foreground">XP Earned</p>
          </div>
          <div className="text-center p-3 rounded-xl bg-card/50">
            <Trophy className="w-4 h-4 mx-auto mb-1 text-amber-500" />
            <p className="font-display font-bold text-lg text-foreground">{actionsCompleted}</p>
            <p className="text-[10px] text-muted-foreground">Actions</p>
          </div>
        </div>

        <Button
          onClick={onUpgrade}
          disabled={isCheckingOut}
          className="w-full gap-2"
          size="lg"
        >
          Continue Your Journey
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </motion.div>
  );
}
