import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface MainQuest {
  id: string;
  user_id: string;
  title: string;
  duration_days: number;
  started_at: string;
  ends_at: string | null;
  completed_at: string | null;
  status: "active" | "completed" | "abandoned" | "paused";
  created_at: string;
}

interface XpLog {
  id: string;
  user_id: string;
  amount: number;
  source: string;
  description: string | null;
  created_at: string;
}

interface IntegrityLog {
  id: string;
  user_id: string;
  promise_text: string;
  promised_at: string;
  due_date: string | null;
  kept: boolean | null;
  kept_at: string | null;
  created_at: string;
}

interface TimeLog {
  id: string;
  user_id: string;
  log_date: string;
  time_invested_minutes: number;
  time_wasted_minutes: number;
  notes: string | null;
  created_at: string;
}

interface UserBuild {
  id: string;
  user_id: string;
  awareness_base: number;
  perspective_base: number;
  habit_base: number;
  wellness_base: number;
  environment_base: number;
  sleep_modifier: number;
  movement_modifier: number;
  inputs_modifier: number;
  environment_modifier: number;
  created_at: string;
  updated_at: string;
}

// XP values for different actions
export const XP_VALUES = {
  DAILY_RESET: 50,
  QUEST_ACTION: 25,
  INTEGRITY_REP: 30,
  RECOVERY_BONUS: 75,
  QUEST_COMPLETE: 500,
  TIME_LOG: 10,
};

// Helper to get user's local date as YYYY-MM-DD
const getLocalDateString = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const useLifeDashboard = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    // Use cached session (instant) instead of getUser (network call)
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (isMounted) {
          setUserId(session?.user?.id || null);
          setIsAuthLoading(false);
        }
      } catch (error) {
        console.error("useLifeDashboard auth error:", error);
        if (isMounted) setIsAuthLoading(false);
      }
    };
    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted || event === "INITIAL_SESSION") return;
      setUserId(session?.user?.id || null);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Get active main quest
  const { data: activeQuest, isLoading: isLoadingQuest } = useQuery({
    queryKey: ["main-quest", userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from("main_quests")
        .select("*")
        .eq("user_id", userId)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as MainQuest | null;
    },
    enabled: !!userId,
  });

  // Get total XP
  const { data: xpLogs = [], isLoading: isLoadingXp } = useQuery({
    queryKey: ["xp-logs", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("xp_logs")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      return data as XpLog[];
    },
    enabled: !!userId,
  });

  // Get integrity logs (last 30 days)
  const { data: integrityLogs = [], isLoading: isLoadingIntegrity } = useQuery({
    queryKey: ["integrity-logs", userId],
    queryFn: async () => {
      if (!userId) return [];
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data, error } = await supabase
        .from("integrity_logs")
        .select("*")
        .eq("user_id", userId)
        .gte("promised_at", thirtyDaysAgo.toISOString())
        .order("promised_at", { ascending: false });

      if (error) throw error;
      return data as IntegrityLog[];
    },
    enabled: !!userId,
  });

  // Get today's time log
  const { data: todayTimeLog, isLoading: isLoadingTime } = useQuery({
    queryKey: ["time-log-today", userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from("time_logs")
        .select("*")
        .eq("user_id", userId)
        .eq("log_date", getLocalDateString())
        .maybeSingle();

      if (error) throw error;
      return data as TimeLog | null;
    },
    enabled: !!userId,
  });

  // Get user build
  const { data: userBuild, isLoading: isLoadingBuild } = useQuery({
    queryKey: ["user-build", userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from("user_builds")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) throw error;
      return data as UserBuild | null;
    },
    enabled: !!userId,
  });

  // Calculate total XP
  const totalXp = useMemo(() => {
    return xpLogs.reduce((sum, log) => sum + log.amount, 0);
  }, [xpLogs]);

  // Calculate integrity score (kept / total that are resolved)
  const integrityScore = useMemo(() => {
    const resolved = integrityLogs.filter((log) => log.kept !== null);
    if (resolved.length === 0) return null;
    const kept = resolved.filter((log) => log.kept === true).length;
    return Math.round((kept / resolved.length) * 100);
  }, [integrityLogs]);

  // Pending promises
  const pendingPromises = useMemo(() => {
    return integrityLogs.filter((log) => log.kept === null);
  }, [integrityLogs]);

  // Create main quest
  const createQuestMutation = useMutation({
    mutationFn: async ({ title, durationDays }: { title: string; durationDays: number }) => {
      if (!userId) throw new Error("Not authenticated");

      // First, pause any active quests
      await supabase
        .from("main_quests")
        .update({ status: "paused" })
        .eq("user_id", userId)
        .eq("status", "active");

      const endsAt = new Date();
      endsAt.setDate(endsAt.getDate() + durationDays);

      const { data, error } = await supabase
        .from("main_quests")
        .insert({
          user_id: userId,
          title,
          duration_days: durationDays,
          ends_at: endsAt.toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data as MainQuest;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["main-quest"] });
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
      if (!userId) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("main_quests")
        .update({ title })
        .eq("id", questId)
        .eq("user_id", userId)
        .select()
        .single();

      if (error) throw error;
      return data as MainQuest;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["main-quest"] });
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
      if (!userId) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("main_quests")
        .update({ 
          status: "completed",
          completed_at: new Date().toISOString()
        })
        .eq("id", questId)
        .eq("user_id", userId)
        .select()
        .single();

      if (error) throw error;
      return data as MainQuest;
    },
    onSuccess: async () => {
      // Award XP for completing quest
      await awardXpMutation.mutateAsync({
        amount: XP_VALUES.QUEST_COMPLETE,
        source: "quest_complete",
        description: "Completed main quest",
      });
      queryClient.invalidateQueries({ queryKey: ["main-quest"] });
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
      if (!userId) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("xp_logs")
        .insert({
          user_id: userId,
          amount,
          source,
          description,
        })
        .select()
        .single();

      if (error) throw error;
      return data as XpLog;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["xp-logs"] });
    },
  });

  // Create promise
  const createPromiseMutation = useMutation({
    mutationFn: async ({ promiseText, dueDate }: { promiseText: string; dueDate?: string }) => {
      if (!userId) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("integrity_logs")
        .insert({
          user_id: userId,
          promise_text: promiseText,
          due_date: dueDate,
        })
        .select()
        .single();

      if (error) throw error;
      return data as IntegrityLog;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integrity-logs"] });
      toast({
        title: "Promise made",
        description: "Keep your word.",
      });
    },
  });

  // Resolve promise
  const resolvePromiseMutation = useMutation({
    mutationFn: async ({ promiseId, kept }: { promiseId: string; kept: boolean }) => {
      if (!userId) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("integrity_logs")
        .update({
          kept,
          kept_at: new Date().toISOString(),
        })
        .eq("id", promiseId)
        .eq("user_id", userId)
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

      return data as IntegrityLog;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["integrity-logs"] });
      toast({
        title: variables.kept ? "Promise kept" : "Promise marked incomplete",
        description: variables.kept ? "Integrity builds momentum." : "Honesty matters more than perfection.",
      });
    },
  });

  // Log time
  const logTimeMutation = useMutation({
    mutationFn: async ({ invested, wasted, notes }: { invested: number; wasted: number; notes?: string }) => {
      if (!userId) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("time_logs")
        .upsert({
          user_id: userId,
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

      return data as TimeLog;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["time-log-today"] });
      toast({
        title: "Time logged",
        description: "Awareness is the first step.",
      });
    },
  });

  // Create or update user build
  const updateBuildMutation = useMutation({
    mutationFn: async (build: Partial<Omit<UserBuild, "id" | "user_id" | "created_at" | "updated_at">>) => {
      if (!userId) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("user_builds")
        .upsert({
          user_id: userId,
          ...build,
        }, {
          onConflict: "user_id",
        })
        .select()
        .single();

      if (error) throw error;
      return data as UserBuild;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-build"] });
      toast({
        title: "Build updated",
        description: "Any build is viable.",
      });
    },
  });

  return {
    userId,
    isLoading: isAuthLoading || isLoadingQuest || isLoadingXp || isLoadingIntegrity || isLoadingTime || isLoadingBuild,
    
    // Quest
    activeQuest,
    createQuest: createQuestMutation.mutate,
    isCreatingQuest: createQuestMutation.isPending,
    updateQuest: updateQuestMutation.mutate,
    isUpdatingQuest: updateQuestMutation.isPending,
    completeQuest: completeQuestMutation.mutate,
    isCompletingQuest: completeQuestMutation.isPending,
    
    // XP
    totalXp,
    xpLogs,
    awardXp: awardXpMutation.mutate,
    
    // Integrity
    integrityScore,
    integrityLogs,
    pendingPromises,
    createPromise: createPromiseMutation.mutate,
    resolvePromise: resolvePromiseMutation.mutate,
    
    // Time
    todayTimeLog,
    logTime: logTimeMutation.mutate,
    isLoggingTime: logTimeMutation.isPending,
    
    // Build
    userBuild,
    updateBuild: updateBuildMutation.mutate,
  };
};
