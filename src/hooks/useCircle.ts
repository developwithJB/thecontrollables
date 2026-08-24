import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CircleMember {
  id: string;
  user_id: string;
  display_name: string | null;
  joined_at: string;
  showedUpToday: boolean;
  totalDaysCompleted: number;
}

interface Circle {
  id: string;
  name: string;
  invite_code: string | null;
  journey_id: string | null;
  max_members: number;
  duration_days: number;
  creator_id: string;
  start_date: string;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Please try again.";
}

export function useCircle(userId: string | undefined, activeSessionId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch user's active circle (challenge where they're a participant and is_solo=false)
  const { data: myCircle, isLoading: isLoadingCircle } = useQuery({
    queryKey: ["my-circle", userId],
    queryFn: async () => {
      if (!userId) return null;

      // Find challenge_participants for this user where challenge is_solo=false
      const { data: participations, error: pError } = await supabase
        .from("challenge_participants")
        .select("challenge_id")
        .eq("user_id", userId);

      if (pError || !participations?.length) return null;

      const challengeIds = participations.map((p) => p.challenge_id);

      const { data: challenges, error: cError } = await supabase
        .from("challenges")
        .select("*")
        .in("id", challengeIds)
        .eq("is_solo", false)
        .limit(1);

      if (cError || !challenges?.length) return null;

      const c = challenges[0];
      return {
        id: c.id,
        name: c.name,
        invite_code: c.invite_code,
        journey_id: c.journey_id,
        max_members: c.max_members ?? 5,
        duration_days: c.duration_days,
        creator_id: c.creator_id,
        start_date: c.start_date,
      } as Circle;
    },
    enabled: !!userId,
  });

  // Fetch circle members with today's progress
  const { data: circleMembers = [], isLoading: isLoadingMembers } = useQuery({
    queryKey: ["circle-members", myCircle?.id],
    queryFn: async () => {
      if (!myCircle) return [];

      const { data: participants, error } = await supabase
        .from("challenge_participants")
        .select("id, user_id, display_name, joined_at")
        .eq("challenge_id", myCircle.id);

      if (error || !participants) return [];

      // Get today's date
      const today = new Date().toISOString().split("T")[0];

      // Get all progress for this challenge
      const { data: progress } = await supabase
        .from("challenge_progress")
        .select("user_id, day_number, log_date, completed")
        .eq("challenge_id", myCircle.id)
        .eq("completed", true);

      const progressByUser = new Map<string, { totalDays: number; showedUpToday: boolean }>();
      for (const p of progress || []) {
        const existing = progressByUser.get(p.user_id) || { totalDays: 0, showedUpToday: false };
        existing.totalDays++;
        if (p.log_date === today) existing.showedUpToday = true;
        progressByUser.set(p.user_id, existing);
      }

      return participants.map((p) => {
        const prog = progressByUser.get(p.user_id);
        return {
          id: p.id,
          user_id: p.user_id,
          display_name: p.display_name,
          joined_at: p.joined_at,
          showedUpToday: prog?.showedUpToday ?? false,
          totalDaysCompleted: prog?.totalDays ?? 0,
        } as CircleMember;
      });
    },
    enabled: !!myCircle,
  });

  const circleId = myCircle?.id;

  // Realtime subscription for live showed-up dots
  useEffect(() => {
    if (!circleId) return;

    const channel = supabase
      .channel(`circle-progress-${circleId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "challenge_progress",
          filter: `challenge_id=eq.${circleId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["circle-members", circleId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [circleId, queryClient]);

  // Create circle
  const createCircleMutation = useMutation({
    mutationFn: async ({ journeyId, displayName }: { journeyId: string; displayName: string }) => {
      if (!userId) throw new Error("Not authenticated");

      // Generate invite code via DB function
      const { data: inviteCode, error: codeError } = await supabase.rpc("generate_invite_code");
      if (codeError) throw codeError;

      // Create the challenge
      const { data: challenge, error: challengeError } = await supabase
        .from("challenges")
        .insert({
          creator_id: userId,
          is_solo: false,
          invite_code: inviteCode,
          journey_id: journeyId,
          name: "Snapshot Circle",
          duration_days: 7,
          is_evergreen: false,
        })
        .select()
        .single();

      if (challengeError) throw challengeError;

      // Add creator as first participant
      const { error: joinError } = await supabase.from("challenge_participants").insert({
        challenge_id: challenge.id,
        user_id: userId,
        display_name: displayName,
        covenant_accepted: true,
        covenant_accepted_at: new Date().toISOString(),
        start_date: new Date().toISOString().split("T")[0],
      });

      if (joinError) throw joinError;

      return challenge;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-circle"] });
      toast({ title: "Circle created!", description: "Share the invite code with your group." });
    },
    onError: (error: unknown) => {
      toast({ title: "Couldn't create circle", description: getErrorMessage(error), variant: "destructive" });
    },
  });

  // Join circle
  const joinCircleMutation = useMutation({
    mutationFn: async ({ inviteCode, displayName }: { inviteCode: string; displayName: string }) => {
      if (!userId) throw new Error("Not authenticated");

      const { data, error } = await supabase.rpc("join_challenge_by_invite_code", {
        p_invite_code: inviteCode,
        p_display_name: displayName,
      });

      if (error) throw error;
      if (!data?.length) throw new Error("Invalid invite code");

      const joinedCircle = data[0];

      return {
        circleName: joinedCircle.circle_name,
        journeyId: joinedCircle.journey_id,
        memberCount: joinedCircle.member_count,
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-circle"] });
      toast({ title: "Joined circle!", description: `You're now part of the circle.` });
    },
    onError: (error: unknown) => {
      toast({ title: "Couldn't join circle", description: getErrorMessage(error), variant: "destructive" });
    },
  });

  // Leave circle
  const leaveCircleMutation = useMutation({
    mutationFn: async () => {
      if (!userId || !myCircle) throw new Error("Not in a circle");

      const { error } = await supabase
        .from("challenge_participants")
        .delete()
        .eq("challenge_id", myCircle.id)
        .eq("user_id", userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-circle"] });
      toast({ title: "Left circle" });
    },
    onError: (error: unknown) => {
      toast({ title: "Couldn't leave circle", description: getErrorMessage(error), variant: "destructive" });
    },
  });

  // Log showed-up (called when user completes daily reset)
  const logShowedUp = useCallback(
    async (dayNumber: number) => {
      if (!userId || !myCircle) return;

      const today = new Date().toISOString().split("T")[0];

      // Check if already logged today
      const { data: existing } = await supabase
        .from("challenge_progress")
        .select("id")
        .eq("challenge_id", myCircle.id)
        .eq("user_id", userId)
        .eq("log_date", today)
        .limit(1);

      if (existing?.length) return; // Already logged

      await supabase.from("challenge_progress").insert({
        challenge_id: myCircle.id,
        user_id: userId,
        day_number: dayNumber,
        completed: true,
        completed_at: new Date().toISOString(),
        log_date: today,
      });

      queryClient.invalidateQueries({ queryKey: ["circle-members", myCircle.id] });
    },
    [userId, myCircle, queryClient]
  );

  // Lookup circle info by invite code (for join preview)
  const lookupCircle = useCallback(async (inviteCode: string) => {
    const { data, error } = await supabase.rpc("lookup_challenge_by_invite_code", {
      p_invite_code: inviteCode,
    });

    if (error || !data?.length) return null;

    const challenge = data[0];

    return {
      id: challenge.id,
      name: challenge.name,
      journeyId: challenge.journey_id,
      memberCount: challenge.member_count,
    };
  }, []);

  // Fetch streak leaderboard
  const { data: streakLeaderboard = [] } = useQuery({
    queryKey: ["circle-streaks", myCircle?.id],
    queryFn: async () => {
      if (!myCircle) return [];
      const { data, error } = await supabase.rpc("get_circle_wellness_streaks", {
        p_challenge_id: myCircle.id,
      });
      if (error) {
        console.error("Streak leaderboard error:", error);
        return [];
      }
      return (data as { user_id: string; display_name: string | null; streak: number }[]) || [];
    },
    enabled: !!myCircle,
    staleTime: 5 * 60 * 1000,
  });

  const showedUpTodayCount = circleMembers.filter((m) => m.showedUpToday).length;

  return {
    myCircle,
    circleMembers,
    isLoadingCircle,
    isLoadingMembers,
    showedUpTodayCount,
    streakLeaderboard,
    createCircle: createCircleMutation.mutate,
    isCreatingCircle: createCircleMutation.isPending,
    joinCircle: joinCircleMutation.mutate,
    isJoiningCircle: joinCircleMutation.isPending,
    leaveCircle: leaveCircleMutation.mutate,
    isLeavingCircle: leaveCircleMutation.isPending,
    logShowedUp,
    lookupCircle,
  };
}
