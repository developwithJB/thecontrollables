import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, isAfter, startOfDay } from "date-fns";
import type { HealthMetrics } from "@/hooks/useHealthData";

interface PvAItem {
  id: string;
  title: string;
  status: "done" | "partial" | "missed" | "planned";
  type: string;
}

interface PvADay {
  date: Date;
  items: PvAItem[];
  health?: HealthMetrics | null;
}

interface SynthesisDayPayload {
  date: string;
  planned: number;
  completed: number;
  recovery: number | null;
  hrv: number | null;
  strain: number | null;
}

export function useDailySynthesis(days: PvADay[]) {
  const today = startOfDay(new Date());

  // Filter to days that have BOTH planner items AND wearable data, and are not future
  const eligibleDays: SynthesisDayPayload[] = days
    .filter((d) => {
      if (isAfter(d.date, today)) return false;
      const hasItems = d.items.length > 0;
      const hasHealth = d.health && (d.health.recovery !== null || d.health.strain !== null);
      return hasItems && hasHealth;
    })
    .map((d) => ({
      date: format(d.date, "yyyy-MM-dd"),
      planned: d.items.length,
      completed: d.items.filter((i) => i.status === "done").length,
      recovery: d.health?.recovery ?? null,
      hrv: d.health?.hrv ?? null,
      strain: d.health?.strain ?? null,
    }));

  const queryKey = ["daily-synthesis", eligibleDays.map((d) => d.date).join(",")];

  const { data: syntheses = {} } = useQuery<Record<string, string>>({
    queryKey,
    queryFn: async () => {
      if (eligibleDays.length === 0) return {};

      const { data, error } = await supabase.functions.invoke("dashboard-intelligence", {
        body: { action: "daily_synthesis", days: eligibleDays },
      });

      if (error) {
        console.error("Daily synthesis fetch error:", error);
        return {};
      }

      return (data?.syntheses as Record<string, string>) || {};
    },
    enabled: eligibleDays.length > 0,
    staleTime: Infinity,
    gcTime: 30 * 60 * 1000,
  });

  return syntheses;
}
