import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getFeatureFlag } from "@/lib/featureFlags";

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
}

export const useOnboarding = (userId: string | null) => {
  const queryClient = useQueryClient();
  const quickStartEnabled = getFeatureFlag("onboarding_quick_start_enabled");

  // Fetch user's onboarding status
  const { data: onboarding, isLoading } = useQuery({
    queryKey: ["user-onboarding", userId],
    queryFn: async () => {
      if (!userId) return null;
      
      const { data, error } = await supabase
        .from("user_onboarding" as any)
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) throw error;
      return data as unknown as UserOnboarding | null;
    },
    enabled: !!userId,
  });

  // Check if user is in simplified mode (new user)
  const isSimplifiedMode = !onboarding?.simplified_mode_completed;
  
  // Check if user needs to complete onboarding flow (new guided onboarding)
  const needsOnboarding =
    quickStartEnabled &&
    onboarding &&
    onboarding.onboarding_step !== "completed" &&
    onboarding.onboarding_step !== null;

  // Create onboarding record if it doesn't exist (for new users, starts onboarding flow)
  const ensureOnboardingRecord = async () => {
    if (!userId) return;
    
    const { data: existing } = await supabase
      .from("user_onboarding" as any)
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (!existing) {
      await supabase.from("user_onboarding" as any).insert({
        user_id: userId,
        simplified_mode_completed: false,
        onboarding_step: quickStartEnabled ? "welcome_integrations" : null,
        build_assessment_completed: false,
      } as any);
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
        .from("user_onboarding" as any)
        .update(updateData as any)
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

  // Complete onboarding (unlock full dashboard) - legacy method
  const completeOnboardingMutation = useMutation({
    mutationFn: async (actionType: FirstActionType) => {
      if (!userId) throw new Error("Not authenticated");

      // Ensure record exists first
      await ensureOnboardingRecord();

      const { data, error } = await supabase
        .from("user_onboarding" as any)
        .update({
          simplified_mode_completed: true,
          first_action_type: actionType,
          first_action_completed_at: new Date().toISOString(),
          onboarding_step: "completed",
        } as any)
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
    currentOnboardingStep: quickStartEnabled ? onboarding?.onboarding_step || null : null,
    journeyControllable: onboarding?.journey_controllable || null,
    ensureOnboardingRecord,
    updateOnboardingProgress: updateOnboardingProgressMutation.mutateAsync,
    isUpdatingOnboarding: updateOnboardingProgressMutation.isPending,
    completeOnboarding: completeOnboardingMutation.mutate,
    isCompletingOnboarding: completeOnboardingMutation.isPending,
  };
};
