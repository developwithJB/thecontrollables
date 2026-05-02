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
    { label: "Operator days", value: String(operatorDays) },
    { label: "Approved actions", value: String(approvedProposals.length) },
    { label: "Completed actions", value: String(completedItems) },
  ];

  const timeStats = getTimeBlockStats(input.plannerItems);
  const morningRate = rate(timeStats.morning.done, timeStats.morning.planned);
  const afternoonRate = rate(timeStats.afternoon.done, timeStats.afternoon.planned);

  if (timeStats.morning.planned >= 2 && timeStats.afternoon.planned >= 2 && morningRate - afternoonRate >= 0.25) {
    return {
      headline: "You protected your mornings better than your afternoons.",
      detail: "Your follow-through was stronger before the day got crowded.",
      nextWeekFocus: "Put the highest-value action before noon, then keep the afternoon lighter.",
      stats,
      confidence: operatorDays >= 3 ? "solid" : "early",
    };
  }

  const dayStats = getDayLoadStats(input.plannerItems);
  const bestDays = dayStats
    .filter((day) => rate(day.done, day.planned) >= 0.6)
    .sort((a, b) => rate(b.done, b.planned) - rate(a.done, a.planned));
  const bestDayAverageLoad = bestDays.length > 0
    ? bestDays.reduce((sum, day) => sum + day.planned, 0) / bestDays.length
    : 0;

  if (bestDays.length >= 2 && bestDayAverageLoad <= 4) {
    return {
      headline: "Your best execution days had fewer than 4 planned actions.",
      detail: "The week worked better when the plan gave you room to move.",
      nextWeekFocus: "Choose one must-win, two supporting actions, and one optional task.",
      stats,
      confidence: "solid",
    };
  }

  if (approvedProposals.length >= 2 && executedProposals.length / approvedProposals.length >= 0.5) {
    return {
      headline: "You moved faster when you turned the brief into approved action.",
      detail: "Reading helped, but confirming the next move created momentum.",
      nextWeekFocus: "Approve one small action from the brief before adding anything new.",
      stats,
      confidence: operatorDays >= 3 ? "solid" : "early",
    };
  }

  if (notUsefulFeedback >= 2 && notUsefulFeedback >= usefulFeedback) {
    return {
      headline: "You made the system sharper by removing what did not fit.",
      detail: "That feedback is useful. The best plan is the one you can actually live.",
      nextWeekFocus: "Keep rejecting noisy suggestions so the Operator learns your real constraints.",
      stats,
      confidence: "early",
    };
  }

  if (adjustmentCount >= 3) {
    return {
      headline: "Your week needed active replanning, not a static to-do list.",
      detail: "The useful signal is not that plans changed. It is that you kept adjusting instead of drifting.",
      nextWeekFocus: "Start each day with one protected action and one thing you are willing to drop.",
      stats,
      confidence: operatorDays >= 3 ? "solid" : "early",
    };
  }

  return {
    headline: "Your clearest days came from keeping the plan short.",
    detail: "The Operator works best when it turns the week into fewer, cleaner decisions.",
    nextWeekFocus: "Aim for one clear first action each morning.",
    stats,
    confidence: operatorDays >= 3 ? "solid" : "early",
  };
};
