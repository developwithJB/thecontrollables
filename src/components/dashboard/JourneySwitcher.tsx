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
import { Check, RefreshCw, Compass, AlertCircle, Sparkles, Brain, TrendingDown, RotateCcw } from "lucide-react";
import { 
  GUIDED_JOURNEYS, 
  getJourneyById, 
  journeyToControllable, 
  getQuestTitleFromJourney, 
  generateCustomFocus,
  getStandardJourneyForCustom,
  type GuidedJourney 
} from "@/lib/guidedJourneys";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useActionTracking } from "@/hooks/useActionTracking";
import { useBuildAssessment } from "@/hooks/useBuildAssessment";
import { BuildAssessmentModal } from "./BuildAssessmentModal";

interface JourneySwitcherProps {
  currentJourneyControllable: string | null;
  sessionId: string;
  currentDay: number;
  userId: string;
  currentQuestTitle?: string | null;
  onJourneyChanged?: () => void;
  onUpdateQuestTitle?: (title: string) => void;
  // Controlled open state (optional - for external triggers)
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
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
  currentQuestTitle,
  onJourneyChanged,
  onUpdateQuestTitle,
  isOpen: controlledIsOpen,
  onOpenChange,
}: JourneySwitcherProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [selectedJourney, setSelectedJourney] = useState<string | null>(null);
  const [isChanging, setIsChanging] = useState(false);
  const [showQuestUpdatePrompt, setShowQuestUpdatePrompt] = useState(false);
  const [pendingJourney, setPendingJourney] = useState<GuidedJourney | null>(null);
  
  // Use controlled state if provided, otherwise internal state
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;
  const setIsOpen = (value: boolean) => {
    if (onOpenChange) {
      onOpenChange(value);
    } else {
      setInternalIsOpen(value);
    }
  };
  
  const queryClient = useQueryClient();
  const { trackFeatureUse } = useActionTracking();
  
  // Fetch build data for custom focus
  const { currentBuild, assessmentHistory, questions, submitAssessment, isSubmitting } = useBuildAssessment();
  const customFocus = generateCustomFocus(currentBuild, assessmentHistory);
  const [showBuildModal, setShowBuildModal] = useState(false);

  const currentJourneyId = controllableToJourneyId(currentJourneyControllable);
  const currentJourney = currentJourneyId ? getJourneyById(currentJourneyId) : null;

  // Combine default journeys with custom focus
  const allJourneys: GuidedJourney[] = customFocus 
    ? [customFocus, ...GUIDED_JOURNEYS]
    : GUIDED_JOURNEYS;

  // Find lowest score for highlighting
  const getLowestControllable = () => {
    if (!currentBuild) return null;
    const scores = [
      { key: "awareness", value: currentBuild.awareness },
      { key: "perspective", value: currentBuild.perspective },
      { key: "habit", value: currentBuild.habit },
      { key: "wellness", value: currentBuild.wellness },
      { key: "environment", value: currentBuild.environment },
    ];
    return scores.reduce((min, curr) => curr.value < min.value ? curr : min).key;
  };
  const lowestControllable = getLowestControllable();

  const handleBuildComplete = async (answers: Record<string, number>) => {
    const result = await submitAssessment(answers);
    // Refresh after a moment to allow new custom focus to generate
    setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: ["build-assessment"] });
    }, 500);
    return result;
  };

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
    
    // If custom focus, map to standard journey for storage
    const journeyIdToStore = selectedJourney.startsWith("custom-") 
      ? getStandardJourneyForCustom(selectedJourney)
      : selectedJourney;
    
    const newControllable = journeyToControllable(journeyIdToStore);
    const newJourney = selectedJourney.startsWith("custom-")
      ? allJourneys.find(j => j.id === selectedJourney)
      : getJourneyById(selectedJourney);

    try {
      // 1. Log the change in journey_changes table
      const { error: logError } = await supabase
        .from("journey_changes" as any)
        .insert({
          user_id: userId,
          session_id: sessionId,
          previous_journey_id: currentJourneyId,
          new_journey_id: journeyIdToStore,
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
          journey_id: journeyIdToStore,
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
        to: journeyIdToStore,
        on_day: currentDay,
        was_custom: selectedJourney.startsWith("custom-"),
      });

      // Invalidate queries - use partial match to catch userId-keyed queries
      queryClient.invalidateQueries({ queryKey: ["user-onboarding"] });
      queryClient.invalidateQueries({ queryKey: ["reset-session"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["journey-changes"] });

      setIsOpen(false);
      
      // Check if quest title should be updated
      if (newJourney && onUpdateQuestTitle) {
        const newQuestTitle = getQuestTitleFromJourney(newJourney);
        // Only prompt if current quest title differs from new journey title
        if (currentQuestTitle && currentQuestTitle !== newQuestTitle) {
          setPendingJourney(newJourney);
          setShowQuestUpdatePrompt(true);
        } else {
          toast.success(`Switched to "${newJourney.title}"`, {
            description: "Your focus has been updated.",
          });
        }
      } else {
        toast.success(`Switched to "${newJourney?.title}"`, {
          description: "Your focus has been updated.",
        });
      }

      onJourneyChanged?.();
    } catch (error) {
      console.error("Failed to change journey:", error);
      toast.error("Failed to change focus", {
        description: "Please try again.",
      });
    } finally {
      setIsChanging(false);
    }
  };

  const handleUpdateQuestTitle = () => {
    if (pendingJourney && onUpdateQuestTitle) {
      const newQuestTitle = getQuestTitleFromJourney(pendingJourney);
      onUpdateQuestTitle(newQuestTitle);
      toast.success(`Quest updated to "${newQuestTitle}"`, {
        description: "Your focus and quest are now aligned.",
      });
    }
    setShowQuestUpdatePrompt(false);
    setPendingJourney(null);
  };

  const handleSkipQuestUpdate = () => {
    toast.success(`Switched to "${pendingJourney?.title}"`, {
      description: "Your quest title was kept as-is.",
    });
    setShowQuestUpdatePrompt(false);
    setPendingJourney(null);
  };

  // When controlled externally (isOpen prop provided), don't show the button
  const isControlled = controlledIsOpen !== undefined;

  return (
    <>
      {/* Current Journey Display with Edit Button - only show when not controlled externally */}
      {!isControlled && (
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
              <p className="text-xs text-muted-foreground mb-0.5">Current Focus</p>
              <p className="font-medium text-foreground truncate">
                {currentJourney ? (
                  <>
                    {currentJourney.emoji} {currentJourney.title}
                  </>
                ) : (
                  "No focus selected"
                )}
              </p>
            </div>
            <RefreshCw className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
        </motion.button>
      )}

      {/* Journey Selection Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">Choose Your Focus</DialogTitle>
            <DialogDescription className="space-y-2">
              <span className="block">
                Changing direction is part of the process. Your previous path will be logged for reflection.
              </span>
            </DialogDescription>
          </DialogHeader>
          
          {/* Importance of Focus callout */}
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 mb-2">
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">A clear focus guides your energy.</span>{" "}
              Without one, progress scatters. Choose what resonates—you can always adjust.
            </p>
          </div>

          {/* Build Scores Inline */}
          {currentBuild ? (
            <div className="p-3 rounded-lg bg-muted/50 border border-border mb-2">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-foreground">Your Current Build</p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => setShowBuildModal(true)}
                >
                  <RotateCcw className="w-3 h-3 mr-1" />
                  Re-scan
                </Button>
              </div>
              <div className="grid grid-cols-5 gap-1">
                {[
                  { key: "awareness", label: "AWR", emoji: "🦉" },
                  { key: "perspective", label: "PER", emoji: "🐢" },
                  { key: "habit", label: "HAB", emoji: "🦈" },
                  { key: "wellness", label: "WEL", emoji: "🛰️" },
                  { key: "environment", label: "ENV", emoji: "🚀" },
                ].map((stat) => {
                  const value = Number(currentBuild[stat.key as keyof typeof currentBuild]) || 0;
                  const isLowest = stat.key === lowestControllable;
                  return (
                    <div 
                      key={stat.key} 
                      className={`text-center p-1.5 rounded-lg ${
                        isLowest 
                          ? "bg-amber-500/10 border border-amber-500/30" 
                          : "bg-background"
                      }`}
                    >
                      <span className="text-sm block">{stat.emoji}</span>
                      <span className={`text-xs font-medium block ${
                        isLowest ? "text-amber-600 dark:text-amber-400" : "text-foreground"
                      }`}>
                        {value.toFixed(1)}
                      </span>
                      {isLowest && (
                        <TrendingDown className="w-2.5 h-2.5 mx-auto text-amber-500 mt-0.5" />
                      )}
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground text-center mt-2">
                {lowestControllable && (
                  <>Your lowest area is highlighted • </>
                )}
                Choose a focus that addresses it
              </p>
            </div>
          ) : (
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 mb-2">
              <div className="flex items-start gap-2">
                <Brain className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="text-xs font-medium text-foreground">No Build data found</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Scan your Build to unlock a personalized focus recommendation.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-xs shrink-0"
                  onClick={() => setShowBuildModal(true)}
                >
                  <RotateCcw className="w-3 h-3 mr-1" />
                  Scan Now
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-3 pt-2">
            {allJourneys.map((journey) => {
              const isSelected = selectedJourney === journey.id;
              const isCurrent = currentJourneyId === journey.id || 
                (journey.isCustom && currentJourneyId === getStandardJourneyForCustom(journey.id));

              return (
                <motion.button
                  key={journey.id}
                  onClick={() => handleSelect(journey.id)}
                  whileTap={{ scale: 0.98 }}
                  className={`w-full p-4 rounded-xl border text-left transition-all relative ${
                    isSelected
                      ? "border-primary bg-primary/5 shadow-[0_0_12px_rgba(102,189,239,0.15)]"
                      : journey.isCustom
                      ? "border-amber-500/30 bg-amber-500/5 hover:border-amber-500/50"
                      : "border-border bg-card hover:border-primary/30"
                  }`}
                >
                  {/* Custom focus badge */}
                  {journey.isCustom && (
                    <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 text-xs">
                      <Sparkles className="w-3 h-3" />
                      Based on your Build
                    </div>
                  )}
                  
                  {isCurrent && !journey.isCustom && (
                    <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-xs">
                      Current
                    </div>
                  )}

                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl shrink-0 ${
                      journey.isCustom 
                        ? "bg-gradient-to-br from-amber-500/20 to-orange-500/20"
                        : "bg-gradient-to-br from-primary/10 to-accent/10"
                    }`}>
                      {journey.emoji}
                    </div>
                    <div className="flex-1 min-w-0 pr-16">
                      <h3 className="font-medium text-foreground">{journey.title}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5 italic">
                        {journey.tagline}
                      </p>
                      {journey.isCustom && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {journey.whatItHelps}
                        </p>
                      )}
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
              {isChanging ? "Changing..." : "Confirm Focus"}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Day {currentDay} of your reset • Changes are logged for reflection
          </p>
        </DialogContent>
      </Dialog>

      {/* Quest Update Prompt Dialog */}
      <Dialog open={showQuestUpdatePrompt} onOpenChange={setShowQuestUpdatePrompt}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-primary" />
              Update Your Quest?
            </DialogTitle>
            <DialogDescription>
              You've switched to a new focus. Would you like to update your Main Quest to match?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="p-4 rounded-xl bg-muted/50 border border-border">
              <p className="text-xs text-muted-foreground mb-1">Current Quest</p>
              <p className="font-medium text-foreground">{currentQuestTitle}</p>
            </div>
            
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
              <p className="text-xs text-muted-foreground mb-1">New Focus Title</p>
              <p className="font-medium text-foreground">
                {pendingJourney?.emoji} {pendingJourney ? getQuestTitleFromJourney(pendingJourney) : ""}
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleSkipQuestUpdate}
                className="flex-1"
              >
                Keep Current
              </Button>
              <Button
                onClick={handleUpdateQuestTitle}
                className="flex-1"
              >
                Update Quest
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Build Assessment Modal */}
      <BuildAssessmentModal
        open={showBuildModal}
        onOpenChange={setShowBuildModal}
        questions={questions}
        onSubmit={handleBuildComplete}
        isSubmitting={isSubmitting}
      />
    </>
  );
}