import { useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface OSPlanItem {
  id: string;
  title: string;
  reason: string;
  source: string;
  deep_link: string;
}

export interface OSTimeBlock {
  title: string;
  start: string;
  end: string;
  energy: "low" | "medium" | "high";
  source: string;
}

export interface OSQuickWin {
  id: string;
  title: string;
  action_link: string;
  reason: string;
}

export interface OSBlocker {
  text: string;
  reason: string;
}

export interface OSFallback {
  title: string;
  description: string;
  items: string[];
}

export interface DailyOSPlan {
  top_three: OSPlanItem[];
  suggested_time_blocks: OSTimeBlock[];
  quick_wins: OSQuickWin[];
  blockers_or_risks: OSBlocker[];
  fallback_plan: OSFallback;
  why_today: string;
  generated_by: "ai" | "rules";
}

export type InteractionState = "done" | "snoozed" | "dismissed";

export interface DailyOSResponse {
  plan: DailyOSPlan | null;
  planId: string | null;
  interactions: Record<string, InteractionState>;
  refreshCount: number;
  refreshLimitReached: boolean;
  cached: boolean;
  generatedBy: "ai" | "rules";
  isLoading: boolean;
  error: Error | null;
}

const QUERY_KEY = "daily-os-plan";

export function useDailyOSPlan(userId: string | null) {
  const today = new Date().toLocaleDateString("sv-SE");
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const { data, isLoading, error } = useQuery({
    queryKey: [QUERY_KEY, userId, today],
    queryFn: async (): Promise<DailyOSResponse> => {
      const { data: result, error: fnError } = await supabase.functions.invoke("daily-os-plan", {
        body: { localDate: today, timezone },
      });

      if (fnError) throw fnError;

      return {
        plan: result?.plan ?? null,
        planId: result?.plan_id ?? null,
        interactions: result?.interactions ?? {},
        refreshCount: result?.refresh_count ?? 0,
        refreshLimitReached: result?.refresh_limit_reached ?? false,
        cached: result?.cached ?? false,
        generatedBy: result?.generated_by ?? "rules",
        isLoading: false,
        error: null,
      };
    },
    enabled: !!userId,
    staleTime: 10 * 60 * 1000, // 10 min — only regenerate on explicit refresh
    gcTime: 30 * 60 * 1000,
    retry: 1,
  });

  return {
    plan: data?.plan ?? null,
    planId: data?.planId ?? null,
    interactions: data?.interactions ?? {},
    refreshCount: data?.refreshCount ?? 0,
    refreshLimitReached: data?.refreshLimitReached ?? false,
    cached: data?.cached ?? false,
    generatedBy: data?.generatedBy ?? "rules",
    isLoading,
    error: error as Error | null,
  };
}

export function useUpdateDailyOSInteraction() {
  const queryClient = useQueryClient();
  const today = new Date().toLocaleDateString("sv-SE");

  return useMutation({
    mutationFn: async ({ planId, itemId, state }: { planId: string; itemId: string; state: InteractionState }) => {
      const { data: existing } = await supabase
        .from("daily_os_plans")
        .select("interactions")
        .eq("id", planId)
        .maybeSingle();

      const current = (existing?.interactions as Record<string, InteractionState>) ?? {};
      const updated = { ...current, [itemId]: state };

      const { error } = await supabase
        .from("daily_os_plans")
        .update({ interactions: updated })
        .eq("id", planId);

      if (error) throw error;
      return updated;
    },
    onMutate: async ({ itemId, state }) => {
      // Cancel and optimistically update ALL matching queries
      await queryClient.cancelQueries({ queryKey: [QUERY_KEY] });

      // Find the active query data by partial key match
      const queries = queryClient.getQueriesData<DailyOSResponse>({ queryKey: [QUERY_KEY] });
      const snapshots: { queryKey: readonly unknown[]; data: DailyOSResponse }[] = [];

      for (const [queryKey, data] of queries) {
        if (data) {
          snapshots.push({ queryKey, data });
          queryClient.setQueryData<DailyOSResponse>(queryKey, {
            ...data,
            interactions: { ...data.interactions, [itemId]: state },
          });
        }
      }
      return { snapshots };
    },
    onError: (_err, _vars, ctx) => {
      // Rollback all snapshots
      for (const { queryKey, data } of ctx?.snapshots ?? []) {
        queryClient.setQueryData(queryKey, data);
      }
    },
  });
}

export function useRefreshDailyOS(userId: string | null) {
  const queryClient = useQueryClient();
  const today = new Date().toLocaleDateString("sv-SE");
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return useMutation({
    mutationFn: async () => {
      const { data: result, error: fnError } = await supabase.functions.invoke("daily-os-plan", {
        body: { localDate: today, timezone, forceRefresh: true },
      });
      if (fnError) throw fnError;
      if (result?.refresh_limit_reached) {
        throw new Error("refresh_limit_reached");
      }
      return result;
    },
    onSuccess: (result) => {
      queryClient.setQueryData<DailyOSResponse>([QUERY_KEY, userId, today], {
        plan: result?.plan ?? null,
        planId: result?.plan_id ?? null,
        interactions: result?.interactions ?? {},
        refreshCount: result?.refresh_count ?? 0,
        refreshLimitReached: result?.refresh_limit_reached ?? false,
        cached: false,
        generatedBy: result?.generated_by ?? "rules",
        isLoading: false,
        error: null,
      });
    },
    onError: (err) => {
      if (err instanceof Error && err.message === "refresh_limit_reached") {
        toast.info("Refresh limit reached", {
          description: "You've refreshed your Daily OS 3 times today. Come back tomorrow for a fresh plan.",
        });
      } else {
        toast.error("Failed to refresh plan", { description: "Please try again." });
      }
    },
  });
}
