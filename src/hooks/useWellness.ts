import { useState, useEffect, useCallback } from "react";
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

export function useWellness(userId: string | undefined) {
  const [todayLog, setTodayLog] = useState<WellnessLog | null>(null);
  const [recentLogs, setRecentLogs] = useState<WellnessLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchWellnessLogs = useCallback(async () => {
    if (!userId) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from("wellness_logs")
        .select("*")
        .eq("user_id", userId)
        .order("log_date", { ascending: false })
        .limit(7);

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

  const logWellness = async (
    sleep: number,
    movement: number,
    nutrition: number,
    notes?: string
  ): Promise<boolean> => {
    if (!userId) return false;

    try {
      const today = new Date().toISOString().split('T')[0];
      
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
      
      const avgRating = ((sleep + movement + nutrition) / 3).toFixed(1);
      toast({
        title: "Battery logged!",
        description: `Current charge: ${avgRating}/5`,
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
    refetch: fetchWellnessLogs,
  };
}
