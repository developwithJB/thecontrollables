export type CoachPlanTier = "free" | "plus" | "pro";
// Only a server-owned billing projection can grant a paid plan. Auth user_metadata
// is editable by users and must never be an entitlement fallback.
export async function readCoachPlanTier(
  readProfile: () => PromiseLike<{ data: { plan_tier: unknown } | null; error: unknown }>,
): Promise<CoachPlanTier> {
  const { data, error } = await readProfile();
  if (error) throw new Error("coach_entitlement_unavailable");
  return data?.plan_tier === "pro" || data?.plan_tier === "plus" ? data.plan_tier : "free";
}
