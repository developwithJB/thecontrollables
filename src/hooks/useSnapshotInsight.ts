import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface SnapshotInsight {
  insight: string | null;
  generated_at: string;
  metrics?: {
    daysCompleted: number;
    totalXp: number;
    promiseRate: number | null;
    actionsCount: number;
  };
}

/**
 * Hook to fetch AI-generated insights specifically for a completed snapshot
 * Uses only the data from within the snapshot's date range
 */
export function useSnapshotInsight(
  userId: string | undefined,
  sessionId: string | undefined,
  isPaid: boolean,
  journeyInfo?: {
    id?: string | null;
    name?: string | null;
    focus?: string | null;
  }
) {
  return useQuery<SnapshotInsight | null>({
    queryKey: ["snapshot-insight", sessionId],
    queryFn: async () => {
      if (!userId || !sessionId) return null;

      const { data, error } = await supabase.functions.invoke("generate-snapshot-insight", {
        body: {
          userId,
          sessionId,
          journeyId: journeyInfo?.id,
          journeyName: journeyInfo?.name,
          journeyFocus: journeyInfo?.focus,
        },
      });

      if (error) {
        console.error("Error fetching snapshot insight:", error);
        return null;
      }

      return data as SnapshotInsight;
    },
    enabled: !!userId && !!sessionId && isPaid,
    staleTime: 7 * 24 * 60 * 60 * 1000, // Cache for 7 days (completed snapshot won't change)
    gcTime: 7 * 24 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
  });
}
