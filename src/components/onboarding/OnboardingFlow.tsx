import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { useBuildAssessment } from "@/hooks/useBuildAssessment";
import { useReset } from "@/hooks/useReset";
import { OnboardingAssessment } from "./OnboardingAssessment";
import { OnboardingArchetypeResult } from "./OnboardingArchetypeResult";
import { OnboardingJourneySelection } from "./OnboardingJourneySelection";
import { OnboardingStarting } from "./OnboardingStarting";
import type { BuildScore } from "@/lib/build";
import type { OnboardingStep } from "@/hooks/useOnboarding";

// Internal step type that includes the transitional "starting" state
type InternalOnboardingStep = OnboardingStep | "starting";

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

export function OnboardingFlow({ 
  userId, 
  onComplete, 
  onUpdateOnboarding,
  initialStep = "build_assessment" 
}: OnboardingFlowProps) {
  const [currentStep, setCurrentStep] = useState<InternalOnboardingStep>(initialStep);
  const [buildResult, setBuildResult] = useState<BuildScore | null>(null);
  const [selectedJourney, setSelectedJourney] = useState<string | null>(null);
  
  const { questions, questionsLoading, submitAssessment, isSubmitting } = useBuildAssessment();
  const { acceptCovenant, isAcceptingCovenant } = useReset();

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

  const handleArchetypeAcknowledged = async () => {
    await onUpdateOnboarding({ step: "journey_selection" });
    setCurrentStep("journey_selection");
  };

  const handleJourneySelected = async (controllable: string) => {
    setSelectedJourney(controllable);
    // Set the internal UI state to "starting"
    setCurrentStep("starting");
    
    // Auto-start the reset after a brief moment
    setTimeout(async () => {
      try {
        await acceptCovenant({ isPaid: false });
        // Mark onboarding as completed in the database
        await onUpdateOnboarding({ 
          step: "completed", 
          journeyControllable: controllable 
        });
        onComplete();
      } catch (error) {
        console.error("Failed to start reset:", error);
        onComplete(); // Still complete onboarding, user can start reset manually
      }
    }, 2000);
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
            lowestControllable={buildResult ? getLowestControllable(buildResult) : null}
            onSelect={handleJourneySelected}
          />
        )}
        
        {currentStep === "starting" && (
          <OnboardingStarting
            key="starting"
            journeyControllable={selectedJourney}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// Helper to determine lowest controllable from build result
function getLowestControllable(build: BuildScore): string {
  const scores = {
    awareness: Number(build.awareness),
    perspective: Number(build.perspective),
    habit: Number(build.habit),
    wellness: Number(build.wellness),
    environment: Number(build.environment),
  };
  
  let lowest = "awareness";
  let lowestScore = scores.awareness;
  
  for (const [key, value] of Object.entries(scores)) {
    if (value < lowestScore) {
      lowestScore = value;
      lowest = key;
    }
  }
  
  return lowest;
}
