import { Link } from "react-router-dom";
import { useFormationEntryStatus } from "@/hooks/useFormationEntryStatus";
import { Button } from "@/components/ui/button";
export function FormationAvailability() {
  const status = useFormationEntryStatus();
  return <div className="rounded-2xl border border-border bg-muted/25 p-4 text-sm" aria-live="polite" data-testid="formation-availability">
    <p className="font-semibold">{status.isPending ? "Checking Fully Charged availability…" : status.data?.strictReady ? "Fully Charged: 75 Days · Reviewed content ready" : "Fully Charged: 75 Days · Not open for new starts yet"}</p>
    {!status.isPending && !status.data?.strictReady ? <p className="mt-2 text-muted-foreground">All 75 assignments must finish review before a strict attempt can begin. Read Along is available now, with no deadline or reset.</p> : null}
    {status.isError ? <Button variant="futureOutline" className="mt-3" onClick={() => void status.refetch()}>Retry availability check</Button> : null}
    {!status.data?.strictReady ? <Link className="mt-2 inline-flex min-h-11 items-center text-primary underline" to="/quick-start?path=read_along">Choose Read Along</Link> : null}
  </div>;
}
