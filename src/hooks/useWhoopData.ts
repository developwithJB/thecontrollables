import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface WhoopRecovery {
  recovery_score: number | null;
  resting_heart_rate: number | null;
  hrv_rmssd_milli: number | null;
  spo2_percentage: number | null;
  skin_temp_celsius: number | null;
  recorded_at: string | null;
}

export interface WhoopSleep {
  sleep_performance_pct: number | null;
  sleep_efficiency_pct: number | null;
  respiratory_rate: number | null;
  total_in_bed_ms: number | null;
  total_awake_ms: number | null;
  total_light_ms: number | null;
  total_sws_ms: number | null;
  total_rem_ms: number | null;
  disturbance_count: number | null;
  start_time: string | null;
  end_time: string | null;
}

export interface WhoopCycle {
  strain: number | null;
  kilojoules: number | null;
  avg_heart_rate: number | null;
  max_heart_rate: number | null;
  start_time: string | null;
}

export interface WhoopConnection {
  provider: string;
  connected_at: string | null;
  last_synced_at: string | null;
}

export function useWhoopData(userId: string | undefined) {
  const { data: connection } = useQuery({
    queryKey: ["whoop-connection", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("wearable_connections")
        .select("provider, connected_at, last_synced_at")
        .eq("user_id", userId!)
        .eq("provider", "whoop")
        .maybeSingle();
      return data as WhoopConnection | null;
    },
    enabled: !!userId,
    staleTime: 60_000,
  });

  const isConnected = !!connection;

  const { data: latestRecovery } = useQuery({
    queryKey: ["whoop-recovery-latest", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("whoop_recoveries")
        .select("recovery_score, resting_heart_rate, hrv_rmssd_milli, spo2_percentage, skin_temp_celsius, recorded_at")
        .eq("user_id", userId!)
        .order("recorded_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data as WhoopRecovery | null;
    },
    enabled: !!userId && isConnected,
    staleTime: 60_000,
  });

  const { data: latestSleep } = useQuery({
    queryKey: ["whoop-sleep-latest", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("whoop_sleeps")
        .select("sleep_performance_pct, sleep_efficiency_pct, respiratory_rate, total_in_bed_ms, total_awake_ms, total_light_ms, total_sws_ms, total_rem_ms, disturbance_count, start_time, end_time")
        .eq("user_id", userId!)
        .order("end_time", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data as WhoopSleep | null;
    },
    enabled: !!userId && isConnected,
    staleTime: 60_000,
  });

  const { data: latestCycle } = useQuery({
    queryKey: ["whoop-cycle-latest", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("whoop_cycles")
        .select("strain, kilojoules, avg_heart_rate, max_heart_rate, start_time")
        .eq("user_id", userId!)
        .order("start_time", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data as WhoopCycle | null;
    },
    enabled: !!userId && isConnected,
    staleTime: 60_000,
  });

  // 7-day trend data
  const { data: recoveryTrend = [] } = useQuery({
    queryKey: ["whoop-recovery-trend", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("whoop_recoveries")
        .select("recovery_score, recorded_at")
        .eq("user_id", userId!)
        .order("recorded_at", { ascending: true })
        .limit(7);
      return (data || []) as { recovery_score: number | null; recorded_at: string | null }[];
    },
    enabled: !!userId && isConnected,
    staleTime: 5 * 60_000,
  });

  const { data: strainTrend = [] } = useQuery({
    queryKey: ["whoop-strain-trend", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("whoop_cycles")
        .select("strain, start_time")
        .eq("user_id", userId!)
        .order("start_time", { ascending: true })
        .limit(7);
      return (data || []) as { strain: number | null; start_time: string | null }[];
    },
    enabled: !!userId && isConnected,
    staleTime: 5 * 60_000,
  });

  return {
    isConnected,
    connection,
    latestRecovery,
    latestSleep,
    latestCycle,
    recoveryTrend,
    strainTrend,
  };
}
