import { useEffect, useState } from "react";
import { CheckCircle2, ChevronDown, SlidersHorizontal, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SNAPSHOTS } from "@/lib/snapshots";
import type { Snapshot } from "@/lib/snapshots";
import { getRegionForBucket } from "@/lib/lifePerspective";

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
  const [showOptions, setShowOptions] = useState(false);
  const recommended = SNAPSHOTS[0];
  const alternateOptions = SNAPSHOTS.filter((snapshot) => snapshot.id !== recommended.id).slice(0, 5);
  const selectedSnapshot =
    [recommended, ...alternateOptions].find((snapshot) => snapshot.id === selectedSnapshotId) ??
    recommended;
  const selectedIsRecommended = selectedSnapshot.id === recommended.id;
  const recommendedRegion = getRegionForBucket(recommended.bucketId);

  useEffect(() => {
    if (!selectedSnapshotId) {
      onSelectSnapshot(recommended);
    }
  }, [onSelectSnapshot, recommended, selectedSnapshotId]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 sm:p-6">
      <div className="w-full max-w-lg space-y-5 rounded-2xl border border-border/70 bg-card/95 p-5 shadow-[0_24px_80px_-48px_hsl(var(--foreground)/0.45)] backdrop-blur sm:p-6">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Recommended Region
          </p>
          <h2 className="font-display text-[1.7rem] font-semibold leading-tight text-foreground">
            Start in {recommendedRegion.label}
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Based on your mission <span className="font-medium text-foreground">“{mission}”</span>, this is the cleanest first direction.
          </p>
        </div>

        <button
          type="button"
          onClick={() => onSelectSnapshot(recommended)}
          className={`w-full rounded-lg border px-5 py-5 text-left transition-all ${
            selectedIsRecommended
              ? "border-primary/70 bg-primary/10 shadow-[0_0_0_1px_hsl(var(--primary)/0.18)]"
              : "border-primary/25 bg-primary/5 hover:border-primary/45"
          }`}
        >
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-background/70 text-2xl shadow-sm">
              {recommended.emoji}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-base font-semibold leading-tight text-foreground">
                  {recommended.name}
                </p>
                <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-[10px] font-semibold text-primary-foreground">
                  <Sparkles className="h-3 w-3" />
                  Recommended
                </span>
              </div>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {recommended.tagline}
              </p>
              <p className="mt-3 text-xs leading-relaxed text-foreground">
                {recommendedRegion.description}
              </p>
              <div className="mt-4 inline-flex items-center gap-2 text-xs font-medium text-primary">
                <CheckCircle2 className="h-4 w-4" />
                {selectedIsRecommended ? "Selected for your start" : "Use recommended region"}
              </div>
            </div>
          </div>
        </button>

        {!selectedIsRecommended ? (
          <div className="rounded-lg border border-border/70 bg-muted/20 px-4 py-3">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-background text-lg">
                {selectedSnapshot.emoji}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                  Selected Instead
                </p>
                <p className="mt-1 text-sm font-medium text-foreground">
                  {selectedSnapshot.name}
                </p>
              </div>
              <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-primary" />
            </div>
          </div>
        ) : null}

        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setShowOptions((current) => !current)}
            className="flex w-full items-center justify-between rounded-lg border border-border/60 bg-background/40 px-4 py-3 text-left text-sm font-medium text-foreground transition-colors hover:border-primary/35 hover:bg-muted/30"
            aria-expanded={showOptions}
          >
            <span className="inline-flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-primary" />
              View other regions
            </span>
            <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
              {alternateOptions.length}
              <ChevronDown
                className={`h-4 w-4 transition-transform ${
                  showOptions ? "rotate-180" : ""
                }`}
              />
            </span>
          </button>

          {showOptions ? (
            <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
              {alternateOptions.map((snapshot) => {
                const selected = selectedSnapshotId === snapshot.id;
                const region = getRegionForBucket(snapshot.bucketId);

                return (
                  <button
                    key={snapshot.id}
                    type="button"
                    onClick={() => onSelectSnapshot(snapshot)}
                    className={`w-full rounded-lg border px-4 py-3 text-left transition-all ${
                      selected
                        ? "border-primary bg-primary/5 shadow-[0_0_0_1px_hsl(var(--primary)/0.15)]"
                        : "border-border/60 bg-card/70 hover:border-primary/30"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted/50 text-xl">
                        {snapshot.emoji}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-medium text-foreground">
                            {snapshot.name}
                          </p>
                          {selected ? (
                            <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                          ) : null}
                        </div>
                        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                          {snapshot.tagline}
                        </p>
                        <p className="mt-2 text-[11px] uppercase tracking-wide text-muted-foreground">
                          {region.label}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>

        <div className="flex gap-2">
          <Button variant="outline" className="h-12 flex-1" onClick={onBack}>Back</Button>
          <Button className="h-12 flex-1" onClick={onContinue} disabled={!selectedSnapshotId}>Continue</Button>
        </div>
      </div>
    </div>
  );
}
