import { useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface AutomationRecipe {
  key: string;
  label: string;
  description: string;
  affected_systems: string[];
  confirmation_required: boolean;
}

export interface AutomationRunResult {
  run_id: string;
  recipe_key: string;
  status: "completed" | "failed";
  steps: Array<Record<string, unknown>>;
}

export function useAutomations(userId: string | null) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch available recipes
  const { data: recipes = [], isLoading: isLoadingRecipes } = useQuery({
    queryKey: ["automation-recipes"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return [];

      const res = await supabase.functions.invoke("run-automation", {
        body: { action: "list" },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.error) throw res.error;
      return (res.data?.recipes || []) as AutomationRecipe[];
    },
    enabled: !!userId,
    staleTime: 60 * 60 * 1000, // 1 hour - recipes don't change
  });

  // Fetch recent runs
  const { data: recentRuns = [] } = useQuery({
    queryKey: ["automation-runs", userId],
    queryFn: async () => {
      if (!userId) return [];
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("automation_runs")
        .select("id, recipe_key, status, result, created_at")
        .eq("user_id", userId)
        .gte("created_at", `${today}T00:00:00`)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
    staleTime: 30 * 1000,
  });

  // Run an automation
  const runMutation = useMutation({
    mutationFn: async ({ recipeKey, inputs }: { recipeKey: string; inputs?: Record<string, unknown> }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const res = await supabase.functions.invoke("run-automation", {
        body: { action: "run", recipe_key: recipeKey, inputs },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.error) throw res.error;
      return res.data as AutomationRunResult;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["automation-runs", userId] });
      queryClient.invalidateQueries({ queryKey: ["planner"] });
      queryClient.invalidateQueries({ queryKey: ["user-mode", userId] });
      
      const recipe = recipes.find(r => r.key === result.recipe_key);
      toast({
        title: result.status === "completed" ? "✅ Done" : "⚠️ Partial",
        description: recipe?.label || result.recipe_key,
      });
    },
    onError: (error) => {
      toast({
        title: "Automation failed",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    },
  });

  const runAutomation = useCallback(
    (recipeKey: string, inputs?: Record<string, unknown>) => {
      runMutation.mutate({ recipeKey, inputs });
    },
    [runMutation]
  );

  return {
    recipes,
    recentRuns,
    runAutomation,
    isRunning: runMutation.isPending,
    isLoadingRecipes,
  };
}
