import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { PRICING, type BillingInterval } from "@/lib/pricing";
import { HOSTED_AI_ALLOWANCE } from "../../../supabase/functions/_shared/billingContract";
export function FreemiumPlans({
  onCheckout,
  busy = false,
  initialInterval = "year",
}: {
  onCheckout?: (interval: BillingInterval) => void;
  busy?: boolean;
  initialInterval?: BillingInterval;
}) {
  const [interval, setInterval] = useState<BillingInterval>(initialInterval);
  return (
    <section aria-labelledby="plans-title" className="space-y-6" id="plans">
      <div>
        <h2 id="plans-title" className="font-display text-2xl font-bold">
          Start free. Choose your support.
        </h2>
        <p className="mt-2 text-muted-foreground">
          Private daily practice is free. AI is optional. The strict 75-day path
          opens once every day is reviewed.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <article className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <h3 className="text-lg font-semibold">Free</h3>
          <p className="text-2xl font-bold">$0</p>
          <p>
            Read Along, daily practices and your own records. No card required.
          </p>
          <p>
            {HOSTED_AI_ALLOWANCE.freeRepliesLifetime} hosted coach sample
            replies per verified account, subject to the shared sample
            allowance. The sample does not reset.
          </p>
          <Button asChild variant="outline" className="min-h-11 w-full">
            <Link to="/quick-start?path=read_along">Start with Read Along</Link>
          </Button>
        </article>
        <article
          className="rounded-2xl border border-border bg-card p-5 space-y-4"
          id="bring-your-own"
        >
          <h3 className="text-lg font-semibold">Bring your own AI</h3>
          <p className="text-2xl font-bold">
            $0 <span className="text-sm font-normal">platform AI fee</span>
          </p>
          <p>
            Use your own OpenAI, OpenRouter or Anthropic key for coach chat.
            Your provider bills you directly.
          </p>
          <p>
            Up to {HOSTED_AI_ALLOWANCE.byoRequestsDaily} requests/day. No
            automatic switch to hosted AI. Hosted planning and summaries are
            separate paid features.
          </p>
          <Button asChild variant="outline" className="min-h-11 w-full">
            <Link to="/billing#coach-settings">Set up my provider</Link>
          </Button>
        </article>
        <article className="rounded-2xl border border-primary/40 bg-primary/5 p-5 space-y-4">
          <h3 className="text-lg font-semibold">Pro</h3>
          <fieldset className="flex flex-wrap gap-3">
            <legend className="text-sm mb-1">Billing interval</legend>
            {(["year", "month"] as const).map((value) => (
              <label
                key={value}
                className="inline-flex min-h-11 items-center gap-2"
              >
                <input
                  type="radio"
                  name="pro-interval"
                  value={value}
                  checked={interval === value}
                  onChange={() => setInterval(value)}
                />
                {value === "year" ? "Annual" : "Monthly"}
              </label>
            ))}
          </fieldset>
          <p className="text-2xl font-bold">
            ${interval === "year" ? PRICING.pro.annual : PRICING.pro.monthly}
            <span className="text-sm font-normal">/{interval}</span>
          </p>
          <p>
            {interval === "year"
              ? "Charged once per year. Renews annually."
              : "Charged monthly. Renews monthly."}{" "}
            Cancel renewal in Billing. Taxes may apply.
          </p>
          <p>
            Hosted coach plus paid history, planning and review tools. Up to{" "}
            {HOSTED_AI_ALLOWANCE.paidRepliesMonthly} standard text coach replies
            per calendar month, maximum {HOSTED_AI_ALLOWANCE.paidRepliesDaily}
            /day.
          </p>
          <p>
            All hosted AI shares one monthly allowance. Long chats, images,
            plans, summaries and failed attempts can reduce available replies.
            No overage charges or unlimited AI.
          </p>
          {onCheckout ? (
            <Button
              className="min-h-11 w-full"
              disabled={busy}
              onClick={() => onCheckout(interval)}
            >
              {busy
                ? "Opening secure checkout…"
                : `Choose Pro — ${interval === "year" ? "annual" : "monthly"}`}
            </Button>
          ) : (
            <Button asChild className="min-h-11 w-full">
              <Link to={`/billing?interval=${interval}`}>Choose Pro</Link>
            </Button>
          )}
        </article>
      </div>
      <p className="text-xs text-muted-foreground">
        Secure checkout is hosted by Stripe. Apple Pay appears on supported
        devices with an eligible Wallet card; card checkout is also available.
        Existing Plus and Pro subscriptions keep their current billing rate.
        Read Along and your saved practices remain available when an AI
        allowance runs out.
      </p>
    </section>
  );
}
