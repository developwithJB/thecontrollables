// DEPRECATED: Use useHealthData instead. This file re-exports for backward compatibility.
import { useHealthData } from "@/hooks/useHealthData";

export type { HealthMetrics } from "@/hooks/useHealthData";

// Legacy types kept for any remaining consumers
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

/**
 * @deprecated Use `useHealthData` instead for provider-agnostic health metrics.
 */
export function useWhoopData(userId: string | undefined) {
  const health = useHealthData(userId);
  
  return {
    isConnected: health.isConnected,
    connection: health.isConnected ? { provider: health.provider || "whoop", connected_at: null, last_synced_at: health.lastSynced } as WhoopConnection : null,
    latestRecovery: health.latest.recovery !== null ? {
      recovery_score: health.latest.recovery,
      resting_heart_rate: health.latest.restingHR,
      hrv_rmssd_milli: health.latest.hrv,
      spo2_percentage: null,
      skin_temp_celsius: null,
      recorded_at: health.latest.date,
    } as WhoopRecovery : null,
    latestSleep: health.latest.sleepMinutes !== null ? {
      sleep_performance_pct: health.latest.sleepScore,
      sleep_efficiency_pct: null,
      respiratory_rate: null,
      total_in_bed_ms: null,
      total_awake_ms: null,
      total_light_ms: null,
      total_sws_ms: null,
      total_rem_ms: null,
      disturbance_count: null,
      start_time: null,
      end_time: health.latest.date,
    } as WhoopSleep : null,
    latestCycle: health.latest.strain !== null ? {
      strain: health.latest.strain,
      kilojoules: null,
      avg_heart_rate: null,
      max_heart_rate: null,
      start_time: health.latest.date,
    } as WhoopCycle : null,
    recoveryTrend: health.trend.filter(t => t.recovery !== null).map(t => ({ recovery_score: t.recovery, recorded_at: t.date })),
    strainTrend: health.trend.filter(t => t.strain !== null).map(t => ({ strain: t.strain, start_time: t.date })),
    sleepTrend: health.trend.filter(t => t.sleepScore !== null).map(t => ({ sleep_performance_pct: t.sleepScore, end_time: t.date })),
  };
}
