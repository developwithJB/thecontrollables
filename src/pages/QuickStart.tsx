import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { OnboardingMissionFirstStep } from "@/components/onboarding/OnboardingMissionFirstStep";
import { OnboardingSnapshotRecommendationStep } from "@/components/onboarding/OnboardingSnapshotRecommendationStep";
import { onboardingQuickStartEnabled } from "@/lib/featureFlags";
import { saveOnboardingQuickStartDraft } from "@/lib/onboardingQuickStartDraft";
import { SNAPSHOTS } from "@/lib/snapshots";

export default function QuickStart() {
  const [step, setStep] = useState<"mission" | "snapshot" | "cta">("mission");
  const [mission, setMission] = useState("");
  const [snapshotId, setSnapshotId] = useState<string | null>(null);

  if (!onboardingQuickStartEnabled()) {
    return <Navigate to="/auth?mode=signup" replace />;
  }

  const selectedSnapshot = SNAPSHOTS.find((snapshot) => snapshot.id === snapshotId) ?? null;

  if (step === "mission") {
    return (
      <OnboardingMissionFirstStep
        mission={mission}
        onMissionChange={(value) => {
          setMission(value);
          saveOnboardingQuickStartDraft({ mission: value, snapshotId, snapshotName: selectedSnapshot?.name ?? null });
        }}
        onContinue={() => setStep("snapshot")}
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
        onContinue={() => setStep("cta")}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background p-6 flex items-center justify-center">
      <div className="w-full max-w-md rounded-xl border bg-card p-6 space-y-4">
        <h1 className="text-xl font-semibold">Today’s Actions are ready</h1>
        <p className="text-sm text-muted-foreground">
          Create your account to start your first action now. Your mission and snapshot draft are saved on this device.
        </p>
        <div className="rounded-lg bg-muted/40 p-3 text-sm">
          <p><span className="font-medium">Mission:</span> {mission}</p>
          <p><span className="font-medium">Snapshot:</span> {selectedSnapshot?.name}</p>
        </div>
        <Link to="/auth?mode=signup" className="block">
          <Button className="w-full">Create account and continue</Button>
        </Link>
      </div>
    </div>
  );
}
