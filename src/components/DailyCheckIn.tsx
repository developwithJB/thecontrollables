import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface DailyCheckInProps {
  isCheckedIn: boolean;
  focus?: string;
  onCheckIn: (focus: string) => void;
}

export function DailyCheckIn({ isCheckedIn, focus, onCheckIn }: DailyCheckInProps) {
  const [inputFocus, setInputFocus] = useState(focus || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!inputFocus.trim()) return;
    setIsSubmitting(true);
    await onCheckIn(inputFocus.trim());
    setIsSubmitting(false);
  };

  if (isCheckedIn) {
    return (
      <motion.div
        className="p-6 rounded-2xl bg-card border shadow-soft"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
            <Check className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-foreground">
              You're checked in
            </h3>
            <p className="text-sm text-muted-foreground">
              Go take action. Come back tomorrow.
            </p>
          </div>
        </div>
        
        {focus && (
          <div className="mt-4 p-4 rounded-xl bg-muted/50 border border-border/50">
            <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
              Today's focus
            </p>
            <p className="font-medium text-foreground">{focus}</p>
          </div>
        )}
      </motion.div>
    );
  }

  return (
    <motion.div
      className="p-6 rounded-2xl bg-card border shadow-soft"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-accent" />
        </div>
        <div>
          <h3 className="font-display font-semibold text-foreground">
            Daily Check-In
          </h3>
          <p className="text-sm text-muted-foreground">
            What's your singular focus for today?
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <Textarea
          value={inputFocus}
          onChange={(e) => setInputFocus(e.target.value)}
          placeholder="The one thing I will focus on today..."
          className="min-h-[80px] resize-none bg-muted/30 border-border/50 focus:border-accent focus:ring-accent/20"
        />
        
        <Button
          onClick={handleSubmit}
          disabled={!inputFocus.trim() || isSubmitting}
          className={cn(
            "w-full font-medium",
            "bg-primary text-primary-foreground hover:bg-primary/90"
          )}
        >
          {isSubmitting ? "Checking in..." : "Check In"}
        </Button>
      </div>
    </motion.div>
  );
}
