import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type GoalType = "sleep_hours" | "steps" | "sleep_rating" | "movement_rating" | "nutrition_rating";

export interface WellnessGoal {
  id: string;
  user_id: string;
  goal_type: GoalType;
  target_value: number;
  created_at: string;
  updated_at: string;
}

export interface GoalProgress {
  goalType: GoalType;
  target: number;
  current: number;
  percentage: number;
  isComplete: boolean;
}

const GOAL_DEFAULTS: Record<GoalType, number> = {
  sleep_hours: 8,
  steps: 10000,
  sleep_rating: 4,
  movement_rating: 4,
  nutrition_rating: 4,
};

const GOAL_LABELS: Record<GoalType, { label: string; unit: string; icon: string }> = {
  sleep_hours: { label: "Sleep", unit: "hrs", icon: "😴" },
  steps: { label: "Steps", unit: "", icon: "🚶" },
  sleep_rating: { label: "Sleep Quality", unit: "/5", icon: "⭐" },
  movement_rating: { label: "Movement", unit: "/5", icon: "💪" },
  nutrition_rating: { label: "Nutrition", unit: "/5", icon: "🥗" },
};

export const getGoalMeta = (goalType: GoalType) => GOAL_LABELS[goalType];
export const getGoalDefault = (goalType: GoalType) => GOAL_DEFAULTS[goalType];

export function useWellnessGoals(userId: string | null) {
  const queryClient = useQueryClient();
  const today = new Date().toISOString().split("T")[0];

  // Fetch user's goals
  const { data: goals = [], isLoading: goalsLoading } = useQuery({
    queryKey: ["wellness-goals", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("wellness_goals")
        .select("*")
        .eq("user_id", userId);
      if (error) throw error;
      return (data || []) as WellnessGoal[];
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch today's health data for steps/sleep_hours
  const { data: healthData } = useQuery({
    queryKey: ["health-sync-today", userId, today],
    queryFn: async () => {
      if (!userId) return null;
      const { data } = await supabase
        .from("health_sync_data")
        .select("steps, sleep_minutes")
        .eq("user_id", userId)
        .eq("sync_date", today)
        .maybeSingle();
      return data;
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
  });

  // Fetch today's wellness log for ratings
  const { data: wellnessLog } = useQuery({
    queryKey: ["wellness-log-today", userId, today],
    queryFn: async () => {
      if (!userId) return null;
      const { data } = await supabase
        .from("wellness_logs")
        .select("sleep_rating, movement_rating, nutrition_rating")
        .eq("user_id", userId)
        .eq("log_date", today)
        .maybeSingle();
      return data;
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
  });

  // Calculate progress for each goal
  const goalProgress: GoalProgress[] = goals.map((goal) => {
    let current = 0;

    switch (goal.goal_type) {
      case "steps":
        current = healthData?.steps || 0;
        break;
      case "sleep_hours":
        current = (healthData?.sleep_minutes || 0) / 60;
        break;
      case "sleep_rating":
        current = wellnessLog?.sleep_rating || 0;
        break;
      case "movement_rating":
        current = wellnessLog?.movement_rating || 0;
        break;
      case "nutrition_rating":
        current = wellnessLog?.nutrition_rating || 0;
        break;
    }

    const percentage = goal.target_value > 0 ? Math.min((current / goal.target_value) * 100, 100) : 0;

    return {
      goalType: goal.goal_type as GoalType,
      target: goal.target_value,
      current,
      percentage,
      isComplete: current >= goal.target_value,
    };
  });

  // Upsert a goal
  const upsertGoalMutation = useMutation({
    mutationFn: async ({ goalType, targetValue }: { goalType: GoalType; targetValue: number }) => {
      if (!userId) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("wellness_goals")
        .upsert(
          {
            user_id: userId,
            goal_type: goalType,
            target_value: targetValue,
          },
          { onConflict: "user_id,goal_type" }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wellness-goals", userId] });
    },
  });

  // Delete a goal
  const deleteGoalMutation = useMutation({
    mutationFn: async (goalType: GoalType) => {
      if (!userId) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("wellness_goals")
        .delete()
        .eq("user_id", userId)
        .eq("goal_type", goalType);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wellness-goals", userId] });
    },
  });

  // Bulk upsert goals (for presets)
  const setGoalsMutation = useMutation({
    mutationFn: async (goalsToSet: { goalType: GoalType; targetValue: number }[]) => {
      if (!userId) throw new Error("Not authenticated");
      for (const g of goalsToSet) {
        const { error } = await supabase
          .from("wellness_goals")
          .upsert(
            {
              user_id: userId,
              goal_type: g.goalType,
              target_value: g.targetValue,
            },
            { onConflict: "user_id,goal_type" }
          );
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wellness-goals", userId] });
    },
  });

  return {
    goals,
    goalProgress,
    isLoading: goalsLoading,
    upsertGoal: upsertGoalMutation.mutateAsync,
    deleteGoal: deleteGoalMutation.mutateAsync,
    setGoals: setGoalsMutation.mutateAsync,
    isUpdating: upsertGoalMutation.isPending || setGoalsMutation.isPending,
  };
}
