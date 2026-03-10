import { useCallback } from "react";
import { motion } from "framer-motion";
import { useLifeOSUser } from "@/hooks/useLifeOSAuth";
import { useWellness } from "@/hooks/useWellness";
import { useEntitlements } from "@/hooks/useEntitlements";
import { usePageViewTracking } from "@/hooks/useAnalytics";
import { useQueryClient } from "@tanstack/react-query";
import { getDefaultCheckoutPlan } from "@/lib/featureFlags";

import { BrainBodyTracker } from "@/components/dashboard/BrainBodyTracker";
import { WellnessGoalsCard } from "@/components/dashboard/WellnessGoalsCard";
import { WhoopSummaryCard } from "@/components/wellness/WhoopSummaryCard";
import { WhoopTrendsCard } from "@/components/wellness/WhoopTrendsCard";
import { DailyOSCard } from "@/components/dashboard/DailyOSCard";
import { MealPlanCard } from "@/components/nutrition/MealPlanCard";
import { WellnessStreakHistory } from "@/components/experience/WellnessStreakHistory";
import { ControllablePoweredBy } from "@/components/layout/ControllablePoweredBy";
import { useReset } from "@/hooks/useReset";
import { isInActiveTrial } from "@/lib/entitlements";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function Wellness() {
  usePageViewTracking("Wellness");
  const user = useLifeOSUser();
  const queryClient = useQueryClient();

  const { isPaid, isLoading: entitlementsLoading, initiateCheckout } = useEntitlements(user.id);
  const { streak: wellnessStreak, logWellness, recentLogs: wellnessLogs } = useWellness(user.id);
  const { activeSession, isCompleted, isExpired } = useReset(user.id);

  const { data: allSessions = [] } = useQuery({
    queryKey: ["all-reset-sessions", user.id],
    queryFn: async () => {
      const { data } = await supabase.from("reset_sessions").select("id, status").eq("user_id", user.id);
      return data || [];
    },
    enabled: !!user.id,
    staleTime: 5 * 60 * 1000,
  });

  const isTrialing = isInActiveTrial(isPaid, !!activeSession, isCompleted, isExpired, allSessions.length);
  const defaultCheckoutPlan = getDefaultCheckoutPlan();

  const startCheckout = useCallback(
    (source = "wellness") => {
      void initiateCheckout(defaultCheckoutPlan, { source });
    },
    [initiateCheckout, defaultCheckoutPlan],
  );

  const handleQuickLog = useCallback(async (sleep: number, movement: number, nutrition: number) => {
    const success = await logWellness(sleep, movement, nutrition);
    if (success) queryClient.invalidateQueries({ queryKey: ["brain-body-wellness", user.id] });
    return success;
  }, [logWellness, queryClient, user.id]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-2xl">💪</span>
          <h1 className="font-display text-2xl font-semibold text-foreground">Wellness</h1>
        </div>
        <p className="text-muted-foreground text-sm">Your body operating panel.</p>
      </div>

      <ControllablePoweredBy controllables={["habit", "wellness"]} />

      {/* WHOOP Integration */}
      <WhoopSummaryCard userId={user.id} />
      <WhoopTrendsCard userId={user.id} />

      {/* Brain & Body Tracker */}
      <BrainBodyTracker
        userId={user.id}
        streak={wellnessStreak}
        onLogWellness={() => {}}
        onQuickLog={handleQuickLog}
        onImportHealth={() => {}}
      />

      {/* Wellness Goals */}
      <WellnessGoalsCard userId={user.id} />

      {/* Daily OS */}
      {!entitlementsLoading && (
        <DailyOSCard
          userId={user.id}
          isPaid={isPaid}
          isTrialing={isTrialing}
          hasActiveSnapshot={!!activeSession && !isCompleted && !isExpired}
          onUpgrade={() => startCheckout("daily_os")}
        />
      )}

      {/* Meal Planning */}
      {!entitlementsLoading && (
        <MealPlanCard
          userId={user.id}
          isPaid={isPaid}
          onUpgrade={() => startCheckout("meal_plan")}
        />
      )}

      {/* Wellness Streak History */}
      {wellnessLogs.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <WellnessStreakHistory recentLogs={wellnessLogs} streak={wellnessStreak} />
        </motion.div>
      )}

      {/* Footer */}
      <footer className="py-6 text-center">
        <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} AGB Coaching</p>
      </footer>
    </div>
  );
}
