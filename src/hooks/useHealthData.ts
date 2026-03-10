import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface HealthMetrics {
  recovery: number | null;
  sleepScore: number | null;
  strain: number | null;
  hrv: number | null;
  restingHR: number | null;
  sleepMinutes: number | null;
  activeMinutes: number | null;
  steps: number | null;
  date: string;
}

export interface HealthDataResult {
  isConnected: boolean;
  provider: string | null;
  latest: HealthMetrics;
  trend: HealthMetrics[];
  lastSynced: string | null;
  connectedAt: string | null;
  isLoading: boolean;
}

const EMPTY_METRICS: HealthMetrics = {
  recovery: null,
  sleepScore: null,
  strain: null,
  hrv: null,
  restingHR: null,
  sleepMinutes: null,
  activeMinutes: null,
  steps: null,
  date: "",
};

function mapRow(row: any): HealthMetrics {
  return {
    recovery: row.recovery_score ?? null,
    sleepScore: row.sleep_minutes ? Math.min(100, Math.round((row.sleep_minutes / 480) * 100)) : null,
    strain: row.strain_score ?? null,
    hrv: row.hrv_ms ?? null,
    restingHR: row.heart_rate_avg ?? null,
    sleepMinutes: row.sleep_minutes ?? null,
    activeMinutes: row.active_minutes ?? null,
    steps: row.steps ?? null,
    date: row.sync_date,
  };
}

export function useHealthData(userId: string | undefined): HealthDataResult {
  // Check for any connected wearable
  const { data: connection, isLoading: connLoading } = useQuery({
    queryKey: ["wearable-connection-any", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("wearable_connections")
        .select("provider, connected_at, last_synced_at")
        .eq("user_id", userId!)
        .limit(1)
        .maybeSingle();
      return data as { provider: string; connected_at: string | null; last_synced_at: string | null } | null;
    },
    enabled: !!userId,
    staleTime: 60_000,
  });

  const isConnected = !!connection;
  const provider = connection?.provider ?? null;

  // Fetch latest 7 days from normalized health_sync_data
  const { data: healthRows = [], isLoading: dataLoading } = useQuery({
    queryKey: ["health-data-trend", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("health_sync_data")
        .select("sync_date, steps, sleep_minutes, active_minutes, heart_rate_avg, recovery_score, hrv_ms, strain_score")
        .eq("user_id", userId!)
        .order("sync_date", { ascending: false })
        .limit(7);
      return data || [];
    },
    enabled: !!userId && isConnected,
    staleTime: 60_000,
  });

  const trend = healthRows.map(mapRow);
  const latest = trend.length > 0 ? trend[0] : EMPTY_METRICS;

  return {
    isConnected,
    provider,
    latest,
    trend,
    lastSynced: connection?.last_synced_at ?? null,
    connectedAt: connection?.connected_at ?? null,
    isLoading: connLoading || dataLoading,
  };
}
