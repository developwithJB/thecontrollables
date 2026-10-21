import {resetDayNumber} from "@/lib/resetCalendar";
import {completeLegacyResetDay} from "@/lib/personalProgress";
import { privateCertificateUrl } from '@/lib/privateCertificates';
import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { canStartNewSnapshot } from "@/lib/entitlements";

interface ResetSession {
  id: string;
  user_id: string;
  start_date: string;
  current_day: number;
  status: "active" | "completed" | "expired" | "paused";
  invite_code: string | null;
  timezone: string | null;
  covenant_accepted: boolean;
  covenant_accepted_at: string | null;
  completed_at: string | null;
  created_at: string;
  journey_id: string | null;
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

// Helper to get user's local date as YYYY-MM-DD
const getLocalDateString = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// Helper to get IANA timezone
const getTimezone = (): string => {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
};

// Calculate log_date for a specific day number given start_date
const getLogDateForDay = (startDate: string, dayNumber: number): string => {
  const start = new Date(startDate + "T00:00:00");
  start.setDate(start.getDate() + (dayNumber - 1));
  const year = start.getFullYear();
  const month = String(start.getMonth() + 1).padStart(2, "0");
  const day = String(start.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// Calculate current day based on start_date and today's date
// Returns the actual elapsed day, even if > 7 (to detect expired sessions)
const calculateCurrentDay = (startDate:string,timezone?:string|null):number=>resetDayNumber(startDate,timezone);

// Check if session has expired (past day 7 without completing all 7 days)
const isSessionExpired = (startDate: string, completedDaysCount: number,timezone?:string|null): boolean => {
  const elapsedDay = calculateCurrentDay(startDate,timezone);
  return elapsedDay > 7 && completedDaysCount < 7;
};

export const useReset = (externalUserId?: string | null) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [internalUserId, setInternalUserId] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(externalUserId === undefined);
  const [displayName, setDisplayName] = useState<string>("");

  // Use external userId if provided, otherwise manage internally
  const userId = externalUserId !== undefined ? externalUserId : internalUserId;

  // Only run internal auth when no external userId is provided
  useEffect(() => {
    if (externalUserId !== undefined) return; // Skip when userId is provided externally
    
    let isMounted = true;

    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!isMounted) return;
        
        const uid = session?.user?.id || null;
        setInternalUserId(uid);
        setIsAuthLoading(false);

        if (uid) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("display_name")
            .eq("id", uid)
            .maybeSingle();
          if (isMounted) {
            setDisplayName(profile?.display_name || session?.user?.email?.split("@")[0] || "");
          }
        }
      } catch (error) {
        console.error("useReset auth error:", error);
        if (isMounted) setIsAuthLoading(false);
      }
    };
    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted || event === "INITIAL_SESSION") return;
      setInternalUserId(session?.user?.id || null);

      if (session?.user?.id) {
        try {
          const { data: profile } = await supabase
            .from("profiles")
            .select("display_name")
            .eq("id", session.user.id)
            .maybeSingle();
          if (isMounted) {
            setDisplayName(profile?.display_name || session.user.email?.split("@")[0] || "");
          }
        } catch (error) {
          console.error("Profile fetch error:", error);
        }
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [externalUserId]);

  // Fetch display name when external userId is provided
  useEffect(() => {
    if (externalUserId === undefined || !userId) return;
    let isMounted = true;

    const fetchDisplayName = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("id", userId)
          .maybeSingle();
        if (isMounted) {
          setDisplayName(profile?.display_name || session?.user?.email?.split("@")[0] || "");
        }
      } catch {
        // Ignore profile fetch errors and keep existing display name fallback.
      }
    };
    fetchDisplayName();

    return () => { isMounted = false; };
  }, [externalUserId, userId]);

  // Get active reset session (handle case where user has multiple active sessions)
  const { data: activeSession, isLoading: isLoadingSession } = useQuery({
    queryKey: ["reset-session", userId],
    queryFn: async () => {
      if (!userId) return null;
      
      // Use .limit(1) without .maybeSingle() to avoid errors when multiple active sessions exist
      const { data, error } = await supabase
        .from("reset_sessions")
        .select("*")
        .eq("user_id", userId)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1);

      if (error) throw error;
      
      // Return the most recent active session, or null if none exist
      return (data && data.length > 0 ? data[0] : null) as ResetSession | null;
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

  // Calculate current day based on start_date (date-anchored), capped at 7 for display
  const currentDay = useMemo(() => {
    if (!activeSession?.start_date) return 1;
    const elapsed = calculateCurrentDay(activeSession.start_date,activeSession.timezone);
    return Math.min(elapsed, 7); // Cap at 7 for display purposes
  }, [activeSession?.start_date, activeSession?.timezone]);

  // Check if session has expired (past day 7 without completing all days)
  const isExpired = useMemo(() => {
    if (!activeSession?.start_date) return false;
    return isSessionExpired(activeSession.start_date, completedDays.length,activeSession.timezone);
  }, [activeSession?.start_date, activeSession?.timezone, completedDays.length]);

  // Check if the current day has already been completed
  const isTodayCompleted = useMemo(() => {
    return completedDays.some((d) => d.day_number === currentDay);
  }, [completedDays, currentDay]);

  // Check if user missed days (they can still continue if within 7-day window)
  const missedDays = useMemo(() => {
    if (!activeSession?.start_date || isExpired) return false;
    const lastCompletedDay = completedDays.length > 0 
      ? Math.max(...completedDays.map(d => d.day_number)) 
      : 0;
    // User has missed days if current calculated day > last completed day + 1
    // AND they haven't done today yet
    return currentDay > lastCompletedDay + 1 && !isTodayCompleted;
  }, [activeSession?.start_date, completedDays, currentDay, isTodayCompleted, isExpired]);

  // Calculate log_date for current day
  const currentLogDate = useMemo(() => {
    if (!activeSession?.start_date) return getLocalDateString();
    return getLogDateForDay(activeSession.start_date, currentDay);
  }, [activeSession?.start_date, currentDay]);

  // Calculate end_date (7 days from start)
  const endDate = useMemo(() => {
    if (!activeSession?.start_date) return getLocalDateString();
    return getLogDateForDay(activeSession.start_date, 7);
  }, [activeSession?.start_date]);

  // Only truly completed if all 7 days are done
  const isCompleted = completedDays.length >= 7;

  // Accept covenant and start a new reset session
  const acceptCovenantMutation = useMutation({
    mutationFn: async ({ isPaid, journeyId }: { isPaid: boolean; journeyId?: string }) => {
      if (!userId) throw new Error("Not authenticated");

      // Check if free user has already used their free Snapshot allocation
      if (!isPaid) {
        const { count, error: countError } = await supabase
          .from("reset_sessions")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId);

        if (countError) throw countError;

        if (!canStartNewSnapshot(false, count ?? 0)) {
          throw new Error("Free tier snapshot limit reached. Upgrade to unlock more snapshots.");
        }
      }

      const now = new Date().toISOString();
      const localDate = getLocalDateString();
      const timezone = getTimezone();

      const { data, error } = await supabase
        .from("reset_sessions")
        .insert({
          user_id: userId,
          start_date: localDate,
          current_day: 1,
          status: "active",
          timezone: timezone,
          covenant_accepted: true,
          covenant_accepted_at: now,
          journey_id: journeyId || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data as ResetSession;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reset-session"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      toast({
        title: "Your 7-Day Snapshot begins",
        description: "Day 1 awaits you.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error starting journey",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Complete a day
  const completeDayMutation = useMutation({
    mutationFn: async ({
      userInput,
    }: {
      userInput?: string;
    }) => {
      if (!userId || !activeSession) throw new Error("No active session");

      // Check if session has expired before allowing completion
      if (isSessionExpired(activeSession.start_date, completedDays.length,activeSession.timezone)) {
        throw new Error("This Snapshot has expired. Start a new 7-Day Snapshot to continue.");
      }

      const data=await completeLegacyResetDay(activeSession.id,userInput);

      return data as DailyReset;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reset-session"] });
      queryClient.invalidateQueries({ queryKey: ["daily-resets"] });
      queryClient.invalidateQueries({ queryKey: ["xp-logs"] });
      queryClient.invalidateQueries({ queryKey: ["life-dashboard"] });
    },
    onError: (error) => {
      toast({
        title: "Error completing day",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Check for existing certificate
  const { data: existingCertificate, isLoading: isLoadingCertificate } = useQuery({
    queryKey: ["certificate", activeSession?.id, userId],
    queryFn: async () => {
      if (!userId || !activeSession?.id) return null;
      
      const { data, error } = await supabase
        .from("certificates")
        .select("*")
        .eq("user_id", userId)
        .eq("reset_session_id", activeSession.id)
        .maybeSingle();
      
      if (error) throw error;
      return data ? { ...data, storage_path: data.certificate_url } : null;
    },
    enabled: !!userId && !!activeSession?.id,
  });

  // Get certificate URL from storage

  // Completion is checked by the authenticated server handler. Browsers can
  // request a certificate but cannot self-issue an authoritative record.
  const generateCertificateMutation = useMutation({
    mutationFn: async (): Promise<string> => {
      if(!activeSession?.id) throw new Error("No active session");
      const {data,error}=await supabase.functions.invoke("generate-certificate", {body:{reset_session_id:activeSession.id}});
      if(error || !data?.certificate_url) throw new Error("Certificate unavailable. Complete all seven days first.");
      queryClient.invalidateQueries({queryKey:["certificate"]});
      return data.certificate_url;
    },
    onError:(error)=>toast({title:"Certificate unavailable",description:error.message,variant:"destructive"}),
  });

  // Get existing certificate URL if available
  const { data: certificateUrl = null } = useQuery({
    queryKey: ['private-certificate-url', userId, existingCertificate?.storage_path],
    queryFn: () => privateCertificateUrl(existingCertificate!.storage_path),
    enabled: !!userId && !!existingCertificate?.storage_path,
    staleTime: 60_000,
    refetchInterval: 240_000,
  });

  return {
    userId,
    displayName,
    activeSession,
    completedDays,
    currentDay,
    currentLogDate,
    endDate,
    isTodayCompleted,
    missedDays,
    isCompleted,
    isExpired,
    isLoading: isAuthLoading || isLoadingSession || isLoadingDays || isLoadingCertificate,
    covenantAccepted: activeSession?.covenant_accepted ?? false,
    acceptCovenant: acceptCovenantMutation.mutate,
    isAcceptingCovenant: acceptCovenantMutation.isPending,
    completeDay: completeDayMutation.mutate,
    isCompleting: completeDayMutation.isPending,
    generateCertificate: generateCertificateMutation.mutateAsync,
    isGeneratingCertificate: generateCertificateMutation.isPending,
    certificateUrl,
    existingCertificate,
  };
};
