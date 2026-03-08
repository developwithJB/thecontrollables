import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface MealPreferences {
  excludeMeals: string[];
  snackCount: number;
  calorieTarget?: number;
  proteinTarget?: number;
  carbsTarget?: number;
  fatTarget?: number;
  dietaryStyle?: string;
  dietaryRestrictions?: string[];
}

const DEFAULT_PREFS: MealPreferences = { excludeMeals: [], snackCount: 1, dietaryStyle: "", dietaryRestrictions: [] };

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
        calorieTarget: typeof raw.calorieTarget === "number" ? raw.calorieTarget : undefined,
        proteinTarget: typeof raw.proteinTarget === "number" ? raw.proteinTarget : undefined,
        carbsTarget: typeof raw.carbsTarget === "number" ? raw.carbsTarget : undefined,
        fatTarget: typeof raw.fatTarget === "number" ? raw.fatTarget : undefined,
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
