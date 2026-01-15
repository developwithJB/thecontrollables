import { useState, useEffect, useMemo } from "react";
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
  timezone: string | null;
  covenant_accepted: boolean;
  covenant_accepted_at: string | null;
  completed_at: string | null;
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
const calculateCurrentDay = (startDate: string): number => {
  const start = new Date(startDate + "T00:00:00");
  const today = new Date(getLocalDateString() + "T00:00:00");
  const diffTime = today.getTime() - start.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  // Day 1 is start_date, so add 1
  return Math.max(1, Math.min(diffDays + 1, 7));
};

export const useReset = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [displayName, setDisplayName] = useState<string>("");

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
      setIsAuthLoading(false);
      
      // Fetch display name from profile
      if (user?.id) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("id", user.id)
          .single();
        setDisplayName(profile?.display_name || user.email?.split("@")[0] || "");
      }
    };
    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_, session) => {
      setUserId(session?.user?.id || null);
      setIsAuthLoading(false);
      
      if (session?.user?.id) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("id", session.user.id)
          .single();
        setDisplayName(profile?.display_name || session.user.email?.split("@")[0] || "");
      }
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

  // Calculate current day based on start_date (date-anchored)
  const currentDay = useMemo(() => {
    if (!activeSession?.start_date) return 1;
    return calculateCurrentDay(activeSession.start_date);
  }, [activeSession?.start_date]);

  // Check if the current day has already been completed
  const isTodayCompleted = useMemo(() => {
    return completedDays.some((d) => d.day_number === currentDay);
  }, [completedDays, currentDay]);

  // Check if user missed days (they can still continue)
  const missedDays = useMemo(() => {
    if (!activeSession?.start_date) return false;
    const lastCompletedDay = completedDays.length > 0 
      ? Math.max(...completedDays.map(d => d.day_number)) 
      : 0;
    // User has missed days if current calculated day > last completed day + 1
    // AND they haven't done today yet
    return currentDay > lastCompletedDay + 1 && !isTodayCompleted;
  }, [activeSession?.start_date, completedDays, currentDay, isTodayCompleted]);

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

  const isCompleted = completedDays.length >= 7;

  // Accept covenant and start a new reset session
  const acceptCovenantMutation = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("Not authenticated");

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
        })
        .select()
        .single();

      if (error) throw error;
      return data as ResetSession;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reset-session"] });
      toast({
        title: "Your 7-Day journey begins",
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

      // If this was day 7, mark session as completed
      if (currentDay >= 7) {
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

  // Check for global admin template
  const getTemplateUrl = async (): Promise<string | null> => {
    const { data } = supabase.storage
      .from("certificates")
      .getPublicUrl("Cetificate Template.png");
    
    try {
      const response = await fetch(data.publicUrl, { method: "HEAD" });
      if (response.ok) {
        return data.publicUrl;
      }
    } catch {
      // Template doesn't exist
    }
    return null;
  };

  // Generate and save certificate to storage
  const generateCertificateMutation = useMutation({
    mutationFn: async (): Promise<string> => {
      if (!activeSession?.start_date || !userId) throw new Error("No active session");
      
      // Check if certificate already exists
      if (existingCertificate?.storage_path) {
        return getCertificateUrl(existingCertificate.storage_path);
      }
      
      // Check for custom template
      const templateUrl = await getTemplateUrl();
      
      // Create a canvas-based certificate (matching template dimensions)
      const canvas = document.createElement("canvas");
      canvas.width = 1200;
      canvas.height = 800;
      const ctx = canvas.getContext("2d");
      
      if (!ctx) throw new Error("Canvas not supported");

      // Draw background - either custom template or default
      if (templateUrl) {
        try {
          const templateImg = await loadImage(templateUrl);
          ctx.drawImage(templateImg, 0, 0, 1200, 800);
        } catch {
          // Fallback to default background if template fails to load
          ctx.fillStyle = "#fafafa";
          ctx.fillRect(0, 0, 1200, 800);
          ctx.strokeStyle = "#e5e5e5";
          ctx.lineWidth = 2;
          ctx.strokeRect(40, 40, 1120, 720);
        }
      } else {
        // Default background
        ctx.fillStyle = "#fafafa";
        ctx.fillRect(0, 0, 1200, 800);
        ctx.strokeStyle = "#e5e5e5";
        ctx.lineWidth = 2;
        ctx.strokeRect(40, 40, 1120, 720);
      }

      // Text styling - positioned for Canva template
      ctx.textAlign = "center";

      // User's display name - replaces "Samira Hadid" in template (script font position)
      if (displayName) {
        ctx.fillStyle = "#1a1a1a";
        ctx.font = "italic 56px Georgia, serif";
        ctx.fillText(displayName, 600, 400);
      }

      // Description text - replaces Lorem ipsum in template
      ctx.fillStyle = "#404040";
      ctx.font = "18px system-ui, sans-serif";
      ctx.fillText("For completing the 7-Day Reset Challenge", 600, 485);
      ctx.fillText("I committed to controlling what I could and surrendering what I could not.", 600, 510);

      // Date range - positioned in the DATE area (bottom left of badge)
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
      ctx.fillText(`${startFormatted} – ${endFormatted}`, 400, 665);

      // "The Controllables" branding - positioned in SIGNATURE area (bottom right)
      ctx.font = "italic 20px Georgia, serif";
      ctx.fillStyle = "#1a1a1a";
      ctx.fillText("The Controllables", 800, 665);

      // Convert canvas to blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((b) => {
          if (b) resolve(b);
          else reject(new Error("Failed to create blob"));
        }, "image/png");
      });

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
