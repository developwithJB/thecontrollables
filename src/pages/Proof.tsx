import type React from "react";
import { Link } from "react-router-dom";
import { Camera, CheckCircle2, LockKeyhole, Share2, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InfoHint } from "@/components/ui/info-hint";
import { FutureChip, FutureHero, FutureMetric, FuturePanel } from "@/components/ui/future";
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
      <FutureHero
        eyebrow="Proof Loop"
        title="Collect proof."
        icon={<CheckCircle2 className="h-5 w-5" />}
        chips={
          <>
            <FutureChip icon={<LockKeyhole className="h-3.5 w-3.5" />} label="Private first" />
            <FutureChip icon={<Share2 className="h-3.5 w-3.5" />} label="Share-safe" />
            <FutureChip icon={<Sparkles className="h-3.5 w-3.5" />} label="Stay Charged" />
          </>
        }
        side={
          <div className="grid grid-cols-2 gap-2">
            <FutureMetric label="Photo proof" value={dexStats.totalProofCount.toString()} icon={<Camera className="h-3 w-3" />} />
            <FutureMetric label="Privacy" value="Safe" icon={<ShieldCheck className="h-3 w-3" />} />
          </div>
        }
      />

      <FuturePanel>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="future-icon-frame h-11 w-11">
              <Sparkles className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Proof Loop · The Controllables Dex
              </p>
              <div className="mt-1 flex items-center gap-2">
                <h2 className="text-lg font-semibold text-foreground">Collect proof of real-life reps.</h2>
                <InfoHint title="Proof Loop">
                  Manual mission photo proof, saved privately and share-safe by default.
                </InfoHint>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <ProofChip icon={<ShieldCheck className="h-3.5 w-3.5" />} label="No exact location" />
                <ProofChip icon={<Camera className="h-3.5 w-3.5" />} label={`${dexStats.totalProofCount} photo proof`} />
              </div>
            </div>
          </div>
          <Button asChild variant="future" className="w-full sm:w-auto">
            <Link to={APP_ROUTES.proofDex}>Open Dex</Link>
          </Button>
        </div>
      </FuturePanel>

      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
        <ProofEntryCard userId={user.id} />
        <ProofHistory userId={user.id} />
      </div>
    </div>
  );
}

function ProofChip({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="future-chip">
      <span className="text-primary">{icon}</span>
      {label}
    </span>
  );
}
