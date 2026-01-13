import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface BuildQuestion {
  id: string;
  controllable: string;
  question_key: string;
  prompt: string;
  order_index: number;
}

export interface UserBuildCurrent {
  user_id: string;
  awareness: number;
  perspective: number;
  habit: number;
  wellness: number;
  environment: number;
  overall: number;
  build_archetype_key: string | null;
  last_assessment_id: string | null;
  updated_at: string;
}

export interface BuildScore {
  id: string;
  assessment_id: string;
  user_id: string;
  awareness: number;
  perspective: number;
  habit: number;
  wellness: number;
  environment: number;
  overall: number;
  build_archetype_key: string;
  computed_at: string;
}

const ARCHETYPE_LABELS: Record<string, { label: string; description: string }> = {
  stable_build: {
    label: "Stable Build",
    description: "All systems functioning well. Maintain and optimize.",
  },
  driven_but_depleting: {
    label: "Driven but Depleting",
    description: "Strong on habits, but running low on energy. Prioritize recovery.",
  },
  clear_but_fighting_friction: {
    label: "Clear but Fighting Friction",
    description: "High awareness, but your environment works against you. Redesign your surroundings.",
  },
  capable_but_inconsistent: {
    label: "Capable but Inconsistent",
    description: "Good energy, but missing reps. Focus on showing up daily.",
  },
  custom_build: {
    label: "Custom Build",
    description: "Your unique pattern. Review your scores to find opportunities.",
  },
};

export function getArchetypeInfo(key: string | null) {
  if (!key) return ARCHETYPE_LABELS.custom_build;
  return ARCHETYPE_LABELS[key] || ARCHETYPE_LABELS.custom_build;
}

export function useBuildAssessment() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch active questions
  const { data: questions = [], isLoading: questionsLoading } = useQuery({
    queryKey: ["build-questions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("build_questions")
        .select("*")
        .eq("is_active", true)
        .order("order_index", { ascending: true });
      if (error) throw error;
      return data as BuildQuestion[];
    },
  });

  // Fetch current build for user
  const { data: currentBuild, isLoading: buildLoading } = useQuery({
    queryKey: ["user-build-current"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("user_build_current")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      
      if (error) throw error;
      return data as UserBuildCurrent | null;
    },
  });

  // Fetch assessment history
  const { data: assessmentHistory = [], isLoading: historyLoading } = useQuery({
    queryKey: ["build-assessment-history"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("build_scores")
        .select("*")
        .eq("user_id", user.id)
        .order("computed_at", { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data as BuildScore[];
    },
  });

  // Submit assessment mutation
  const submitAssessmentMutation = useMutation({
    mutationFn: async (answers: Record<string, number>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Create assessment
      const { data: assessment, error: assessmentError } = await supabase
        .from("build_assessments")
        .insert({ user_id: user.id })
        .select()
        .single();

      if (assessmentError) throw assessmentError;

      // Insert all answers
      const answerRows = Object.entries(answers).map(([questionId, score]) => ({
        assessment_id: assessment.id,
        question_id: questionId,
        score,
      }));

      const { error: answersError } = await supabase
        .from("build_answers")
        .insert(answerRows);

      if (answersError) throw answersError;

      // The trigger will auto-compute scores, but we need to wait and fetch
      // Give the trigger a moment to complete
      await new Promise(resolve => setTimeout(resolve, 500));

      // Fetch the computed scores
      const { data: scores, error: scoresError } = await supabase
        .from("build_scores")
        .select("*")
        .eq("assessment_id", assessment.id)
        .single();

      if (scoresError) throw scoresError;

      return scores as BuildScore;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-build-current"] });
      queryClient.invalidateQueries({ queryKey: ["build-assessment-history"] });
      toast({
        title: "Build Updated",
        description: "Your build stats have been recalculated.",
      });
    },
    onError: (error) => {
      console.error("Assessment submission error:", error);
      toast({
        title: "Error",
        description: "Failed to submit assessment. Please try again.",
        variant: "destructive",
      });
    },
  });

  return {
    questions,
    questionsLoading,
    currentBuild,
    buildLoading,
    assessmentHistory,
    historyLoading,
    submitAssessment: submitAssessmentMutation.mutateAsync,
    isSubmitting: submitAssessmentMutation.isPending,
  };
}
