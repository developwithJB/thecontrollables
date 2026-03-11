import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, isAfter, startOfDay } from "date-fns";
import type { HealthMetrics } from "@/hooks/useHealthData";
import type { Project } from "@/hooks/useProjects";

interface PvAItem {
  id: string;
  title: string;
  status: "done" | "partial" | "missed" | "planned";
  type: string;
  project_id?: string | null;
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
  project_id?: string | null;
  project_name?: string | null;
  project_controllable?: string | null;
}

export function useDailySynthesis(days: PvADay[], projects: Project[] = []) {
  const today = startOfDay(new Date());

  // Build per-project payloads: group items by project_id for each day
  const eligibleEntries: SynthesisDayPayload[] = [];

  for (const d of days) {
    if (isAfter(d.date, today)) continue;
    const hasHealth = d.health && (d.health.recovery !== null || d.health.strain !== null);
    if (!hasHealth || d.items.length === 0) continue;

    const dateStr = format(d.date, "yyyy-MM-dd");

    // Group items by project_id
    const byProject: Record<string, typeof d.items> = {};
    for (const item of d.items) {
      const key = item.project_id ?? "__none";
      if (!byProject[key]) byProject[key] = [];
      byProject[key].push(item);
    }

    for (const [key, items] of Object.entries(byProject)) {
      const projectId = key === "__none" ? null : key;
      const project = projectId ? projects.find(p => p.id === projectId) : null;

      eligibleEntries.push({
        date: dateStr,
        planned: items.length,
        completed: items.filter((i) => i.status === "done").length,
        recovery: d.health?.recovery ?? null,
        hrv: d.health?.hrv ?? null,
        strain: d.health?.strain ?? null,
        project_id: projectId,
        project_name: project?.name ?? null,
        project_controllable: project?.controllable ?? null,
      });
    }
  }

  const queryKey = [
    "daily-synthesis",
    eligibleEntries.map((d) => `${d.date}:${d.project_id ?? ""}`).join(","),
  ];

  const { data: syntheses = {} } = useQuery<Record<string, string>>({
    queryKey,
    queryFn: async () => {
      if (eligibleEntries.length === 0) return {};

      const { data, error } = await supabase.functions.invoke("dashboard-intelligence", {
        body: { action: "daily_synthesis", days: eligibleEntries },
      });

      if (error) {
        console.error("Daily synthesis fetch error:", error);
        return {};
      }

      return (data?.syntheses as Record<string, string>) || {};
    },
    enabled: eligibleEntries.length > 0,
    staleTime: Infinity,
    gcTime: 30 * 60 * 1000,
  });

  return syntheses;
}
