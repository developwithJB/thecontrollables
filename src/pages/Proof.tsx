import { Link } from "react-router-dom";
import { Award, BookOpen, Camera, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProofEntryCard } from "@/components/dashboard/ProofEntryCard";
import { ProofHistory } from "@/components/dashboard/IGProofHistory";
import { ControllableLevelsCard } from "@/components/dashboard/ControllableLevelsCard";
import { useBadges } from "@/hooks/useBadges";
import { useLifeOSUser } from "@/hooks/useLifeOSAuth";
import { usePageViewTracking } from "@/hooks/useAnalytics";
import { BADGES, getAllBadgeKeys } from "@/lib/badges";
import { cn } from "@/lib/utils";

export default function Proof() {
  usePageViewTracking("Proof");
  const user = useLifeOSUser();
  const { earnedBadges, isLoading } = useBadges(user.id);
  const earnedKeys = new Set(earnedBadges.map((badge) => badge.badge_key));
  const allBadgeKeys = getAllBadgeKeys();

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-24">
      <section className="rounded-2xl border border-border/60 bg-card px-5 py-6 shadow-sm md:px-7">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="max-w-2xl space-y-3">
            <Badge variant="secondary" className="w-fit text-[11px] uppercase tracking-[0.16em]">
              Dashboard = Proof
            </Badge>
            <div className="space-y-2">
              <h1 className="font-display text-2xl font-semibold text-foreground md:text-3xl">
                Confidence Comes From Kept Promises.
              </h1>
              <p className="text-sm leading-relaxed text-muted-foreground md:text-base">
                Proof is where the reps become visible: kept promises, completed resets, earned badges, and the evidence that you returned when drift happened.
              </p>
            </div>
          </div>

          <Link to="/reset">
            <Button className="w-full md:w-auto">
              Begin the 7-Day Reset
              <BookOpen className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <section className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <Camera className="h-4 w-4 text-primary" />
              <div>
                <h2 className="text-sm font-semibold text-foreground">Daily Proof</h2>
                <p className="text-xs text-muted-foreground">
                  Log the honest move, not a performance.
                </p>
              </div>
            </div>
            <ProofEntryCard userId={user.id} />
          </div>

          <div className="rounded-2xl border border-border/60 bg-card px-4 py-4 shadow-sm">
            <ProofHistory userId={user.id} />
          </div>
        </section>

        <section className="space-y-4">
          <div className="rounded-2xl border border-border/60 bg-card px-4 py-4 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Award className="h-4 w-4 text-primary" />
                <div>
                  <h2 className="text-sm font-semibold text-foreground">Badges</h2>
                  <p className="text-xs text-muted-foreground">
                    Meaningful markers, not empty rewards.
                  </p>
                </div>
              </div>
              <Badge variant="outline" className="text-[11px]">
                {earnedBadges.length}/{allBadgeKeys.length}
              </Badge>
            </div>

            {isLoading ? (
              <div className="space-y-2">
                <div className="h-12 rounded-xl bg-muted/60 animate-pulse" />
                <div className="h-12 rounded-xl bg-muted/60 animate-pulse" />
                <div className="h-12 rounded-xl bg-muted/60 animate-pulse" />
              </div>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {allBadgeKeys.map((badgeKey) => {
                  const badge = BADGES[badgeKey];
                  const earned = earnedKeys.has(badgeKey);

                  return (
                    <div
                      key={badge.key}
                      className={cn(
                        "rounded-xl border px-3 py-3 transition-colors",
                        earned
                          ? "border-primary/20 bg-primary/5"
                          : "border-border/50 bg-background/60 opacity-70",
                      )}
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-xl" aria-hidden="true">
                          {badge.emoji}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-medium text-foreground">{badge.name}</p>
                            {earned ? <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> : null}
                          </div>
                          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                            {badge.meaning}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <ControllableLevelsCard userId={user.id} />
        </section>
      </div>
    </div>
  );
}
