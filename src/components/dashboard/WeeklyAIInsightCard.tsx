import { useMemo, useRef, useState } from "react";
import { endOfWeek, format, startOfWeek } from "date-fns";
import { Download, Loader2, Lock, Sparkles, TrendingUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useEntitlements } from "@/hooks/useEntitlements";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { generateWeeklyAIInsight, type WeeklyAIInsightInput } from "@/lib/weeklyAIInsight";

interface WeeklyAIInsightCardProps {
  userId: string;
  className?: string;
}

interface DailyPlanRow {
  plan_date: string;
  status: string | null;
}

interface ProposalRow {
  status: string;
  proposal_type: string | null;
}

interface PlannerItemRow {
  scheduled_date: string;
  status: string;
  start_time: string | null;
}

interface FeedbackRow {
  feedback_type: string;
}

interface UsageRow {
  mode: string;
  cache_hit: boolean | null;
}

const isWeeklyInsightWindow = () => {
  const day = new Date().getDay();
  return day >= 4 || day === 0;
};

const getWeekBounds = () => {
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

  return {
    startDate: format(weekStart, "yyyy-MM-dd"),
    endDate: format(weekEnd, "yyyy-MM-dd"),
    startIso: weekStart.toISOString(),
    endIso: weekEnd.toISOString(),
    label: `${format(weekStart, "MMM d")} - ${format(weekEnd, "MMM d")}`,
  };
};

const proWeeklyInsightPlans = new Set(["pro", "premium", "lifetime"]);

export function WeeklyAIInsightCard({ userId, className }: WeeklyAIInsightCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isSaving, setIsSaving] = useState(false);
  const weeklyWindow = useMemo(isWeeklyInsightWindow, []);
  const week = useMemo(getWeekBounds, []);
  const { planTier, initiateCheckout, isCheckingOut } = useEntitlements(userId);

  const canUseDeepWeeklyInsight = planTier ? proWeeklyInsightPlans.has(planTier) : false;

  const { data: insight, isLoading } = useQuery({
    queryKey: ["weekly-ai-insight", userId, week.startDate, week.endDate],
    queryFn: async () => {
      const [dailyPlans, proposals, plannerItems, feedbackEvents, usageEvents] = await Promise.all([
        supabase
          .from("ai_daily_plans" as never)
          .select("plan_date,status")
          .eq("user_id", userId)
          .gte("plan_date", week.startDate)
          .lte("plan_date", week.endDate),
        supabase
          .from("ai_action_proposals" as never)
          .select("status,proposal_type")
          .eq("user_id", userId)
          .gte("created_at", week.startIso)
          .lte("created_at", week.endIso),
        supabase
          .from("planner_items")
          .select("scheduled_date,status,start_time")
          .eq("user_id", userId)
          .gte("scheduled_date", week.startDate)
          .lte("scheduled_date", week.endDate),
        supabase
          .from("ai_feedback_events" as never)
          .select("feedback_type")
          .eq("user_id", userId)
          .gte("created_at", week.startIso)
          .lte("created_at", week.endIso),
        supabase
          .from("ai_usage_events" as never)
          .select("mode,cache_hit")
          .eq("user_id", userId)
          .gte("created_at", week.startIso)
          .lte("created_at", week.endIso),
      ]);

      const firstError =
        dailyPlans.error || proposals.error || plannerItems.error || feedbackEvents.error || usageEvents.error;
      if (firstError) throw firstError;

      const input: WeeklyAIInsightInput = {
        dailyPlans: ((dailyPlans.data ?? []) as DailyPlanRow[]).map((plan) => ({
          planDate: plan.plan_date,
          status: plan.status,
        })),
        proposals: ((proposals.data ?? []) as ProposalRow[]).map((proposal) => ({
          status: proposal.status,
          proposalType: proposal.proposal_type,
        })),
        plannerItems: ((plannerItems.data ?? []) as PlannerItemRow[]).map((item) => ({
          scheduledDate: item.scheduled_date,
          status: item.status,
          startTime: item.start_time,
        })),
        feedbackEvents: ((feedbackEvents.data ?? []) as FeedbackRow[]).map((event) => ({
          feedbackType: event.feedback_type,
        })),
        usageEvents: ((usageEvents.data ?? []) as UsageRow[]).map((event) => ({
          mode: event.mode,
          cacheHit: event.cache_hit,
        })),
      };

      return generateWeeklyAIInsight(input);
    },
    enabled: weeklyWindow && !!userId,
    staleTime: 10 * 60 * 1000,
  });

  if (!weeklyWindow) return null;

  const handleSaveImage = async () => {
    if (!cardRef.current || !insight) return;
    setIsSaving(true);

    try {
      const { default: html2canvas } = await import("html2canvas");
      const canvas = await html2canvas(cardRef.current, {
        scale: 3,
        backgroundColor: null,
        useCORS: true,
      });

      const link = document.createElement("a");
      link.download = `dashboard-weekly-insight-${week.startDate}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast.success("Weekly insight saved.");
    } catch {
      toast.error("Couldn't save the card. Try a screenshot instead.");
    } finally {
      setIsSaving(false);
    }
  };

  const startUpgrade = () => {
    void initiateCheckout("pro", { source: "weekly_ai_insight" });
  };

  if (isLoading) {
    return (
      <section className={cn("rounded-xl border bg-card p-4 shadow-sm", className)}>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Reading this week's pattern...
        </div>
      </section>
    );
  }

  return (
    <section className={cn("space-y-3", className)} aria-label="Weekly AI Insight">
      <div
        ref={cardRef}
        className="relative overflow-hidden rounded-xl border bg-card shadow-sm"
        style={{ backgroundColor: "hsl(var(--card))" }}
      >
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-accent to-emerald-500" />

        <div className="space-y-5 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Weekly AI Insight
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{week.label}</p>
            </div>
            <Badge variant="outline" className="gap-1 border-primary/30 bg-primary/5 text-[10px]">
              <Sparkles className="h-3 w-3 text-primary" />
              Privacy-safe
            </Badge>
          </div>

          {insight ? (
            <>
              <div className="space-y-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-display text-2xl font-semibold leading-tight text-foreground">
                    {insight.headline}
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{insight.detail}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {insight.stats.map((stat) => (
                  <div key={stat.label} className="rounded-lg border bg-background/70 p-3 text-center">
                    <p className="text-lg font-semibold text-foreground">{stat.value}</p>
                    <p className="text-[10px] leading-tight text-muted-foreground">{stat.label}</p>
                  </div>
                ))}
              </div>

              {canUseDeepWeeklyInsight ? (
                <div className="rounded-lg bg-primary/10 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">Next week</p>
                  <p className="mt-1 text-sm font-medium leading-relaxed text-foreground">{insight.nextWeekFocus}</p>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed bg-background/70 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Deeper weekly read
                  </p>
                  <p className="mt-1 text-sm font-medium leading-relaxed text-foreground">
                    Unlock Pro to turn this pattern into next week's default.
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between gap-3 border-t pt-3 text-[11px] text-muted-foreground">
                <span>The Dashboard</span>
                <span>{insight.confidence === "solid" ? "Pattern confidence: solid" : "Pattern confidence: early"}</span>
              </div>
            </>
          ) : (
            <div className="space-y-4 py-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                <Sparkles className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <h3 className="font-display text-xl font-semibold text-foreground">Your pattern is warming up.</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Use The Dashboard for a few days and your weekly pattern will appear here.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {insight ? (
          <Button variant="outline" size="sm" onClick={handleSaveImage} disabled={isSaving} className="gap-2">
            {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            {isSaving ? "Saving..." : "Save Image"}
          </Button>
        ) : null}

        {!canUseDeepWeeklyInsight ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={startUpgrade}
            disabled={isCheckingOut}
            className="gap-2 text-muted-foreground"
          >
            <Lock className="h-3.5 w-3.5" />
            Deeper weekly insight unlocks with Pro
          </Button>
        ) : (
          <Badge variant="secondary" className="gap-1">
            <Sparkles className="h-3 w-3" />
            Pro weekly insight
          </Badge>
        )}
      </div>
    </section>
  );
}
