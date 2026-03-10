import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { Download, X } from "lucide-react";
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

const CONTROLLABLE_THEMES: Record<string, { emoji: string; gradient: string }> = {
  awareness: { emoji: "🦉", gradient: "from-amber-500/20 to-orange-500/20" },
  perspective: { emoji: "🐢", gradient: "from-emerald-500/20 to-teal-500/20" },
  habit: { emoji: "🦈", gradient: "from-blue-500/20 to-indigo-500/20" },
  wellness: { emoji: "🛰️", gradient: "from-violet-500/20 to-purple-500/20" },
  environment: { emoji: "🚀", gradient: "from-rose-500/20 to-pink-500/20" },
};

interface SnapshotShareCardProps {
  snapshotName: string;
  controllable?: string;
  completionDate: string;
  displayName?: string;
}

function ShareCard({ snapshotName, controllable, completionDate, displayName }: SnapshotShareCardProps) {
  const theme = CONTROLLABLE_THEMES[controllable || "awareness"] || CONTROLLABLE_THEMES.awareness;
  const formattedDate = format(new Date(completionDate), "MMMM d, yyyy");

  return (
    <div
      className={`relative w-[340px] rounded-2xl overflow-hidden bg-gradient-to-br ${theme.gradient} border border-white/10`}
      style={{ backgroundColor: "hsl(var(--background))" }}
    >
      {/* Inner card */}
      <div className="p-8 text-center space-y-5">
        {/* Emoji */}
        <div className="text-5xl">{theme.emoji}</div>

        {/* Headline */}
        <div>
          <h2 className="text-xl font-bold text-foreground tracking-tight">
            7 days. I showed up.
          </h2>
          <p className="text-sm text-muted-foreground mt-1">{snapshotName}</p>
        </div>

        {/* Date & name */}
        <div className="space-y-1">
          {displayName && (
            <p className="text-sm font-medium text-foreground">{displayName}</p>
          )}
          <p className="text-xs text-muted-foreground">Completed {formattedDate}</p>
        </div>

        {/* Divider */}
        <div className="w-12 h-px bg-border mx-auto" />

        {/* App link */}
        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Built with
          </p>
          <p className="text-sm font-semibold text-accent">
            thecontrollables.lovable.app
          </p>
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
  displayName?: string;
}

export function SnapshotShareModal({
  open,
  onOpenChange,
  snapshotName,
  controllable,
  completionDate,
  displayName,
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
              displayName={displayName}
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
