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
import { useHealthData } from "@/hooks/useHealthData";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Activity, Loader2, Moon as MoonIcon, RefreshCw, Utensils, Wifi } from "lucide-react";
import { toast } from "sonner";

const STEPS = [
  { key: "sleep", question: "How did you sleep last night?", emojis: ["😩", "😕", "😐", "🙂", "😴"], scale: "Terrible → Amazing" },
  { key: "movement", question: "How active were you yesterday?", emojis: ["🪑", "🚶", "🏃", "💪", "🔥"], scale: "Sedentary → Very Active" },
  { key: "nutrition", question: "How was your nutrition?", emojis: ["🍟", "🍕", "🥪", "🥗", "🥑"], scale: "Poor → Excellent" },
] as const;

function sleepMinutesToRating(mins: number | null): number | null {
  if (mins == null) return null;
  const hours = mins / 60;
  if (hours >= 8) return 5;
  if (hours >= 7) return 4;
  if (hours >= 6) return 3;
  if (hours >= 5) return 2;
  return 1;
}

function activeMinutesToRating(mins: number | null): number | null {
  if (mins == null) return null;
  if (mins >= 60) return 5;
  if (mins >= 45) return 4;
  if (mins >= 30) return 3;
  if (mins >= 15) return 2;
  return 1;
}

function recoveryLabel(score: number | null): string {
  if (score == null) return "";
  if (score >= 67) return "Green (optimal)";
  if (score >= 34) return "Yellow (moderate)";
  return "Red (rest needed)";
}

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
  const [wearableSynced, setWearableSynced] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const { logWellness } = useWellness(userId);
  const healthData = useHealthData(userId);
  const queryClient = useQueryClient();

  const hasWearable = healthData.isConnected && !healthData.isLoading;
  const wearableLatest = healthData.latest;

  // Derive suggested ratings from wearable data
  const suggestedSleep = sleepMinutesToRating(wearableLatest.sleepMinutes);
  const suggestedMovement = activeMinutesToRating(wearableLatest.activeMinutes);

  // Total steps: wearable summary (if connected) → sleep → movement → nutrition → notes
  const wearableStep = hasWearable ? 0 : -1;
  const sleepStep = hasWearable ? 1 : 0;
  const movementStep = hasWearable ? 2 : 1;
  const nutritionStep = hasWearable ? 3 : 2;
  const notesStep = hasWearable ? 4 : 3;
  const totalDots = hasWearable ? 4 : 3;

  const reset = useCallback(() => {
    setStep(0);
    setRatings([]);
    setNotes("");
    setSubmitting(false);
    setWearableSynced(false);
    setSyncing(false);
  }, []);

  const handleRate = useCallback((rating: number) => {
    const newRatings = [...ratings, rating];
    setRatings(newRatings);

    if (newRatings.length < 3) {
      setStep(step + 1);
    } else {
      setStep(notesStep);
    }
  }, [step, ratings, notesStep]);

  const handleFreshSync = useCallback(async () => {
    if (!healthData.provider) return;
    setSyncing(true);
    try {
      const { error } = await supabase.functions.invoke("wearable-sync", {
        body: { provider: healthData.provider },
      });
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ["health-data-trend", userId] });
      await queryClient.invalidateQueries({ queryKey: ["wearable-connection-any", userId] });
      setWearableSynced(true);
      toast.success("Wearable data synced");
    } catch (err) {
      console.error("Fresh sync failed:", err);
      toast.error("Sync failed — you can still rate manually");
    }
    setSyncing(false);
  }, [healthData.provider, queryClient, userId]);

  const handleWearableContinue = useCallback(() => {
    setStep(sleepStep);
  }, [sleepStep]);

  const handleSubmit = useCallback(async () => {
    if (ratings.length < 3) return;
    setSubmitting(true);

    try {
      // 1. Log to wellness_logs
      const success = await logWellness(ratings[0], ratings[1], ratings[2], notes || undefined);
      
      if (success) {
        // 2. Also write to time_logs so todayTimeLogged flips to true
        const today = new Date().toLocaleDateString("sv-SE");
        await supabase.from("time_logs").upsert({
          user_id: userId,
          log_date: today,
          time_invested_minutes: 0,
          time_wasted_minutes: 0,
          notes: notes || `Sleep: ${ratings[0]}/5, Movement: ${ratings[1]}/5, Nutrition: ${ratings[2]}/5${wearableSynced ? ' (wearable synced)' : ''}`,
        }, { onConflict: "user_id,log_date" });

        // 3. Invalidate all relevant queries
        queryClient.invalidateQueries({ queryKey: ["brain-body-wellness"] });
        queryClient.invalidateQueries({ queryKey: ["today-time-log"] });
        queryClient.invalidateQueries({ queryKey: ["wellness-logs"] });
        queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
        
        onOpenChange(false);
        reset();
      }
    } catch (err) {
      console.error("ConfirmLastNight submit error:", err);
    }
    setSubmitting(false);
  }, [ratings, notes, logWellness, queryClient, onOpenChange, reset, userId, wearableSynced]);

  const handleOpenChange = useCallback((v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  }, [onOpenChange, reset]);

  const isNotesStep = step === notesStep;
  const isWearableStep = hasWearable && step === wearableStep;

  // Map current step to STEPS index for emoji selection
  const getEmojiStepIndex = (): number => {
    if (hasWearable) return step - 1; // steps 1,2,3 map to STEPS 0,1,2
    return step; // steps 0,1,2 map to STEPS 0,1,2
  };

  const emojiStepIndex = getEmojiStepIndex();
  const currentStepData = !isNotesStep && !isWearableStep && emojiStepIndex >= 0 && emojiStepIndex < 3 ? STEPS[emojiStepIndex] : null;

  // Get suggested rating for current emoji step
  const getSuggestedRating = (): number | null => {
    if (!hasWearable || !wearableSynced) return null;
    if (emojiStepIndex === 0) return suggestedSleep;
    if (emojiStepIndex === 1) return suggestedMovement;
    return null; // no wearable data for nutrition
  };

  const suggestedRating = getSuggestedRating();

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="pb-2">
          <DrawerTitle className="text-center font-display">
            ⚡ Confirm Last Night
          </DrawerTitle>
          <p className="text-xs text-muted-foreground text-center">
            {hasWearable ? "Wearable data + quick ratings" : "Quick 3-tap check-in"}
          </p>
        </DrawerHeader>

        <div className="px-6 pb-8">
          {/* Progress dots */}
          <div className="flex justify-center gap-1.5 mb-6">
            {Array.from({ length: totalDots }).map((_, i) => {
              const dotStep = hasWearable ? i : i;
              const isCompleted = hasWearable
                ? (i === 0 ? wearableSynced : ratings.length >= i)
                : ratings.length > i;
              const isCurrent = hasWearable
                ? (i === 0 ? step === 0 : step === i)
                : step === i;
              return (
                <div
                  key={i}
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-300",
                    isCompleted ? "w-6 bg-primary" :
                    isCurrent ? "w-6 bg-wellness" :
                    isNotesStep ? "w-6 bg-primary" :
                    "w-1.5 bg-border"
                  )}
                />
              );
            })}
          </div>

          <AnimatePresence mode="wait">
            {/* Wearable Summary Step */}
            {isWearableStep && (
              <motion.div
                key="wearable"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Wifi className="w-4 h-4 text-primary" />
                  <p className="text-sm font-medium text-foreground">
                    {healthData.provider ? healthData.provider.charAt(0).toUpperCase() + healthData.provider.slice(1) : "Wearable"} Data
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {wearableLatest.sleepMinutes != null && (
                    <div className="bg-muted/50 rounded-xl p-3 text-center">
                      <MoonIcon className="w-4 h-4 mx-auto mb-1 text-indigo-400" />
                      <p className="text-lg font-semibold text-foreground">
                        {Math.round(wearableLatest.sleepMinutes / 60 * 10) / 10}h
                      </p>
                      <p className="text-[10px] text-muted-foreground">Sleep</p>
                    </div>
                  )}
                  {wearableLatest.activeMinutes != null && (
                    <div className="bg-muted/50 rounded-xl p-3 text-center">
                      <Activity className="w-4 h-4 mx-auto mb-1 text-green-400" />
                      <p className="text-lg font-semibold text-foreground">
                        {wearableLatest.activeMinutes}min
                      </p>
                      <p className="text-[10px] text-muted-foreground">Active</p>
                    </div>
                  )}
                  {wearableLatest.recovery != null && (
                    <div className="bg-muted/50 rounded-xl p-3 text-center">
                      <span className="text-lg">❤️‍🩹</span>
                      <p className="text-lg font-semibold text-foreground">
                        {wearableLatest.recovery}%
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        Recovery · {recoveryLabel(wearableLatest.recovery)}
                      </p>
                    </div>
                  )}
                  {wearableLatest.hrv != null && (
                    <div className="bg-muted/50 rounded-xl p-3 text-center">
                      <span className="text-lg">💓</span>
                      <p className="text-lg font-semibold text-foreground">
                        {wearableLatest.hrv}ms
                      </p>
                      <p className="text-[10px] text-muted-foreground">HRV</p>
                    </div>
                  )}
                </div>

                {wearableLatest.sleepMinutes == null && wearableLatest.activeMinutes == null && (
                  <p className="text-xs text-muted-foreground text-center">
                    No recent data synced. You can still rate manually below.
                  </p>
                )}

                <Button className="w-full" onClick={handleWearableContinue}>
                  Continue to Ratings →
                </Button>
              </motion.div>
            )}

            {/* Emoji Rating Steps */}
            {!isNotesStep && !isWearableStep && currentStepData && (
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="text-center"
              >
                <p className="text-sm font-medium text-foreground mb-1">
                  {currentStepData.question}
                </p>
                {suggestedRating && (
                  <p className="text-[10px] text-primary mb-3">
                    Wearable suggests: {currentStepData.emojis[suggestedRating - 1]} ({suggestedRating}/5)
                  </p>
                )}
                <div className="flex justify-center gap-3 mt-3">
                  {currentStepData.emojis.map((emoji, i) => (
                    <motion.button
                      key={i}
                      whileHover={{ scale: 1.15 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleRate(i + 1)}
                      className={cn(
                        "w-12 h-12 rounded-xl text-2xl flex items-center justify-center",
                        "bg-muted/50 hover:bg-muted border border-transparent",
                        "hover:border-wellness/30 transition-colors cursor-pointer",
                        suggestedRating === i + 1 && "ring-2 ring-primary/50 border-primary/30"
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
            )}

            {/* Notes + Submit Step */}
            {isNotesStep && (
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
                {wearableSynced && (
                  <p className="text-[10px] text-center text-primary">
                    ✓ Wearable data synced
                  </p>
                )}
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
