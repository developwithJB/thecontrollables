import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Challenge {
  id: string;
  creator_id: string;
  name: string;
  start_date: string;
  is_solo: boolean;
  invite_code: string | null;
  created_at: string;
}

export interface ChallengeProgress {
  id: string;
  challenge_id: string;
  user_id: string;
  day_number: number;
  completed: boolean;
  reflection: string | null;
  completed_at: string | null;
}

export interface Participant {
  id: string;
  user_id: string;
  joined_at: string;
}

export const CHALLENGE_DAYS = [
  {
    day: 1,
    controllable: "awareness",
    emoji: "🦉",
    theme: "Who am I right now?",
    action: "Use the AI Owl to reframe one current stressor.",
    description: "See things as they are. Let the Owl help you find clarity.",
  },
  {
    day: 2,
    controllable: "perspective",
    emoji: "🐢",
    theme: "The Pause",
    action: "Use the Turtle tool before reacting to anything emotional today.",
    description: "Create space between stimulus and response. Patience is power.",
  },
  {
    day: 3,
    controllable: "habit",
    emoji: "🦈",
    theme: "Shark Mode",
    action: "Track three micro-wins using the Habit system.",
    description: "Keep moving forward. Small actions build unstoppable momentum.",
  },
  {
    day: 4,
    controllable: "wellness",
    emoji: "🛰️",
    theme: "Battery Check",
    action: "Log Sleep, Movement, and Nutrition in the app.",
    description: "Not perfection—just awareness of your current charge level.",
  },
  {
    day: 5,
    controllable: "environment",
    emoji: "🚀",
    theme: "Launchpad Scrub",
    action: "Identify one anchor person and one thruster person.",
    description: "Your environment is fuel. Choose who launches you forward.",
  },
  {
    day: 6,
    controllable: "ego",
    emoji: "👺",
    theme: "The Scanner",
    action: "Catch one Ego lie today using the Ego tool.",
    description: "The Ego whispers lies. Today, you catch it in the act.",
  },
  {
    day: 7,
    controllable: "review",
    emoji: "⚡",
    theme: "Full Charge",
    action: "Review your week and continue the momentum!",
    description: "Export your journal. Share your journey. Keep charging.",
  },
];

export function useChallenge(userId: string | undefined) {
  const [activeChallenge, setActiveChallenge] = useState<Challenge | null>(null);
  const [progress, setProgress] = useState<ChallengeProgress[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchActiveChallenge = useCallback(async () => {
    if (!userId) return;

    try {
      // First check if user has their own challenge
      const { data: ownChallenges, error: ownError } = await supabase
        .from("challenges")
        .select("*")
        .eq("creator_id", userId)
        .order("created_at", { ascending: false })
        .limit(1);

      if (ownError) throw ownError;

      if (ownChallenges && ownChallenges.length > 0) {
        setActiveChallenge(ownChallenges[0]);
        await fetchProgress(ownChallenges[0].id);
        await fetchParticipants(ownChallenges[0].id);
        return;
      }

      // Check if user is participant in another challenge
      const { data: participations, error: partError } = await supabase
        .from("challenge_participants")
        .select("challenge_id")
        .eq("user_id", userId)
        .order("joined_at", { ascending: false })
        .limit(1);

      if (partError) throw partError;

      if (participations && participations.length > 0) {
        const { data: challenge, error: challengeError } = await supabase
          .from("challenges")
          .select("*")
          .eq("id", participations[0].challenge_id)
          .single();

        if (challengeError) throw challengeError;

        if (challenge) {
          setActiveChallenge(challenge);
          await fetchProgress(challenge.id);
          await fetchParticipants(challenge.id);
        }
      }
    } catch (error) {
      console.error("Error fetching challenge:", error);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  const fetchProgress = async (challengeId: string) => {
    if (!userId) return;

    const { data, error } = await supabase
      .from("challenge_progress")
      .select("*")
      .eq("challenge_id", challengeId)
      .eq("user_id", userId);

    if (error) {
      console.error("Error fetching progress:", error);
      return;
    }

    setProgress(data || []);
  };

  const fetchParticipants = async (challengeId: string) => {
    const { data, error } = await supabase
      .from("challenge_participants")
      .select("*")
      .eq("challenge_id", challengeId);

    if (error) {
      console.error("Error fetching participants:", error);
      return;
    }

    setParticipants(data || []);
  };

  useEffect(() => {
    fetchActiveChallenge();
  }, [fetchActiveChallenge]);

  const startChallenge = async (isSolo: boolean): Promise<Challenge | null> => {
    if (!userId) return null;

    try {
      const inviteCode = isSolo ? null : generateInviteCode();
      
      const { data, error } = await supabase
        .from("challenges")
        .insert({
          creator_id: userId,
          is_solo: isSolo,
          invite_code: inviteCode,
          start_date: new Date().toISOString().split('T')[0],
        })
        .select()
        .single();

      if (error) throw error;

      // Add creator as participant
      await supabase
        .from("challenge_participants")
        .insert({
          challenge_id: data.id,
          user_id: userId,
        });

      setActiveChallenge(data);
      toast({
        title: "Challenge started!",
        description: isSolo 
          ? "Your 7-day journey begins now." 
          : `Share code ${inviteCode} with friends!`,
      });
      
      return data;
    } catch (error) {
      console.error("Error starting challenge:", error);
      toast({
        title: "Failed to start challenge",
        description: "Please try again.",
        variant: "destructive",
      });
      return null;
    }
  };

  const joinChallenge = async (inviteCode: string): Promise<boolean> => {
    if (!userId) return false;

    try {
      // Find challenge by invite code
      const { data: challenges, error: findError } = await supabase
        .from("challenges")
        .select("*")
        .eq("invite_code", inviteCode.toUpperCase())
        .limit(1);

      if (findError) throw findError;

      if (!challenges || challenges.length === 0) {
        toast({
          title: "Challenge not found",
          description: "Check the invite code and try again.",
          variant: "destructive",
        });
        return false;
      }

      const challenge = challenges[0];

      // Join as participant
      const { error: joinError } = await supabase
        .from("challenge_participants")
        .insert({
          challenge_id: challenge.id,
          user_id: userId,
        });

      if (joinError) {
        if (joinError.code === '23505') {
          toast({
            title: "Already joined",
            description: "You're already part of this challenge.",
          });
          return false;
        }
        throw joinError;
      }

      setActiveChallenge(challenge);
      await fetchProgress(challenge.id);
      await fetchParticipants(challenge.id);
      
      toast({
        title: "Joined challenge!",
        description: "You're now part of the 7-day journey.",
      });
      
      return true;
    } catch (error) {
      console.error("Error joining challenge:", error);
      toast({
        title: "Failed to join",
        description: "Please try again.",
        variant: "destructive",
      });
      return false;
    }
  };

  const completeDay = async (dayNumber: number, reflection?: string): Promise<boolean> => {
    if (!userId || !activeChallenge) return false;

    try {
      const { data, error } = await supabase
        .from("challenge_progress")
        .upsert({
          challenge_id: activeChallenge.id,
          user_id: userId,
          day_number: dayNumber,
          completed: true,
          reflection: reflection || null,
          completed_at: new Date().toISOString(),
        }, {
          onConflict: "challenge_id,user_id,day_number"
        })
        .select()
        .single();

      if (error) throw error;

      setProgress(prev => {
        const existing = prev.findIndex(p => p.day_number === dayNumber);
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = data;
          return updated;
        }
        return [...prev, data];
      });

      toast({
        title: `Day ${dayNumber} complete!`,
        description: dayNumber === 7 
          ? "Congratulations! You've completed the challenge!" 
          : "Keep the momentum going.",
      });
      
      return true;
    } catch (error) {
      console.error("Error completing day:", error);
      toast({
        title: "Failed to save progress",
        description: "Please try again.",
        variant: "destructive",
      });
      return false;
    }
  };

  const getCurrentDay = (): number => {
    if (!activeChallenge) return 1;
    
    const startDate = new Date(activeChallenge.start_date);
    const today = new Date();
    startDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    
    const diffTime = today.getTime() - startDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
    
    return Math.min(Math.max(diffDays, 1), 7);
  };

  return {
    activeChallenge,
    progress,
    participants,
    isLoading,
    startChallenge,
    joinChallenge,
    completeDay,
    getCurrentDay,
    refetch: fetchActiveChallenge,
  };
}

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
