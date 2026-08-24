import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface Insight {
  insight: string;
  generated_at: string;
}

/**
 * Hook to fetch AI-generated personalized insights for premium users
 * Insights are cached for 24 hours to minimize API calls
 */
export function useInsights(userId: string | undefined, isPaid: boolean) {
  return useQuery<Insight | null>({
    queryKey: ["user-insights", userId],
    queryFn: async () => {
      if (!userId) return null;

      const { data, error } = await supabase.functions.invoke("generate-insights", {
        body: {},
      });

      if (error) {
        console.error("Error fetching insights:", error);
        return null;
      }

      return data as Insight;
    },
    enabled: !!userId && isPaid,
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
    gcTime: 24 * 60 * 60 * 1000, // Keep in cache for 24 hours
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
  });
}
