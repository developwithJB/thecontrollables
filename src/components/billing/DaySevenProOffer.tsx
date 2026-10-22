import { useEntitlements } from "@/hooks/useEntitlements";
import { useHostedAiAllowance } from "@/hooks/useHostedAiAllowance";
import { ProOfferCard } from "./ProOfferCard";

export function DaySevenProOffer({ userId }: { userId: string }) {
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
  return <ProOfferCard placement="day7_review" userId={userId} />;
}
