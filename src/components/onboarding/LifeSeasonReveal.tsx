import { Sparkles } from "lucide-react";
import type { LifeSeasonMapping } from "@/lib/lifePerspective";

interface LifeSeasonRevealProps {
  season: LifeSeasonMapping;
}

export function LifeSeasonReveal({ season }: LifeSeasonRevealProps) {
  return (
    <div className="space-y-6">
      <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10">
        <Sparkles className="h-5 w-5 text-primary" />
      </div>

      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Season Of Life
        </p>
        <h1 className="font-display text-2xl font-semibold text-foreground">
          {season.label}
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {season.headline}
        </p>
      </div>

      <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-muted/20 px-5 py-5">
        <p className="text-sm leading-relaxed text-foreground">
          {season.description}
        </p>
        <div className="mt-4 rounded-xl bg-muted/40 px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Reflection
          </p>
          <p className="mt-1 text-sm leading-relaxed text-foreground">
            {season.reflection}
          </p>
        </div>
      </div>
    </div>
  );
}
