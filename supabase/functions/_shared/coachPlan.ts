export type CoachPlanTier = "free" | "plus" | "pro";
// Only a server-owned billing projection can grant a paid plan. Auth user_metadata
// is editable by users and must never be an entitlement fallback.
export async function readCoachPlanTier(
  readProfile: () => PromiseLike<{
    data: { plan_tier: unknown } | null;
    error: unknown;
  }>,
): Promise<CoachPlanTier> {
  const { data, error } = await readProfile();
  if (error) throw new Error("coach_entitlement_unavailable");
  if (["pro", "premium", "lifetime"].includes(String(data?.plan_tier)))
    return "pro";
  return data?.plan_tier === "plus" ? "plus" : "free";
}

export function hostedCoachAccess(
  selected: boolean,
  enabled: boolean,
  plan: CoachPlanTier,
): "legacy" | "active" | "disabled" | "upgrade" {
  if (!selected) return "legacy";
  if (!enabled) return "disabled";
  return plan === "pro" ? "active" : "upgrade";
}
