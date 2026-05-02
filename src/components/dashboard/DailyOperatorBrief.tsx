import { useMemo, useState } from "react";
import type React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Bot, Check, ChevronRight, Edit3, Loader2, RefreshCw, Send, Shield, Sparkles, ThumbsDown, ThumbsUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAIOperatorActions, useDailyOperatorBrief, type AIActionProposal } from "@/hooks/useAIOperator";
import { useEntitlements } from "@/hooks/useEntitlements";
import {
  AI_DEPTH_LEVELS,
  getAIDepthCopy,
  getAIPlanConfidence,
  getAIPlanContextLine,
  isExecutableAIProposal,
  shouldSuggestDeeperPass,
  type AIDepthLevel,
} from "@/lib/aiOperator";

interface DailyOperatorBriefProps {
  userId: string;
}

const proposalDeepLink = (proposal: AIActionProposal): string | null => {
  const payload = proposal.payload || {};
  const deepLink = payload.deep_link || payload.action_link;
  return typeof deepLink === "string" ? deepLink : null;
};

export function DailyOperatorBrief({ userId }: DailyOperatorBriefProps) {
  const navigate = useNavigate();
  const [adjustmentPrompt, setAdjustmentPrompt] = useState("");
  const [aiDepth, setAiDepth] = useState<AIDepthLevel>("quick");
  const [adjustmentCount, setAdjustmentCount] = useState(0);
  const [deeperPass, setDeeperPass] = useState<{ prompt: string; reasons: string[]; locked: boolean } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedTitle, setEditedTitle] = useState("");
  const [editedDescription, setEditedDescription] = useState("");
  const [feedbackSent, setFeedbackSent] = useState<Record<string, boolean>>({});
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
  const confidence = getAIPlanConfidence(plan?.sources_used || []);
  const contextLine = getAIPlanContextLine(plan?.sources_used || []);
  const canUseDeeperPass = planTier === "pro" || planTier === "premium" || planTier === "lifetime";

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

  const submitAdjustment = async () => {
    const trimmed = adjustmentPrompt.trim();
    if (!trimmed) return;
    await requestAdjustment.mutateAsync({ prompt: trimmed, aiDepth });
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
      setDeeperPass({ prompt: trimmed, reasons: signal.reasons, locked });
      await submitFeedback.mutateAsync({
        feedbackType: "do_more",
        dailyPlanId: brief.data?.daily_plan?.id,
        feedbackText: "Deeper pass suggested",
        showToast: false,
        metadata: {
          prompt: trimmed,
          reasons: signal.reasons,
          locked,
        },
      });
    } else {
      setDeeperPass(null);
    }
    setAdjustmentPrompt("");
  };

  const makeDayLighter = async () => {
    await requestAdjustment.mutateAsync({ prompt: "Make this day lighter", aiDepth: "quick" });
  };

  const runDeeperPass = async () => {
    if (!deeperPass) return;
    if (deeperPass.locked) {
      await submitFeedback.mutateAsync({
        feedbackType: "do_more",
        dailyPlanId: brief.data?.daily_plan?.id,
        feedbackText: "Deeper pass upgrade requested",
        showToast: false,
        metadata: { prompt: deeperPass.prompt, reasons: deeperPass.reasons, locked: true },
      });
      await initiateCheckout("pro", { source: "daily_operator_deeper_pass" });
      return;
    }

    await submitFeedback.mutateAsync({
      feedbackType: "do_more",
      dailyPlanId: brief.data?.daily_plan?.id,
      feedbackText: "Deeper pass accepted",
      showToast: false,
      metadata: { prompt: deeperPass.prompt, reasons: deeperPass.reasons },
    });
    await requestAdjustment.mutateAsync({ prompt: deeperPass.prompt, aiDepth: "deep" });
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
      metadata: { prompt: deeperPass.prompt, reasons: deeperPass.reasons, locked: deeperPass.locked },
    });
    setDeeperPass(null);
  };

  if (brief.isLoading) {
    return (
      <div className="rounded-2xl border border-border/30 bg-card px-5 py-5 space-y-4">
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span className="text-sm font-medium text-muted-foreground">Building your Daily Operator Brief...</span>
        </div>
        <div className="space-y-2">
          <div className="h-4 w-3/4 rounded bg-muted animate-pulse" />
          <div className="h-4 w-1/2 rounded bg-muted animate-pulse" />
          <div className="h-20 rounded-xl bg-muted/60 animate-pulse" />
        </div>
      </div>
    );
  }

  if (brief.data?.usage_limited && !plan) {
    return (
      <div className="rounded-2xl border border-primary/20 bg-card px-5 py-5 space-y-4 shadow-sm">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Daily Operator Brief</span>
        </div>
        <div className="space-y-2">
          <h2 className="font-display text-xl font-semibold text-foreground">Your free AI plans are used for this month.</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {brief.data.limit_message || "You've used your free AI plans for this month. Upgrade to keep your AI learning you."}
          </p>
        </div>
        <Button onClick={() => initiateCheckout("pro", { source: "daily_operator_monthly_limit" })} disabled={isCheckingOut}>
          {isCheckingOut ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
          Upgrade to Pro
        </Button>
      </div>
    );
  }

  if (brief.isError || !plan) {
    return (
      <div className="rounded-2xl border border-border/30 bg-card px-5 py-5 space-y-3">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-primary" />
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Daily Operator</span>
        </div>
        <p className="text-sm text-muted-foreground">
          The Operator could not build today&apos;s brief. Your Today view still works from the local signals below.
        </p>
        <Button variant="outline" size="sm" onClick={() => brief.refetch()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Try again
        </Button>
      </div>
    );
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-primary/20 bg-card px-5 py-5 space-y-5 shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Bot className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Daily Operator Brief</span>
            <Badge variant="outline" className="text-[10px]">
              Confidence: {confidence}
            </Badge>
          </div>
          <h2 className="font-display text-xl font-semibold text-foreground">What kind of day is this?</h2>
          <p className="text-base font-medium text-foreground">{plan.day_type}</p>
          <p className="text-sm text-muted-foreground leading-relaxed">{plan.summary}</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={() => brief.refetch()}
          disabled={brief.isFetching}
          title="Refresh brief"
        >
          <RefreshCw className={`h-4 w-4 ${brief.isFetching ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <div className="space-y-2 rounded-xl border border-primary/15 bg-primary/5 px-4 py-3">
        <p className="text-xs font-medium text-primary">Nothing changes unless you approve it.</p>
        <p className="text-xs text-muted-foreground leading-relaxed">{contextLine}</p>
      </div>

      <div className="grid gap-3">
        <OperatorLine label="What matters most" value={plan.matters_most} icon={<Sparkles className="h-3.5 w-3.5" />} />
        <OperatorLine label="What to protect" value={plan.protect} icon={<Shield className="h-3.5 w-3.5" />} />
        <OperatorLine label="What to do next" value={plan.next_move} icon={<ChevronRight className="h-3.5 w-3.5" />} emphasized />
      </div>

      <div className="rounded-xl bg-muted/35 px-4 py-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">If the day gets noisy</p>
        <p className="text-sm text-foreground leading-relaxed">{plan.fallback}</p>
      </div>

      {plan.weekly_prompt && (
        <div className="rounded-xl border border-accent/20 bg-accent/5 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-accent mb-1">Weekly loop</p>
          <p className="text-sm text-foreground leading-relaxed">{plan.weekly_prompt}</p>
        </div>
      )}

      {deeperPass && (
        <div className="rounded-xl border border-primary/15 bg-background/80 px-4 py-3 space-y-3">
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">
              This may need a deeper pass.
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Want me to take a better look? I&apos;ll only do that if you confirm.
            </p>
            {deeperPass.locked && (
              <p className="text-xs text-muted-foreground leading-relaxed">
                Go deeper is part of Pro for bigger planning moments.
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

      {proposals.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Do this first</p>
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
                  Approve
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => editingId === proposal.id ? setEditingId(null) : startEditing(proposal)}
                  disabled={confirmProposal.isPending}
                >
                  <Edit3 className="mr-1.5 h-3.5 w-3.5" />
                  {editingId === proposal.id ? "Close edit" : "Edit"}
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

      <div className="rounded-xl border border-border/50 bg-background/60 p-3 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Ask / adjust</p>
          <div className="flex flex-wrap justify-end gap-1">
            {["Replan my afternoon", "What should I drop?", "Make this lighter"].map((prompt) => (
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
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Most daily changes use quick mode. Deeper thinking is saved for bigger moments.
        </p>
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
            placeholder="Tell the Operator what changed..."
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
            Add more context in settings when you want deeper personalization.
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
    </motion.section>
  );
}

function OperatorLine({ label, value, icon, emphasized = false }: { label: string; value: string; icon: React.ReactNode; emphasized?: boolean }) {
  return (
    <div className={`flex gap-3 rounded-xl px-4 py-3 ${emphasized ? "bg-primary/10" : "bg-muted/25"}`}>
      <div className="mt-0.5 text-primary/70">{icon}</div>
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className={`${emphasized ? "text-base font-medium" : "text-sm"} text-foreground leading-relaxed`}>{value}</p>
      </div>
    </div>
  );
}
