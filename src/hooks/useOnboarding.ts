import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getFeatureFlag } from "@/lib/featureFlags";
import { isDevMockAuthEnabled } from "@/lib/devMockAuth";
import {
  RESET_ONBOARDING_ENTRY_STEP,
  getEffectiveOnboardingStep,
  shouldForceNewOnboardingExperience,
} from "@/lib/onboardingReset";
import type { DailyOperatorOnboardingAnswers } from "@/lib/operatorOnboarding";
import type { Json } from "@/integrations/supabase/types";

export type FirstActionType = "quest" | "operator" | "rep";
export type OnboardingStep = "welcome_integrations" | "build_assessment" | "archetype_result" | "journey_selection" | "completed";

export interface UserOnboarding {
  user_id: string;
  simplified_mode_completed: boolean;
  first_action_type: FirstActionType | null;
  first_action_completed_at: string | null;
  created_at: string;
  // New onboarding flow fields
  onboarding_step: OnboardingStep | null;
  build_assessment_completed: boolean;
  build_assessment_completed_at: string | null;
  journey_controllable: string | null;
  journey_selected_at: string | null;
  operator_onboarding_completed: boolean;
  operator_onboarding_answers: DailyOperatorOnboardingAnswers | Record<string, never>;
  operator_onboarding_completed_at: string | null;
}

export const useOnboarding = (userId: string | null) => {
  const queryClient = useQueryClient();
  const quickStartEnabled = getFeatureFlag("onboarding_quick_start_enabled");
  const devMock = isDevMockAuthEnabled();

  // Fetch user's onboarding status
  const { data: fetchedOnboarding, isLoading: fetchedOnboardingLoading } = useQuery({
    queryKey: ["user-onboarding", userId],
    queryFn: async () => {
      if (!userId) return null;
      
      const { data, error } = await supabase
        .from("user_onboarding")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) throw error;
      if (data) return data as unknown as UserOnboarding;

      const { data: created, error: createError } = await supabase
        .from("user_onboarding")
        .insert({
          user_id: userId,
          simplified_mode_completed: false,
          onboarding_step: RESET_ONBOARDING_ENTRY_STEP,
          build_assessment_completed: false,
          operator_onboarding_completed: false,
          operator_onboarding_completed_at: null,
        })
        .select()
        .single();

      if (createError) throw createError;
      return created as unknown as UserOnboarding;
    },
    enabled: !!userId && !devMock,
  });

  const onboarding: UserOnboarding | null = devMock && userId
    ? {
        user_id: userId,
        simplified_mode_completed: true,
        first_action_type: "operator",
        first_action_completed_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        onboarding_step: "completed",
        build_assessment_completed: true,
        build_assessment_completed_at: new Date().toISOString(),
        journey_controllable: "habit",
        journey_selected_at: new Date().toISOString(),
        operator_onboarding_completed: true,
        operator_onboarding_answers: {},
        operator_onboarding_completed_at: new Date().toISOString(),
      }
    : fetchedOnboarding ?? null;
  const isLoading = devMock ? false : fetchedOnboardingLoading;

  const forceNewOnboardingExperience = shouldForceNewOnboardingExperience(onboarding);
  const effectiveOnboardingStep = getEffectiveOnboardingStep(onboarding, RESET_ONBOARDING_ENTRY_STEP) as OnboardingStep | null;

  // Check if user is in simplified mode (new user)
  const isSimplifiedMode = !onboarding?.simplified_mode_completed;
  
  // Check if user needs to complete onboarding flow (new guided onboarding)
  const needsOnboarding =
    quickStartEnabled &&
    onboarding &&
    (forceNewOnboardingExperience || onboarding.onboarding_step !== "completed");

  // Create onboarding record if it doesn't exist (for new users, starts onboarding flow)
  const ensureOnboardingRecord = async () => {
    if (!userId) return;
    
    const { data: existing } = await supabase
      .from("user_onboarding")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (!existing) {
      await supabase.from("user_onboarding").insert({
        user_id: userId,
        simplified_mode_completed: false,
        onboarding_step: RESET_ONBOARDING_ENTRY_STEP,
        build_assessment_completed: false,
        operator_onboarding_completed: false,
      });
      queryClient.invalidateQueries({ queryKey: ["user-onboarding"] });
    }
  };

  // Update onboarding progress (for new guided flow)
  const updateOnboardingProgressMutation = useMutation({
    mutationFn: async (data: {
      step: OnboardingStep;
      buildCompleted?: boolean;
      journeyControllable?: string;
    }) => {
      if (!userId) throw new Error("Not authenticated");

      const updateData: Record<string, unknown> = {
        onboarding_step: data.step,
      };

      if (data.buildCompleted) {
        updateData.build_assessment_completed = true;
        updateData.build_assessment_completed_at = new Date().toISOString();
      }

      if (data.journeyControllable) {
        updateData.journey_controllable = data.journeyControllable;
        updateData.journey_selected_at = new Date().toISOString();
      }

      // When completing onboarding, also mark simplified mode as done
      if (data.step === "completed") {
        updateData.simplified_mode_completed = true;
        updateData.first_action_completed_at = new Date().toISOString();
      }

      const { data: result, error } = await supabase
        .from("user_onboarding")
        .update(updateData)
        .eq("user_id", userId)
        .select()
        .single();

      if (error) throw error;
      return result as unknown as UserOnboarding;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-onboarding"] });
    },
  });

  const completeDailyOperatorOnboardingMutation = useMutation({
    mutationFn: async (answers: DailyOperatorOnboardingAnswers) => {
      if (!userId) throw new Error("Not authenticated");

      await ensureOnboardingRecord();

      const { data, error } = await supabase
        .from("user_onboarding")
        .upsert({
          user_id: userId,
          simplified_mode_completed: true,
          first_action_type: "operator",
          first_action_completed_at: new Date().toISOString(),
          onboarding_step: "completed",
          operator_onboarding_completed: true,
          operator_onboarding_answers: answers as unknown as Json,
          operator_onboarding_completed_at: new Date().toISOString(),
        }, { onConflict: "user_id" })
        .select()
        .single();

      if (error) throw error;
      const { error: briefError } = await supabase.functions.invoke("ai-orchestrator", {
        body: {
          mode: "daily_brief",
          localDate: new Date().toLocaleDateString("sv-SE"),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          forceRefresh: true,
        },
      });
      if (briefError) console.warn("Could not prebuild Daily Operator Brief:", briefError);
      return data as unknown as UserOnboarding;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-onboarding"] });
      queryClient.invalidateQueries({ queryKey: ["ai-daily-operator-brief", userId] });
    },
  });

  const resetDailyOperatorOnboardingMutation = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("Not authenticated");

      await ensureOnboardingRecord();

      const { data, error } = await supabase
        .from("user_onboarding")
        .update({
          operator_onboarding_completed: false,
          operator_onboarding_completed_at: null,
        })
        .eq("user_id", userId)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as UserOnboarding;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-onboarding"] });
    },
  });

  // Complete onboarding (unlock full dashboard) - legacy method
  const completeOnboardingMutation = useMutation({
    mutationFn: async (actionType: FirstActionType) => {
      if (!userId) throw new Error("Not authenticated");

      // Ensure record exists first
      await ensureOnboardingRecord();

      const { data, error } = await supabase
        .from("user_onboarding")
        .update({
          simplified_mode_completed: true,
          first_action_type: actionType,
          first_action_completed_at: new Date().toISOString(),
          onboarding_step: "completed",
        })
        .eq("user_id", userId)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as UserOnboarding;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-onboarding"] });
      
      // Calm confirmation message
      toast("Momentum started. The rest can wait.", {
        duration: 4000,
      });
    },
  });

  return {
    onboarding,
    isLoading,
    isSimplifiedMode,
    needsOnboarding,
    needsDailyOperatorOnboarding: !needsOnboarding && onboarding?.operator_onboarding_completed === false,
    currentOnboardingStep: quickStartEnabled ? effectiveOnboardingStep : null,
    journeyControllable: onboarding?.journey_controllable || null,
    ensureOnboardingRecord,
    updateOnboardingProgress: updateOnboardingProgressMutation.mutateAsync,
    isUpdatingOnboarding: updateOnboardingProgressMutation.isPending,
    completeDailyOperatorOnboarding: completeDailyOperatorOnboardingMutation.mutateAsync,
    isCompletingDailyOperatorOnboarding: completeDailyOperatorOnboardingMutation.isPending,
    resetDailyOperatorOnboarding: resetDailyOperatorOnboardingMutation.mutateAsync,
    isResettingDailyOperatorOnboarding: resetDailyOperatorOnboardingMutation.isPending,
    completeOnboarding: completeOnboardingMutation.mutate,
    isCompletingOnboarding: completeOnboardingMutation.isPending,
  };
};
