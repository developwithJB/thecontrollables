import { useMemo, useState } from "react";
import { OnboardingMissionFirstStep } from "./OnboardingMissionFirstStep";
import { OnboardingSnapshotRecommendationStep } from "./OnboardingSnapshotRecommendationStep";
import { OnboardingStarting } from "./OnboardingStarting";
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
  const [step, setStep] = useState<"mission" | "snapshot" | "starting">("mission");
  const [mission, setMission] = useState(draft?.mission ?? "");
  const [snapshotId, setSnapshotId] = useState<string | null>(draft?.snapshotId ?? null);
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

  const handleStart = async () => {
    if (!selectedSnapshot) return;
    setStep("starting");

    await acceptCovenant({ isPaid, journeyId: selectedSnapshot.id });
    if (createQuest) {
      await createQuest({ title: mission || selectedSnapshot.name, durationDays: 7 });
    }

    await onUpdateOnboarding({ step: "completed", journeyControllable: selectedSnapshot.focus });
    clearOnboardingQuickStartDraft();

    setTimeout(() => onComplete(), 1600);
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
        onContinue={handleStart}
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
