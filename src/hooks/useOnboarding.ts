import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type FirstActionType = "quest" | "operator" | "rep";

export interface UserOnboarding {
  user_id: string;
  simplified_mode_completed: boolean;
  first_action_type: FirstActionType | null;
  first_action_completed_at: string | null;
  created_at: string;
}

export const useOnboarding = (userId: string | null) => {
  const queryClient = useQueryClient();

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

  // Create onboarding record if it doesn't exist
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
      } as any);
      queryClient.invalidateQueries({ queryKey: ["user-onboarding"] });
    }
  };

  // Complete onboarding (unlock full dashboard)
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
    ensureOnboardingRecord,
    completeOnboarding: completeOnboardingMutation.mutate,
    isCompletingOnboarding: completeOnboardingMutation.isPending,
  };
};
