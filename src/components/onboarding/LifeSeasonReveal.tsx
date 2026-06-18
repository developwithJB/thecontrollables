import { Sparkles } from "lucide-react";
import type { LifeSeasonMapping } from "@/lib/lifePerspective";

interface LifeSeasonRevealProps {
  season: LifeSeasonMapping;
}

export function LifeSeasonReveal({ season }: LifeSeasonRevealProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
          <Sparkles className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
            Season
          </p>
          <h1 className="mt-1 font-display text-2xl font-semibold leading-tight text-foreground">
            {season.label}
          </h1>
          <p className="mt-1 text-sm leading-5 text-muted-foreground">
            {season.headline}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card/90 to-muted/20 px-4 py-4">
        <p className="text-sm leading-6 text-foreground">
          {season.description}
        </p>
        <div className="mt-3 rounded-xl border border-border/50 bg-background/45 px-3 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">
            Read
          </p>
          <p className="mt-1 text-sm leading-5 text-muted-foreground">
            {season.reflection}
          </p>
        </div>
      </div>
    </div>
  );
}
