import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Sparkles, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { ProofEntryCard } from "@/components/dashboard/ProofEntryCard";

interface DailyCheckInProps {
  isCheckedIn: boolean;
  focus?: string;
  onCheckIn: (focus: string) => void;
  userId?: string;
}

export function DailyCheckIn({ isCheckedIn, focus, onCheckIn, userId }: DailyCheckInProps) {
  const [inputFocus, setInputFocus] = useState(focus || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [proofOpen, setProofOpen] = useState(false);

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

        {/* Optional proof section */}
        <Collapsible open={proofOpen} onOpenChange={setProofOpen} className="mt-4">
          <CollapsibleTrigger className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors w-full">
            <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", proofOpen && "rotate-180")} />
            Add proof (optional)
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3">
            <ProofEntryCard userId={userId} />
          </CollapsibleContent>
        </Collapsible>
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
        <div className="relative">
          <Textarea
            value={inputFocus}
            onChange={(e) => setInputFocus(e.target.value.slice(0, 1000))}
            placeholder="The one thing I will focus on today..."
            className="min-h-[80px] resize-none bg-muted/30 border-border/50 focus:border-accent focus:ring-accent/20"
            maxLength={1000}
          />
          <span className="absolute bottom-2 right-3 text-xs text-muted-foreground">
            {inputFocus.length}/1000
          </span>
        </div>
        
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
