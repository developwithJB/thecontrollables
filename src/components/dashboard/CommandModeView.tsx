import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { DailyRings } from "./DailyRings";
import { WeeklyRecapCard } from "./WeeklyRecapCard";
import { TomorrowForecastCard } from "./TomorrowForecastCard";
import { AskDashboardBar } from "./AskDashboardBar";
import { AIRecommendedActions } from "./AIRecommendedActions";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { CalendarDays, Brain, Camera } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { InstagramInputCard } from "./InstagramInputCard";
import { IGProofHistory } from "./IGProofHistory";
import { useDashboardIntelligence } from "@/hooks/useDashboardIntelligence";
import { useDailyRings } from "@/hooks/useDailyRings";
import { useIntegrationConnections } from "@/hooks/useIntegrations";

interface CommandModeViewProps {
  userId?: string;
  hasActiveSession: boolean;
  todayResetCompleted: boolean;
  todayTimeLogged: boolean;
  todayPromiseMade: boolean;
  pendingPromisesCount: number;
  hasActiveQuest: boolean;
  wellnessLoggedToday: boolean;
  pendingPromises?: Array<{ id: string; promise_text: string; promised_at: string }>;
  onLogTime?: (data: { invested: number; wasted: number; notes?: string }) => Promise<any>;
  onLogWellness?: (sleep: number, movement: number, nutrition: number, notes?: string) => Promise<boolean>;
  onResolvePromise?: (data: { promiseId: string; kept: boolean }) => void;
  onNavigateReset?: () => void;
  onOpenReset: () => void;
  onOpenTimeLog: () => void;
  onOpenPromises: () => void;
  onOpenAIGuide: () => void;
  onOpenWellness: () => void;
  onOpenMealPlan: () => void;
  onOpenPlanner: () => void;
  onOpenMoney: () => void;
  onOpenBuild: () => void;
  onSwitchToControl: () => void;
}

export const CommandModeView = ({
  userId,
  hasActiveSession,
  todayResetCompleted,
  pendingPromises = [],
  onLogTime,
  onLogWellness,
  onResolvePromise,
  onNavigateReset,
  onOpenReset,
  onOpenPlanner,
  onOpenBuild,
}: CommandModeViewProps) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [showIGProof, setShowIGProof] = useState(false);
  const { rings, completedCount } = useDailyRings(userId);
  const intelligence = useDashboardIntelligence(userId, completedCount, rings);
  const { data: connections } = useIntegrationConnections();

  const hasInstagram = (connections || []).some(
    (c) => c.provider === "instagram" && c.status === "active"
  );

  // Screen time logging handler
  const handleScreenTimeSave = useCallback(async (hours: number, category: string) => {
    if (!userId) return;
    try {
      await supabase.from("health_sync_data").insert({
        user_id: userId,
        sync_date: new Date().toLocaleDateString("sv-SE"),
        source: "screentime",
        raw_data: { hours, category },
        active_minutes: Math.round(hours * 60),
      });
      toast({ title: "Screen time logged", description: `${hours}h of ${category} recorded.` });
    } catch {
      toast({ title: "Error", description: "Could not save screen time.", variant: "destructive" });
    }
  }, [userId, toast]);

  // Reset nudge (shown if they haven't done their daily reset)
  const showResetNudge = hasActiveSession && !todayResetCompleted;

  return (
    <div className="flex flex-col min-h-[60vh] justify-center">
      {/* Reset nudge — only thing outside the rings */}
      {showResetNudge && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-3 rounded-xl border border-border bg-card text-center"
        >
          <p className="text-xs text-muted-foreground mb-2">🧱 Complete today's Reset first</p>
          <Button size="sm" onClick={onNavigateReset || onOpenReset} className="gap-1.5">
            Start Reset
          </Button>
        </motion.div>
      )}

      {/* Daily Rings — the ENTIRE daily flow */}
      <DailyRings userId={userId} />

      {/* Persistent quick-access row: Planner + IG Proof */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mt-5 max-w-sm mx-auto w-full flex justify-center gap-2"
      >
        <Button
          variant="outline"
          size="sm"
          onClick={onOpenPlanner}
          className="gap-1.5 text-xs border-primary/30 hover:bg-primary/10"
        >
          <CalendarDays className="w-3.5 h-3.5 text-primary" />
          Plan Your Day
        </Button>
        {hasInstagram && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowIGProof(!showIGProof)}
            className="gap-1.5 text-xs border-accent/30 hover:bg-accent/10"
          >
            <Camera className="w-3.5 h-3.5 text-accent-foreground" />
            IG Proof
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={onOpenBuild}
          className="gap-1.5 text-xs"
        >
          <Brain className="w-3.5 h-3.5" />
          Build
        </Button>
      </motion.div>

      {/* Ask Dashboard Bar */}
      <div className="mt-4 max-w-sm mx-auto w-full">
        <AskDashboardBar />
      </div>

      {/* Tomorrow Forecast */}
      {completedCount >= 3 && (
        <div className="mt-3 max-w-sm mx-auto w-full">
          <TomorrowForecastCard data={intelligence.data} />
        </div>
      )}

      {/* Weekly Review Card */}
      <div className="mt-4 max-w-sm mx-auto w-full">
        <WeeklyRecapCard userId={userId} />
      </div>

      {/* IG Proof card + history */}
      <AnimatePresence>
        {showIGProof && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="max-w-sm mx-auto w-full overflow-hidden space-y-3"
          >
            <InstagramInputCard userId={userId} onClose={() => setShowIGProof(false)} />
            <IGProofHistory userId={userId} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Recommended Actions */}
      <div className="mt-6 max-w-sm mx-auto w-full">
        <AIRecommendedActions data={intelligence.data} />
      </div>
    </div>
  );
};
