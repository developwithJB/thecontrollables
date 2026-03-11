import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface MealAnalysis {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  items: { name: string; portion: string; calories: number }[];
  satellite_tip: string;
}

export interface MealLog {
  id: string;
  user_id: string;
  log_date: string;
  meal_type: string;
  description: string | null;
  image_path: string | null;
  ai_analysis: MealAnalysis | null;
  created_at: string;
}

export interface MealPlanMeal {
  meal_type: string;
  name: string;
  description: string;
  est_calories: number;
  est_protein?: number;
  est_carbs?: number;
  est_fat?: number;
}

export interface MealPlan {
  id: string;
  user_id: string;
  plan_date: string;
  meals: MealPlanMeal[];
  generated_by: string;
  created_at: string;
}

export interface MealSlotConfig {
  excludeMeals?: string[];
  snackCount?: number;
}

export function useMealTracking(userId: string | null) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const today = new Date().toLocaleDateString("sv-SE");

  // Fetch today's meal logs
  const { data: todayMeals = [], isLoading: mealsLoading } = useQuery({
    queryKey: ["meal-logs", userId, today],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("meal_logs")
        .select("*")
        .eq("user_id", userId)
        .eq("log_date", today)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as MealLog[];
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
  });

  // Fetch today's meal plan
  const { data: todayPlan, isLoading: planLoading } = useQuery({
    queryKey: ["meal-plan", userId, today],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from("meal_plans")
        .select("*")
        .eq("user_id", userId)
        .eq("plan_date", today)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as MealPlan | null;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  // Analyze meal via AI
  const analyzeMeal = useMutation({
    mutationFn: async ({ description, imageFile, mealType }: {
      description?: string;
      imageFile?: File;
      mealType: string;
    }) => {
      if (!userId) throw new Error("Not authenticated");

      let image_base64: string | undefined;
      let image_path: string | undefined;

      if (imageFile) {
        const fileExt = imageFile.name.split(".").pop() || "jpg";
        const filePath = `${userId}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from("meal-photos")
          .upload(filePath, imageFile, { cacheControl: "3600" });
        if (uploadError) throw uploadError;
        image_path = filePath;

        const buffer = await imageFile.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        let binary = "";
        for (let i = 0; i < bytes.length; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        image_base64 = btoa(binary);
      }

      const { data: fnData, error: fnError } = await supabase.functions.invoke("ai-meal-analyze", {
        body: { description, image_base64 },
      });

      if (fnError) throw fnError;
      const analysis = fnData as MealAnalysis;

      const { error: insertError } = await supabase.from("meal_logs").insert({
        user_id: userId,
        log_date: today,
        meal_type: mealType,
        description: description || null,
        image_path: image_path || null,
        ai_analysis: analysis as any,
      });
      if (insertError) throw insertError;

      return analysis;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meal-logs", userId, today] });
    },
    onError: (err: any) => {
      toast({
        title: "Analysis failed",
        description: err?.message || "Could not analyze meal",
        variant: "destructive",
      });
    },
  });

  // Generate meal plan via AI
  const generatePlan = useMutation({
    mutationFn: async (opts?: {
      preferences?: string;
      calorie_target?: number;
      excludeMeals?: string[];
      snackCount?: number;
      date?: string;
      macro_targets?: { proteinTarget?: number; carbsTarget?: number; fatTarget?: number };
      dietary_style?: string;
      dietary_restrictions?: string[];
    }) => {
      if (!userId) throw new Error("Not authenticated");

      const planDate = opts?.date || today;

      const { data: fnData, error: fnError } = await supabase.functions.invoke("ai-meal-plan", {
        body: {
          date: planDate,
          preferences: opts?.preferences,
          calorie_target: opts?.calorie_target,
          exclude_meals: opts?.excludeMeals,
          snack_count: opts?.snackCount,
          macro_targets: opts?.macro_targets,
          dietary_style: opts?.dietary_style,
          dietary_restrictions: opts?.dietary_restrictions,
        },
      });
      if (fnError) throw fnError;

      const plan = fnData as { meals: MealPlanMeal[]; satellite_tip: string };

      const { error: upsertError } = await supabase.from("meal_plans").upsert({
        user_id: userId,
        plan_date: planDate,
        meals: plan.meals as any,
        generated_by: "ai",
      }, { onConflict: "user_id,plan_date" });
      if (upsertError) throw upsertError;

      return plan;
    },
    onSuccess: (_data, vars) => {
      const planDate = vars?.date || today;
      queryClient.invalidateQueries({ queryKey: ["meal-plan", userId, planDate] });
      queryClient.invalidateQueries({ queryKey: ["meal-week-comparison", userId] });
      queryClient.invalidateQueries({ queryKey: ["meal-week-plans", userId] });
      toast({ title: "🛰️ Meal plan generated", description: "Satellite has your fuel mapped out." });
    },
    onError: (err: any) => {
      toast({
        title: "Plan generation failed",
        description: err?.message || "Could not generate plan",
        variant: "destructive",
      });
    },
  });

  // Update meals in an existing plan (remove a meal, etc.)
  const updatePlanMeals = useMutation({
    mutationFn: async ({ planId, meals, planDate }: { planId: string; meals: MealPlanMeal[]; planDate?: string }) => {
      if (!userId) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("meal_plans")
        .update({ meals: meals as any })
        .eq("id", planId)
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["meal-plan", userId] });
      queryClient.invalidateQueries({ queryKey: ["meal-week-plans", userId] });
      queryClient.invalidateQueries({ queryKey: ["meal-week-comparison", userId] });
    },
  });

  // Generate week plan (7 days)
  const generateWeekPlan = useMutation({
    mutationFn: async (opts?: MealSlotConfig & { preferences?: string; calorie_target?: number }) => {
      if (!userId) throw new Error("Not authenticated");

      const results: { date: string; meals: MealPlanMeal[] }[] = [];

      for (let i = 0; i < 7; i++) {
        const d = new Date();
        d.setDate(d.getDate() + i);
        const dateStr = d.toLocaleDateString("sv-SE");

        const { data: fnData, error: fnError } = await supabase.functions.invoke("ai-meal-plan", {
          body: {
            date: dateStr,
            preferences: opts?.preferences,
            calorie_target: opts?.calorie_target,
            exclude_meals: opts?.excludeMeals,
            snack_count: opts?.snackCount,
          },
        });
        if (fnError) throw fnError;

        const plan = fnData as { meals: MealPlanMeal[]; satellite_tip: string };

        await supabase.from("meal_plans").upsert({
          user_id: userId,
          plan_date: dateStr,
          meals: plan.meals as any,
          generated_by: "ai",
        }, { onConflict: "user_id,plan_date" });

        results.push({ date: dateStr, meals: plan.meals });
      }

      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meal-plan", userId] });
      queryClient.invalidateQueries({ queryKey: ["meal-week-comparison", userId] });
      queryClient.invalidateQueries({ queryKey: ["meal-week-plans", userId] });
      toast({ title: "🛰️ Week plan generated", description: "7 days of fuel mapped out." });
    },
    onError: (err: any) => {
      toast({
        title: "Week plan failed",
        description: err?.message || "Could not generate week plan",
        variant: "destructive",
      });
    },
  });

  // Daily totals
  const dailyTotals = todayMeals.reduce(
    (acc, meal) => {
      const a = meal.ai_analysis;
      if (a) {
        acc.calories += a.calories || 0;
        acc.protein += a.protein || 0;
        acc.carbs += a.carbs || 0;
        acc.fat += a.fat || 0;
      }
      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  // Add meal to planner as a time_block
  const addMealToPlanner = useMutation({
    mutationFn: async ({ meal, date }: { meal: MealPlanMeal; date?: string }) => {
      if (!userId) throw new Error("Not authenticated");
      const planDate = date || today;
      
      const mealTimeMap: Record<string, { start: string; end: string }> = {
        breakfast: { start: "07:00", end: "07:30" },
        lunch: { start: "12:00", end: "12:30" },
        dinner: { start: "18:00", end: "18:30" },
        snack: { start: "15:00", end: "15:15" },
      };
      const times = mealTimeMap[meal.meal_type] || mealTimeMap.snack;

      const { error } = await supabase
        .from("planner_items" as any)
        .insert({
          user_id: userId,
          title: `🛰️ ${meal.name}`,
          item_type: "time_block",
          scheduled_date: planDate,
          start_time: times.start,
          end_time: times.end,
          description: `${meal.description}\n~${meal.est_calories} cal${meal.est_protein ? ` · ${meal.est_protein}g protein` : ""}`,
          sort_order: 0,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["planner-items"] });
      queryClient.invalidateQueries({ queryKey: ["planner-items-today"] });
      toast({ title: "🛰️ Added to Planner", description: "Meal block added to your schedule." });
    },
    onError: (err: any) => {
      toast({ title: "Failed to add", description: err?.message || "Could not add meal to planner", variant: "destructive" });
    },
  });

  return {
    todayMeals,
    mealsLoading,
    todayPlan,
    planLoading,
    analyzeMeal,
    generatePlan,
    updatePlanMeals,
    generateWeekPlan,
    dailyTotals,
    addMealToPlanner,
  };
}
