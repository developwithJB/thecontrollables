import { Button } from "@/components/ui/button";
import { SNAPSHOTS } from "@/lib/snapshots";
import type { Snapshot } from "@/lib/snapshots";

interface OnboardingSnapshotRecommendationStepProps {
  mission: string;
  selectedSnapshotId: string | null;
  onSelectSnapshot: (snapshot: Snapshot) => void;
  onBack: () => void;
  onContinue: () => void;
}

export function OnboardingSnapshotRecommendationStep({
  mission,
  selectedSnapshotId,
  onSelectSnapshot,
  onBack,
  onContinue,
}: OnboardingSnapshotRecommendationStepProps) {
  const recommended = SNAPSHOTS[0];

  return (
    <div className="min-h-screen bg-background p-6 flex items-center justify-center">
      <div className="w-full max-w-md rounded-xl border bg-card p-6 space-y-4">
        <h2 className="text-xl font-semibold text-foreground">Recommended snapshot</h2>
        <p className="text-sm text-muted-foreground">
          Based on your mission <span className="text-foreground font-medium">“{mission}”</span>, start with one
          simple direction.
        </p>

        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {SNAPSHOTS.slice(0, 6).map((snapshot) => {
            const selected = selectedSnapshotId === snapshot.id;
            const isRecommended = recommended?.id === snapshot.id;
            return (
              <button
                key={snapshot.id}
                onClick={() => onSelectSnapshot(snapshot)}
                className={`w-full text-left rounded-lg border p-3 transition-colors ${
                  selected ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-sm">{snapshot.emoji} {snapshot.name}</span>
                  {isRecommended && <span className="text-[11px] text-primary font-medium">Recommended</span>}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{snapshot.tagline}</p>
              </button>
            );
          })}
        </div>

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onBack}>Back</Button>
          <Button className="flex-1" onClick={onContinue} disabled={!selectedSnapshotId}>Continue</Button>
        </div>
      </div>
    </div>
  );
}
