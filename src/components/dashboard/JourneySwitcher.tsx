import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Check, RefreshCw, Compass } from "lucide-react";
import { GUIDED_JOURNEYS, getJourneyById, journeyToControllable, type GuidedJourney } from "@/lib/guidedJourneys";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useActionTracking } from "@/hooks/useActionTracking";

interface JourneySwitcherProps {
  currentJourneyControllable: string | null;
  sessionId: string;
  currentDay: number;
  userId: string;
  onJourneyChanged?: () => void;
}

// Reverse map controllable to journey ID
function controllableToJourneyId(controllable: string | null): string | null {
  if (!controllable) return null;
  const mapping: Record<string, string> = {
    habit: "reenter-the-game", // or rebuild-momentum
    awareness: "reduce-mental-noise",
    wellness: "ground-yourself",
    perspective: "refocus-on-what-matters",
  };
  return mapping[controllable] || null;
}

export function JourneySwitcher({
  currentJourneyControllable,
  sessionId,
  currentDay,
  userId,
  onJourneyChanged,
}: JourneySwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedJourney, setSelectedJourney] = useState<string | null>(null);
  const [isChanging, setIsChanging] = useState(false);
  
  const queryClient = useQueryClient();
  const { trackFeatureUse } = useActionTracking();

  const currentJourneyId = controllableToJourneyId(currentJourneyControllable);
  const currentJourney = currentJourneyId ? getJourneyById(currentJourneyId) : null;

  const handleOpen = () => {
    setSelectedJourney(currentJourneyId);
    setIsOpen(true);
    trackFeatureUse("journey_switcher", "open");
  };

  const handleSelect = (journeyId: string) => {
    setSelectedJourney(journeyId);
  };

  const handleConfirm = async () => {
    if (!selectedJourney || selectedJourney === currentJourneyId) {
      setIsOpen(false);
      return;
    }

    setIsChanging(true);
    const newControllable = journeyToControllable(selectedJourney);
    const newJourney = getJourneyById(selectedJourney);

    try {
      // 1. Log the change in journey_changes table
      const { error: logError } = await supabase
        .from("journey_changes" as any)
        .insert({
          user_id: userId,
          session_id: sessionId,
          previous_journey_id: currentJourneyId,
          new_journey_id: selectedJourney,
          changed_on_day: currentDay,
        } as any);

      if (logError) {
        console.error("Failed to log journey change:", logError);
        // Continue anyway - logging is not critical
      }

      // 2. Update reset_sessions with new journey
      const { error: sessionError } = await supabase
        .from("reset_sessions")
        .update({
          journey_id: selectedJourney,
          journey_changed_at: new Date().toISOString(),
        } as any)
        .eq("id", sessionId);

      if (sessionError) throw sessionError;

      // 3. Update user_onboarding with new controllable
      const { error: onboardingError } = await supabase
        .from("user_onboarding" as any)
        .update({
          journey_controllable: newControllable,
          journey_selected_at: new Date().toISOString(),
        } as any)
        .eq("user_id", userId);

      if (onboardingError) {
        console.error("Failed to update onboarding:", onboardingError);
      }

      // Track the change
      trackFeatureUse("journey_switcher", "change", {
        from: currentJourneyId,
        to: selectedJourney,
        on_day: currentDay,
      });

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ["user-onboarding"] });
      queryClient.invalidateQueries({ queryKey: ["reset-session"] });
      queryClient.invalidateQueries({ queryKey: ["journey-changes"] });

      toast.success(`Switched to "${newJourney?.title}"`, {
        description: "Your course has been updated. Previous direction logged.",
      });

      setIsOpen(false);
      onJourneyChanged?.();
    } catch (error) {
      console.error("Failed to change journey:", error);
      toast.error("Failed to change journey", {
        description: "Please try again.",
      });
    } finally {
      setIsChanging(false);
    }
  };

  return (
    <>
      {/* Current Journey Display with Edit Button */}
      <motion.button
        onClick={handleOpen}
        whileTap={{ scale: 0.98 }}
        className="w-full p-4 rounded-xl bg-gradient-to-br from-primary/5 to-accent/5 border border-primary/20 hover:border-primary/40 transition-all text-left group"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
            <Compass className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground mb-0.5">Current Journey</p>
            <p className="font-medium text-foreground truncate">
              {currentJourney ? (
                <>
                  {currentJourney.emoji} {currentJourney.title}
                </>
              ) : (
                "No journey selected"
              )}
            </p>
          </div>
          <RefreshCw className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>
      </motion.button>

      {/* Journey Selection Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">Change Your Journey</DialogTitle>
            <DialogDescription>
              Changing direction is part of the process. Your previous path will be logged for reflection.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            {GUIDED_JOURNEYS.map((journey) => {
              const isSelected = selectedJourney === journey.id;
              const isCurrent = currentJourneyId === journey.id;

              return (
                <motion.button
                  key={journey.id}
                  onClick={() => handleSelect(journey.id)}
                  whileTap={{ scale: 0.98 }}
                  className={`w-full p-4 rounded-xl border text-left transition-all relative ${
                    isSelected
                      ? "border-primary bg-primary/5 shadow-[0_0_12px_rgba(102,189,239,0.15)]"
                      : "border-border bg-card hover:border-primary/30"
                  }`}
                >
                  {isCurrent && (
                    <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-xs">
                      Current
                    </div>
                  )}

                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center text-xl shrink-0">
                      {journey.emoji}
                    </div>
                    <div className="flex-1 min-w-0 pr-16">
                      <h3 className="font-medium text-foreground">{journey.title}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5 italic">
                        {journey.tagline}
                      </p>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-1 transition-colors ${
                        isSelected
                          ? "border-primary bg-primary"
                          : "border-muted-foreground/30"
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              className="flex-1"
              disabled={isChanging}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              className="flex-1"
              disabled={isChanging || selectedJourney === currentJourneyId}
            >
              {isChanging ? "Changing..." : "Confirm Change"}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Day {currentDay} of your reset • Changes are logged for reflection
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}
