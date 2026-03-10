import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { DailyRingsState } from "@/hooks/useDailyRings";

export interface DashboardSignal {
  label: string;
  direction: "up" | "down" | "neutral";
}

export interface DashboardIntelligence {
  pattern_detected: string;
  why_it_matters: string;
  best_next_move: string;
  tomorrow_forecast: string;
  snapshot_forecast: string;
  month_forecast: string;
  year_forecast: string;
  signals: {
    energy_trend: DashboardSignal;
    confidence_signal: DashboardSignal;
    stress_load: DashboardSignal;
    drift_risk: DashboardSignal;
    strongest_today: string;
    most_neglected_week: string;
  };
  why_fully_charged: string[];
  recommended_actions: Array<{ text: string; ring: string }>;
  memory_comparisons: string[];
  center_rotations: string[];
}

const CACHE_KEY = "dashboard-intelligence-cache";

function getCachedData(): DashboardIntelligence | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { data, date } = JSON.parse(raw);
    const today = new Date().toISOString().slice(0, 10);
    if (date !== today) return null;
    // Check staleness (30 min)
    const { ts } = JSON.parse(raw);
    if (ts && Date.now() - ts > 30 * 60 * 1000) return null;
    return data;
  } catch {
    return null;
  }
}

function setCachedData(data: DashboardIntelligence) {
  sessionStorage.setItem(CACHE_KEY, JSON.stringify({
    data,
    date: new Date().toISOString().slice(0, 10),
    ts: Date.now(),
  }));
}

export function useDashboardIntelligence(
  userId: string | undefined,
  completedCount: number,
  rings: DailyRingsState
) {
  const [data, setData] = useState<DashboardIntelligence | null>(getCachedData);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchIntelligence = useCallback(async () => {
    if (!userId || completedCount < 3) return;
    setIsLoading(true);
    setError(null);

    try {
      const { data: result, error: fnError } = await supabase.functions.invoke("dashboard-intelligence", {
        body: { completedCount, rings },
      });

      if (fnError) throw fnError;
      if (result?.error) throw new Error(result.error);

      setData(result);
      setCachedData(result);
    } catch (err) {
      console.error("Dashboard intelligence error:", err);
      setError(err instanceof Error ? err.message : "Failed to load intelligence");
    } finally {
      setIsLoading(false);
    }
  }, [userId, completedCount, rings]);

  useEffect(() => {
    if (completedCount >= 3 && !data && !isLoading) {
      fetchIntelligence();
    }
  }, [completedCount, data, isLoading, fetchIntelligence]);

  return {
    data,
    isLoading,
    error,
    refresh: fetchIntelligence,
  };
}
