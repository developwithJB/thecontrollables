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
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          What This Season Needs Most
        </p>
        <h1 className="font-display text-2xl font-semibold text-foreground">
          Where should we begin?
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          We’d start with <span className="text-foreground font-medium">{CONTROLLABLE_LIST.find((item) => item.type === season.recommendedControllable)?.label}</span>, but choose the one that feels truest right now.
        </p>
      </div>

      <div className="space-y-3">
        {CONTROLLABLE_LIST.map((controllable) => {
          const isSelected = controllable.type === selectedNeed;
          const isRecommended = controllable.type === season.recommendedControllable;

          return (
            <button
              key={controllable.type}
              type="button"
              onClick={() => onSelectNeed(controllable.type)}
              className={`w-full rounded-xl border px-4 py-4 text-left transition-all ${
                isSelected
                  ? "border-primary bg-primary/5 shadow-[0_0_0_1px_hsl(var(--primary)/0.15)]"
                  : "border-border/60 bg-card hover:border-primary/30"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted/50 text-xl">
                  {controllable.emoji}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground">
                      {controllable.label}
                    </p>
                    {isRecommended ? (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                        Suggested
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {NEED_COPY[controllable.type]}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
