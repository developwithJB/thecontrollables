import { useCallback, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { useLifeOSUser } from "@/hooks/useLifeOSAuth";
import { useWellness } from "@/hooks/useWellness";
import { useEntitlements } from "@/hooks/useEntitlements";
import { usePageViewTracking } from "@/hooks/useAnalytics";
import { useQueryClient } from "@tanstack/react-query";
import { getDefaultCheckoutPlan } from "@/lib/featureFlags";
import { useToast } from "@/hooks/use-toast";

import { BrainBodyTracker } from "@/components/dashboard/BrainBodyTracker";
import { WellnessGoalsCard } from "@/components/dashboard/WellnessGoalsCard";
import { WearableSummaryCard } from "@/components/wellness/WearableSummaryCard";
import { WearableTrendsCard } from "@/components/wellness/WearableTrendsCard";
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
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();

  // Handle wearable OAuth callback params
  useEffect(() => {
    const connected = searchParams.get("wearable_connected");
    const error = searchParams.get("wearable_error");
    if (connected) {
      toast({ title: `${connected.charAt(0).toUpperCase() + connected.slice(1)} connected!`, description: "Your wearable data will sync shortly." });
      queryClient.invalidateQueries({ queryKey: ["wearable-connections"] });
      queryClient.invalidateQueries({ queryKey: ["health-sync-today"] });
      queryClient.invalidateQueries({ queryKey: ["health-data-trend"] });
      queryClient.invalidateQueries({ queryKey: ["brain-body"] });
      queryClient.invalidateQueries({ queryKey: ["wellness-goals"] });
      // Auto-trigger initial sync so goals populate immediately
      supabase.functions.invoke("wearable-sync", { body: { provider: connected } }).then(() => {
        queryClient.invalidateQueries({ queryKey: ["health-sync-today"] });
        queryClient.invalidateQueries({ queryKey: ["health-data-trend"] });
        queryClient.invalidateQueries({ queryKey: ["wellness-goals"] });
      });
      const next = new URLSearchParams(searchParams);
      next.delete("wearable_connected");
      setSearchParams(next, { replace: true });
    } else if (error) {
      toast({ title: "Connection failed", description: `Wearable connection error: ${error.replace(/_/g, " ")}`, variant: "destructive" });
      const next = new URLSearchParams(searchParams);
      next.delete("wearable_error");
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams, toast, queryClient]);

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

      {/* Wearable Integration */}
      <WearableSummaryCard userId={user.id} isPaid={isPaid} onUpgrade={() => startCheckout("wearable_summary")} />
      <WearableTrendsCard userId={user.id} isPaid={isPaid} onUpgrade={() => startCheckout("wearable_trends")} />

      {/* Brain & Body Tracker */}
      <BrainBodyTracker
        userId={user.id}
        streak={wellnessStreak}
        onLogWellness={() => {}}
        onQuickLog={handleQuickLog}
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
