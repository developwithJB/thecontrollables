import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useMemo } from "react";

// XP values for different actions
export const XP_VALUES = {
  DAILY_RESET: 50,
  QUEST_ACTION: 25,
  INTEGRITY_REP: 30,
  RECOVERY_BONUS: 75,
  QUEST_COMPLETE: 500,
  TIME_LOG: 10,
};

interface DashboardSummary {
  activeQuest: {
    id: string;
    user_id: string;
    title: string;
    duration_days: number;
    started_at: string;
    ends_at: string | null;
    completed_at: string | null;
    status: "active" | "completed" | "abandoned" | "paused";
    created_at: string;
  } | null;
  totalXp: number;
  integrityScore: number | null;
  pendingPromises: Array<{
    id: string;
    promise_text: string;
    promised_at: string;
    due_date: string | null;
    kept: boolean | null;
    kept_at: string | null;
  }>;
  todayTimeLog: {
    id: string;
    user_id: string;
    log_date: string;
    time_invested_minutes: number;
    time_wasted_minutes: number;
    notes: string | null;
    created_at: string;
  } | null;
  userBuild: {
    id: string;
    user_id: string;
    awareness_base: number | null;
    perspective_base: number | null;
    habit_base: number | null;
    wellness_base: number | null;
    environment_base: number | null;
    sleep_modifier: number | null;
    movement_modifier: number | null;
    inputs_modifier: number | null;
    environment_modifier: number | null;
    created_at: string;
    updated_at: string;
  } | null;
  xpLogs: Array<{
    id: string;
    amount: number;
    source: string;
    description: string | null;
    created_at: string;
  }>;
  integrityLogs: Array<{
    id: string;
    promise_text: string;
    promised_at: string;
    due_date: string | null;
    kept: boolean | null;
    kept_at: string | null;
  }>;
}

// Helper to get user's local date as YYYY-MM-DD
const getLocalDateString = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const useDashboardSummary = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    
    const getUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (isMounted) {
          setUserId(user?.id || null);
          setIsAuthLoading(false);
        }
      } catch (error) {
        console.error("useDashboardSummary auth error:", error);
        if (isMounted) {
          setIsAuthLoading(false);
        }
      }
    };
    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      if (isMounted) {
        setUserId(session?.user?.id || null);
        setIsAuthLoading(false);
      }
    });

    // Safety timeout - never get stuck loading
    const timeout = setTimeout(() => {
      if (isMounted) {
        setIsAuthLoading(false);
      }
    }, 5000);

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  // Fetch all dashboard data in a single optimized request
  const { data: summary, isLoading: isLoadingSummary, error } = useQuery({
    queryKey: ["dashboard-summary", userId],
    queryFn: async (): Promise<DashboardSummary> => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await supabase.functions.invoke("dashboard-summary", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) throw response.error;
      return response.data as DashboardSummary;
    },
    enabled: !!userId,
    staleTime: 60 * 1000, // 1 minute
  });

  // Extract values from summary with defaults
  const activeQuest = summary?.activeQuest ?? null;
  const totalXp = summary?.totalXp ?? 0;
  const integrityScore = summary?.integrityScore ?? null;
  const pendingPromises = summary?.pendingPromises ?? [];
  const todayTimeLog = summary?.todayTimeLog ?? null;
  const userBuild = summary?.userBuild ?? null;
  const xpLogs = summary?.xpLogs ?? [];
  const integrityLogs = summary?.integrityLogs ?? [];

  // Create main quest
  const createQuestMutation = useMutation({
    mutationFn: async ({ title, durationDays }: { title: string; durationDays: number }) => {
      // Always get fresh user from session to avoid stale state race conditions
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) throw new Error("Not authenticated");

      // First, pause any active quests
      await supabase
        .from("main_quests")
        .update({ status: "paused" })
        .eq("user_id", user.id)
        .eq("status", "active");

      const endsAt = new Date();
      endsAt.setDate(endsAt.getDate() + durationDays);

      const { data, error } = await supabase
        .from("main_quests")
        .insert({
          user_id: user.id,
          title,
          duration_days: durationDays,
          ends_at: endsAt.toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      toast({
        title: "Quest activated",
        description: "Your journey begins now.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to create quest",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update quest title
  const updateQuestMutation = useMutation({
    mutationFn: async ({ questId, title }: { questId: string; title: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("main_quests")
        .update({ title })
        .eq("id", questId)
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      toast({
        title: "Quest updated",
        description: "Direction refined.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to update quest",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Complete quest
  const completeQuestMutation = useMutation({
    mutationFn: async (questId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("main_quests")
        .update({ 
          status: "completed",
          completed_at: new Date().toISOString()
        })
        .eq("id", questId)
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: async () => {
      // Award XP for completing quest
      await awardXpMutation.mutateAsync({
        amount: XP_VALUES.QUEST_COMPLETE,
        source: "quest_complete",
        description: "Completed main quest",
      });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      toast({
        title: "Quest completed!",
        description: "+500 XP earned. Choose your next adventure.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to complete quest",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Award XP
  const awardXpMutation = useMutation({
    mutationFn: async ({ amount, source, description }: { amount: number; source: string; description?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("xp_logs")
        .insert({
          user_id: user.id,
          amount,
          source,
          description,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
    },
  });

  // Create promise
  const createPromiseMutation = useMutation({
    mutationFn: async ({ promiseText, dueDate }: { promiseText: string; dueDate?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("integrity_logs")
        .insert({
          user_id: user.id,
          promise_text: promiseText,
          due_date: dueDate,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      toast({
        title: "Promise made",
        description: "Keep your word.",
      });
    },
  });

  // Resolve promise
  const resolvePromiseMutation = useMutation({
    mutationFn: async ({ promiseId, kept }: { promiseId: string; kept: boolean }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("integrity_logs")
        .update({
          kept,
          kept_at: new Date().toISOString(),
        })
        .eq("id", promiseId)
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) throw error;

      // Award XP for kept promise
      if (kept) {
        await awardXpMutation.mutateAsync({
          amount: XP_VALUES.INTEGRITY_REP,
          source: "integrity_rep",
          description: "Kept a promise",
        });
      }

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      toast({
        title: variables.kept ? "Promise kept" : "Promise marked incomplete",
        description: variables.kept ? "Integrity builds momentum." : "Honesty matters more than perfection.",
      });
    },
  });

  // Log time
  const logTimeMutation = useMutation({
    mutationFn: async ({ invested, wasted, notes }: { invested: number; wasted: number; notes?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("time_logs")
        .upsert({
          user_id: user.id,
          log_date: getLocalDateString(),
          time_invested_minutes: invested,
          time_wasted_minutes: wasted,
          notes,
        }, {
          onConflict: "user_id,log_date",
        })
        .select()
        .single();

      if (error) throw error;

      // Award XP for logging time
      await awardXpMutation.mutateAsync({
        amount: XP_VALUES.TIME_LOG,
        source: "time_log",
        description: "Daily time awareness",
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      toast({
        title: "Time logged",
        description: "Awareness is the first step.",
      });
    },
  });

  // Create or update user build
  const updateBuildMutation = useMutation({
    mutationFn: async (build: Partial<Omit<NonNullable<DashboardSummary["userBuild"]>, "id" | "user_id" | "created_at" | "updated_at">>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("user_builds")
        .upsert({
          user_id: user.id,
          ...build,
        }, {
          onConflict: "user_id",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      toast({
        title: "Build updated",
        description: "Your stats have been saved.",
      });
    },
  });

  return {
    userId,
    isLoading: isAuthLoading || isLoadingSummary,
    error,
    
    // Quest
    activeQuest,
    createQuest: createQuestMutation.mutateAsync,
    updateQuest: updateQuestMutation.mutateAsync,
    completeQuest: completeQuestMutation.mutateAsync,
    isCreatingQuest: createQuestMutation.isPending,
    isUpdatingQuest: updateQuestMutation.isPending,
    isCompletingQuest: completeQuestMutation.isPending,
    
    // XP
    totalXp,
    xpLogs,
    awardXp: awardXpMutation.mutateAsync,
    
    // Integrity
    integrityScore,
    integrityLogs,
    pendingPromises,
    createPromise: createPromiseMutation.mutateAsync,
    resolvePromise: resolvePromiseMutation.mutateAsync,
    
    // Time
    todayTimeLog,
    logTime: logTimeMutation.mutateAsync,
    isLoggingTime: logTimeMutation.isPending,
    
    // Build
    userBuild,
    updateBuild: updateBuildMutation.mutateAsync,
  };
};
