import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useMemo } from "react";
import { withTimeout } from "@/lib/withTimeout";

// Timeout for mutations (10 seconds)
const MUTATION_TIMEOUT_MS = 10000;

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
  todayPromiseMade: boolean; // NEW: timezone-aware flag from server
  consecutiveStreak: number; // NEW: actual consecutive days checked in
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

// Helper to get browser's timezone
const getBrowserTimezone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "UTC";
  }
};

export const useDashboardSummary = (userId: string | null = null) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all dashboard data in a single optimized request with timeout
  const { data: summary, isLoading: isLoadingSummary, error } = useQuery({
    queryKey: ["dashboard-summary", userId],
    queryFn: async (): Promise<DashboardSummary> => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      // Pass client's local date and timezone to ensure timezone consistency
      const localDate = getLocalDateString();
      const timezone = getBrowserTimezone();

      // Wrap the edge function call with a timeout
      const response = await withTimeout(
        supabase.functions.invoke("dashboard-summary", {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          body: { localDate, timezone },
        }),
        15000, // 15 second timeout for initial data fetch
        "Dashboard data request timed out. Please check your connection."
      );

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
  const todayPromiseMade = summary?.todayPromiseMade ?? false;
  const consecutiveStreak = summary?.consecutiveStreak ?? 0;
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
        description: "Quest completed",
      });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      toast({
        title: "Quest completed!",
        description: "+500 XP earned. Choose your next adventure.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to complete mission",
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

  // Create promise with timeout protection
  const createPromiseMutation = useMutation({
    mutationFn: async ({ promiseText, dueDate }: { promiseText: string; dueDate?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) throw new Error("Not authenticated");

      // Create a proper promise from the Supabase query
      const queryPromise = new Promise<{ data: any; error: any }>(async (resolve) => {
        const result = await supabase
          .from("integrity_logs")
          .insert({
            user_id: user.id,
            promise_text: promiseText,
            due_date: dueDate,
          })
          .select()
          .single();
        resolve(result);
      });

      const { data, error } = await withTimeout(queryPromise, MUTATION_TIMEOUT_MS);

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
    onError: (error) => {
      toast({
        title: "Couldn't save promise",
        description: error.message.includes("timed out") 
          ? "Connection slow. Please try again." 
          : "Please try again.",
        variant: "destructive",
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

  // Log time reflection with timeout protection
  const logTimeMutation = useMutation({
    mutationFn: async ({ invested, wasted, notes }: { invested: number; wasted: number; notes?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) throw new Error("Not authenticated");

      // Use current local date for accurate logging
      const today = getLocalDateString();
      console.log("Logging time for date:", today, { invested, wasted });

      // Create a proper promise from the Supabase query
      const queryPromise = new Promise<{ data: any; error: any }>(async (resolve) => {
        const result = await supabase
          .from("time_logs")
          .upsert({
            user_id: user.id,
            log_date: today,
            time_invested_minutes: invested,
            time_wasted_minutes: wasted,
            notes,
          }, {
            onConflict: "user_id,log_date",
          })
          .select()
          .single();
        resolve(result);
      });

      const { data, error } = await withTimeout(queryPromise, MUTATION_TIMEOUT_MS);

      if (error) {
        console.error("Time log error:", error);
        throw error;
      }

      console.log("Time log saved:", data);

      // Award XP for logging time (only for first log of the day)
      try {
        await awardXpMutation.mutateAsync({
          amount: XP_VALUES.TIME_LOG,
          source: "time_log",
          description: "Daily reflection",
        });
      } catch (xpError) {
        console.log("XP award skipped (may already be awarded):", xpError);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      toast({
        title: "Reflection saved",
        description: "Awareness is power.",
      });
    },
    onError: (error) => {
      console.error("Time log mutation error:", error);
      toast({
        title: "Couldn't save reflection",
        description: error.message.includes("timed out") 
          ? "Connection slow. Please try again." 
          : "Please try again.",
        variant: "destructive",
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
    isLoading: isLoadingSummary,
    isAuthReady: !!userId,
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
    todayPromiseMade, // NEW: timezone-aware flag from server
    consecutiveStreak, // NEW: actual consecutive days checked in
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
