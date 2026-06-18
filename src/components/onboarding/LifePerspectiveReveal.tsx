import { Clock, Compass, Sparkles } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import type { AgeBreakdown } from "@/lib/lifePerspective";
import { formatAgeInYearsMonthsDays } from "@/lib/lifePerspective";

interface LifePerspectiveRevealProps {
  age: AgeBreakdown;
  weeksLived: number;
  lifePercentage: number;
}

export function LifePerspectiveReveal({
  age,
  weeksLived,
  lifePercentage,
}: LifePerspectiveRevealProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
          <Compass className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
            Life Perspective
          </p>
          <h1 className="mt-1 font-display text-xl font-semibold leading-tight text-foreground">
            Locate yourself gently.
          </h1>
          <p className="mt-1 text-sm leading-5 text-muted-foreground">
            Not a countdown. Just context.
          </p>
        </div>
      </div>

      <div className="grid gap-2">
        <div className="rounded-xl border border-border/60 bg-card/80 px-4 py-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
            Age
          </p>
          <p className="mt-1 text-sm font-semibold leading-relaxed text-foreground">
            {formatAgeInYearsMonthsDays(age)}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-border/60 bg-card/80 px-4 py-3">
            <div className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 text-primary/70" />
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Weeks
              </p>
            </div>
            <p className="mt-1 font-display text-2xl font-semibold text-foreground">
              {weeksLived.toLocaleString()}
            </p>
          </div>

          <div className="rounded-xl border border-border/60 bg-card/80 px-4 py-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-primary/70" />
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Arc
              </p>
            </div>
            <p className="mt-1 font-display text-2xl font-semibold text-foreground">
              {lifePercentage}%
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-2 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>80-year reference</span>
          <span>{lifePercentage}%</span>
        </div>
        <Progress value={lifePercentage} className="h-2 bg-primary/10" />
      </div>
    </div>
  );
}
