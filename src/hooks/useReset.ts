import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ResetSession {
  id: string;
  user_id: string;
  start_date: string;
  current_day: number;
  status: "active" | "completed" | "paused";
  invite_code: string | null;
  created_at: string;
}

interface DailyReset {
  id: string;
  session_id: string;
  user_id: string;
  day_number: number;
  reflection: string | null;
  commitment: string | null;
  release: string | null;
  completed_at: string;
  created_at: string;
}

export const useReset = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
      setIsAuthLoading(false);
    };
    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUserId(session?.user?.id || null);
      setIsAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Get active reset session
  const { data: activeSession, isLoading: isLoadingSession } = useQuery({
    queryKey: ["reset-session", userId],
    queryFn: async () => {
      if (!userId) return null;
      
      const { data, error } = await supabase
        .from("reset_sessions")
        .select("*")
        .eq("user_id", userId)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as ResetSession | null;
    },
    enabled: !!userId,
  });

  // Get completed days for current session
  const { data: completedDays = [], isLoading: isLoadingDays } = useQuery({
    queryKey: ["daily-resets", activeSession?.id],
    queryFn: async () => {
      if (!activeSession?.id) return [];

      const { data, error } = await supabase
        .from("daily_resets")
        .select("*")
        .eq("session_id", activeSession.id)
        .order("day_number", { ascending: true });

      if (error) throw error;
      return data as DailyReset[];
    },
    enabled: !!activeSession?.id,
  });

  // Calculate current day based on completed days
  const currentDay = completedDays.length + 1;
  const isCompleted = completedDays.length >= 7;

  // Start a new reset session
  const startResetMutation = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("reset_sessions")
        .insert({
          user_id: userId,
          start_date: new Date().toISOString().split("T")[0],
          current_day: 1,
          status: "active",
        })
        .select()
        .single();

      if (error) throw error;
      return data as ResetSession;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reset-session"] });
      toast({
        title: "Your 7-Day Reset has begun",
        description: "Day 1 awaits you.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error starting reset",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Complete a day
  const completeDayMutation = useMutation({
    mutationFn: async ({
      reflection,
      commitment,
      release,
    }: {
      reflection?: string;
      commitment?: string;
      release?: string;
    }) => {
      if (!userId || !activeSession) throw new Error("No active session");

      const { data, error } = await supabase
        .from("daily_resets")
        .insert({
          session_id: activeSession.id,
          user_id: userId,
          day_number: currentDay,
          reflection,
          commitment,
          release,
        })
        .select()
        .single();

      if (error) throw error;

      // If this was day 7, mark session as completed
      if (currentDay >= 7) {
        await supabase
          .from("reset_sessions")
          .update({ status: "completed", current_day: 7 })
          .eq("id", activeSession.id);
      } else {
        // Update current day in session
        await supabase
          .from("reset_sessions")
          .update({ current_day: currentDay + 1 })
          .eq("id", activeSession.id);
      }

      return data as DailyReset;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reset-session"] });
      queryClient.invalidateQueries({ queryKey: ["daily-resets"] });
    },
    onError: (error) => {
      toast({
        title: "Error completing day",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    userId,
    activeSession,
    completedDays,
    currentDay: Math.min(currentDay, 7),
    isCompleted,
    isLoading: isAuthLoading || isLoadingSession || isLoadingDays,
    startReset: startResetMutation.mutate,
    isStarting: startResetMutation.isPending,
    completeDay: completeDayMutation.mutate,
    isCompleting: completeDayMutation.isPending,
  };
};
