import { useState } from "react";
import type React from "react";
import { Archive, ChevronDown, Cross, ShieldCheck, Sparkles } from "lucide-react";
import { useLifeOSUser } from "@/hooks/useLifeOSAuth";
import { usePageViewTracking } from "@/hooks/useAnalytics";
import { EvidenceMuseum } from "@/components/covenant/EvidenceMuseum";
import { ProofEntryCard } from "@/components/dashboard/ProofEntryCard";
import { ProofHistory } from "@/components/dashboard/IGProofHistory";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export default function Evidence() {
  usePageViewTracking("Evidence");
  const user = useLifeOSUser();
  const [journalOpen, setJournalOpen] = useState(false);

  return (
    <div className="mx-auto max-w-6xl space-y-5 pb-24">
      <header className="dashboard-os-surface rounded-[2rem] p-5 sm:p-6">
        <div className="pointer-events-none absolute inset-x-0 top-0 grid grid-cols-10 gap-px opacity-60">
          {Array.from({ length: 10 }).map((_, index) => (
            <span key={index} className={index < 7 ? "h-px bg-primary" : "h-px bg-border"} />
          ))}
        </div>
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-[inset_0_0_22px_hsl(var(--primary)/0.1)]">
              <Archive className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Lifetime Evidence</p>
              <h1 className="dashboard-neon-accent font-display text-4xl font-bold leading-tight">A museum of faithfulness.</h1>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <EvidenceChip icon={<ShieldCheck className="h-3.5 w-3.5" />} label="Private first" />
            <EvidenceChip icon={<Cross className="h-3.5 w-3.5" />} label="Grace centered" />
            <EvidenceChip icon={<Sparkles className="h-3.5 w-3.5" />} label="Built for a lifetime" />
          </div>
        </div>
      </header>

      <EvidenceMuseum userId={user.id} />

      <Collapsible open={journalOpen} onOpenChange={setJournalOpen} className="dashboard-os-card rounded-[2rem] p-4">
        <CollapsibleTrigger className="flex w-full items-center justify-between gap-3 text-left">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">Evidence Journal</p>
            <h2 className="mt-1 font-display text-xl font-bold text-foreground">Keep a moment, photo, or faithful choice</h2>
            <p className="mt-1 text-xs text-muted-foreground">The museum holds the totals. The journal remembers the Tuesdays.</p>
          </div>
          <ChevronDown className={`h-5 w-5 shrink-0 text-muted-foreground transition-transform ${journalOpen ? "rotate-180" : ""}`} />
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-4">
          <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
            <ProofEntryCard userId={user.id} />
            <ProofHistory userId={user.id} />
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

function EvidenceChip({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-foreground shadow-[0_0_16px_hsl(var(--primary)/0.08)]">
      <span className="text-primary">{icon}</span>
      {label}
    </span>
  );
}
