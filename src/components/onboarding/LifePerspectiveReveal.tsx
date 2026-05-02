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
    <div className="space-y-6">
      <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10">
        <Compass className="h-5 w-5 text-primary" />
      </div>

      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Life Perspective
        </p>
        <h1 className="font-display text-2xl font-semibold text-foreground">
          A gentler way to locate yourself
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Not a countdown. Just a clearer sense of where you are in the story.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border/60 bg-card px-4 py-4">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
            Age
          </p>
          <p className="mt-2 text-sm font-medium leading-relaxed text-foreground">
            {formatAgeInYearsMonthsDays(age)}
          </p>
        </div>

        <div className="rounded-xl border border-border/60 bg-card px-4 py-4">
          <div className="flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 text-primary/70" />
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Weeks Lived
            </p>
          </div>
          <p className="mt-2 text-2xl font-display font-semibold text-foreground">
            {weeksLived.toLocaleString()}
          </p>
        </div>

        <div className="rounded-xl border border-border/60 bg-card px-4 py-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-primary/70" />
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Reference Arc
            </p>
          </div>
          <p className="mt-2 text-2xl font-display font-semibold text-foreground">
            {lifePercentage}%
          </p>
        </div>
      </div>

      <div className="space-y-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-4">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>80-year reference life</span>
          <span>{lifePercentage}% into the arc</span>
        </div>
        <Progress value={lifePercentage} className="h-2 bg-primary/10" />
        <p className="text-sm leading-relaxed text-foreground">
          You’ve already lived a real number of ordinary weeks. That perspective can make the next one matter more.
        </p>
      </div>
    </div>
  );
}
