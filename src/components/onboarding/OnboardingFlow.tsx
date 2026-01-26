import { useState, useEffect, useRef } from "react";
import { AnimatePresence } from "framer-motion";
import { useBuildAssessment } from "@/hooks/useBuildAssessment";
import { useReset } from "@/hooks/useReset";
import { useOnboardingAnalytics } from "@/hooks/useOnboardingAnalytics";
import { OnboardingAssessment } from "./OnboardingAssessment";
import { OnboardingArchetypeResult } from "./OnboardingArchetypeResult";
import { OnboardingJourneySelection } from "./OnboardingJourneySelection";
import { OnboardingStarting } from "./OnboardingStarting";
import { OnboardingSkipConfirmation } from "./OnboardingSkipConfirmation";
import { OnboardingRecovery } from "./OnboardingRecovery";
import { 
  getDefaultJourney, 
  journeyToControllable,
  getQuestTitleFromJourney,
  getStandardJourneyForCustom,
  type GuidedJourney 
} from "@/lib/guidedJourneys";
import type { BuildScore } from "@/lib/build";
import type { OnboardingStep } from "@/hooks/useOnboarding";

// Internal step type that includes transitional states
type InternalOnboardingStep = OnboardingStep | "starting" | "skip_confirmation" | "recovery";

interface OnboardingFlowProps {
  userId: string;
  onComplete: () => void;
  onUpdateOnboarding: (data: {
    step: OnboardingStep;
    buildCompleted?: boolean;
    journeyControllable?: string;
  }) => Promise<void>;
  initialStep?: OnboardingStep;
  isPaid?: boolean;
  createQuest?: (data: { title: string; durationDays: number }) => Promise<unknown>;
}

// Timeout for stuck states (10 seconds)
const STUCK_TIMEOUT_MS = 10000;

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
    awareness: "breathe-easy",
    perspective: "tiny-wins",
    habit: "tiny-wins",
    wellness: "happy-moves",
    environment: "pocket-change",
  };
  
  return controllableToJourney[lowest] || "happy-moves";
}

export function OnboardingFlow({ 
  userId, 
  onComplete, 
  onUpdateOnboarding,
  initialStep = "build_assessment",
  isPaid = false,
  createQuest,
}: OnboardingFlowProps) {
  const [currentStep, setCurrentStep] = useState<InternalOnboardingStep>(initialStep);
  const [buildResult, setBuildResult] = useState<BuildScore | null>(null);
  const [selectedJourney, setSelectedJourney] = useState<GuidedJourney | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  
  // Timeout tracking for stuck states
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastActionRef = useRef<(() => void) | null>(null);
  
  const { questions, questionsLoading, submitAssessment, isSubmitting } = useBuildAssessment();
  const { acceptCovenant } = useReset();
  const {
    trackAssessmentCompleted,
    trackAssessmentSkipped,
    trackArchetypeViewed,
    trackSnapshotSelected,
    trackOnboardingComplete,
    trackStepChange,
    trackRecoveryAttempt,
  } = useOnboardingAnalytics();

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Start stuck timeout when in "starting" step
  useEffect(() => {
    if (currentStep === "starting") {
      timeoutRef.current = setTimeout(() => {
        console.warn("Onboarding stuck - showing recovery");
        setCurrentStep("recovery");
      }, STUCK_TIMEOUT_MS);
    } else {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    }
    
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [currentStep]);

  const handleAssessmentComplete = async (answers: Record<string, number>) => {
    try {
      const result = await submitAssessment(answers);
      setBuildResult(result);
      
      // Track assessment completion
      trackAssessmentCompleted(result?.build_archetype_key);
      trackStepChange("build_assessment", "archetype_result");
      
      // Save progress incrementally
      await onUpdateOnboarding({ 
        step: "archetype_result", 
        buildCompleted: true 
      });
      setCurrentStep("archetype_result");
    } catch (error) {
      console.error("Assessment submission error:", error);
      lastActionRef.current = () => handleAssessmentComplete(answers);
      setCurrentStep("recovery");
    }
  };

  const handleSkipAssessment = () => {
    // Track that user skipped assessment
    trackAssessmentSkipped();
    trackStepChange("build_assessment", "skip_confirmation");
    // Show skip confirmation, then auto-start with default journey
    setCurrentStep("skip_confirmation");
  };

  const handleSkipConfirmationComplete = async () => {
    const defaultJourney = getDefaultJourney();
    setSelectedJourney(defaultJourney);
    setCurrentStep("starting");
    
    // Track snapshot selection (default journey)
    trackSnapshotSelected(defaultJourney.id, defaultJourney.title, true);
    trackStepChange("skip_confirmation", "starting");
    
    const startReset = async () => {
      try {
        // Start the reset with journey ID
        await acceptCovenant({ isPaid, journeyId: defaultJourney.id });
        
        // Auto-create Main Quest with Journey title
        if (createQuest) {
          const questTitle = getQuestTitleFromJourney(defaultJourney);
          await createQuest({ title: questTitle, durationDays: 7 });
        }
        
        await onUpdateOnboarding({ 
          step: "completed", 
          journeyControllable: journeyToControllable(defaultJourney.id)
        });
        
        // Track onboarding complete
        trackOnboardingComplete(defaultJourney.id, true);
        
        // Small delay to show the starting animation
        setTimeout(() => {
          onComplete();
        }, 2000);
      } catch (error) {
        console.error("Failed to start reset:", error);
        lastActionRef.current = startReset;
        setCurrentStep("recovery");
      }
    };
    
    lastActionRef.current = startReset;
    await startReset();
  };

  const handleArchetypeAcknowledged = async () => {
    try {
      // Track archetype viewed
      if (buildResult) {
        trackArchetypeViewed(buildResult.build_archetype_key);
      }
      trackStepChange("archetype_result", "journey_selection");
      
      await onUpdateOnboarding({ step: "journey_selection" });
      setCurrentStep("journey_selection");
    } catch (error) {
      console.error("Failed to save progress:", error);
      lastActionRef.current = handleArchetypeAcknowledged;
      setCurrentStep("recovery");
    }
  };

  const handleJourneySelected = async (journey: GuidedJourney) => {
    setSelectedJourney(journey);
    setCurrentStep("starting");
    
    // Map custom journey to standard journey ID for storage
    const standardJourney = journey.isCustom && journey.id.startsWith("custom-")
      ? getStandardJourneyForCustom(journey.id)
      : null;
    const journeyIdToStore = standardJourney ? standardJourney.id : journey.id;
    
    // Track journey selection
    const recommendedId = getRecommendedJourneyId(buildResult);
    const isRecommended = journey.id === recommendedId;
    trackSnapshotSelected(journeyIdToStore, journey.title, isRecommended);
    trackStepChange("journey_selection", "starting");
    
    const startReset = async () => {
      try {
        // Start the reset with journey ID (use standard ID for storage)
        await acceptCovenant({ isPaid, journeyId: journeyIdToStore });
        
        // Auto-create Main Quest with Journey title
        if (createQuest) {
          const questTitle = getQuestTitleFromJourney(journey);
          await createQuest({ title: questTitle, durationDays: 7 });
        }
        
        await onUpdateOnboarding({ 
          step: "completed", 
          journeyControllable: journeyToControllable(journeyIdToStore)
        });
        
        // Track onboarding complete
        trackOnboardingComplete(journeyIdToStore, false);
        
        // Small delay to show the starting animation
        setTimeout(() => {
          onComplete();
        }, 2000);
      } catch (error) {
        console.error("Failed to start reset:", error);
        lastActionRef.current = startReset;
        setCurrentStep("recovery");
      }
    };
    
    lastActionRef.current = startReset;
    await startReset();
  };

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      if (lastActionRef.current) {
        trackRecoveryAttempt(currentStep, true);
        await lastActionRef.current();
      } else {
        // Fallback: just complete onboarding
        onComplete();
      }
    } catch {
      trackRecoveryAttempt(currentStep, false);
    } finally {
      setIsRetrying(false);
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
            buildResult={buildResult}
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
        
        {currentStep === "recovery" && (
          <OnboardingRecovery
            key="recovery"
            onRetry={handleRetry}
            isRetrying={isRetrying}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
