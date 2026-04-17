import { useMemo, useState } from "react";
import { OnboardingMissionFirstStep } from "./OnboardingMissionFirstStep";
import { OnboardingSnapshotRecommendationStep } from "./OnboardingSnapshotRecommendationStep";
import { OnboardingOrientation } from "./OnboardingOrientation";
import { OnboardingStarting } from "./OnboardingStarting";
import { OnboardingRecovery } from "./OnboardingRecovery";
import { useReset } from "@/hooks/useReset";
import { SNAPSHOTS } from "@/lib/snapshots";
import { clearOnboardingQuickStartDraft, getOnboardingQuickStartDraft, saveOnboardingQuickStartDraft } from "@/lib/onboardingQuickStartDraft";

interface OnboardingQuickStartFlowProps {
  isPaid?: boolean;
  onComplete: () => void;
  onUpdateOnboarding: (data: { step: "completed"; journeyControllable?: string }) => Promise<void>;
  createQuest?: (data: { title: string; durationDays: number }) => Promise<unknown>;
}

export function OnboardingQuickStartFlow({
  isPaid = false,
  onComplete,
  onUpdateOnboarding,
  createQuest,
}: OnboardingQuickStartFlowProps) {
  const draft = useMemo(() => getOnboardingQuickStartDraft(), []);
  const getInitialStep = () => {
    if (draft?.snapshotId && draft?.birthday) return "orientation";
    if (draft?.snapshotId) return "snapshot";
    return "mission";
  };

  const [step, setStep] = useState<"mission" | "snapshot" | "orientation" | "starting" | "recovery">(getInitialStep);
  const [mission, setMission] = useState(draft?.mission ?? draft?.seasonNeedLabel ?? "");
  const [snapshotId, setSnapshotId] = useState<string | null>(draft?.snapshotId ?? null);
  const [isRetrying, setIsRetrying] = useState(false);
  const { acceptCovenant } = useReset();

  const selectedSnapshot = SNAPSHOTS.find((snapshot) => snapshot.id === snapshotId) ?? null;

  const handleContinueMission = () => {
    saveOnboardingQuickStartDraft({
      mission,
      snapshotId,
      snapshotName: selectedSnapshot?.name ?? null,
    });
    setStep("snapshot");
  };

  const handleSnapshotContinue = () => {
    if (!selectedSnapshot) return;
    // Show orientation before starting
    setStep("orientation");
  };

  const handleOrientationComplete = async () => {
    if (!selectedSnapshot) return;
    setStep("starting");
    await startReset();
  };

  const startReset = async () => {
    if (!selectedSnapshot) return;
    try {
      await acceptCovenant({ isPaid, journeyId: selectedSnapshot.id });
      if (createQuest) {
        await createQuest({ title: mission || selectedSnapshot.name, durationDays: 7 });
      }

      await onUpdateOnboarding({ step: "completed", journeyControllable: selectedSnapshot.focus });
      clearOnboardingQuickStartDraft();

      setTimeout(() => onComplete(), 1600);
    } catch (error) {
      console.error("QuickStart: failed to start reset:", error);
      setStep("recovery");
    }
  };

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      setStep("starting");
      await startReset();
    } catch {
      setStep("recovery");
    } finally {
      setIsRetrying(false);
    }
  };

  if (step === "mission") {
    return (
      <OnboardingMissionFirstStep
        mission={mission}
        onMissionChange={(value) => {
          setMission(value);
          saveOnboardingQuickStartDraft({
            mission: value,
            snapshotId,
            snapshotName: selectedSnapshot?.name ?? null,
          });
        }}
        onContinue={handleContinueMission}
      />
    );
  }

  if (step === "snapshot") {
    return (
      <OnboardingSnapshotRecommendationStep
        mission={mission}
        selectedSnapshotId={snapshotId}
        onSelectSnapshot={(snapshot) => {
          setSnapshotId(snapshot.id);
          saveOnboardingQuickStartDraft({ mission, snapshotId: snapshot.id, snapshotName: snapshot.name });
        }}
        onBack={() => setStep("mission")}
        onContinue={handleSnapshotContinue}
      />
    );
  }

  if (step === "orientation" && selectedSnapshot) {
    return (
      <OnboardingOrientation
        snapshotName={selectedSnapshot.name}
        snapshotEmoji={selectedSnapshot.emoji}
        onStartDay1={handleOrientationComplete}
      />
    );
  }

  if (step === "recovery") {
    return (
      <OnboardingRecovery
        onRetry={handleRetry}
        isRetrying={isRetrying}
      />
    );
  }

  return (
    <OnboardingStarting
      journeyEmoji={selectedSnapshot?.emoji ?? "✨"}
      journeyTitle={selectedSnapshot?.name ?? "your snapshot"}
    />
  );
}
