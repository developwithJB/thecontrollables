import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Check, Sparkles, Brain, ArrowRight } from "lucide-react";
import { 
  GUIDED_JOURNEYS, 
  generateCustomFocus,
  getStandardJourneyForCustom,
  type GuidedJourney 
} from "@/lib/guidedJourneys";
import type { BuildScore } from "@/lib/build";

interface OnboardingJourneySelectionProps {
  recommendedJourneyId: string | null;
  buildResult?: BuildScore | null;
  onSelect: (journey: GuidedJourney) => void;
}

export function OnboardingJourneySelection({
  recommendedJourneyId,
  buildResult,
  onSelect,
}: OnboardingJourneySelectionProps) {
  // Generate custom focus from build result
  const customFocus = generateCustomFocus(buildResult);
  
  // Pre-select the custom focus if available, otherwise recommended
  const [selected, setSelected] = useState<string | null>(
    customFocus ? customFocus.id : recommendedJourneyId
  );

  const handleSelect = (id: string) => {
    setSelected(id);
  };

  const handleContinue = () => {
    // If custom focus is selected, find the actual journey object
    let journey: GuidedJourney | undefined;
    
    if (selected?.startsWith("custom-") && customFocus) {
      // For custom focus, we'll pass the custom journey object
      // The parent will map it to a standard journey for storage
      journey = customFocus;
    } else {
      journey = GUIDED_JOURNEYS.find((j) => j.id === selected);
    }
    
    if (journey) {
      onSelect(journey);
    }
  };

  // Combine custom focus with default journeys
  const allJourneys: GuidedJourney[] = customFocus 
    ? [customFocus, ...GUIDED_JOURNEYS]
    : GUIDED_JOURNEYS;

  // Reorder journeys to show recommended first (after custom if present)
  const orderedJourneys = [...allJourneys].sort((a, b) => {
    // Custom always first
    if (a.isCustom) return -1;
    if (b.isCustom) return 1;
    // Then recommended
    if (a.id === recommendedJourneyId) return -1;
    if (b.id === recommendedJourneyId) return 1;
    return 0;
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen flex flex-col px-6 py-12"
    >
      <div className="max-w-md mx-auto w-full flex-1 flex flex-col">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-4"
        >
          <p className="text-sm text-muted-foreground mb-1">
            Choose your focus
          </p>
          <h1 className="font-display text-2xl font-semibold text-foreground">
            Where to Begin
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Direction should be selected, not invented. Pick what resonates.
          </p>
        </motion.div>
        
        {/* Importance of Focus callout */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-4 rounded-xl bg-primary/5 border border-primary/20 mb-4"
        >
          <div className="flex items-start gap-3">
            <Brain className="w-5 h-5 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">Focus is your compass</p>
              <p className="text-xs text-muted-foreground mt-1">
                Without a clear focus, progress scatters across too many directions. 
                Your 7-Day Reset will be built around this choice—but you can always change it.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Custom focus explanation if available */}
        {customFocus && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 mb-4"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Based on your Build Assessment</span>, 
                we've created a personalized focus just for you.
              </p>
            </div>
          </motion.div>
        )}

        {/* Journey options */}
        <div className="space-y-3 flex-1 overflow-y-auto">
          {orderedJourneys.map((journey, index) => {
            const isSelected = selected === journey.id;
            const isRecommended = journey.id === recommendedJourneyId && !journey.isCustom;

            return (
              <motion.button
                key={journey.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + index * 0.06 }}
                onClick={() => handleSelect(journey.id)}
                whileTap={{ scale: 0.98 }}
                className={`w-full p-4 rounded-xl border text-left transition-all relative overflow-hidden ${
                  isSelected
                    ? journey.isCustom
                      ? "border-amber-500 bg-amber-500/10 shadow-[0_0_16px_rgba(245,158,11,0.2)]"
                      : "border-primary bg-primary/5 shadow-[0_0_16px_rgba(102,189,239,0.2)]"
                    : journey.isCustom
                    ? "border-amber-500/30 bg-amber-500/5 hover:border-amber-500/50"
                    : "border-border bg-card hover:border-primary/30"
                }`}
              >
                {/* Custom focus badge */}
                {journey.isCustom && (
                  <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 text-xs">
                    <Sparkles className="w-3 h-3" />
                    For you
                  </div>
                )}
                
                {/* Recommended badge */}
                {isRecommended && !journey.isCustom && (
                  <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs">
                    <Sparkles className="w-3 h-3" />
                    Recommended
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0 ${
                    journey.isCustom
                      ? "bg-gradient-to-br from-amber-500/20 to-orange-500/20"
                      : "bg-gradient-to-br from-primary/10 to-accent/10"
                  }`}>
                    {journey.emoji}
                  </div>
                  <div className="flex-1 min-w-0 pr-6">
                    <h3 className="font-medium text-foreground">
                      {journey.title}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-0.5 italic">
                      {journey.tagline}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {journey.whatItHelps}
                    </p>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-1 transition-colors ${
                      isSelected
                        ? journey.isCustom
                          ? "border-amber-500 bg-amber-500"
                          : "border-primary bg-primary"
                        : "border-muted-foreground/30"
                    }`}
                  >
                    {isSelected && (
                      <Check className="w-3 h-3 text-primary-foreground" />
                    )}
                  </div>
                </div>
                
                {/* Daily action preview when selected */}
                {isSelected && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="mt-3 pt-3 border-t border-border/50"
                  >
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">Daily action:</span>{" "}
                      {journey.dailyAction}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {journey.duration} days • You can customize anytime
                    </p>
                  </motion.div>
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Continue button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="pt-6"
        >
          <Button
            onClick={handleContinue}
            disabled={!selected}
            className="w-full h-14 text-lg"
          >
            Begin 7-Day Reset
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
          <p className="text-xs text-muted-foreground text-center mt-3">
            Includes daily readings, reflections, and simple actions
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
}