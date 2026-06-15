import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, RotateCcw, ShieldCheck, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useMyControllablesProfile } from "@/hooks/useMyControllablesProfile";
import { getBookControllable } from "@/lib/bookWorld";

interface MyControllablesDailyTrainingCardProps {
  userId: string | null;
}

export function MyControllablesDailyTrainingCard({ userId }: MyControllablesDailyTrainingCardProps) {
  const { toast } = useToast();
  const { profile, stats, dailyPlan, logDailyTraining } = useMyControllablesProfile(userId);
  const guide = getBookControllable(dailyPlan.controllable);
  const [promise, setPromise] = useState(dailyPlan.promise);

  useEffect(() => {
    if (!promise.trim()) setPromise(dailyPlan.promise);
  }, [dailyPlan.promise, promise]);

  if (!profile.assessment) {
    return (
      <section className="rounded-2xl border border-border/60 bg-card px-4 py-4 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <UserRound className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <div>
              <Badge variant="secondary" className="text-[10px] uppercase tracking-[0.16em]">
                My Controllables
              </Badge>
              <h2 className="mt-2 text-base font-semibold text-foreground">
                Start your 60-second read.
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                Create your private profile, find your current training focus, and unlock the first proof card.
              </p>
            </div>
            <Link to="/my-controllables">
              <Button size="sm" className="w-full gap-2">
                Open My Controllables
                <UserRound className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    );
  }

  const handleLog = (kind: "kept_promise" | "recovery_win") => {
    const finalPromise = promise.trim() || dailyPlan.promise;
    const entry = logDailyTraining({
      controllable: dailyPlan.controllable,
      promise: finalPromise,
      kind,
    });

    toast({
      title: kind === "recovery_win" ? "Recovery win logged" : "Kept promise logged",
      description: `+${entry.xp} Self-Trust through ${guide.name}.`,
    });
  };

  return (
    <section className="rounded-2xl border border-border/60 bg-card px-4 py-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <Badge variant="secondary" className="text-[10px] uppercase tracking-[0.16em]">
            Daily Training
          </Badge>
          <h2 className="text-base font-semibold text-foreground">Train {guide.name} today.</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">{guide.coreQuestion}</p>
        </div>
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${guide.classes.bgClass}`}>
          <span className="text-xl" aria-hidden="true">
            {guide.emoji}
          </span>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-border/50 bg-background/60 px-3 py-3">
        <div className="mb-2 flex items-center justify-between gap-3">
          <p className="text-xs font-medium text-muted-foreground">Self-Trust Level {stats.level}</p>
          <p className="text-xs font-medium text-muted-foreground">{stats.levelProgress}/100 XP</p>
        </div>
        <Progress value={stats.levelProgress} className="h-2 bg-muted/60" />
      </div>

      <div className="mt-3 space-y-3">
        <Textarea
          value={promise}
          onChange={(event) => setPromise(event.target.value.slice(0, 160))}
          className="min-h-[72px] resize-none text-sm"
          placeholder="One promise I can keep today..."
          maxLength={160}
          disabled={Boolean(stats.todayEntry)}
        />

        {stats.todayEntry ? (
          <div className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <p className="text-sm font-medium text-foreground">
                Today's proof is logged.
              </p>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {stats.todayEntry.promise}
            </p>
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            <Button onClick={() => handleLog("kept_promise")} size="sm" className="gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Log kept promise
            </Button>
            <Button
              onClick={() => handleLog("recovery_win")}
              size="sm"
              variant="outline"
              className="gap-2"
              disabled={!stats.recoveryAvailable}
            >
              <RotateCcw className="h-4 w-4" />
              Recovery win
            </Button>
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 border-t border-border/50 pt-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5" />
          Private by default
        </div>
        <Link to="/my-controllables" className="text-xs font-medium text-primary hover:underline">
          Profile and proof
        </Link>
      </div>
    </section>
  );
}
