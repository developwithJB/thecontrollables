import { CheckCircle2 } from "lucide-react";
import { useLifeOSUser } from "@/hooks/useLifeOSAuth";
import { usePageViewTracking } from "@/hooks/useAnalytics";
import { ProofEntryCard } from "@/components/dashboard/ProofEntryCard";
import { ProofHistory } from "@/components/dashboard/IGProofHistory";

export default function Proof() {
  usePageViewTracking("Proof");
  const user = useLifeOSUser();

  return (
    <div className="mx-auto max-w-md space-y-4">
      <header className="flex items-center gap-3">
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <CheckCircle2 className="h-5 w-5" />
        </span>
        <div>
          <h1 className="font-display text-2xl font-semibold text-foreground">Proof</h1>
          <p className="text-sm text-muted-foreground">Share proof, not private work.</p>
        </div>
      </header>

      <ProofEntryCard userId={user.id} />
      <ProofHistory userId={user.id} />
    </div>
  );
}
