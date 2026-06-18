import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import html2canvas from "html2canvas";
import { toast } from "sonner";
import { format } from "date-fns";
import type { ControllableType } from "@/components/ControllableCard";
import { buildShareProofPayload } from "@/lib/shareProof";

const CONTROLLABLE_TYPES: ControllableType[] = ["awareness", "perspective", "habit", "wellness", "environment"];

interface SnapshotShareCardProps {
  snapshotName: string;
  controllable?: string;
  completionDate: string;
}

function getControllableType(value?: string): ControllableType | undefined {
  return CONTROLLABLE_TYPES.find((type) => type === value);
}

function ShareCard({ snapshotName, controllable, completionDate }: SnapshotShareCardProps) {
  const safeControllable = getControllableType(controllable);
  const isSeason = /season/i.test(snapshotName);
  const payload = buildShareProofPayload({
    kind: isSeason ? "continuous_upgrade" : "reset_completed",
    controllable: safeControllable,
    completedDays: isSeason ? undefined : 7,
    visibility: "anonymous",
  });
  const formattedDate = format(new Date(completionDate), "MMMM d, yyyy");

  return (
    <div
      className="relative w-[340px] overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-slate-950 via-slate-900 to-sky-950"
      style={{ backgroundColor: "hsl(var(--background))" }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_16%,rgba(56,189,248,0.28),transparent_30%)]" />
      <div className="relative p-8 text-center text-white">
        <div className="mx-auto mb-5 flex h-24 w-24 items-center justify-center rounded-full border border-white/15 bg-white/10 shadow-[0_0_52px_rgba(56,189,248,0.22)]">
          <span className="text-5xl" aria-hidden="true">{payload.icon}</span>
        </div>

        <div className="space-y-3">
          <p className="mx-auto w-fit rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/65">
            Proof Card
          </p>
          <h2 className="text-2xl font-bold leading-tight tracking-tight">
            {payload.headline}
          </h2>
          <p className="text-sm font-medium text-white/70">{payload.proofLine}</p>
        </div>

        <div className="my-6 h-px bg-white/10" />

        <div className="flex items-end justify-between text-left">
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-white/45">{payload.brandSubtitle}</p>
            <p className="text-sm font-semibold text-white">{payload.brandTitle}</p>
          </div>
          <p className="text-[10px] text-white/45">{formattedDate}</p>
        </div>
      </div>
    </div>
  );
}

interface SnapshotShareModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  snapshotName: string;
  controllable?: string;
  completionDate: string;
}

export function SnapshotShareModal({
  open,
  onOpenChange,
  snapshotName,
  controllable,
  completionDate,
}: SnapshotShareModalProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveImage = async () => {
    if (!cardRef.current) return;
    setIsSaving(true);

    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 3,
        backgroundColor: null,
        useCORS: true,
      });

      const link = document.createElement("a");
      link.download = `controllables-${snapshotName.toLowerCase().replace(/\s+/g, "-")}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast.success("Image saved! Share it to your story 🎉");
    } catch {
      toast.error("Couldn't save the image. Try a screenshot instead.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">Share your win</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-5 py-4">
          <div ref={cardRef}>
            <ShareCard
              snapshotName={snapshotName}
              controllable={controllable}
              completionDate={completionDate}
            />
          </div>

          <Button onClick={handleSaveImage} disabled={isSaving} className="gap-2 w-full">
            <Download className="w-4 h-4" />
            {isSaving ? "Saving..." : "Save Image"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
