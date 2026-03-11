import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface WeeklyReview {
  headline: string;
  supported_by: string;
  drained_by: string;
  strongest_system: string;
  weakest_system: string;
  patterns: string[];
  next_week: string;
}

function isWeeklyReviewAvailable(): boolean {
  const day = new Date().getDay(); // 0=Sun, 4=Thu
  return day >= 4 || day === 0;
}

export function useWeeklyReview(userId: string | undefined, isPaid: boolean) {
  const available = isWeeklyReviewAvailable();

  const query = useQuery({
    queryKey: ["weekly-review", userId],
    queryFn: async (): Promise<WeeklyReview | null> => {
      const { data, error } = await supabase.functions.invoke("generate-weekly-review");
      if (error) {
        console.error("Weekly review error:", error);
        return null;
      }
      const raw = data?.review;
      if (!raw) return null;
      try {
        const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
        return parsed as WeeklyReview;
      } catch {
        console.error("Failed to parse weekly review:", raw);
        return null;
      }
    },
    enabled: !!userId && isPaid && available,
    staleTime: 12 * 60 * 60 * 1000, // 12 hours
    retry: 1,
  });

  return {
    review: query.data ?? null,
    isLoading: query.isLoading,
    isAvailable: available && isPaid,
    refetch: query.refetch,
  };
}
