import { useState, useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Season {
  id: string;
  user_id: string;
  name: string | null;
  started_at: string;
  completed_at: string | null;
  status: string;
  created_at: string;
  theme_text: string | null;
  ends_at: string | null;
  controllable_focus: string | null;
}

interface SeasonSnapshot {
  id: string;
  journey_id: string | null;
  start_date: string;
  completed_at: string | null;
  status: string;
  current_day: number;
  season_id: string | null;
}

interface SeasonProgress {
  weekNumber: number;
  snapshotsCompleted: number;
  totalCheckIns: number;
  totalXP: number;
  isComplete: boolean;
}

export function useSeason(userId?: string) {
  const queryClient = useQueryClient();
  const [isStartingSeason, setIsStartingSeason] = useState(false);

  // Fetch active season
  const { data: activeSeason, isLoading: isLoadingSeason } = useQuery({
    queryKey: ["season-active", userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from("seasons")
        .select("*")
        .eq("user_id", userId)
        .eq("status", "active")
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as Season | null;
    },
    enabled: !!userId,
  });

  // Fetch snapshots belonging to active season
  const { data: seasonSnapshots = [] } = useQuery({
    queryKey: ["season-snapshots", activeSeason?.id],
    queryFn: async () => {
      if (!activeSeason?.id) return [];
      const { data, error } = await supabase
        .from("reset_sessions")
        .select("id, journey_id, start_date, completed_at, status, current_day, season_id")
        .eq("season_id", activeSeason.id)
        .order("start_date", { ascending: true });
      if (error) throw error;
      return (data || []) as SeasonSnapshot[];
    },
    enabled: !!activeSeason?.id,
  });

  // Fetch cumulative stats for season snapshots
  const seasonSnapshotIds = useMemo(
    () => seasonSnapshots.map((s) => s.id),
    [seasonSnapshots]
  );

  const { data: seasonStats } = useQuery({
    queryKey: ["season-stats", seasonSnapshotIds],
    queryFn: async () => {
      if (seasonSnapshotIds.length === 0) return { checkIns: 0, xp: 0 };
      const [checkInsRes, xpRes] = await Promise.all([
        supabase
          .from("daily_resets")
          .select("id", { count: "exact", head: true })
          .in("session_id", seasonSnapshotIds),
        supabase
          .from("xp_logs")
          .select("amount")
          .eq("user_id", userId!)
          .gte("created_at", seasonSnapshots[0]?.start_date || ""),
      ]);
      const totalXP = (xpRes.data || []).reduce((sum, r) => sum + r.amount, 0);
      return { checkIns: checkInsRes.count || 0, xp: totalXP };
    },
    enabled: seasonSnapshotIds.length > 0 && !!userId,
  });

  // Computed progress
  const seasonProgress = useMemo<SeasonProgress | null>(() => {
    if (!activeSeason || seasonSnapshots.length === 0) return null;
    const completed = seasonSnapshots.filter((s) => s.status === "completed").length;
    return {
      weekNumber: Math.min(seasonSnapshots.length, 4),
      snapshotsCompleted: completed,
      totalCheckIns: seasonStats?.checkIns || 0,
      totalXP: seasonStats?.xp || 0,
      isComplete: completed >= 4,
    };
  }, [activeSeason, seasonSnapshots, seasonStats]);

  // Fetch all seasons for history view
  const { data: allSeasons = [] } = useQuery({
    queryKey: ["seasons-all", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("seasons")
        .select("*")
        .eq("user_id", userId)
        .order("started_at", { ascending: false });
      if (error) throw error;
      return (data || []) as Season[];
    },
    enabled: !!userId,
  });

  // Start a new season
  const startSeason = useCallback(async (name?: string): Promise<string | null> => {
    if (!userId) return null;
    setIsStartingSeason(true);
    try {
      const { data, error } = await supabase
        .from("seasons")
        .insert({ user_id: userId, name: name || null })
        .select("id")
        .single();
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["season-active"] });
      queryClient.invalidateQueries({ queryKey: ["seasons-all"] });
      return data.id;
    } catch (err) {
      console.error("Failed to start season:", err);
      toast.error("Could not start season");
      return null;
    } finally {
      setIsStartingSeason(false);
    }
  }, [userId, queryClient]);

  // Link a snapshot to the active season
  const linkSnapshotToSeason = useCallback(async (sessionId: string, seasonId: string) => {
    const { error } = await supabase
      .from("reset_sessions")
      .update({ season_id: seasonId } as any)
      .eq("id", sessionId);
    if (error) {
      console.error("Failed to link snapshot to season:", error);
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["season-snapshots"] });
    queryClient.invalidateQueries({ queryKey: ["reset-session"] });
  }, [queryClient]);

  // Complete the season
  const completeSeason = useCallback(async () => {
    if (!activeSeason) return;
    const { error } = await supabase
      .from("seasons")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", activeSeason.id);
    if (error) {
      console.error("Failed to complete season:", error);
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["season-active"] });
    queryClient.invalidateQueries({ queryKey: ["seasons-all"] });
    toast.success("Season complete! 🎉");
  }, [activeSeason, queryClient]);

  // Check if season should auto-complete (4th snapshot finished)
  const shouldShowSeasonComplete = useMemo(() => {
    return seasonProgress?.isComplete && activeSeason?.status === "active";
  }, [seasonProgress, activeSeason]);

  return {
    activeSeason,
    isLoadingSeason,
    seasonSnapshots,
    seasonProgress,
    allSeasons,
    isStartingSeason,
    startSeason,
    linkSnapshotToSeason,
    completeSeason,
    shouldShowSeasonComplete,
  };
}
