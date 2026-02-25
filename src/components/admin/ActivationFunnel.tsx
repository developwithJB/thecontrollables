import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle } from "lucide-react";
import type { AnalyticsSummary } from "./types";

interface ActivationFunnelProps {
  summary: AnalyticsSummary | null;
}

interface FunnelStage {
  label: string;
  value: number;
  color: string;
}

function FunnelSuggestion({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
      <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
      <p className="text-sm text-amber-700 dark:text-amber-400">{message}</p>
    </div>
  );
}

export default function ActivationFunnel({ summary }: ActivationFunnelProps) {
  // Onboarding funnel
  const onboardingStages: FunnelStage[] = [
    { label: "Account Created", value: summary?.onboardingFunnel?.accountCreated || 0, color: "bg-habit-soft dark:bg-habit-soft" },
    { label: "Assessment Done", value: summary?.onboardingFunnel?.assessment || 0, color: "bg-wellness-soft dark:bg-wellness-soft" },
    { label: "Archetype Reveal", value: summary?.onboardingFunnel?.archetype || 0, color: "bg-awareness-soft dark:bg-awareness-soft" },
    { label: "Snapshot Started", value: summary?.onboardingFunnel?.snapshot || 0, color: "bg-environment-soft dark:bg-environment-soft" },
    { label: "Day 1 Done", value: summary?.onboardingFunnel?.day1 || 0, color: "bg-perspective-soft dark:bg-perspective-soft" },
  ];

  // Conversion funnel
  const conversionStages: FunnelStage[] = [
    { label: "Landing", value: summary?.conversionFunnel?.landing || 0, color: "bg-muted" },
    { label: "Signed Up", value: summary?.conversionFunnel?.signup || 0, color: "bg-habit-soft dark:bg-habit-soft" },
    { label: "Dashboard", value: summary?.conversionFunnel?.dashboard || 0, color: "bg-perspective-soft dark:bg-perspective-soft" },
    { label: "First Action", value: summary?.conversionFunnel?.completedAction || 0, color: "bg-awareness-soft dark:bg-awareness-soft" },
  ];

  // Free trial
  const trialStages: FunnelStage[] = summary?.freeTrialMetrics
    ? [
        { label: "Trial Started", value: summary.freeTrialMetrics.started, color: "bg-habit-soft dark:bg-habit-soft" },
        { label: "Completed Snapshot", value: summary.freeTrialMetrics.completed, color: "bg-perspective-soft dark:bg-perspective-soft" },
        { label: "Converted to Paid", value: summary.freeTrialMetrics.converted, color: "bg-awareness-soft dark:bg-awareness-soft" },
      ]
    : [];

  // Auto-suggestions based on drop-off analysis
  const suggestions: string[] = [];

  if (onboardingStages.length >= 2) {
    for (let i = 1; i < onboardingStages.length; i++) {
      const prev = onboardingStages[i - 1].value;
      const curr = onboardingStages[i].value;
      if (prev > 0 && curr / prev < 0.5) {
        suggestions.push(
          `${Math.round((1 - curr / prev) * 100)}% drop-off between "${onboardingStages[i - 1].label}" and "${onboardingStages[i].label}". Consider adding a guided nudge at this step.`
        );
      }
    }
  }

  if (conversionStages.length >= 2) {
    const signups = conversionStages[1].value;
    const actions = conversionStages[3].value;
    if (signups > 0 && actions / signups < 0.3) {
      suggestions.push(
        `Only ${Math.round((actions / signups) * 100)}% of signups complete their first action. Consider an immediate guided first-log walkthrough.`
      );
    }
  }

  if (summary?.freeTrialMetrics) {
    const { started, converted } = summary.freeTrialMetrics;
    if (started > 0 && converted / started < 0.1) {
      suggestions.push(
        `Trial-to-paid conversion is ${(converted / started * 100).toFixed(1)}%. Consider adding a value recap at day 5 or a limited-time offer at trial end.`
      );
    }
  }

  return (
    <div className="space-y-6">
      {/* Onboarding Funnel */}
      <FunnelCard title="🚀 Onboarding Funnel (7d)" description="New user progression through onboarding" stages={onboardingStages} />

      {/* Conversion Funnel */}
      <FunnelCard title="📊 Conversion Funnel (7d)" description="Track user progression through key milestones" stages={conversionStages} />

      {/* Free Trial Funnel */}
      {trialStages.length > 0 && (
        <FunnelCard title="🎁 Free Trial Funnel" description="Trial users and conversion to paid" stages={trialStages} />
      )}

      {/* Auto-Suggestions */}
      {suggestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              💡 Suggested Actions
            </CardTitle>
            <CardDescription>Auto-detected based on funnel drop-offs</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {suggestions.map((s, i) => (
              <FunnelSuggestion key={i} message={s} />
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function FunnelCard({ title, description, stages }: { title: string; description: string; stages: FunnelStage[] }) {
  const maxValue = Math.max(...stages.map((s) => s.value), 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {stages.map((stage, i) => {
            const prevValue = i > 0 ? stages[i - 1].value : stage.value;
            const dropOff = prevValue > 0 ? ((prevValue - stage.value) / prevValue * 100) : 0;
            const barWidth = maxValue > 0 ? (stage.value / maxValue * 100) : 0;

            return (
              <div key={stage.label}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">{stage.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold">{stage.value}</span>
                    {i > 0 && prevValue > 0 && (
                      <Badge
                        variant="outline"
                        className={`text-xs ${
                          dropOff > 50
                            ? "text-red-600 border-red-200"
                            : dropOff > 25
                            ? "text-amber-600 border-amber-200"
                            : "text-emerald-600 border-emerald-200"
                        }`}
                      >
                        -{dropOff.toFixed(0)}%
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${stage.color.includes('bg-') ? '' : 'bg-primary'}`}
                    style={{
                      width: `${barWidth}%`,
                      backgroundColor: stage.color.includes('bg-') ? undefined : undefined,
                    }}
                  >
                    <div className={`h-full rounded-full ${stage.color || 'bg-primary'}`} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Overall rate */}
        {stages.length >= 2 && stages[0].value > 0 && (
          <div className="mt-4 pt-4 border-t flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Overall Completion</span>
            <span className="font-semibold text-primary">
              {Math.round((stages[stages.length - 1].value / stages[0].value) * 100)}%
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
