import { Link } from "react-router-dom";
import type { HostedAiAllowance } from "@/hooks/useHostedAiAllowance";
import { isFreeSampleExhausted } from "@/lib/launchFunnel";
import { ProOfferCard } from "./ProOfferCard";
export function AiAllowancePanel({
  allowance,
  unavailable = false,
  compact = false,
  userId,
}: {
  allowance?: HostedAiAllowance;
  unavailable?: boolean;
  compact?: boolean;
  userId?: string;
}) {
  const explanation = allowance && (
    <div className="space-y-2 pt-2">
      {!allowance.byoActive && (
        <>
          <p>
            {allowance.budgetPercentRemaining}% of your shared AI allowance
            remains. Longer conversations, plans, summaries and failed attempts
            use the same allowance.
          </p>
          <p>
            {allowance.resetsAt
              ? `Resets ${new Date(allowance.resetsAt).toLocaleDateString(undefined, { timeZone: "UTC" })} at 00:00 UTC. Unused allowance does not roll over.`
              : "The free sample does not reset. Email verification is required."}
          </p>
        </>
      )}
      <p className="text-muted-foreground">
        AI supports reflection. Scripture and reviewed lessons remain the
        foundation. AI never completes a practice for you.
      </p>
    </div>
  );
  return (
    <section
      aria-label="AI allowance"
      className="w-full rounded-xl border border-border bg-muted/30 p-4 text-sm space-y-2"
    >
      <h3 className="font-semibold">Your AI allowance</h3>
      {unavailable ? (
        <p role="status">
          We couldn’t load your allowance. Refresh before starting a new
          conversation.
        </p>
      ) : !allowance ? (
        <p role="status">Checking your allowance…</p>
      ) : allowance.byoActive ? (
        <p>
          Your provider key is active. {allowance.byoRemaining} requests
          remaining today. Your provider bills its use; no hosted fallback.
        </p>
      ) : !allowance.enabled ? (
        <p>
          Hosted AI is temporarily unavailable. Your daily practices remain
          available.
        </p>
      ) : (
        <p>
          {allowance.repliesRemaining}{" "}
          {allowance.plan === "free"
            ? "sample replies left on this account"
            : "replies left this month"}
          ; {allowance.dailyRemaining} available today.
        </p>
      )}
      {allowance &&
        (compact ? (
          <details>
            <summary className="min-h-11 cursor-pointer py-3 underline">
              How this allowance works
            </summary>
            {explanation}
          </details>
        ) : (
          explanation
        ))}
      {!unavailable && isFreeSampleExhausted(allowance) ? <ProOfferCard placement="sample_exhausted" userId={userId} /> : null}
      <Link
        to="/billing"
        className="inline-flex min-h-11 items-center text-primary underline"
      >
        Plans, usage & bring your own key
      </Link>
    </section>
  );
}
