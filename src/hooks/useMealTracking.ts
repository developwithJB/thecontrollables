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
}

export interface MealPlan {
  id: string;
  user_id: string;
  plan_date: string;
  meals: MealPlanMeal[];
  generated_by: string;
  created_at: string;
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

      // Upload photo if provided
      if (imageFile) {
        const fileExt = imageFile.name.split(".").pop() || "jpg";
        const filePath = `${userId}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from("meal-photos")
          .upload(filePath, imageFile, { cacheControl: "3600" });
        if (uploadError) throw uploadError;
        image_path = filePath;

        // Convert to base64 for AI
        const buffer = await imageFile.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        let binary = "";
        for (let i = 0; i < bytes.length; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        image_base64 = btoa(binary);
      }

      // Call AI analysis
      const { data: fnData, error: fnError } = await supabase.functions.invoke("ai-meal-analyze", {
        body: { description, image_base64 },
      });

      if (fnError) throw fnError;
      const analysis = fnData as MealAnalysis;

      // Save meal log
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
    mutationFn: async (opts?: { preferences?: string; calorie_target?: number }) => {
      if (!userId) throw new Error("Not authenticated");

      const { data: fnData, error: fnError } = await supabase.functions.invoke("ai-meal-plan", {
        body: { date: today, preferences: opts?.preferences, calorie_target: opts?.calorie_target },
      });
      if (fnError) throw fnError;

      const plan = fnData as { meals: MealPlanMeal[]; satellite_tip: string };

      // Upsert meal plan
      const { error: upsertError } = await supabase.from("meal_plans").upsert({
        user_id: userId,
        plan_date: today,
        meals: plan.meals as any,
        generated_by: "ai",
      }, { onConflict: "user_id,plan_date" });
      if (upsertError) throw upsertError;

      return plan;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meal-plan", userId, today] });
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

  return {
    todayMeals,
    mealsLoading,
    todayPlan,
    planLoading,
    analyzeMeal,
    generatePlan,
    dailyTotals,
  };
}
