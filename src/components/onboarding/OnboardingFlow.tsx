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
import { OnboardingOrientation } from "./OnboardingOrientation";
import { 
  SNAPSHOTS,
  getRecommendedSnapshot,
  type Snapshot,
} from "@/lib/snapshots";
import type { BuildScore } from "@/lib/build";
import type { OnboardingStep } from "@/hooks/useOnboarding";

// Internal step type that includes transitional states
type InternalOnboardingStep = OnboardingStep | "orientation" | "starting" | "skip_confirmation" | "recovery" | "meet_guides";

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

// Stale onboarding threshold (24 hours)
const STALE_ONBOARDING_MS = 24 * 60 * 60 * 1000;

// Get default snapshot for skip flow
function getDefaultSnapshot(): Snapshot {
  return SNAPSHOTS.find(s => s.id === "rebuild-confidence-agb") || SNAPSHOTS[0];
}

// Generate quest title from snapshot name
function getQuestTitleFromSnapshot(snapshot: Snapshot): string {
  return snapshot.name;
}

export function OnboardingFlow({ 
  userId, 
  onComplete, 
  onUpdateOnboarding,
  initialStep = "build_assessment",
  isPaid = false,
  createQuest,
}: OnboardingFlowProps) {
  // Check if onboarding record is stale (older than 24 hours) — auto-skip to recovery
  const [checkedStale, setCheckedStale] = useState(false);
  
  const getEffectiveInitialStep = (): InternalOnboardingStep => {
    // If we haven't checked stale yet, return a temporary value - will be overridden in useEffect
    return initialStep;
  };
  
  const [currentStep, setCurrentStep] = useState<InternalOnboardingStep>(getEffectiveInitialStep);
  const [buildResult, setBuildResult] = useState<BuildScore | null>(null);
  const [selectedSnapshot, setSelectedSnapshot] = useState<Snapshot | null>(null);
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

  // Check for stale onboarding (>24 hours old, still not completed)
  useEffect(() => {
    if (checkedStale) return;
    
    const checkStale = async () => {
      try {
        const { data } = await (await import("@/integrations/supabase/client")).supabase
          .from("user_onboarding")
          .select("created_at, onboarding_step")
          .eq("user_id", userId)
          .maybeSingle();
        
        if (data && data.onboarding_step !== "completed") {
          const createdAt = new Date(data.created_at).getTime();
          const age = Date.now() - createdAt;
          if (age > STALE_ONBOARDING_MS) {
            console.log("Stale onboarding detected, auto-showing skip confirmation");
            setCurrentStep("skip_confirmation");
          }
        }
      } catch (e) {
        console.warn("Failed to check stale onboarding:", e);
      }
      setCheckedStale(true);
    };
    
    checkStale();
  }, [userId, checkedStale]);

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
    // Show skip confirmation, then auto-start with default snapshot
    setCurrentStep("skip_confirmation");
  };

  const handleSkipConfirmationComplete = async () => {
    const defaultSnapshot = getDefaultSnapshot();
    setSelectedSnapshot(defaultSnapshot);
    setCurrentStep("starting");
    
    // Track snapshot selection (default snapshot)
    trackSnapshotSelected(defaultSnapshot.id, defaultSnapshot.name, true);
    trackStepChange("skip_confirmation", "starting");
    
    const startReset = async () => {
      try {
        // Start the reset with snapshot ID
        await acceptCovenant({ isPaid, journeyId: defaultSnapshot.id });
        
        // Auto-create Main Quest with Snapshot name
        if (createQuest) {
          const questTitle = getQuestTitleFromSnapshot(defaultSnapshot);
          await createQuest({ title: questTitle, durationDays: 7 });
        }
        
        await onUpdateOnboarding({ 
          step: "completed", 
          journeyControllable: defaultSnapshot.focus
        });
        
        // Track onboarding complete
        trackOnboardingComplete(defaultSnapshot.id, true);
        
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
      if (buildResult) {
        trackArchetypeViewed(buildResult.build_archetype_key);
      }
      trackStepChange("archetype_result", "meet_guides");
      setCurrentStep("meet_guides");
    } catch (error) {
      console.error("Failed to save progress:", error);
      lastActionRef.current = handleArchetypeAcknowledged;
      setCurrentStep("recovery");
    }
  };

  const handleMeetGuidesContinue = async () => {
    try {
      trackStepChange("meet_guides", "journey_selection");
      await onUpdateOnboarding({ step: "journey_selection" });
      setCurrentStep("journey_selection");
    } catch (error) {
      console.error("Failed to save progress:", error);
      lastActionRef.current = handleMeetGuidesContinue;
      setCurrentStep("recovery");
    }
  };

  const handleSnapshotSelected = async (snapshot: Snapshot) => {
    setSelectedSnapshot(snapshot);
    // Show orientation screen first (Day 0)
    setCurrentStep("orientation");
    
    // Track snapshot selection
    const recommendedSnapshot = buildResult ? getRecommendedSnapshot(buildResult) : null;
    const isRecommended = recommendedSnapshot ? snapshot.id === recommendedSnapshot.id : false;
    trackSnapshotSelected(snapshot.id, snapshot.name, isRecommended);
    trackStepChange("journey_selection", "orientation");
  };

  const handleOrientationComplete = async () => {
    if (!selectedSnapshot) return;
    
    setCurrentStep("starting");
    trackStepChange("orientation", "starting");
    
    const startReset = async () => {
      try {
        // Start the reset with snapshot ID
        await acceptCovenant({ isPaid, journeyId: selectedSnapshot.id });
        
        // Auto-create Main Quest with Snapshot name
        if (createQuest) {
          const questTitle = getQuestTitleFromSnapshot(selectedSnapshot);
          await createQuest({ title: questTitle, durationDays: 7 });
        }
        
        await onUpdateOnboarding({ 
          step: "completed", 
          journeyControllable: selectedSnapshot.focus
        });
        
        // Track onboarding complete
        trackOnboardingComplete(selectedSnapshot.id, false);
        
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
            key="snapshot-selection"
            buildResult={buildResult}
            onSelect={handleSnapshotSelected}
          />
        )}

        {currentStep === "meet_guides" && (
          <OnboardingMeetGuides
            key="meet-guides"
            buildResult={buildResult}
            onContinue={handleMeetGuidesContinue}
          />
        )}
        
        {currentStep === "orientation" && selectedSnapshot && (
          <OnboardingOrientation
            key="orientation"
            snapshotName={selectedSnapshot.name}
            snapshotEmoji={selectedSnapshot.emoji}
            snapshotFocus={selectedSnapshot.focus}
            onStartDay1={handleOrientationComplete}
          />
        )}
        
        {currentStep === "starting" && (
          <OnboardingStarting
            key="starting"
            journeyTitle={selectedSnapshot?.name || "your snapshot"}
            journeyEmoji={selectedSnapshot?.emoji || "✨"}
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
