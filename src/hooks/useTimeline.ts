import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { isDevMockAuthEnabled } from "@/lib/devMockAuth";
import {
  assessDevTimelineEvent,
  createDevTimelineMoment,
  deleteDevTimelineMoment,
  getDevTimelineEvents,
  setDevTimelineEventIncluded,
} from "@/lib/devMockTimeline";
import {
  calculateDailyCharge,
  normalizeCategoryScores,
  type DailyChargeSnapshot,
  type TimelineAssessment,
  type TimelineControllable,
  type TimelineEvent,
  type TimelineImpact,
  type TimelineScoringStatus,
  type TimelineVisibility,
} from "@/lib/timeline";

interface TimelineEventRow {
  id: string;
  occurred_at: string;
  recorded_at: string;
  local_date: string;
  timezone: string;
  source_type: string;
  event_type: string;
  title: string;
  scoring_status: string;
  confidence: number;
  visibility: string;
  private_metadata: unknown;
  timeline_impacts: Array<{
    id: string;
    controllable: string;
    delta: number;
    reason_code: string;
    explanation: string;
    rule_version: string;
    confidence: number;
    user_overridden: boolean;
  }> | null;
}

interface DailyChargeSnapshotRow {
  charge_date: string;
  overall_score: number;
  net_impact: number;
  event_count: number;
  category_scores: unknown;
  rule_version: string;
  calculated_at: string;
}

export interface CreateTimelineMomentInput {
  title: string;
  eventType: string;
  targetControllable: TimelineControllable;
  occurredAt: string;
  localDate: string;
  timezone: string;
}

const mapTimelineEvent = (row: TimelineEventRow): TimelineEvent => ({
  id: row.id,
  occurredAt: row.occurred_at,
  recordedAt: row.recorded_at,
  localDate: row.local_date,
  timezone: row.timezone,
  sourceType: row.source_type,
  eventType: row.event_type,
  title: row.title,
  scoringStatus: row.scoring_status as TimelineScoringStatus,
  confidence: Number(row.confidence),
  visibility: row.visibility as TimelineVisibility,
  privateMetadata: row.private_metadata && typeof row.private_metadata === "object"
    ? row.private_metadata as Record<string, unknown>
    : {},
  impacts: (row.timeline_impacts ?? []).map((impact): TimelineImpact => ({
    id: impact.id,
    controllable: impact.controllable as TimelineControllable,
    delta: impact.delta,
    reasonCode: impact.reason_code,
    explanation: impact.explanation,
    ruleVersion: impact.rule_version,
    confidence: Number(impact.confidence),
    userOverridden: impact.user_overridden,
  })),
});

const mapSnapshot = (row: DailyChargeSnapshotRow): DailyChargeSnapshot => ({
  chargeDate: row.charge_date,
  overallScore: row.overall_score,
  netImpact: row.net_impact,
  eventCount: row.event_count,
  categoryScores: normalizeCategoryScores(row.category_scores),
  ruleVersion: row.rule_version,
  calculatedAt: row.calculated_at,
});

export const useTimelineDay = (userId: string, localDate: string) => {
  const devMock = isDevMockAuthEnabled();
  const eventsQuery = useQuery({
    queryKey: ["timeline-events", userId, localDate],
    queryFn: async () => {
      if (devMock) return getDevTimelineEvents(localDate);
      const { data, error } = await supabase
        .from("timeline_events")
        .select(`
          id,
          occurred_at,
          recorded_at,
          local_date,
          timezone,
          source_type,
          event_type,
          title,
          scoring_status,
          confidence,
          visibility,
          private_metadata,
          timeline_impacts (
            id,
            controllable,
            delta,
            reason_code,
            explanation,
            rule_version,
            confidence,
            user_overridden
          )
        `)
        .eq("user_id", userId)
        .eq("local_date", localDate)
        .order("occurred_at", { ascending: false });

      if (error) throw error;
      return ((data ?? []) as unknown as TimelineEventRow[]).map(mapTimelineEvent);
    },
    enabled: Boolean(userId && localDate),
    staleTime: 15_000,
  });

  const snapshotQuery = useQuery({
    queryKey: ["daily-charge-snapshot", userId, localDate],
    queryFn: async () => {
      if (devMock) return null;
      const { data, error } = await supabase
        .from("daily_charge_snapshots")
        .select("charge_date, overall_score, net_impact, event_count, category_scores, rule_version, calculated_at")
        .eq("user_id", userId)
        .eq("charge_date", localDate)
        .maybeSingle();

      if (error) throw error;
      return data ? mapSnapshot(data as DailyChargeSnapshotRow) : null;
    },
    enabled: Boolean(userId && localDate),
    staleTime: 15_000,
  });

  const events = eventsQuery.data ?? [];
  const snapshot = snapshotQuery.data ?? calculateDailyCharge(events, localDate);

  return {
    events,
    snapshot,
    isLoading: eventsQuery.isLoading || snapshotQuery.isLoading,
    isError: eventsQuery.isError || snapshotQuery.isError,
    error: eventsQuery.error ?? snapshotQuery.error,
    refetch: async () => {
      await Promise.all([eventsQuery.refetch(), snapshotQuery.refetch()]);
    },
  };
};

export const useTimelineMutations = (userId: string) => {
  const devMock = isDevMockAuthEnabled();
  const queryClient = useQueryClient();
  const invalidate = async (localDate: string) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["timeline-events", userId, localDate] }),
      queryClient.invalidateQueries({ queryKey: ["daily-charge-snapshot", userId, localDate] }),
    ]);
  };

  const createMoment = useMutation({
    mutationFn: async (input: CreateTimelineMomentInput) => {
      if (devMock) return { id: createDevTimelineMoment(input), localDate: input.localDate };
      const { data, error } = await supabase.rpc("create_manual_timeline_event", {
        event_title: input.title,
        event_type: input.eventType,
        target_controllable: input.targetControllable,
        occurred_at: input.occurredAt,
        local_date: input.localDate,
        timezone: input.timezone,
      });
      if (error) throw error;
      return { id: data, localDate: input.localDate };
    },
    onSuccess: ({ localDate }) => invalidate(localDate),
  });

  const assessEvent = useMutation({
    mutationFn: async ({ event, assessment }: { event: TimelineEvent; assessment: TimelineAssessment }) => {
      if (devMock) {
        assessDevTimelineEvent(event.id, assessment);
        return event.localDate;
      }
      const { error } = await supabase.rpc("assess_timeline_event", {
        target_event_id: event.id,
        assessment,
      });
      if (error) throw error;
      return event.localDate;
    },
    onSuccess: (localDate) => invalidate(localDate),
  });

  const setIncluded = useMutation({
    mutationFn: async ({ event, included }: { event: TimelineEvent; included: boolean }) => {
      if (devMock) {
        setDevTimelineEventIncluded(event.id, included);
        return event.localDate;
      }
      const { error } = await supabase
        .from("timeline_events")
        .update({ scoring_status: included ? (event.impacts.length ? "scored" : "neutral") : "excluded" })
        .eq("id", event.id)
        .eq("user_id", userId);
      if (error) throw error;
      return event.localDate;
    },
    onSuccess: (localDate) => invalidate(localDate),
  });

  const deleteMoment = useMutation({
    mutationFn: async (event: TimelineEvent) => {
      if (event.sourceType !== "manual") throw new Error("Only manual moments can be deleted here.");
      if (devMock) {
        deleteDevTimelineMoment(event.id);
        return event.localDate;
      }
      const { error } = await supabase
        .from("timeline_events")
        .delete()
        .eq("id", event.id)
        .eq("user_id", userId)
        .eq("source_type", "manual");
      if (error) throw error;
      return event.localDate;
    },
    onSuccess: (localDate) => invalidate(localDate),
  });

  return { createMoment, assessEvent, setIncluded, deleteMoment };
};
