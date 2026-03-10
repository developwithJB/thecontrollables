import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useWellness } from "@/hooks/useWellness";
import { useQueryClient } from "@tanstack/react-query";

const STEPS = [
  { key: "sleep", question: "How did you sleep last night?", emojis: ["😩", "😕", "😐", "🙂", "😴"], scale: "Terrible → Amazing" },
  { key: "movement", question: "How active were you yesterday?", emojis: ["🪑", "🚶", "🏃", "💪", "🔥"], scale: "Sedentary → Very Active" },
  { key: "nutrition", question: "How was your nutrition?", emojis: ["🍟", "🍕", "🥪", "🥗", "🥑"], scale: "Poor → Excellent" },
] as const;

interface ConfirmLastNightDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
}

export function ConfirmLastNightDialog({ open, onOpenChange, userId }: ConfirmLastNightDialogProps) {
  const [step, setStep] = useState(0);
  const [ratings, setRatings] = useState<number[]>([]);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { logWellness } = useWellness(userId);
  const queryClient = useQueryClient();

  const reset = useCallback(() => {
    setStep(0);
    setRatings([]);
    setNotes("");
    setSubmitting(false);
  }, []);

  const handleRate = useCallback((rating: number) => {
    const newRatings = [...ratings, rating];
    setRatings(newRatings);

    if (step < 2) {
      setStep(step + 1);
    } else {
      setStep(3); // notes step
    }
  }, [step, ratings]);

  const handleSubmit = useCallback(async () => {
    if (ratings.length < 3) return;
    setSubmitting(true);
    const success = await logWellness(ratings[0], ratings[1], ratings[2], notes || undefined);
    if (success) {
      queryClient.invalidateQueries({ queryKey: ["brain-body-wellness"] });
      queryClient.invalidateQueries({ queryKey: ["today-time-log"] });
      queryClient.invalidateQueries({ queryKey: ["wellness-logs"] });
      onOpenChange(false);
      reset();
    }
    setSubmitting(false);
  }, [ratings, notes, logWellness, queryClient, onOpenChange, reset]);

  const handleOpenChange = useCallback((v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  }, [onOpenChange, reset]);

  const isNotesStep = step === 3;
  const currentStepData = !isNotesStep ? STEPS[step] : null;

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="pb-2">
          <DrawerTitle className="text-center font-display">
            ⚡ Confirm Last Night
          </DrawerTitle>
          <p className="text-xs text-muted-foreground text-center">Quick 3-tap check-in</p>
        </DrawerHeader>

        <div className="px-6 pb-8">
          {/* Progress dots */}
          <div className="flex justify-center gap-1.5 mb-6">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  i < step ? "w-6 bg-primary" :
                  i === step && !isNotesStep ? "w-6 bg-wellness" :
                  isNotesStep ? "w-6 bg-primary" :
                  "w-1.5 bg-border"
                )}
              />
            ))}
          </div>

          <AnimatePresence mode="wait">
            {!isNotesStep && currentStepData ? (
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="text-center"
              >
                <p className="text-sm font-medium text-foreground mb-4">
                  {currentStepData.question}
                </p>
                <div className="flex justify-center gap-3">
                  {currentStepData.emojis.map((emoji, i) => (
                    <motion.button
                      key={i}
                      whileHover={{ scale: 1.15 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleRate(i + 1)}
                      className={cn(
                        "w-12 h-12 rounded-xl text-2xl flex items-center justify-center",
                        "bg-muted/50 hover:bg-muted border border-transparent",
                        "hover:border-wellness/30 transition-colors cursor-pointer"
                      )}
                      aria-label={`Rate ${i + 1} out of 5`}
                    >
                      {emoji}
                    </motion.button>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground mt-3">
                  {currentStepData.scale}
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="notes"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <div className="flex justify-center gap-2 text-2xl">
                  {ratings.map((r, i) => (
                    <span key={i}>{STEPS[i].emojis[r - 1]}</span>
                  ))}
                </div>
                <Textarea
                  placeholder="Any notes? (optional)"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="min-h-[60px] text-sm"
                  rows={2}
                />
                <Button
                  className="w-full"
                  onClick={handleSubmit}
                  disabled={submitting}
                >
                  {submitting ? "Logging..." : "Log & Complete ✓"}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
