import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { getFeatureFlag } from "@/lib/featureFlags";
import { getHostedCoachPriceDisplay } from "@/lib/pricing";
import {
  loadHostedCoachStatus,
  selectHostedCoach,
} from "@/data/coach/coachSettings";

export function HostedCoachCard({ userId }: { userId: string }) {
  const visible = getFeatureFlag("hosted_coach_enabled");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const query = useQuery({
    queryKey: ["hosted-coach", userId],
    queryFn: () => loadHostedCoachStatus(userId),
    enabled: visible,
    staleTime: 0,
    gcTime: 0,
  });
  if (!visible || !query.data?.enabled) return null;
  const price = getHostedCoachPriceDisplay();
  const setSelection = async (selected: boolean) => {
    setBusy(true);
    setStatus("");
    try {
      await selectHostedCoach(userId, selected);
      await query.refetch();
      setStatus("Saved.");
    } catch {
      setStatus("Could not change coach. Please try again.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <section
      aria-label="Hosted coach"
      className="ph-no-capture ph-block space-y-3 rounded-lg border border-border/50 bg-muted/30 p-4"
      data-private
    >
      <h3 className="font-medium">Hosted coach</h3>
      <p className="text-sm">Included with Pro</p>
      {price && !query.data.entitled ? <p className="text-sm">{price}</p> : null}
      <p className="text-xs text-muted-foreground">
        Use the app’s coach without bringing an API key. Up to 200 standard text replies per month, 10/day, subject to the shared AI allowance. Coaching supports your practice; you still complete every
        circuit and close each day yourself.
      </p>
      {query.data.selected ? (
        <p className="text-sm">
          Hosted coach selected. Any saved personal provider key is retained.
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {query.data.entitled ? (
          <Button
            disabled={busy || query.data.selected}
            onClick={() => void setSelection(true)}
          >
            Use Pro coach
          </Button>
        ) : (
          <Button asChild>
            <Link to="/billing#plans">Explore Pro</Link>
          </Button>
        )}
        {query.data.selected ? (
          <Button
            variant="futureOutline"
            disabled={busy}
            onClick={() => void setSelection(false)}
          >
            Use previous coach
          </Button>
        ) : null}
      </div>
      <p role="status" className="text-sm text-muted-foreground">
        {busy ? "Saving…" : status}
      </p>
    </section>
  );
}
