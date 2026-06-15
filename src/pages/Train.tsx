import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useLifeOSUser } from "@/hooks/useLifeOSAuth";
import { usePageViewTracking } from "@/hooks/useAnalytics";
import { useControllableLevels } from "@/hooks/useControllableLevels";
import { BOOK_CONTROLLABLES, SEVEN_DAY_CONTROLLABLES_RESET } from "@/lib/bookWorld";
import { cn } from "@/lib/utils";

export default function Train() {
  usePageViewTracking("Train");
  const user = useLifeOSUser();
  const { data: levels = [], isLoading } = useControllableLevels(user.id);

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-24">
      <section className="rounded-2xl border border-border/60 bg-card px-5 py-6 shadow-sm md:px-7">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="max-w-2xl space-y-3">
            <Badge variant="secondary" className="w-fit text-[11px] uppercase tracking-[0.16em]">
              Chapter 2
            </Badge>
            <div className="space-y-2">
              <h1 className="font-display text-2xl font-semibold text-foreground md:text-3xl">
                You&apos;ve met the 5 Controllables. Now it&apos;s time to train them.
              </h1>
              <p className="text-sm leading-relaxed text-muted-foreground md:text-base">
                The book gave you the language. This is where you get the reps: Awareness, Perspective, Habit, Wellness, and Environment practiced until they become identity.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-primary/15 bg-primary/5 px-4 py-3 md:w-72">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
              Product Thesis
            </p>
            <p className="mt-2 text-sm leading-relaxed text-foreground">
              Book = belief. App = practice. Dashboard = proof.
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              5 Controllables
            </p>
            <h2 className="font-display text-xl font-semibold text-foreground">
              Trainable guides
            </h2>
          </div>
          <Badge variant="outline" className="text-[11px]">
            Self-Trust over productivity
          </Badge>
        </div>

        <div className="grid gap-4 lg:grid-cols-5">
          {BOOK_CONTROLLABLES.map((controllable, index) => {
            const level = levels.find((item) => item.type === controllable.id);
            const progress = Math.max(0, Math.min((level?.progress ?? 0) * 100, 100));
            const totalXp = level?.totalXp ?? 0;

            return (
              <motion.article
                key={controllable.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
                className={cn(
                  "rounded-2xl border bg-card px-4 py-4 shadow-sm",
                  controllable.classes.borderClass,
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl" aria-hidden="true">
                        {controllable.emoji}
                      </span>
                      <h3 className={cn("font-display text-lg font-semibold", controllable.classes.textClass)}>
                        {controllable.name}
                      </h3>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {controllable.role}
                    </p>
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  <div className="rounded-xl bg-background/70 px-3 py-3">
                    <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                      Core Question
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-foreground">
                      {controllable.coreQuestion}
                    </p>
                  </div>

                  <div>
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="text-xs font-medium text-muted-foreground">
                        {isLoading ? "Loading level" : `Level ${level?.level ?? 1}`}
                      </p>
                      <p className="text-xs font-medium text-muted-foreground">
                        {totalXp} XP
                      </p>
                    </div>
                    <Progress value={progress} className="h-2 bg-muted/60" />
                  </div>

                  <div className="rounded-xl border border-border/50 bg-background/60 px-3 py-3">
                    <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                      Current State
                    </p>
                    <p className="mt-1 text-sm text-foreground">{controllable.currentState}</p>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {controllable.recommendedPractice}
                    </p>
                  </div>
                </div>
              </motion.article>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-border/60 bg-card px-5 py-5 shadow-sm md:px-7">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="max-w-2xl space-y-2">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Start Here
            </p>
            <h2 className="font-display text-xl font-semibold text-foreground">
              The 7-Day Controllables Reset
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              The best next step after the book is not downloading another tracker. It is a guided week of practice: one honest read, one release, one kept promise at a time.
            </p>
          </div>
          <Link to="/reset">
            <Button className="w-full md:w-auto">
              Begin the 7-Day Reset
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-7">
          {SEVEN_DAY_CONTROLLABLES_RESET.map((day) => (
            <div
              key={day.day}
              className="rounded-xl border border-border/50 bg-background/70 px-3 py-3"
            >
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                Day {day.day}
              </p>
              <p className="mt-2 text-sm font-semibold text-foreground">{day.focus}</p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{day.practice}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-primary/15 bg-primary/5 px-4 py-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <p className="text-sm font-medium text-foreground">
                Confidence Comes From Kept Promises.
              </p>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              XP should point back to integrity: finishing the Main Mission, recovering after drift, naming the truth, and protecting your energy.
            </p>
          </div>

          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-amber-600/80" />
              <p className="text-sm font-medium text-foreground">
                Ego is the recurring signal.
              </p>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              When pressure gets loud, the app answers with the right Controllable response: one calm practice, one honest move, one promise worth keeping.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

