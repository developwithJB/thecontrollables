import { useEntitlements } from "@/hooks/useEntitlements";
import { useHostedAiAllowance } from "@/hooks/useHostedAiAllowance";
import { isFreeSampleExhausted } from "@/lib/launchFunnel";
import type { ProOfferPlacement } from "./ProOfferCard";
import { ProOfferCard } from "./ProOfferCard";

export function AccountProOffer({
  userId,
  placement,
}: {
  userId: string;
  placement: ProOfferPlacement;
}) {
  const entitlement = useEntitlements(userId);
  const allowance = useHostedAiAllowance(userId);
  if (
    entitlement.isLoading ||
    !entitlement.serverVerified ||
    entitlement.isPaid ||
    entitlement.legacyAppAccess ||
    allowance.isError ||
    !allowance.data?.enabled ||
    allowance.data.plan !== "free"
  )
    return null;
  if (
    placement === "sample_exhausted" &&
    !isFreeSampleExhausted(allowance.data)
  )
    return null;
  return <ProOfferCard placement={placement} userId={userId} />;
}
