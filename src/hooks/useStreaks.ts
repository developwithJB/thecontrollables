import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface CheckIn {
  id: string;
  check_in_date: string;
  daily_focus: string | null;
  completed: boolean;
}

export function useStreaks(userId: string | undefined) {
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  const [todayCheckIn, setTodayCheckIn] = useState<CheckIn | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const calculateStreaks = useCallback((checkins: CheckIn[]) => {
    if (checkins.length === 0) {
      setCurrentStreak(0);
      setLongestStreak(0);
      return;
    }

    // Sort by date descending
    const sorted = [...checkins].sort(
      (a, b) => new Date(b.check_in_date).getTime() - new Date(a.check_in_date).getTime()
    );

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Calculate current streak
    let current = 0;
    let checkDate = today;
    
    // Check if today is checked in
    const todayStr = today.toISOString().split('T')[0];
    const hasTodayCheckIn = sorted.some(c => c.check_in_date === todayStr);
    
    if (!hasTodayCheckIn) {
      // If not checked in today, start from yesterday
      checkDate = yesterday;
    }

    for (const checkin of sorted) {
      const checkinDate = new Date(checkin.check_in_date);
      checkinDate.setHours(0, 0, 0, 0);
      
      const checkDateStr = checkDate.toISOString().split('T')[0];
      
      if (checkin.check_in_date === checkDateStr) {
        current++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else if (new Date(checkin.check_in_date) < checkDate) {
        break;
      }
    }

    setCurrentStreak(current);

    // Calculate longest streak
    let longest = 0;
    let tempStreak = 1;
    
    for (let i = 0; i < sorted.length - 1; i++) {
      const currentDate = new Date(sorted[i].check_in_date);
      const nextDate = new Date(sorted[i + 1].check_in_date);
      
      const diffDays = Math.floor(
        (currentDate.getTime() - nextDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      
      if (diffDays === 1) {
        tempStreak++;
      } else {
        longest = Math.max(longest, tempStreak);
        tempStreak = 1;
      }
    }
    longest = Math.max(longest, tempStreak, current);
    setLongestStreak(longest);
  }, []);

  const fetchCheckIns = useCallback(async () => {
    if (!userId) return;
    
    try {
      const { data, error } = await supabase
        .from("daily_checkins")
        .select("*")
        .eq("user_id", userId)
        .order("check_in_date", { ascending: false });

      if (error) throw error;

      setCheckIns(data || []);
      
      // Find today's check-in
      const today = new Date().toISOString().split('T')[0];
      const todayRecord = data?.find(c => c.check_in_date === today);
      setTodayCheckIn(todayRecord || null);
      
      calculateStreaks(data || []);
    } catch (error) {
      console.error("Error fetching check-ins:", error);
    } finally {
      setIsLoading(false);
    }
  }, [userId, calculateStreaks]);

  useEffect(() => {
    fetchCheckIns();
  }, [fetchCheckIns]);

  const checkIn = async (focus: string): Promise<boolean> => {
    if (!userId) return false;

    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from("daily_checkins")
        .upsert({
          user_id: userId,
          check_in_date: today,
          daily_focus: focus,
          completed: true,
        }, {
          onConflict: "user_id,check_in_date"
        })
        .select()
        .single();

      if (error) throw error;

      setTodayCheckIn(data);
      await fetchCheckIns();
      
      toast({
        title: "You're checked in!",
        description: "Go take action. Come back tomorrow.",
      });
      
      return true;
    } catch (error) {
      console.error("Error checking in:", error);
      toast({
        title: "Check-in failed",
        description: "Please try again.",
        variant: "destructive",
      });
      return false;
    }
  };

  return {
    checkIns,
    currentStreak,
    longestStreak,
    todayCheckIn,
    isLoading,
    checkIn,
    refetch: fetchCheckIns,
  };
}
