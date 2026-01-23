import { useState, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import { useBuildAssessment } from "@/hooks/useBuildAssessment";
import { useReset } from "@/hooks/useReset";
import { OnboardingAssessment } from "./OnboardingAssessment";
import { OnboardingArchetypeResult } from "./OnboardingArchetypeResult";
import { OnboardingJourneySelection } from "./OnboardingJourneySelection";
import { OnboardingStarting } from "./OnboardingStarting";
import { OnboardingSkipConfirmation } from "./OnboardingSkipConfirmation";
import { 
  getDefaultJourney, 
  journeyToControllable, 
  type GuidedJourney 
} from "@/lib/guidedJourneys";
import type { BuildScore } from "@/lib/build";
import type { OnboardingStep } from "@/hooks/useOnboarding";

// Internal step type that includes transitional states
type InternalOnboardingStep = OnboardingStep | "starting" | "skip_confirmation";

interface OnboardingFlowProps {
  userId: string;
  onComplete: () => void;
  onUpdateOnboarding: (data: {
    step: OnboardingStep;
    buildCompleted?: boolean;
    journeyControllable?: string;
  }) => Promise<void>;
  initialStep?: OnboardingStep;
}

// Map build scores to recommended journey
function getRecommendedJourneyId(buildResult: BuildScore | null): string {
  if (!buildResult) return "reenter-the-game";
  
  const scores = {
    awareness: Number(buildResult.awareness),
    perspective: Number(buildResult.perspective),
    habit: Number(buildResult.habit),
    wellness: Number(buildResult.wellness),
    environment: Number(buildResult.environment),
  };
  
  // Find lowest controllable
  let lowest = "habit";
  let lowestScore = scores.habit;
  
  for (const [key, value] of Object.entries(scores)) {
    if (value < lowestScore) {
      lowestScore = value;
      lowest = key;
    }
  }
  
  // Map controllable to journey
  const controllableToJourney: Record<string, string> = {
    awareness: "reduce-mental-noise",
    perspective: "refocus-on-what-matters",
    habit: "rebuild-momentum",
    wellness: "ground-yourself",
    environment: "refocus-on-what-matters",
  };
  
  return controllableToJourney[lowest] || "reenter-the-game";
}

export function OnboardingFlow({ 
  userId, 
  onComplete, 
  onUpdateOnboarding,
  initialStep = "build_assessment" 
}: OnboardingFlowProps) {
  const [currentStep, setCurrentStep] = useState<InternalOnboardingStep>(initialStep);
  const [buildResult, setBuildResult] = useState<BuildScore | null>(null);
  const [selectedJourney, setSelectedJourney] = useState<GuidedJourney | null>(null);
  
  const { questions, questionsLoading, submitAssessment, isSubmitting } = useBuildAssessment();
  const { acceptCovenant } = useReset();

  const handleAssessmentComplete = async (answers: Record<string, number>) => {
    try {
      const result = await submitAssessment(answers);
      setBuildResult(result);
      await onUpdateOnboarding({ 
        step: "archetype_result", 
        buildCompleted: true 
      });
      setCurrentStep("archetype_result");
    } catch (error) {
      console.error("Assessment submission error:", error);
    }
  };

  const handleSkipAssessment = () => {
    // Show skip confirmation, then auto-start with default journey
    setCurrentStep("skip_confirmation");
  };

  const handleSkipConfirmationComplete = async () => {
    const defaultJourney = getDefaultJourney();
    setSelectedJourney(defaultJourney);
    setCurrentStep("starting");
    
    try {
      await acceptCovenant({ isPaid: false });
      await onUpdateOnboarding({ 
        step: "completed", 
        journeyControllable: journeyToControllable(defaultJourney.id)
      });
      // Small delay to show the starting animation
      setTimeout(() => {
        onComplete();
      }, 2000);
    } catch (error) {
      console.error("Failed to start reset:", error);
      onComplete();
    }
  };

  const handleArchetypeAcknowledged = async () => {
    await onUpdateOnboarding({ step: "journey_selection" });
    setCurrentStep("journey_selection");
  };

  const handleJourneySelected = async (journey: GuidedJourney) => {
    setSelectedJourney(journey);
    setCurrentStep("starting");
    
    try {
      await acceptCovenant({ isPaid: false });
      await onUpdateOnboarding({ 
        step: "completed", 
        journeyControllable: journeyToControllable(journey.id)
      });
      // Small delay to show the starting animation
      setTimeout(() => {
        onComplete();
      }, 2000);
    } catch (error) {
      console.error("Failed to start reset:", error);
      onComplete();
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AnimatePresence mode="wait">
        {currentStep === "build_assessment" && (
          <OnboardingAssessment
            key="assessment"
            questions={questions}
            questionsLoading={questionsLoading}
            onComplete={handleAssessmentComplete}
            onSkip={handleSkipAssessment}
            isSubmitting={isSubmitting}
          />
        )}
        
        {currentStep === "archetype_result" && buildResult && (
          <OnboardingArchetypeResult
            key="archetype"
            buildResult={buildResult}
            onContinue={handleArchetypeAcknowledged}
          />
        )}
        
        {currentStep === "journey_selection" && (
          <OnboardingJourneySelection
            key="journey"
            recommendedJourneyId={getRecommendedJourneyId(buildResult)}
            onSelect={handleJourneySelected}
          />
        )}
        
        {currentStep === "starting" && (
          <OnboardingStarting
            key="starting"
            journeyTitle={selectedJourney?.title || "your journey"}
            journeyEmoji={selectedJourney?.emoji || "✨"}
          />
        )}
        
        {currentStep === "skip_confirmation" && (
          <OnboardingSkipConfirmation
            key="skip"
            onComplete={handleSkipConfirmationComplete}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
