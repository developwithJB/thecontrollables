import { CONTROLLABLE_GUIDE_IDS, getControllableGuide, type ControllableGuideId } from "@/lib/controllables";

export interface WeeklyAIInsightInput {
  dailyPlans: Array<{
    planDate: string;
    status?: string | null;
  }>;
  proposals: Array<{
    status: string;
    proposalType?: string | null;
  }>;
  plannerItems: Array<{
    scheduledDate: string;
    status: string;
    startTime?: string | null;
  }>;
  feedbackEvents: Array<{
    feedbackType: string;
  }>;
  usageEvents: Array<{
    mode: string;
    cacheHit?: boolean | null;
  }>;
}

export interface WeeklyAIInsight {
  headline: string;
  detail: string;
  chargeLevel: string;
  guideSections: Array<{
    guideId: ControllableGuideId;
    guideName: string;
    guideEmoji: string;
    prompt: string;
    insight: string;
  }>;
  egoCheck: string;
  nextWeekFocus: string;
  stats: Array<{ label: string; value: string }>;
  confidence: "early" | "solid";
}

const uniqueCount = (values: string[]) => new Set(values.filter(Boolean)).size;

const getDayLoadStats = (plannerItems: WeeklyAIInsightInput["plannerItems"]) => {
  const byDay = new Map<string, { planned: number; done: number }>();

  for (const item of plannerItems) {
    const current = byDay.get(item.scheduledDate) || { planned: 0, done: 0 };
    current.planned += 1;
    if (item.status === "done") current.done += 1;
    byDay.set(item.scheduledDate, current);
  }

  return Array.from(byDay.values()).filter((day) => day.planned > 0);
};

const getTimeBlockStats = (plannerItems: WeeklyAIInsightInput["plannerItems"]) => {
  const stats = {
    morning: { planned: 0, done: 0 },
    afternoon: { planned: 0, done: 0 },
  };

  for (const item of plannerItems) {
    if (!item.startTime) continue;
    const hour = Number.parseInt(item.startTime.slice(0, 2), 10);
    if (!Number.isFinite(hour)) continue;
    const bucket = hour < 12 ? stats.morning : stats.afternoon;
    bucket.planned += 1;
    if (item.status === "done") bucket.done += 1;
  }

  return stats;
};

const rate = (done: number, planned: number) => (planned > 0 ? done / planned : 0);

const buildChargeLevel = ({
  operatorDays,
  approvedActions,
  completedItems,
  confidence,
}: {
  operatorDays: number;
  approvedActions: number;
  completedItems: number;
  confidence: "early" | "solid";
}) => {
  if (confidence === "solid" && operatorDays >= 4 && completedItems >= 8) return "Strong charge";
  if (operatorDays >= 3 || approvedActions >= 2 || completedItems >= 5) return "Steady charge";
  return "Building charge";
};

const buildGuideReport = ({
  awareness,
  perspective,
  habit,
  wellness,
  environment,
}: {
  awareness: string;
  perspective: string;
  habit: string;
  wellness: string;
  environment: string;
}): WeeklyAIInsight["guideSections"] => {
  const prompts: Record<ControllableGuideId, string> = {
    awareness: "What pattern showed up",
    perspective: "What story needs reframing",
    habit: "What repeat helped or hurt",
    wellness: "What protected or drained energy",
    environment: "What helped or created friction",
  };
  const insights: Record<ControllableGuideId, string> = {
    awareness,
    perspective,
    habit,
    wellness,
    environment,
  };

  return CONTROLLABLE_GUIDE_IDS.map((guideId) => {
    const guide = getControllableGuide(guideId);
    return {
      guideId: guide.id,
      guideName: guide.name,
      guideEmoji: guide.emoji,
      prompt: prompts[guide.id],
      insight: insights[guide.id],
    };
  });
};

const finalizeReport = ({
  headline,
  detail,
  nextWeekFocus,
  stats,
  confidence,
  guideSections,
  egoCheck,
  operatorDays,
  approvedActions,
  completedItems,
}: Omit<WeeklyAIInsight, "chargeLevel"> & {
  operatorDays: number;
  approvedActions: number;
  completedItems: number;
}): WeeklyAIInsight => ({
  headline,
  detail,
  chargeLevel: buildChargeLevel({ operatorDays, approvedActions, completedItems, confidence }),
  guideSections,
  egoCheck,
  nextWeekFocus,
  stats,
  confidence,
});

export const generateWeeklyAIInsight = (input: WeeklyAIInsightInput): WeeklyAIInsight | null => {
  const operatorDays = uniqueCount(input.dailyPlans.map((plan) => plan.planDate));
  const approvedProposals = input.proposals.filter((proposal) => proposal.status === "approved" || proposal.status === "executed");
  const executedProposals = input.proposals.filter((proposal) => proposal.status === "executed");
  const completedItems = input.plannerItems.filter((item) => item.status === "done").length;
  const adjustmentCount = input.usageEvents.filter((event) => event.mode === "adjust").length;
  const usefulFeedback = input.feedbackEvents.filter((event) => event.feedbackType === "thumbs_up" || event.feedbackType === "do_more").length;
  const notUsefulFeedback = input.feedbackEvents.filter((event) => event.feedbackType === "not_useful" || event.feedbackType === "thumbs_down").length;

  if (operatorDays < 2 && approvedProposals.length < 1 && completedItems < 3) {
    return null;
  }

  const stats = [
    { label: "Brief days", value: String(operatorDays) },
    { label: "Approved moves", value: String(approvedProposals.length) },
    { label: "Completed moves", value: String(completedItems) },
  ];

  const timeStats = getTimeBlockStats(input.plannerItems);
  const morningRate = rate(timeStats.morning.done, timeStats.morning.planned);
  const afternoonRate = rate(timeStats.afternoon.done, timeStats.afternoon.planned);

  if (timeStats.morning.planned >= 2 && timeStats.afternoon.planned >= 2 && morningRate - afternoonRate >= 0.25) {
    const confidence = operatorDays >= 3 ? "solid" : "early";
    return finalizeReport({
      headline: "You protected your mornings better than your afternoons.",
      detail: "Your follow-through was stronger before the day got crowded.",
      nextWeekFocus: "Put the highest-value action before noon, then keep the afternoon lighter.",
      guideSections: buildGuideReport({
        awareness: "Your week had a clearer charge early in the day.",
        perspective: "This is not an all-day willpower problem. It is a timing pattern.",
        habit: "The repeat that helped was starting before the day got crowded.",
        wellness: "Energy looked easier to protect before afternoon pressure built up.",
        environment: "The later part of the day carried more friction and fewer clean lanes.",
      }),
      egoCheck: "Watch for overcommitting in the afternoon to prove you can still catch up.",
      stats,
      confidence,
      operatorDays,
      approvedActions: approvedProposals.length,
      completedItems,
    });
  }

  const dayStats = getDayLoadStats(input.plannerItems);
  const bestDays = dayStats
    .filter((day) => rate(day.done, day.planned) >= 0.6)
    .sort((a, b) => rate(b.done, b.planned) - rate(a.done, a.planned));
  const bestDayAverageLoad = bestDays.length > 0
    ? bestDays.reduce((sum, day) => sum + day.planned, 0) / bestDays.length
    : 0;

  if (bestDays.length >= 2 && bestDayAverageLoad <= 4) {
    return finalizeReport({
      headline: "Your best execution days had fewer than 4 planned actions.",
      detail: "The week worked better when the plan gave you room to move.",
      nextWeekFocus: "Choose one must-win, two supporting actions, and one optional task.",
      guideSections: buildGuideReport({
        awareness: "Your execution improved when the day had fewer moving pieces.",
        perspective: "A smaller plan was not a weaker plan. It was the plan that worked.",
        habit: "The repeat that helped was keeping the daily list short enough to finish.",
        wellness: "Lower load protected decision quality and reduced drag.",
        environment: "Less clutter in the plan created more room to act.",
      }),
      egoCheck: "Watch for adding extra tasks to feel productive when the better move is staying focused.",
      stats,
      confidence: "solid",
      operatorDays,
      approvedActions: approvedProposals.length,
      completedItems,
    });
  }

  if (approvedProposals.length >= 2 && executedProposals.length / approvedProposals.length >= 0.5) {
    const confidence = operatorDays >= 3 ? "solid" : "early";
    return finalizeReport({
      headline: "You moved faster when you turned the brief into approved action.",
      detail: "Reading helped, but confirming the next move created momentum.",
      nextWeekFocus: "Approve one small action from the brief before adding anything new.",
      guideSections: buildGuideReport({
        awareness: "The week changed when the brief became a decision, not just information.",
        perspective: "Progress came from approval and movement, not from perfect certainty.",
        habit: "The useful repeat was approving one small next action.",
        wellness: "A clear next move reduced the energy cost of deciding again.",
        environment: "The Dashboard worked best when it placed the next action where you could see it.",
      }),
      egoCheck: "Watch for waiting until the whole plan feels perfect before approving one useful move.",
      stats,
      confidence,
      operatorDays,
      approvedActions: approvedProposals.length,
      completedItems,
    });
  }

  if (notUsefulFeedback >= 2 && notUsefulFeedback >= usefulFeedback) {
    return finalizeReport({
      headline: "You made the system sharper by removing what did not fit.",
      detail: "That feedback is useful. The best plan is the one you can actually live.",
      nextWeekFocus: "Keep rejecting noisy suggestions so the Operator learns your real constraints.",
      guideSections: buildGuideReport({
        awareness: "Your feedback showed where the plan did not match reality.",
        perspective: "Rejecting a bad suggestion is not resistance. It is calibration.",
        habit: "The repeat that helped was editing the plan instead of forcing it.",
        wellness: "Less noise protects energy for the actions that actually matter.",
        environment: "Your Dashboard gets better when friction is named and removed.",
      }),
      egoCheck: "Watch for treating edits as failure instead of using them as information.",
      stats,
      confidence: "early",
      operatorDays,
      approvedActions: approvedProposals.length,
      completedItems,
    });
  }

  if (adjustmentCount >= 3) {
    const confidence = operatorDays >= 3 ? "solid" : "early";
    return finalizeReport({
      headline: "Your week needed active replanning, not a static to-do list.",
      detail: "The useful signal is not that plans changed. It is that you kept adjusting instead of drifting.",
      nextWeekFocus: "Start each day with one protected action and one thing you are willing to drop.",
      guideSections: buildGuideReport({
        awareness: "The week had movement and changing constraints.",
        perspective: "Replanning was not a failure. It was how you stayed responsive.",
        habit: "The repeat that helped was coming back to the plan instead of abandoning it.",
        wellness: "Frequent adjustment can protect energy when it keeps the day realistic.",
        environment: "The week needed flexible rails, not a rigid script.",
      }),
      egoCheck: "Watch for reacting to change by trying to control everything at once.",
      stats,
      confidence,
      operatorDays,
      approvedActions: approvedProposals.length,
      completedItems,
    });
  }

  const confidence = operatorDays >= 3 ? "solid" : "early";
  return finalizeReport({
    headline: "Your clearest days came from keeping the plan short.",
    detail: "The Operator works best when it turns the week into fewer, cleaner decisions.",
    nextWeekFocus: "Aim for one clear first action each morning.",
    guideSections: buildGuideReport({
      awareness: "Your week had more clarity when the plan stayed simple.",
      perspective: "A clean first action mattered more than a full perfect map.",
      habit: "The repeat to keep is starting with one visible next move.",
      wellness: "Fewer decisions helped protect your charge.",
      environment: "The best setup was a day with less noise around the first action.",
    }),
    egoCheck: "Watch for making the plan bigger when the useful move is making it clearer.",
    stats,
    confidence,
    operatorDays,
    approvedActions: approvedProposals.length,
    completedItems,
  });
};
