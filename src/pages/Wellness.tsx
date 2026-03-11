import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronDown, ArrowRight } from "lucide-react";
import { useLifeOSUser } from "@/hooks/useLifeOSAuth";
import { useWellness } from "@/hooks/useWellness";
import { useEntitlements } from "@/hooks/useEntitlements";
import { usePageViewTracking } from "@/hooks/useAnalytics";
import { useQueryClient } from "@tanstack/react-query";
import { getDefaultCheckoutPlan } from "@/lib/featureFlags";
import { useToast } from "@/hooks/use-toast";
import { useHealthData } from "@/hooks/useHealthData";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

import { BrainBodyTracker } from "@/components/dashboard/BrainBodyTracker";
import { WellnessGoalsCard } from "@/components/dashboard/WellnessGoalsCard";
import { WearableSummaryCard } from "@/components/wellness/WearableSummaryCard";
import { WearableTrendsCard } from "@/components/wellness/WearableTrendsCard";
import { WellnessFuelSummary } from "@/components/nutrition/WellnessFuelSummary";
import { WellnessStreakHistory } from "@/components/experience/WellnessStreakHistory";
import { useReset } from "@/hooks/useReset";
import { isInActiveTrial } from "@/lib/entitlements";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function Wellness() {
  usePageViewTracking("Body");
  const user = useLifeOSUser();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const [historyOpen, setHistoryOpen] = useState(false);

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
  const { isConnected: wearableConnected } = useHealthData(user.id);
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
          <h1 className="font-display text-2xl font-semibold text-foreground">Body</h1>
        </div>
        <p className="text-muted-foreground text-sm">How your body is doing — recovery, sleep, strain, and trends.</p>
      </div>

      {/* 1. Wearable Integration (primary) */}
      <WearableSummaryCard userId={user.id} isPaid={isPaid} onUpgrade={() => startCheckout("wearable_summary")} />

      {/* 2. Wearable Trends */}
      <WearableTrendsCard userId={user.id} isPaid={isPaid} onUpgrade={() => startCheckout("wearable_trends")} />

      {/* 3. Manual Body Tracker (secondary fallback) */}
      {wearableConnected ? (
        <Collapsible>
          <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full py-2">
            <ChevronDown className="h-3.5 w-3.5" />
            Manual body tracking
          </CollapsibleTrigger>
          <CollapsibleContent>
            <BrainBodyTracker
              userId={user.id}
              streak={wellnessStreak}
              onLogWellness={() => {}}
              onQuickLog={handleQuickLog}
            />
          </CollapsibleContent>
        </Collapsible>
      ) : (
        <BrainBodyTracker
          userId={user.id}
          streak={wellnessStreak}
          onLogWellness={() => {}}
          onQuickLog={handleQuickLog}
        />
      )}

      {/* 4. Fuel Summary */}
      <WellnessFuelSummary userId={user.id} />

      {/* 5. Wellness Goals */}
      <WellnessGoalsCard userId={user.id} />

      {/* 6. Streak History (collapsible) */}
      {wellnessLogs.length > 0 && (
        <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
          <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full py-2">
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${historyOpen ? "rotate-180" : ""}`} />
            Wellness history
          </CollapsibleTrigger>
          <CollapsibleContent>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <WellnessStreakHistory recentLogs={wellnessLogs} streak={wellnessStreak} />
            </motion.div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Link back to Today */}
      <button
        onClick={() => navigate("/home")}
        className="flex items-center gap-1.5 text-xs text-accent hover:text-accent/80 transition-colors mx-auto"
      >
        See how your body data affects your day <ArrowRight className="h-3 w-3" />
      </button>

      {/* Footer */}
      <footer className="py-6 text-center">
        <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} AGB Coaching</p>
      </footer>
    </div>
  );
}
