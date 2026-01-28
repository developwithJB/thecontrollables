import { motion } from "framer-motion";
import { Award } from "lucide-react";
import { BADGES, type BadgeKey } from "@/lib/badges";
import type { UserBadge } from "@/hooks/useBadges";
import { CollapsibleCard } from "./CollapsibleCard";

interface BadgesEarnedProps {
  earnedBadges: UserBadge[];
  isLoading?: boolean;
}

export function BadgesEarned({ earnedBadges, isLoading }: BadgesEarnedProps) {
  if (isLoading) {
    return (
      <div className="rounded-2xl bg-card border p-6">
        <div className="animate-pulse">
          <div className="h-5 w-32 bg-muted rounded mb-4" />
          <div className="h-20 bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <CollapsibleCard
      icon={<Award className="w-4 h-4 text-muted-foreground" />}
      title="Badges Earned"
      headerBadge={
        earnedBadges.length > 0 ? (
          <span className="text-xs text-muted-foreground">
            {earnedBadges.length} earned
          </span>
        ) : null
      }
      defaultOpen={false}
      className="shadow-soft"
    >
      {/* Badges Grid */}
      <div className="p-4">
        {earnedBadges.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-sm text-muted-foreground italic">
              "Badges mark meaningful moments, not counts."
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Your first badge awaits.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {earnedBadges.map((userBadge, index) => {
              const badge = BADGES[userBadge.badge_key as BadgeKey];
              if (!badge) return null;

              const earnedDate = new Date(userBadge.earned_at);
              const formattedDate = earnedDate.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              });

              return (
                <motion.div
                  key={userBadge.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-start gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  {/* Badge Emoji */}
                  <div className="text-2xl shrink-0">{badge.emoji}</div>

                  {/* Badge Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-sm text-foreground">
                        {badge.name}
                      </h4>
                      <span className="text-[10px] text-muted-foreground">
                        {formattedDate}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground italic mt-0.5">
                      "{badge.meaning}"
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Subtle locked badges hint (optional) */}
      {earnedBadges.length > 0 && earnedBadges.length < 9 && (
        <div className="px-4 pb-4">
          <div className="flex items-center gap-2 opacity-40">
            {Object.values(BADGES)
              .filter((b) => !earnedBadges.some((ub) => ub.badge_key === b.key))
              .slice(0, 4)
              .map((badge) => (
                <div
                  key={badge.key}
                  className="w-6 h-6 rounded-full border border-dashed border-muted-foreground/30 flex items-center justify-center"
                >
                  <span className="text-xs opacity-30">{badge.emoji}</span>
                </div>
              ))}
            {earnedBadges.length < 4 && (
              <span className="text-[10px] text-muted-foreground">
                +{9 - earnedBadges.length} more to discover
              </span>
            )}
          </div>
        </div>
      )}
    </CollapsibleCard>
  );
}
