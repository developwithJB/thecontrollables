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
    <div className="space-y-6">
      <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10">
        <Shield className="h-5 w-5 text-primary" />
      </div>

      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Starter Team
        </p>
        <h1 className="font-display text-2xl font-semibold text-foreground">
          Your five Controllables
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          These are the five forces The Dashboard uses to help you move through real life more deliberately.
        </p>
      </div>

      <div className="space-y-3">
        {CONTROLLABLE_LIST.map((controllable) => {
          const isRecommended = controllable.type === recommendedControllable;

          return (
            <div
              key={controllable.type}
              className={`rounded-xl border px-4 py-4 transition-colors ${
                isRecommended
                  ? "border-primary/40 bg-primary/5"
                  : "border-border/60 bg-card"
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
                        Highlighted this season
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
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
