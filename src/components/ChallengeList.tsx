import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ChevronDown, ChevronUp, Trophy, Users, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import type { Challenge } from "@/hooks/useChallenge";

interface ChallengeListProps {
  userId: string | undefined;
  onSelectChallenge?: (challenge: Challenge) => void;
}

export function ChallengeList({ userId, onSelectChallenge }: ChallengeListProps) {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    const fetchChallenges = async () => {
      setIsLoading(true);
      try {
        // Fetch user's own challenges
        const { data: ownChallenges, error: ownError } = await supabase
          .from("challenges")
          .select("*")
          .eq("creator_id", userId)
          .order("created_at", { ascending: false });

        if (ownError) throw ownError;

        // Fetch challenges user has joined
        const { data: participations, error: partError } = await supabase
          .from("challenge_participants")
          .select("challenge_id")
          .eq("user_id", userId);

        if (partError) throw partError;

        const joinedChallengeIds = participations
          ?.map((p) => p.challenge_id)
          .filter((id) => !ownChallenges?.some((c) => c.id === id)) || [];

        let joinedChallenges: Challenge[] = [];
        if (joinedChallengeIds.length > 0) {
          const { data, error } = await supabase
            .from("challenges")
            .select("*")
            .in("id", joinedChallengeIds)
            .order("created_at", { ascending: false });

          if (!error && data) {
            joinedChallenges = data;
          }
        }

        const allChallenges = [...(ownChallenges || []), ...joinedChallenges]
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        setChallenges(allChallenges);
      } catch (error) {
        console.error("Error fetching challenges:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchChallenges();
  }, [userId]);

  if (isLoading || challenges.length === 0) {
    return null;
  }

  const displayedChallenges = isExpanded ? challenges : challenges.slice(0, 3);

  return (
    <motion.div
      className="p-5 rounded-xl bg-card border shadow-soft"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
          <Trophy className="w-5 h-5 text-accent" />
        </div>
        <div>
          <h3 className="font-display font-semibold text-foreground">Your Challenges</h3>
          <p className="text-xs text-muted-foreground">{challenges.length} challenge{challenges.length !== 1 ? "s" : ""}</p>
        </div>
      </div>

      <div className="space-y-2">
        {displayedChallenges.map((challenge) => (
          <button
            key={challenge.id}
            className={cn(
              "w-full p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors text-left",
              "flex items-center justify-between gap-3"
            )}
            onClick={() => onSelectChallenge?.(challenge)}
          >
            <div className="flex items-center gap-3 min-w-0">
              {challenge.is_solo ? (
                <User className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              ) : (
                <Users className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              )}
              <div className="min-w-0">
                <p className="font-medium text-sm text-foreground truncate">{challenge.name}</p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(challenge.start_date), "MMM d, yyyy")}
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {challenges.length > 3 && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full mt-3 text-muted-foreground"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? (
            <>
              <ChevronUp className="w-4 h-4 mr-1" />
              Show less
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4 mr-1" />
              Show all ({challenges.length})
            </>
          )}
        </Button>
      )}
    </motion.div>
  );
}
