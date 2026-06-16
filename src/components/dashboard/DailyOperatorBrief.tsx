import { useMemo, useState } from "react";
import type React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Check,
  ChevronDown,
  ChevronRight,
  Edit3,
  Loader2,
  RefreshCw,
  Send,
  Shield,
  SlidersHorizontal,
  Sparkles,
  Target,
  ThumbsDown,
  ThumbsUp,
  X,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ChargeMoment } from "@/components/dashboard/ChargeMoment";
import { ChargeProgressRing } from "@/components/dashboard/ControllableChargeVisual";
import { useAIOperatorActions, useDailyOperatorBrief, type AIActionProposal } from "@/hooks/useAIOperator";
import { useEntitlements } from "@/hooks/useEntitlements";
import { useMissionCompletion } from "@/hooks/useMissionCompletion";
import {
  AI_DEPTH_LEVELS,
  AI_GUIDE_LENS_OPTIONS,
  getAIGuideLensOption,
  getAIDepthCopy,
  getAIPlanConfidence,
  isExecutableAIProposal,
  shouldSuggestDeeperPass,
  type AIGuideInsight,
  type AIDepthLevel,
  type AIGuideLensId,
} from "@/lib/aiOperator";
import { getControllableGuide, getControllableGuideClasses } from "@/lib/controllables";
import { getControllableChargeVisual } from "@/lib/controllableVisuals";
import { buildMissionOfTheDayFromPlan } from "@/lib/missionOfTheDay";

interface DailyOperatorBriefProps {
  userId: string;
}

const proposalDeepLink = (proposal: AIActionProposal): string | null => {
  const payload = proposal.payload || {};
  const deepLink = payload.deep_link || payload.action_link;
  return typeof deepLink === "string" ? deepLink : null;
};

const compactText = (value: string | null | undefined, maxWords = 12): string => {
  if (!value) return "";
  const words = value.trim().split(/\s+/);
  if (words.length <= maxWords) return value.trim();
  return `${words.slice(0, maxWords).join(" ")}...`;
};

const oneSentence = (value: string | null | undefined, maxWords = 12): string => {
  const trimmed = compactText(value, maxWords);
  if (!trimmed) return "";
  const [firstSentence] = trimmed.split(/(?<=[.!?])\s+/);
  return firstSentence || trimmed;
};

export function DailyOperatorBrief({ userId }: DailyOperatorBriefProps) {
  const navigate = useNavigate();
  const [adjustmentPrompt, setAdjustmentPrompt] = useState("");
  const [aiDepth, setAiDepth] = useState<AIDepthLevel>("quick");
  const [selectedGuide, setSelectedGuide] = useState<AIGuideLensId>("full_dashboard");
  const [adjustmentCount, setAdjustmentCount] = useState(0);
  const [deeperPass, setDeeperPass] = useState<{ prompt: string; reasons: string[]; locked: boolean; selectedGuide: AIGuideLensId } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedTitle, setEditedTitle] = useState("");
  const [editedDescription, setEditedDescription] = useState("");
  const [feedbackSent, setFeedbackSent] = useState<Record<string, boolean>>({});
  const [showMissionDetails, setShowMissionDetails] = useState(false);
  const [showTunePanel, setShowTunePanel] = useState(false);
  const brief = useDailyOperatorBrief(userId);
  const { confirmProposal, requestAdjustment, submitFeedback } = useAIOperatorActions(userId);
  const { planTier, initiateCheckout, isCheckingOut } = useEntitlements(userId);

  const plan = brief.data?.daily_plan?.plan_data;
  const activeLimit = requestAdjustment.data?.usage_limited ? requestAdjustment.data : brief.data?.usage_limited ? brief.data : null;
  const proposals = useMemo(
    () => (brief.data?.proposals || []).filter((proposal) => proposal.status === "pending").slice(0, 5),
    [brief.data?.proposals],
  );

  const hasConsentedSources = (plan?.sources_used || []).filter((source) => !["planner", "growth"].includes(source));
  const confidence = plan?.confidence || getAIPlanConfidence(plan?.sources_used || []);
  const canUseDeeperPass = planTier === "pro" || planTier === "premium" || planTier === "lifetime";
  const nextActions = plan?.next_actions?.length ? plan.next_actions.slice(0, 5) : [plan?.next_move].filter(Boolean);
  const guideInsights = useMemo(() => plan?.guide_insights?.slice(0, 5) || [], [plan?.guide_insights]);
  const selectedGuideOption = getAIGuideLensOption(selectedGuide);
  const missionSourceGuide = useMemo(
    () =>
      guideInsights.find((guide) => guide.confidence === "High" && guide.recommended_action) ||
      guideInsights.find((guide) => guide.recommended_action) ||
      guideInsights[0],
    [guideInsights],
  );
  const mission = useMemo(
    () =>
      buildMissionOfTheDayFromPlan({
        date: brief.data?.daily_plan?.plan_date,
        dayMode: plan?.day_type,
        guideInsights,
        nextActions,
        nextMove: plan?.next_move,
        mainPriority: plan?.main_priority,
        appCtaLabel: "Start Mission",
        appCtaUrl: "/home",
      }),
    [
      brief.data?.daily_plan?.plan_date,
      guideInsights,
      nextActions,
      plan?.day_type,
      plan?.main_priority,
      plan?.next_move,
    ],
  );
  const missionGuide = getControllableGuide(mission.targetControllable);
  const missionClasses = getControllableGuideClasses(mission.targetControllable);
  const missionChargeValue = missionSourceGuide?.confidence === "High" ? 88 : missionSourceGuide?.confidence === "Medium" ? 68 : 48;
  const missionVisual = getControllableChargeVisual({
    type: mission.targetControllable,
    level: 1,
    progress: missionChargeValue / 100,
    totalXp: mission.xpReward,
  });
  const missionCompletion = useMissionCompletion(userId, mission);

  const buildEditedPayload = (proposal: AIActionProposal) => {
    if (editingId !== proposal.id) return undefined;
    const payload = proposal.payload || {};
    return {
      ...payload,
      title: editedTitle.trim() || payload.title || proposal.title,
      description: editedDescription.trim() || payload.description || null,
    };
  };

  const handleApprove = async (proposal: AIActionProposal) => {
    const result = await confirmProposal.mutateAsync({
      proposalId: proposal.id,
      decision: "approved",
      editedPayload: buildEditedPayload(proposal),
    });

    setEditingId(null);
    if (result.nextPath) navigate(result.nextPath);
    if (!result.nextPath && !isExecutableAIProposal(proposal.proposal_type)) {
      const link = proposalDeepLink(proposal);
      if (link) navigate(link);
    }
  };

  const handleReject = async (proposal: AIActionProposal) => {
    await confirmProposal.mutateAsync({
      proposalId: proposal.id,
      decision: "rejected",
    });
  };

  const handleStartMission = async () => {
    const missionProposal = proposals[0];
    if (missionProposal) {
      await handleApprove(missionProposal);
      return;
    }
    navigate("/planner");
  };

  const handleCompleteMission = async () => {
    await missionCompletion.completeMission();
  };

  const startEditing = (proposal: AIActionProposal) => {
    const payload = proposal.payload || {};
    setEditingId(proposal.id);
    setEditedTitle(typeof payload.title === "string" ? payload.title : proposal.title);
    setEditedDescription(typeof payload.description === "string" ? payload.description : "");
  };

  const handleFeedback = async (proposal: AIActionProposal | null, useful: boolean) => {
    const key = proposal?.id || brief.data?.daily_plan?.id || "plan";
    setFeedbackSent((current) => ({ ...current, [key]: true }));
    await submitFeedback.mutateAsync({
      feedbackType: useful ? "thumbs_up" : "not_useful",
      dailyPlanId: brief.data?.daily_plan?.id,
      proposalId: proposal?.id,
      feedbackText: useful ? "Useful" : "Not useful",
    });
  };

  const handleEgoFeedback = async (useful: boolean) => {
    const key = `ego-${brief.data?.daily_plan?.id || "plan"}`;
    setFeedbackSent((current) => ({ ...current, [key]: true }));
    await submitFeedback.mutateAsync({
      feedbackType: useful ? "thumbs_up" : "not_useful",
      dailyPlanId: brief.data?.daily_plan?.id,
      feedbackText: useful ? "Ego Check useful" : "Ego Check not useful",
      metadata: {
        surface: "daily_brief_ego_check",
        signal: plan?.ego_warning_optional?.signal,
      },
    });
  };

  const submitAdjustment = async () => {
    const trimmed = adjustmentPrompt.trim();
    if (!trimmed) return;
    await requestAdjustment.mutateAsync({ prompt: trimmed, aiDepth, selectedGuide });
    const nextAdjustmentCount = adjustmentCount + 1;
    setAdjustmentCount(nextAdjustmentCount);
    const signal = shouldSuggestDeeperPass({
      prompt: trimmed,
      currentDepth: aiDepth,
      confidence,
      adjustmentCount: nextAdjustmentCount,
    });
    if (signal.shouldSuggest) {
      const locked = !canUseDeeperPass;
      setDeeperPass({ prompt: trimmed, reasons: signal.reasons, locked, selectedGuide });
      await submitFeedback.mutateAsync({
        feedbackType: "do_more",
        dailyPlanId: brief.data?.daily_plan?.id,
        feedbackText: "Deeper pass suggested",
        showToast: false,
        metadata: {
          prompt: trimmed,
          reasons: signal.reasons,
          locked,
          selectedGuide,
        },
      });
    } else {
      setDeeperPass(null);
    }
    setAdjustmentPrompt("");
  };

  const makeDayLighter = async () => {
    await requestAdjustment.mutateAsync({ prompt: "Make this day lighter", aiDepth: "quick", selectedGuide: "wellness" });
  };

  const runDeeperPass = async () => {
    if (!deeperPass) return;
    if (deeperPass.locked) {
      await submitFeedback.mutateAsync({
        feedbackType: "do_more",
        dailyPlanId: brief.data?.daily_plan?.id,
        feedbackText: "Deeper pass upgrade requested",
        showToast: false,
        metadata: { prompt: deeperPass.prompt, reasons: deeperPass.reasons, locked: true, selectedGuide: deeperPass.selectedGuide },
      });
      await initiateCheckout("pro", { source: "daily_operator_deeper_pass" });
      return;
    }

    await submitFeedback.mutateAsync({
      feedbackType: "do_more",
      dailyPlanId: brief.data?.daily_plan?.id,
      feedbackText: "Deeper pass accepted",
      showToast: false,
      metadata: { prompt: deeperPass.prompt, reasons: deeperPass.reasons, selectedGuide: deeperPass.selectedGuide },
    });
    await requestAdjustment.mutateAsync({ prompt: deeperPass.prompt, aiDepth: "deep", selectedGuide: deeperPass.selectedGuide });
    setAiDepth("deep");
    setDeeperPass(null);
  };

  const keepItQuick = async () => {
    if (!deeperPass) return;
    await submitFeedback.mutateAsync({
      feedbackType: "too_much",
      dailyPlanId: brief.data?.daily_plan?.id,
      feedbackText: "Kept quick response",
      showToast: false,
      metadata: { prompt: deeperPass.prompt, reasons: deeperPass.reasons, locked: deeperPass.locked, selectedGuide: deeperPass.selectedGuide },
    });
    setDeeperPass(null);
  };

  if (brief.isLoading) {
    return (
      <div className="dashboard-os-card rounded-2xl px-5 py-5">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Loader2 className="h-5 w-5 animate-spin" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Mission of the Day</p>
            <p className="text-sm font-medium text-muted-foreground">Loading mission...</p>
          </div>
        </div>
      </div>
    );
  }

  if (brief.data?.usage_limited && !plan) {
    return (
      <div className="dashboard-os-card rounded-2xl px-5 py-5">
        <div className="flex items-center gap-4">
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-2xl">
            <Target className="h-6 w-6 text-primary" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Mission of the Day</p>
            <h2 className="font-display text-lg font-semibold text-foreground">Mission locked</h2>
          </div>
          <Button size="sm" onClick={() => initiateCheckout("pro", { source: "daily_operator_monthly_limit" })} disabled={isCheckingOut}>
            {isCheckingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Pro
          </Button>
        </div>
      </div>
    );
  }

  if (brief.isError || !plan) {
    return (
      <div className="dashboard-os-card rounded-2xl px-5 py-5">
        <div className="flex items-center gap-4">
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-2xl">
            <Shield className="h-6 w-6 text-primary" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Mission of the Day</p>
            <h2 className="font-display text-lg font-semibold text-foreground">Mission delayed</h2>
          </div>
          <Button variant="outline" size="icon" onClick={() => brief.refetch()} title="Try again">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="dashboard-os-surface rounded-[2rem]"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 grid grid-cols-12 gap-px opacity-70">
        {Array.from({ length: 12 }).map((_, index) => (
          <span key={index} className={index < 8 ? "h-px bg-primary" : "h-px bg-border"} />
        ))}
      </div>
      <div className="relative z-10 space-y-4 px-5 py-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Mission of the Day</p>
            <h2 className="font-display text-xl font-semibold text-foreground">
              Charge {missionGuide.name}
            </h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={() => brief.refetch()}
            disabled={brief.isFetching}
            title="Refresh mission"
          >
            <RefreshCw className={`h-4 w-4 ${brief.isFetching ? "animate-spin" : ""}`} />
          </Button>
        </div>

        <div className={`dashboard-os-card relative overflow-hidden rounded-[1.75rem] p-4 ${missionClasses?.borderClass || "border-primary/20"}`}>
          <div
            className="pointer-events-none absolute inset-x-4 top-0 h-px"
            style={{ background: `linear-gradient(90deg, transparent, ${missionVisual.color}, transparent)` }}
          />
          <div className="grid gap-4 sm:grid-cols-[auto_1fr] sm:items-center">
            <div className="flex items-center gap-3 sm:block">
              <ChargeProgressRing visual={missionVisual} size={86} strokeWidth={5} />
              <div className="sm:mt-3 sm:text-center">
                <span className="rounded-full bg-background/70 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  {mission.dayMode}
                </span>
              </div>
            </div>
            <div className="min-w-0 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="text-[10px]">{confidence}</Badge>
                <span className="rounded-full bg-background/70 px-2.5 py-1 text-[10px] font-semibold text-foreground">
                  {missionGuide.emoji} {missionGuide.name}
                </span>
              </div>
              <p className="text-xl font-semibold leading-tight text-foreground">
                {mission.missionInstruction}
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                <RewardChip icon={<Zap className="h-3.5 w-3.5" />} label={`+${mission.xpReward} ${missionGuide.name} XP`} />
                <RewardChip icon={<Shield className="h-3.5 w-3.5" />} label={`+${mission.selfTrustReward} Self-Trust`} />
              </div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-[1fr_auto] items-center gap-3">
            <CircuitBar value={missionChargeValue} />
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Stay Charged
            </span>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <Button
            size="lg"
            className="dashboard-primary-glow h-12 text-sm font-semibold"
            onClick={handleStartMission}
            disabled={confirmProposal.isPending}
          >
            {confirmProposal.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Target className="mr-2 h-4 w-4" />}
            Start Mission
          </Button>
          <Button
            size="lg"
            variant={missionCompletion.isCompleted ? "secondary" : "outline"}
            className="h-12 text-sm font-semibold"
            onClick={handleCompleteMission}
            disabled={missionCompletion.isCompleting || missionCompletion.isLoading || missionCompletion.isCompleted}
          >
            {missionCompletion.isCompleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
            {missionCompletion.isCompleted ? "Mission Complete" : "Complete Mission"}
          </Button>
        </div>

        {missionCompletion.completionResult ? (
          <ChargeMoment
            type={missionCompletion.completionResult.progress.type}
            xpAwarded={Math.max(missionCompletion.completionResult.xpAwarded, mission.xpReward)}
            progress={missionCompletion.completionResult.progress.progress}
            totalXp={missionCompletion.completionResult.progress.totalXp}
            level={missionCompletion.completionResult.progress.level}
          />
        ) : null}

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setShowMissionDetails((current) => !current)}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-border/50 bg-background/50 px-3 py-2 text-xs font-medium text-foreground transition-colors hover:border-primary/30"
          >
            Why this?
            <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${showMissionDetails ? "rotate-180" : ""}`} />
          </button>
          <button
            type="button"
            onClick={() => setShowTunePanel((current) => !current)}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-border/50 bg-background/50 px-3 py-2 text-xs font-medium text-foreground transition-colors hover:border-primary/30"
          >
            <SlidersHorizontal className="h-3.5 w-3.5 text-primary" />
            Tune
          </button>
        </div>

        {showMissionDetails ? (
          <div className="space-y-3 rounded-2xl border border-border/50 bg-background/50 p-3">
            <OperatorLine label="Today's Signal" value={mission.shortWhy} icon={<Sparkles className="h-3.5 w-3.5" />} />
            <OperatorLine label="Protect" value={oneSentence(plan.protect_this, 14)} icon={<Shield className="h-3.5 w-3.5" />} />
            <OperatorLine label="If noisy" value={oneSentence(plan.fallback, 14)} icon={<ChevronRight className="h-3.5 w-3.5" />} emphasized />

            {guideInsights.length > 0 ? (
              <div className="grid grid-cols-5 gap-2">
                {guideInsights.map((guide) => (
                  <GuideInsightCard key={guide.guide_id} guide={guide} />
                ))}
              </div>
            ) : null}

            {plan.ego_warning_optional ? (
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300 mb-1">Edge Out the Ego</p>
                    <p className="text-sm text-foreground leading-relaxed">{oneSentence(plan.ego_warning_optional.signal, 14)}</p>
                    <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{plan.ego_warning_optional.recommended_response}</p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-[11px] text-muted-foreground"
                      onClick={() => handleEgoFeedback(true)}
                      disabled={feedbackSent[`ego-${brief.data?.daily_plan?.id || "plan"}`] || submitFeedback.isPending}
                    >
                      <ThumbsUp className="mr-1 h-3 w-3" />
                      Useful
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-[11px] text-muted-foreground"
                      onClick={() => handleEgoFeedback(false)}
                      disabled={feedbackSent[`ego-${brief.data?.daily_plan?.id || "plan"}`] || submitFeedback.isPending}
                    >
                      <ThumbsDown className="mr-1 h-3 w-3" />
                      Not useful
                    </Button>
                  </div>
                </div>
              </div>
            ) : null}

            {plan.fully_charged_focus ? (
              <OperatorLine label="Fully Charged Focus" value={oneSentence(plan.fully_charged_focus, 16)} icon={<Zap className="h-3.5 w-3.5" />} />
            ) : null}

            {plan.weekly_prompt ? (
              <OperatorLine label="Continuous Upgrade" value={oneSentence(plan.weekly_prompt, 16)} icon={<Sparkles className="h-3.5 w-3.5" />} />
            ) : null}
          </div>
        ) : null}

        {deeperPass && (
        <div className="rounded-xl border border-primary/15 bg-background/80 px-4 py-3 space-y-3">
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">Go deeper?</p>
            <p className="text-xs text-muted-foreground leading-relaxed">Optional: tune today&apos;s mission before you move.</p>
            {deeperPass.locked && (
              <p className="text-xs text-muted-foreground leading-relaxed">
                Pro unlocks deeper mission tuning.
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              className="h-8 text-xs"
              onClick={runDeeperPass}
              disabled={requestAdjustment.isPending || submitFeedback.isPending || isCheckingOut}
            >
              {deeperPass.locked ? "Upgrade for Go deeper" : "Go deeper"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-muted-foreground"
              onClick={keepItQuick}
              disabled={submitFeedback.isPending}
            >
              Keep it quick
            </Button>
          </div>
        </div>
        )}

        {activeLimit?.usage_limited && (
        <div className="rounded-xl border border-primary/15 bg-primary/5 px-4 py-3 space-y-3">
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">You&apos;ve used your free AI plans for this month.</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {activeLimit.limit_message || "Upgrade to keep your AI learning you."}
            </p>
          </div>
          {activeLimit.upgrade_required && (
            <Button
              size="sm"
              className="h-8 text-xs"
              onClick={() => initiateCheckout("pro", { source: "daily_operator_usage_limit" })}
              disabled={isCheckingOut}
            >
              {isCheckingOut ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Sparkles className="mr-1.5 h-3.5 w-3.5" />}
              Upgrade to Pro
            </Button>
          )}
        </div>
        )}

        {showMissionDetails && proposals.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Next Move</p>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={makeDayLighter}
              disabled={requestAdjustment.isPending}
            >
              Make this day lighter
            </Button>
          </div>
          {proposals.map((proposal) => (
            <div key={proposal.id} className="rounded-xl border border-border/50 bg-background/60 p-3 space-y-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm font-semibold text-foreground">{proposal.title}</h3>
                  {isExecutableAIProposal(proposal.proposal_type) && (
                    <Badge variant="outline" className="text-[10px]">confirm</Badge>
                  )}
                </div>
                {proposal.rationale && (
                  <p className="text-xs text-muted-foreground leading-relaxed">{proposal.rationale}</p>
                )}
              </div>

              {editingId === proposal.id && (
                <div className="space-y-2 rounded-lg bg-muted/30 p-2">
                  <Input
                    value={editedTitle}
                    onChange={(event) => setEditedTitle(event.target.value)}
                    className="h-9 text-xs"
                    placeholder="Action title"
                    maxLength={120}
                  />
                  <Textarea
                    value={editedDescription}
                    onChange={(event) => setEditedDescription(event.target.value)}
                    className="min-h-[64px] resize-none text-xs"
                    placeholder="Add a note for this action..."
                    maxLength={500}
                  />
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => handleApprove(proposal)}
                  disabled={confirmProposal.isPending}
                >
                  <Check className="mr-1.5 h-3.5 w-3.5" />
                  Start
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => editingId === proposal.id ? setEditingId(null) : startEditing(proposal)}
                  disabled={confirmProposal.isPending}
                >
                  <Edit3 className="mr-1.5 h-3.5 w-3.5" />
                  {editingId === proposal.id ? "Close" : "Edit"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs text-muted-foreground"
                  onClick={() => handleReject(proposal)}
                  disabled={confirmProposal.isPending}
                >
                  <X className="mr-1.5 h-3.5 w-3.5" />
                  Remove
                </Button>
              </div>
              <div className="flex items-center gap-2 border-t border-border/40 pt-2">
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Feedback</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-[11px] text-muted-foreground"
                  onClick={() => handleFeedback(proposal, true)}
                  disabled={feedbackSent[proposal.id] || submitFeedback.isPending}
                >
                  <ThumbsUp className="mr-1 h-3 w-3" />
                  Useful
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-[11px] text-muted-foreground"
                  onClick={() => handleFeedback(proposal, false)}
                  disabled={feedbackSent[proposal.id] || submitFeedback.isPending}
                >
                  <ThumbsDown className="mr-1 h-3 w-3" />
                  Not useful
                </Button>
              </div>
            </div>
          ))}
        </div>
        )}

        {showTunePanel ? (
          <>
            <div className="rounded-xl border border-border/50 bg-background/60 p-3 space-y-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Lens</p>
                  <span className="text-[10px] text-muted-foreground">
                    {selectedGuideOption.emoji ? `${selectedGuideOption.emoji} ` : ""}
                    {selectedGuideOption.label}
                  </span>
                </div>
                <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
                  {AI_GUIDE_LENS_OPTIONS.map((guide) => {
                    const selected = selectedGuide === guide.id;
                    return (
                      <button
                        key={guide.id}
                        type="button"
                        onClick={() => {
                          setSelectedGuide(guide.id);
                          setAdjustmentPrompt(guide.example);
                        }}
                        className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-medium transition ${
                          selected
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {guide.emoji && <span aria-hidden="true" className="mr-1">{guide.emoji}</span>}
                        {guide.label}
                      </button>
                    );
                  })}
                </div>
                <div className="flex flex-wrap gap-1">
                  {[selectedGuideOption.example, "What should I drop?", "Prep tomorrow."].map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => setAdjustmentPrompt(prompt)}
                      className="rounded-full bg-muted px-2 py-1 text-[10px] text-muted-foreground hover:text-foreground"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                {AI_DEPTH_LEVELS.map((depth) => {
                  const copy = getAIDepthCopy(depth);
                  const selected = aiDepth === depth;
                  return (
                    <button
                      key={depth}
                      type="button"
                      title={copy.description}
                      onClick={() => setAiDepth(depth)}
                      className={`rounded-full px-2.5 py-1 text-[10px] font-medium transition ${
                        selected
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {copy.label}
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-2">
                <Textarea
                  value={adjustmentPrompt}
                  onChange={(event) => setAdjustmentPrompt(event.target.value)}
                  placeholder={`Ask ${selectedGuideOption.label}...`}
                  className="min-h-[44px] resize-none text-xs"
                />
                <Button
                  size="icon"
                  className="h-11 w-11 shrink-0"
                  onClick={submitAdjustment}
                  disabled={requestAdjustment.isPending || adjustmentPrompt.trim().length === 0}
                  title="Adjust today"
                >
                  {requestAdjustment.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Context</span>
              {(plan.sources_used || ["planner", "growth"]).map((source) => (
                <Badge key={source} variant="outline" className="text-[10px] capitalize">
                  {source}
                </Badge>
              ))}
              {hasConsentedSources.length === 0 && (
                <span className="text-[10px] text-muted-foreground">
                  Add context in settings for deeper personalization.
                </span>
              )}
              <div className="ml-auto flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-[11px] text-muted-foreground"
                  onClick={() => handleFeedback(null, true)}
                  disabled={feedbackSent[brief.data?.daily_plan?.id || "plan"] || submitFeedback.isPending}
                >
                  <ThumbsUp className="mr-1 h-3 w-3" />
                  Useful
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-[11px] text-muted-foreground"
                  onClick={() => handleFeedback(null, false)}
                  disabled={feedbackSent[brief.data?.daily_plan?.id || "plan"] || submitFeedback.isPending}
                >
                  <ThumbsDown className="mr-1 h-3 w-3" />
                  Not useful
                </Button>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </motion.section>
  );
}

function GuideInsightCard({ guide }: { guide: AIGuideInsight }) {
  const classes = getControllableGuideClasses(guide.guide_id);
  const signalStrength = guide.confidence === "High" ? 3 : guide.confidence === "Medium" ? 2 : 1;

  return (
    <div
      className={`rounded-xl border bg-background/70 px-2 py-3 text-center shadow-sm ${classes.borderClass}`}
      title={`${guide.guide_name}: ${guide.recommended_action || guide.insight}`}
    >
      <span className="block text-2xl leading-none" aria-hidden="true">{guide.guide_emoji}</span>
      <p className={`mt-2 truncate text-[10px] font-semibold ${classes.textClass}`}>{guide.guide_name}</p>
      <div className="mx-auto mt-2 flex w-10 justify-center gap-1">
        {[0, 1, 2].map((index) => (
          <span
            key={index}
            className={`h-1.5 w-1.5 rounded-full ${
              index < signalStrength
                ? "bg-primary"
                : "bg-muted"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

function RewardChip({ icon, label }: { icon: React.ReactNode; label: string }) {
  if (!label) return null;

  return (
    <span className="inline-flex max-w-full items-center gap-1.5 rounded-xl border border-border/50 bg-background/70 px-2.5 py-2 text-xs font-medium text-foreground">
      <span className="shrink-0 text-primary">{icon}</span>
      <span className="truncate">{label}</span>
    </span>
  );
}

function CircuitBar({ value }: { value: number }) {
  return (
    <div className="grid h-2 grid-cols-12 gap-1">
      {Array.from({ length: 12 }).map((_, index) => {
        const active = index < Math.round((Math.max(0, Math.min(value, 100)) / 100) * 12);
        return (
          <span
            key={index}
            className={`rounded-full ${active ? "bg-primary" : "bg-background/80"}`}
          />
        );
      })}
    </div>
  );
}

function OperatorLine({ label, value, icon, emphasized = false }: { label: string; value: string; icon: React.ReactNode; emphasized?: boolean }) {
  return (
    <div className={`flex gap-3 rounded-xl px-4 py-3 ${emphasized ? "border border-primary/20 bg-primary/10" : "bg-muted/25"}`}>
      <div className="mt-0.5 text-primary/70">{icon}</div>
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className={`${emphasized ? "text-base font-medium" : "text-sm"} text-foreground leading-relaxed`}>{value}</p>
      </div>
    </div>
  );
}
