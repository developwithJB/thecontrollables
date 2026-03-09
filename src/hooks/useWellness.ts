import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface WellnessLog {
  id: string;
  user_id: string;
  log_date: string;
  sleep_rating: number | null;
  movement_rating: number | null;
  nutrition_rating: number | null;
  notes: string | null;
  created_at: string;
}

const STREAK_MILESTONES: Record<number, number> = {
  3: 25,
  7: 50,
  14: 100,
  30: 200,
};

// Milestones that trigger celebration animation
const CELEBRATION_MILESTONES = [7, 14, 30];

function calculateStreak(logs: WellnessLog[]): number {
  if (logs.length === 0) return 0;

  const dates = [...new Set(logs.map(l => l.log_date))].sort().reverse();
  const today = new Date().toISOString().split("T")[0];

  // Grace period: streak is valid if most recent log is today or yesterday
  const mostRecent = dates[0];
  const diffMs = new Date(today).getTime() - new Date(mostRecent).getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays > 1) return 0;

  let streak = 1;
  for (let i = 0; i < dates.length - 1; i++) {
    const curr = new Date(dates[i]).getTime();
    const prev = new Date(dates[i + 1]).getTime();
    if (curr - prev === 86400000) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

export function useWellness(userId: string | undefined) {
  const [todayLog, setTodayLog] = useState<WellnessLog | null>(null);
  const [recentLogs, setRecentLogs] = useState<WellnessLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hitMilestone, setHitMilestone] = useState<number | null>(null);
  const { toast } = useToast();

  // Auto-reset hitMilestone after 3 seconds
  useEffect(() => {
    if (hitMilestone !== null) {
      const timer = setTimeout(() => setHitMilestone(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [hitMilestone]);

  const fetchWellnessLogs = useCallback(async () => {
    if (!userId) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from("wellness_logs")
        .select("*")
        .eq("user_id", userId)
        .order("log_date", { ascending: false })
        .limit(60);

      if (error) throw error;

      setRecentLogs(data || []);
      
      const todayRecord = data?.find(l => l.log_date === today);
      setTodayLog(todayRecord || null);
    } catch (error) {
      console.error("Error fetching wellness logs:", error);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchWellnessLogs();
  }, [fetchWellnessLogs]);

  const streak = useMemo(() => calculateStreak(recentLogs), [recentLogs]);

  const logWellness = async (
    sleep: number,
    movement: number,
    nutrition: number,
    notes?: string
  ): Promise<boolean> => {
    if (!userId) return false;

    try {
      const today = new Date().toISOString().split('T')[0];
      
      const streakBefore = streak;

      const { data, error } = await supabase
        .from("wellness_logs")
        .upsert({
          user_id: userId,
          log_date: today,
          sleep_rating: sleep,
          movement_rating: movement,
          nutrition_rating: nutrition,
          notes: notes || null,
        }, {
          onConflict: "user_id,log_date"
        })
        .select()
        .single();

      if (error) throw error;

      setTodayLog(data);
      await fetchWellnessLogs();
      
      // Calculate new streak after refresh
      const newStreak = streakBefore + (todayLog ? 0 : 1);
      const milestoneXp = STREAK_MILESTONES[newStreak];

      if (milestoneXp) {
        await supabase.from("xp_logs").insert({
          user_id: userId,
          amount: milestoneXp,
          source: "wellness_streak",
          description: `🔥 ${newStreak}-day wellness streak bonus`,
        });
      }

      // Trigger celebration for big milestones (7, 14, 30)
      if (CELEBRATION_MILESTONES.includes(newStreak)) {
        setHitMilestone(newStreak);
      }

      const avgRating = ((sleep + movement + nutrition) / 3).toFixed(1);
      const streakText = newStreak > 1 ? ` 🔥 ${newStreak}-day streak!` : "";
      const xpText = milestoneXp ? ` +${milestoneXp} XP bonus` : "";

      toast({
        title: "Battery logged!",
        description: `Current charge: ${avgRating}/5${streakText}${xpText}`,
      });
      
      return true;
    } catch (error) {
      console.error("Error logging wellness:", error);
      toast({
        title: "Failed to log",
        description: "Please try again.",
        variant: "destructive",
      });
      return false;
    }
  };

  const getAverageCharge = (): number => {
    if (!todayLog) return 0;
    
    const ratings = [
      todayLog.sleep_rating,
      todayLog.movement_rating,
      todayLog.nutrition_rating,
    ].filter((r): r is number => r !== null);
    
    if (ratings.length === 0) return 0;
    return ratings.reduce((a, b) => a + b, 0) / ratings.length;
  };

  return {
    todayLog,
    recentLogs,
    isLoading,
    logWellness,
    getAverageCharge,
    streak,
    hitMilestone,
    clearMilestone: () => setHitMilestone(null),
    refetch: fetchWellnessLogs,
  };
}
