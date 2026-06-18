import type React from "react";
import { Link } from "react-router-dom";
import { Camera, CheckCircle2, LockKeyhole, Share2, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLifeOSUser } from "@/hooks/useLifeOSAuth";
import { usePageViewTracking } from "@/hooks/useAnalytics";
import { useControllablesDex } from "@/hooks/useControllablesDex";
import { ProofEntryCard } from "@/components/dashboard/ProofEntryCard";
import { ProofHistory } from "@/components/dashboard/IGProofHistory";
import { APP_ROUTES } from "@/lib/appRoutes";

export default function Proof() {
  usePageViewTracking("Proof");
  const user = useLifeOSUser();
  const { stats: dexStats } = useControllablesDex(user.id);

  return (
    <div className="mx-auto max-w-5xl space-y-4 pb-24">
      <header className="dashboard-os-surface rounded-[2rem] p-5 sm:p-6">
        <div className="relative z-10">
          <div className="pointer-events-none absolute inset-x-0 top-0 grid grid-cols-8 gap-px opacity-60">
            {Array.from({ length: 8 }).map((_, index) => (
              <span key={index} className={index < 5 ? "h-px bg-primary" : "h-px bg-border"} />
            ))}
          </div>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-[inset_0_0_22px_hsl(var(--primary)/0.1)]">
                <CheckCircle2 className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Proof</p>
                <h1 className="dashboard-neon-accent font-display text-4xl font-bold leading-tight">Share proof.</h1>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <ProofChip icon={<LockKeyhole className="h-3.5 w-3.5" />} label="Private first" />
              <ProofChip icon={<Share2 className="h-3.5 w-3.5" />} label="Share-safe" />
              <ProofChip icon={<Sparkles className="h-3.5 w-3.5" />} label="Stay Charged" />
            </div>
          </div>
        </div>
      </header>

      <section className="dashboard-os-card rounded-[2rem] p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Sparkles className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                The Controllables Dex
              </p>
              <h2 className="mt-1 text-lg font-semibold text-foreground">Collect proof of real-life reps.</h2>
              <p className="mt-1 max-w-xl text-sm text-muted-foreground">
                Manual mission photo proof, saved privately and share-safe by default.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <ProofChip icon={<ShieldCheck className="h-3.5 w-3.5" />} label="No exact location" />
                <ProofChip icon={<Camera className="h-3.5 w-3.5" />} label={`${dexStats.totalProofCount} photo proof`} />
              </div>
            </div>
          </div>
          <Link to={APP_ROUTES.proofDex}>
            <Button className="w-full sm:w-auto">Open Dex</Button>
          </Link>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
        <ProofEntryCard userId={user.id} />
        <ProofHistory userId={user.id} />
      </div>
    </div>
  );
}

function ProofChip({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-foreground shadow-[0_0_16px_hsl(var(--primary)/0.08)]">
      <span className="text-primary">{icon}</span>
      {label}
    </span>
  );
}
