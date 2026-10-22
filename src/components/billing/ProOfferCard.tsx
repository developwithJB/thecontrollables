import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { PRICING } from "@/lib/pricing";
import { trackGrowthEvent } from "@/lib/growthEvents";

export type ProOfferPlacement = "sample_exhausted" | "day7_review";

export function ProOfferCard({
  placement,
  userId = "session",
}: {
  placement: ProOfferPlacement;
  userId?: string;
}) {
  const key = `pro-offer-dismissed:${userId}:${placement}`;
  const [dismissedKey, setDismissedKey] = useState("");
  const tracked = useRef("");
  let stored = false;
  // Display preference only; never a billing entitlement or allowance decision.
  try {
    stored = localStorage.getItem(key) === "true";
  } catch {
    /* Optional storage. */
  }
  const dismissed = stored || dismissedKey === key;
  useEffect(() => {
    if (dismissed || tracked.current === key) return;
    tracked.current = key;
    trackGrowthEvent("pro_offer_viewed", { placement });
  }, [dismissed, key, placement]);
  if (dismissed) return null;
  return (
    <aside
      aria-label="Optional Pro offer"
      className="space-y-3 rounded-2xl border border-primary/30 bg-primary/5 p-4"
      data-testid={`pro-offer-${placement}`}
    >
      <h3 className="font-display text-lg font-semibold">
        {placement === "sample_exhausted"
          ? "Your free coach sample is complete"
          : "Keep the rhythm. Add support if it helps."}
      </h3>
      <p className="text-sm text-muted-foreground">
        {placement === "sample_exhausted"
          ? "Your one-time coach sample has reached its allowance. It does not reset. "
          : "You have a week to look back on. "}
        Pro adds hosted coaching and paid planning, history, and review tools.
      </p>
      <p className="text-sm">
        <strong>
          ${PRICING.pro.monthly}/month or ${PRICING.pro.annual}/year
        </strong>
        , before applicable tax. Up to 200 standard text replies per calendar
        month, at most 10/day, subject to the shared AI cost allowance. Larger
        requests and other AI features can reduce available replies.
      </p>
      <div className="flex flex-wrap gap-3">
        <Button asChild variant="future">
          <Link
            to="/pricing"
            onClick={() => trackGrowthEvent("pro_offer_clicked", { placement })}
          >
            See Pro plans
          </Link>
        </Button>
        <Link
          className="inline-flex min-h-11 items-center text-primary underline"
          to="/billing#coach-settings"
        >
          Bring my own AI key
        </Link>
        <Button
          variant="futureOutline"
          onClick={() => {
            try {
              localStorage.setItem(key, "true");
            } catch {
              /* Optional preference. */
            }
            setDismissedKey(key);
            trackGrowthEvent("pro_offer_dismissed", { placement });
          }}
        >
          Keep practicing free
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Read Along stays free. Strict 75-day enrollment still requires reviewed
        content.
      </p>
    </aside>
  );
}
