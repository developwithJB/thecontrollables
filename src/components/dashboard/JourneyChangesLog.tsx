import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getJourneyById } from "@/lib/guidedJourneys";
import { ArrowRight, History } from "lucide-react";
import { CollapsibleSection } from "@/components/experience/CollapsibleSection";

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

  const summaryRow = (
    <div className="flex items-center gap-3">
      <div className="p-2 rounded-lg bg-muted">
        <History className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-foreground text-sm">Focus Changes</h3>
        <p className="text-xs text-muted-foreground">
          {changes.length} change{changes.length !== 1 ? "s" : ""} this reset
        </p>
      </div>
    </div>
  );

  return (
    <CollapsibleSection summaryRow={summaryRow} defaultExpanded={false}>
      <div className="p-4 space-y-2">
        {changes.map((change) => {
          const prevJourney = change.previous_journey_id
            ? getJourneyById(change.previous_journey_id)
            : null;
          const newJourney = getJourneyById(change.new_journey_id);

          return (
            <div
              key={change.id}
              className="flex items-center gap-2 text-sm p-2 rounded-lg bg-muted/50"
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
        <p className="text-xs text-muted-foreground pt-2 italic">
          Changing direction is part of finding your way.
        </p>
      </div>
    </CollapsibleSection>
  );
}
