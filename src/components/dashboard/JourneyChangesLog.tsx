import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { getJourneyById } from "@/lib/guidedJourneys";
import { ArrowRight, History } from "lucide-react";
import { format } from "date-fns";

interface JourneyChange {
  id: string;
  previous_journey_id: string | null;
  new_journey_id: string;
  changed_on_day: number;
  reason: string | null;
  created_at: string;
}

interface JourneyChangesLogProps {
  sessionId: string;
  userId: string;
}

export function JourneyChangesLog({ sessionId, userId }: JourneyChangesLogProps) {
  const { data: changes = [], isLoading } = useQuery({
    queryKey: ["journey-changes", sessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("journey_changes" as any)
        .select("*")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return (data || []) as unknown as JourneyChange[];
    },
    enabled: !!sessionId && !!userId,
  });

  if (isLoading || changes.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 rounded-xl bg-muted/30 border border-border"
    >
      <div className="flex items-center gap-2 mb-3">
        <History className="w-4 h-4 text-muted-foreground" />
        <h4 className="text-sm font-medium text-foreground">Journey Changes</h4>
      </div>

      <div className="space-y-2">
        {changes.map((change, index) => {
          const prevJourney = change.previous_journey_id
            ? getJourneyById(change.previous_journey_id)
            : null;
          const newJourney = getJourneyById(change.new_journey_id);

          return (
            <div
              key={change.id}
              className="flex items-center gap-2 text-sm p-2 rounded-lg bg-background/50"
            >
              <span className="text-xs text-muted-foreground w-12 shrink-0">
                Day {change.changed_on_day}
              </span>
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                {prevJourney ? (
                  <>
                    <span className="truncate text-muted-foreground">
                      {prevJourney.emoji} {prevJourney.title}
                    </span>
                    <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />
                  </>
                ) : (
                  <span className="text-muted-foreground">Started with</span>
                )}
                <span className="truncate text-foreground font-medium">
                  {newJourney?.emoji} {newJourney?.title}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground mt-3 italic">
        Changing direction is part of finding your way.
      </p>
    </motion.div>
  );
}
