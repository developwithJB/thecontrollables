import { useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type AppMode = "focus" | "recovery" | "maintenance" | "social" | "travel";

export interface UserMode {
  id: string;
  active_mode: AppMode;
  source: "system" | "manual" | "automation";
  reasons: string[];
  activated_at: string;
  expires_at: string | null;
}

export const MODE_CONFIG: Record<AppMode, {
  label: string;
  emoji: string;
  description: string;
  color: string;
}> = {
  focus: {
    label: "Focus",
    emoji: "🎯",
    description: "Deep work protection. Fewer distractions, task sequencing prioritized.",
    color: "text-blue-500",
  },
  recovery: {
    label: "Recovery",
    emoji: "🌿",
    description: "Lighter commitments. Sleep, hydration, and rest emphasized.",
    color: "text-emerald-500",
  },
  maintenance: {
    label: "Maintenance",
    emoji: "⚡",
    description: "Balanced day. Keep your rhythm going.",
    color: "text-amber-500",
  },
  social: {
    label: "Social",
    emoji: "🤝",
    description: "People-focused. Circle engagement and relationship actions highlighted.",
    color: "text-violet-500",
  },
  travel: {
    label: "Travel",
    emoji: "✈️",
    description: "Disrupted routine. Minimal expectations, flexible scheduling.",
    color: "text-rose-500",
  },
};

export function useAdaptiveMode(userId: string | null) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: userMode, isLoading } = useQuery({
    queryKey: ["user-mode", userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from("user_modes")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as UserMode | null;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  const activeMode: AppMode = useMemo(() => {
    if (!userMode) return "maintenance";
    // Check expiry
    if (userMode.expires_at && new Date(userMode.expires_at) < new Date()) {
      return "maintenance";
    }
    return userMode.active_mode;
  }, [userMode]);

  const setMode = useMutation({
    mutationFn: async ({ mode, expiresInHours }: { mode: AppMode; expiresInHours?: number }) => {
      if (!userId) throw new Error("No user");
      const expiresAt = expiresInHours
        ? new Date(Date.now() + expiresInHours * 3600000).toISOString()
        : null;

      const { error } = await supabase
        .from("user_modes")
        .upsert({
          user_id: userId,
          active_mode: mode,
          source: "manual",
          reasons: ["Manually selected"],
          activated_at: new Date().toISOString(),
          expires_at: expiresAt,
          previous_mode: activeMode,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });
      if (error) throw error;
    },
    onSuccess: (_, { mode }) => {
      queryClient.invalidateQueries({ queryKey: ["user-mode", userId] });
      toast({
        title: `${MODE_CONFIG[mode].emoji} ${MODE_CONFIG[mode].label} Mode`,
        description: MODE_CONFIG[mode].description,
      });
    },
    onError: () => {
      toast({ title: "Error", description: "Could not change mode", variant: "destructive" });
    },
  });

  const modeConfig = MODE_CONFIG[activeMode];
  const isManual = userMode?.source === "manual";

  return {
    activeMode,
    modeConfig,
    userMode,
    isManual,
    setMode: (mode: AppMode, expiresInHours?: number) => setMode.mutate({ mode, expiresInHours }),
    isLoading,
  };
}
