import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getLevelProgress, ALL_CONTROLLABLES } from "@/lib/controllableTheme";
import type { ControllableType } from "@/components/ControllableCard";

export interface ControllableLevel {
  type: ControllableType;
  totalXp: number;
  level: number;
  current: number;
  next: number;
  progress: number;
}

export function useControllableLevels(userId: string | null) {
  return useQuery({
    queryKey: ["controllable-levels", userId],
    queryFn: async (): Promise<ControllableLevel[]> => {
      if (!userId) return ALL_CONTROLLABLES.map(defaultLevel);

      const { data, error } = await supabase
        .from("completed_actions")
        .select("controllable, xp_awarded")
        .eq("user_id", userId)
        .not("controllable", "is", null);

      if (error) throw error;

      // Sum XP per controllable
      const xpMap: Record<string, number> = {};
      for (const row of data ?? []) {
        if (row.controllable) {
          xpMap[row.controllable] = (xpMap[row.controllable] || 0) + row.xp_awarded;
        }
      }

      return ALL_CONTROLLABLES.map((type) => {
        const totalXp = xpMap[type] || 0;
        const lp = getLevelProgress(totalXp);
        return { type, totalXp, ...lp };
      });
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
  });
}

function defaultLevel(type: ControllableType): ControllableLevel {
  return { type, totalXp: 0, level: 1, current: 0, next: 25, progress: 0 };
}
