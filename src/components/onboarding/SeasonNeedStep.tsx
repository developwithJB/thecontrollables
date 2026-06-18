import { useState } from "react";
import { CheckCircle2, ChevronDown, SlidersHorizontal, Sparkles } from "lucide-react";
import { CONTROLLABLE_LIST } from "@/lib/controllableTheme";
import type { LifeSeasonMapping } from "@/lib/lifePerspective";
import type { Controllable } from "@/lib/snapshots";

const NEED_COPY: Record<Controllable, string> = {
  awareness: "More noticing, less autopilot.",
  perspective: "A clearer frame for what actually matters.",
  habit: "More structure and steadier follow-through.",
  wellness: "Better protection for energy, recovery, and steadiness.",
  environment: "A setup that supports you instead of draining you.",
};

interface SeasonNeedStepProps {
  season: LifeSeasonMapping;
  selectedNeed: Controllable;
  onSelectNeed: (value: Controllable) => void;
}

export function SeasonNeedStep({
  season,
  selectedNeed,
  onSelectNeed,
}: SeasonNeedStepProps) {
  const [showOptions, setShowOptions] = useState(false);
  const recommended =
    CONTROLLABLE_LIST.find((item) => item.type === season.recommendedControllable) ??
    CONTROLLABLE_LIST[0];
  const selected =
    CONTROLLABLE_LIST.find((item) => item.type === selectedNeed) ?? recommended;
  const selectedIsRecommended = selected.type === recommended.type;
  const alternateOptions = CONTROLLABLE_LIST.filter(
    (controllable) => controllable.type !== recommended.type,
  );

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
          Training Focus
        </p>
        <h1 className="mt-1 font-display text-2xl font-semibold leading-tight text-foreground">
          Start with {recommended.label}.
        </h1>
      </div>

      <button
        type="button"
        onClick={() => onSelectNeed(recommended.type)}
        className={`w-full rounded-xl border px-4 py-4 text-left transition-all ${
          selectedIsRecommended
            ? "border-primary/70 bg-primary/10 shadow-[0_0_0_1px_hsl(var(--primary)/0.18)]"
            : "border-primary/25 bg-primary/5 hover:border-primary/45"
        }`}
      >
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-background/70 text-2xl shadow-sm">
            {recommended.emoji}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-base font-semibold leading-tight text-foreground">
                {recommended.label}
              </p>
              <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-[10px] font-semibold text-primary-foreground">
                <Sparkles className="h-3 w-3" />
                Suggested
              </span>
            </div>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              {NEED_COPY[recommended.type]}
            </p>
            <div className="mt-3 inline-flex items-center gap-2 text-xs font-medium text-primary">
              <CheckCircle2 className="h-4 w-4" />
              {selectedIsRecommended ? "Selected for this season" : "Use suggested focus"}
            </div>
          </div>
        </div>
      </button>

      {!selectedIsRecommended ? (
        <div className="rounded-lg border border-border/70 bg-muted/20 px-4 py-3">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-background text-lg">
              {selected.emoji}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                Selected Instead
              </p>
              <p className="mt-1 text-sm font-medium text-foreground">
                {selected.label}
              </p>
            </div>
            <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-primary" />
          </div>
        </div>
      ) : null}

      <div className="space-y-2">
        <button
          type="button"
          onClick={() => setShowOptions((current) => !current)}
          className="flex w-full items-center justify-between rounded-xl border border-border/60 bg-background/40 px-4 py-3 text-left text-sm font-medium text-foreground transition-colors hover:border-primary/35 hover:bg-muted/30"
          aria-expanded={showOptions}
        >
          <span className="inline-flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-primary" />
            View other focus areas
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
          <div className="grid gap-2 sm:grid-cols-2">
            {alternateOptions.map((controllable) => {
              const isSelected = controllable.type === selectedNeed;

              return (
                <button
                  key={controllable.type}
                  type="button"
                  onClick={() => onSelectNeed(controllable.type)}
                  className={`w-full rounded-xl border px-3 py-3 text-left transition-all ${
                    isSelected
                      ? "border-primary bg-primary/5 shadow-[0_0_0_1px_hsl(var(--primary)/0.15)]"
                      : "border-border/60 bg-card/70 hover:border-primary/30"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted/50 text-lg">
                      {controllable.emoji}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium text-foreground">
                          {controllable.label}
                        </p>
                        {isSelected ? (
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                        ) : null}
                      </div>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">
                        {NEED_COPY[controllable.type]}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}
