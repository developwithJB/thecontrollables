import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface MealPreferences {
  excludeMeals: string[];
  snackCount: number;
}

const DEFAULT_PREFS: MealPreferences = { excludeMeals: [], snackCount: 1 };

export function useMealPreferences(userId: string | null) {
  const queryClient = useQueryClient();

  const { data: preferences = DEFAULT_PREFS, isLoading } = useQuery({
    queryKey: ["meal-preferences", userId],
    queryFn: async (): Promise<MealPreferences> => {
      if (!userId) return DEFAULT_PREFS;
      const { data, error } = await supabase
        .from("profiles")
        .select("meal_preferences")
        .eq("id", userId)
        .maybeSingle();
      if (error) throw error;
      const raw = (data?.meal_preferences as any) || {};
      return {
        excludeMeals: Array.isArray(raw.excludeMeals) ? raw.excludeMeals : [],
        snackCount: typeof raw.snackCount === "number" ? raw.snackCount : 1,
      };
    },
    enabled: !!userId,
    staleTime: 10 * 60 * 1000,
  });

  const savePreferences = useMutation({
    mutationFn: async (prefs: MealPreferences) => {
      if (!userId) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("profiles")
        .update({ meal_preferences: prefs as any })
        .eq("id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meal-preferences", userId] });
    },
  });

  return { preferences, isLoading, savePreferences };
}
