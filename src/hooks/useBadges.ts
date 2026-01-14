import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { BADGES, type BadgeKey } from "@/lib/badges";

export interface UserBadge {
  id: string;
  user_id: string;
  badge_key: BadgeKey;
  earned_at: string;
  trigger_context: Record<string, unknown> | null;
  created_at: string;
}

export const useBadges = (userId: string | null) => {
  const queryClient = useQueryClient();

  // Fetch user's earned badges
  const { data: earnedBadges = [], isLoading } = useQuery({
    queryKey: ["user-badges", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("user_badges" as any)
        .select("*")
        .eq("user_id", userId)
        .order("earned_at", { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as UserBadge[];
    },
    enabled: !!userId,
  });

  // Check if a badge has been earned
  const hasBadge = (badgeKey: BadgeKey): boolean => {
    return earnedBadges.some((b) => b.badge_key === badgeKey);
  };

  // Award a badge (quiet, calm notification)
  const awardBadgeMutation = useMutation({
    mutationFn: async ({
      badgeKey,
      triggerContext,
    }: {
      badgeKey: BadgeKey;
      triggerContext?: Record<string, unknown>;
    }) => {
      if (!userId) throw new Error("Not authenticated");

      // Check if already earned
      const { data: existing } = await supabase
        .from("user_badges" as any)
        .select("id")
        .eq("user_id", userId)
        .eq("badge_key", badgeKey)
        .maybeSingle();

      if (existing) {
        // Already earned, skip silently
        return null;
      }

      const { data, error } = await supabase
        .from("user_badges" as any)
        .insert({
          user_id: userId,
          badge_key: badgeKey,
          trigger_context: triggerContext || null,
        } as any)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as UserBadge;
    },
    onSuccess: (data) => {
      if (data) {
        queryClient.invalidateQueries({ queryKey: ["user-badges"] });
        
        // Calm, reflective toast - no celebration
        const badge = BADGES[data.badge_key];
        toast(`${badge.emoji} "${badge.meaning}"`, {
          duration: 5000,
        });
      }
    },
  });

  // Check and award "returned" badge (after 48+ hours inactivity)
  const checkReturnedBadge = async () => {
    if (!userId || hasBadge("returned")) return;

    // Check last activity (XP log, completed action, or daily reset)
    const twoDaysAgo = new Date();
    twoDaysAgo.setHours(twoDaysAgo.getHours() - 48);

    const { data: recentXp } = await supabase
      .from("xp_logs")
      .select("created_at")
      .eq("user_id", userId)
      .lt("created_at", twoDaysAgo.toISOString())
      .order("created_at", { ascending: false })
      .limit(1);

    // If they have activity from before 48 hours ago, they've returned
    if (recentXp && recentXp.length > 0) {
      awardBadgeMutation.mutate({
        badgeKey: "returned",
        triggerContext: { last_activity: recentXp[0].created_at },
      });
    }
  };

  // Check and award "protected_time" badge (3+ time logs in 7 days)
  const checkProtectedTimeBadge = async () => {
    if (!userId || hasBadge("protected_time")) return;

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { count } = await supabase
      .from("time_logs")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("log_date", sevenDaysAgo.toISOString().split("T")[0]);

    if (count && count >= 3) {
      awardBadgeMutation.mutate({
        badgeKey: "protected_time",
        triggerContext: { time_logs_count: count },
      });
    }
  };

  // Check and award "asked_guidance" badge (3+ unique operators)
  const checkAskedGuidanceBadge = async () => {
    if (!userId || hasBadge("asked_guidance")) return;

    // Check completed_actions for unique controllables
    const { data: actions } = await supabase
      .from("completed_actions")
      .select("controllable")
      .eq("user_id", userId)
      .not("controllable", "is", null);

    if (actions) {
      const uniqueOperators = new Set(actions.map((a) => a.controllable));
      if (uniqueOperators.size >= 3) {
        awardBadgeMutation.mutate({
          badgeKey: "asked_guidance",
          triggerContext: { operators_used: Array.from(uniqueOperators) },
        });
      }
    }
  };

  return {
    earnedBadges,
    isLoading,
    hasBadge,
    awardBadge: awardBadgeMutation.mutate,
    isAwardingBadge: awardBadgeMutation.isPending,
    checkReturnedBadge,
    checkProtectedTimeBadge,
    checkAskedGuidanceBadge,
  };
};
