import { Shield } from "lucide-react";
import { CONTROLLABLE_LIST } from "@/lib/controllableTheme";
import type { Controllable } from "@/lib/snapshots";

const CONTROLLABLE_DESCRIPTIONS: Record<Controllable, string> = {
  awareness: "Helps you notice what is true before you react.",
  perspective: "Helps you zoom out and choose the wiser frame.",
  habit: "Helps you turn intention into repeatable follow-through.",
  wellness: "Helps you read your energy and protect your baseline.",
  environment: "Helps you shape your surroundings so the right move is easier.",
};

interface StarterTeamRevealProps {
  recommendedControllable: Controllable;
}

export function StarterTeamReveal({
  recommendedControllable,
}: StarterTeamRevealProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
          <Shield className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
            Starter Team
          </p>
          <h1 className="mt-1 font-display text-2xl font-semibold leading-tight text-foreground">
            Your five Controllables
          </h1>
        </div>
      </div>

      <div className="grid gap-2">
        {CONTROLLABLE_LIST.map((controllable) => {
          const isRecommended = controllable.type === recommendedControllable;

          return (
            <div
              key={controllable.type}
              className={`rounded-xl border px-3 py-3 transition-colors ${
                isRecommended
                  ? "border-primary/40 bg-primary/5"
                  : "border-border/60 bg-card/80"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted/50 text-lg">
                  {controllable.emoji}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-foreground">
                      {controllable.label}
                    </p>
                    {isRecommended ? (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                        Starter
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
                    {CONTROLLABLE_DESCRIPTIONS[controllable.type]}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
