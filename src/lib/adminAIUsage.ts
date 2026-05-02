export const AI_DEPTH_LABELS: Record<string, string> = {
  quick: "Quick answer",
  balanced: "Think it through",
  deep: "Go deeper",
};

export const AI_MODE_LABELS: Record<string, string> = {
  daily_brief: "Daily Operator Brief",
  adjust: "Adjustment",
  weekly_plan: "Weekly Plan",
};

export const formatAIUsageCurrency = (value: number | null | undefined, maximumFractionDigits?: number) => {
  const amount = Number.isFinite(value) ? Number(value) : 0;
  const resolvedMaximumFractionDigits = maximumFractionDigits ?? (amount < 1 ? 4 : 2);
  const minimumFractionDigits = amount < 1
    ? Math.min(4, resolvedMaximumFractionDigits)
    : Math.min(2, resolvedMaximumFractionDigits);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits,
    maximumFractionDigits: resolvedMaximumFractionDigits,
  }).format(amount);
};

export const formatAIUsagePercent = (value: number | null | undefined) => {
  const amount = Number.isFinite(value) ? Number(value) : 0;
  return `${amount.toFixed(1)}%`;
};

export const safeCostPerApprovedProposal = (totalCost: number, approvedCount: number) => {
  return approvedCount > 0 ? totalCost / approvedCount : 0;
};

export const getAIDepthAdminLabel = (depth: string) => AI_DEPTH_LABELS[depth] || depth;
export const getAIModeAdminLabel = (mode: string) => AI_MODE_LABELS[mode] || mode;
