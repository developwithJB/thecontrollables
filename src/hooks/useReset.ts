import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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
const calculateCurrentDay = (startDate: string): number => {
  const start = new Date(startDate + "T00:00:00");
  const today = new Date(getLocalDateString() + "T00:00:00");
  const diffTime = today.getTime() - start.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  // Day 1 is start_date, so add 1
  return Math.max(1, diffDays + 1);
};

// Check if session has expired (past day 7 without completing all 7 days)
const isSessionExpired = (startDate: string, completedDaysCount: number): boolean => {
  const elapsedDay = calculateCurrentDay(startDate);
  return elapsedDay > 7 && completedDaysCount < 7;
};

export const useReset = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [displayName, setDisplayName] = useState<string>("");

  useEffect(() => {
    let isMounted = true;

    // Use cached session (instant) instead of getUser (network call)
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!isMounted) return;
        
        const uid = session?.user?.id || null;
        setUserId(uid);
        setIsAuthLoading(false);

        // Fetch display name from profile
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

    // Listen for auth changes (skip INITIAL_SESSION to prevent double-fire)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted || event === "INITIAL_SESSION") return;
      setUserId(session?.user?.id || null);

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
  }, []);

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
    const elapsed = calculateCurrentDay(activeSession.start_date);
    return Math.min(elapsed, 7); // Cap at 7 for display purposes
  }, [activeSession?.start_date]);

  // Check if session has expired (past day 7 without completing all days)
  const isExpired = useMemo(() => {
    if (!activeSession?.start_date) return false;
    return isSessionExpired(activeSession.start_date, completedDays.length);
  }, [activeSession?.start_date, completedDays.length]);

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

      // Check if free user has already used their one free reset
      if (!isPaid) {
        const { count, error: countError } = await supabase
          .from("reset_sessions")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId);

        if (countError) throw countError;

        if (count && count >= 1) {
          throw new Error("Free users are limited to one 7-Day Reset. Upgrade to unlock unlimited resets.");
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
      if (isSessionExpired(activeSession.start_date, completedDays.length)) {
        throw new Error("This reset session has expired. Start a new 7-day reset to continue.");
      }

      const { data, error } = await supabase
        .from("daily_resets")
        .insert({
          session_id: activeSession.id,
          user_id: userId,
          day_number: currentDay,
          reflection: userInput,
        })
        .select()
        .single();

      if (error) throw error;

      // Award XP for completing the day (bonus XP for Day 7)
      const xpAmount = currentDay === 7 ? 50 : 25;
      await supabase
        .from("xp_logs")
        .insert({
          user_id: userId,
          amount: xpAmount,
          source: "reset_day_complete",
          description: `Completed Day ${currentDay} of 7-Day Reset`,
        });

      // Calculate if this completes all 7 days (need to include the one we just added)
      const newCompletedCount = completedDays.length + 1;
      
      // Only mark as "completed" if ALL 7 days are now done
      if (newCompletedCount >= 7) {
        await supabase
          .from("reset_sessions")
          .update({ 
            status: "completed", 
            current_day: 7,
            completed_at: new Date().toISOString(),
          })
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
        .from("completion_certificates")
        .select("*")
        .eq("user_id", userId)
        .eq("challenge_id", activeSession.id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!userId && !!activeSession?.id,
  });

  // Get certificate URL from storage
  const getCertificateUrl = (storagePath: string): string => {
    const { data } = supabase.storage.from("certificates").getPublicUrl(storagePath);
    return data.publicUrl;
  };

  // Helper to load image
  const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new window.Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  };

  // Get the admin-uploaded certificate template
  const getTemplateUrl = (): string => {
    const { data } = supabase.storage
      .from("certificates")
      .getPublicUrl("Certificate Template.png");
    return data.publicUrl;
  };

  // Generate and save certificate to storage
  const generateCertificateMutation = useMutation({
    mutationFn: async (): Promise<string> => {
      if (!activeSession?.start_date || !userId) throw new Error("No active session");
      
      // Check if certificate already exists
      if (existingCertificate?.storage_path) {
        return getCertificateUrl(existingCertificate.storage_path);
      }
      
      // Load the admin template
      const templateUrl = getTemplateUrl();
      
      // Create a canvas-based certificate
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d", { willReadFrequently: false });
      
      if (!ctx) throw new Error("Canvas not supported");

      // Load template and use its natural dimensions
      let templateImg: HTMLImageElement;
      try {
        templateImg = await loadImage(templateUrl);
        canvas.width = templateImg.naturalWidth;
        canvas.height = templateImg.naturalHeight;
        
        // Enable image smoothing for better quality
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        
        ctx.drawImage(templateImg, 0, 0, canvas.width, canvas.height);
      } catch (err) {
        console.error("Failed to load certificate template:", err);
        throw new Error("Certificate template not found. Please contact support.");
      }

      // Calculate center X based on actual canvas width
      const centerX = canvas.width / 2;
      const canvasHeight = canvas.height;

      // Text styling - positioned for template
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      // User's display name (centered, upper third)
      if (displayName) {
        ctx.fillStyle = "#1a1a1a";
        ctx.font = "italic 56px Georgia, serif";
        ctx.fillText(displayName, centerX, canvasHeight * 0.5);
      }

      // Description text
      ctx.fillStyle = "#404040";
      ctx.font = "18px system-ui, sans-serif";
      ctx.fillText("For completing the 7-Day Reset Challenge", centerX, canvasHeight * 0.6);
      ctx.fillText("I committed to controlling what I could and surrendering what I could not.", centerX, canvasHeight * 0.64);

      // Date range
      const startFormatted = new Date(activeSession.start_date + "T00:00:00").toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });
      const endFormatted = new Date(endDate + "T00:00:00").toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });
      ctx.font = "16px system-ui, sans-serif";
      ctx.fillStyle = "#404040";
      ctx.fillText(`${startFormatted} – ${endFormatted}`, centerX * 0.66, canvasHeight * 0.83);

      // "The Controllables" branding
      ctx.font = "italic 20px Georgia, serif";
      ctx.fillStyle = "#1a1a1a";
      ctx.fillText("The Controllables", centerX * 1.34, canvasHeight * 0.83);

      // Convert canvas to blob with high quality
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => {
            if (b) resolve(b);
            else reject(new Error("Failed to create certificate image"));
          },
          "image/png",
          1.0 // Maximum quality
        );
      });

      // Verify blob is valid
      if (blob.size === 0) {
        throw new Error("Generated certificate is empty");
      }

      // Upload to storage
      const storagePath = `${userId}/${activeSession.id}.png`;
      const { error: uploadError } = await supabase.storage
        .from("certificates")
        .upload(storagePath, blob, {
          contentType: "image/png",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Save certificate record to database
      const { error: dbError } = await supabase
        .from("completion_certificates")
        .upsert({
          user_id: userId,
          challenge_id: activeSession.id,
          start_date: activeSession.start_date,
          end_date: endDate,
          timezone: activeSession.timezone,
          storage_path: storagePath,
        }, {
          onConflict: "user_id,challenge_id",
        });

      if (dbError) throw dbError;

      // Invalidate certificate query
      queryClient.invalidateQueries({ queryKey: ["certificate"] });

      return getCertificateUrl(storagePath);
    },
    onError: (error) => {
      toast({
        title: "Error generating certificate",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Get existing certificate URL if available
  const certificateUrl = existingCertificate?.storage_path 
    ? getCertificateUrl(existingCertificate.storage_path) 
    : null;

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
