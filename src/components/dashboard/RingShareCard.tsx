import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Download, X } from "lucide-react";
import { DAILY_MOVE_DEFINITIONS, type DailyMoveKey } from "@/hooks/useDailyRings";
import html2canvas from "html2canvas";
import { useToast } from "@/hooks/use-toast";
import { buildDailyMoveSharePayload } from "@/lib/shareProof";

const MOVE_GRADIENTS: Record<string, string> = {
  notice: "from-[hsl(var(--awareness))] to-[hsl(var(--awareness)/0.7)]",
  choose: "from-[hsl(var(--perspective))] to-[hsl(var(--perspective)/0.7)]",
  prove: "from-[hsl(var(--habit))] to-[hsl(var(--habit)/0.7)]",
  align: "from-[hsl(var(--environment))] to-[hsl(var(--environment)/0.7)]",
  charge: "from-[hsl(var(--wellness))] to-[hsl(var(--wellness)/0.7)]",
  fully_charged: "from-[hsl(var(--accent))] to-[hsl(var(--wellness))]",
};

interface RingShareCardProps {
  ringKey: DailyMoveKey | "fully_charged";
  onClose: () => void;
}

export const RingShareCard = ({ ringKey, onClose }: RingShareCardProps) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const [downloading, setDownloading] = useState(false);

  const payload = buildDailyMoveSharePayload(ringKey);
  const gradient = MOVE_GRADIENTS[ringKey];
  const dateStr = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  const handleDownload = async () => {
    if (!cardRef.current) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 3,
        backgroundColor: null,
        useCORS: true,
      });
      const link = document.createElement("a");
      link.download = `daily-moves-${ringKey}-${Date.now()}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast({ title: "Downloaded!", description: "Share it on your Instagram Story." });
    } catch {
      toast({ title: "Download failed", variant: "destructive" });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-[320px] space-y-3">
        <div
          ref={cardRef}
          className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${gradient} p-6 aspect-[9/16] flex flex-col justify-between text-white`}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_28%,rgba(255,255,255,0.24),transparent_28%),linear-gradient(180deg,rgba(0,0,0,0.04),rgba(0,0,0,0.42))]" />
          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-[10px] font-medium text-white/60 tracking-widest uppercase">{payload.brandTitle}</p>
              <p className="text-xs font-semibold text-white/85">{payload.brandSubtitle}</p>
            </div>
            <p className="text-[10px] text-white/55">{dateStr}</p>
          </div>

          <div className="relative text-center space-y-5">
            <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full border border-white/25 bg-white/12 shadow-[0_0_60px_rgba(255,255,255,0.22)]">
              <span className="text-6xl" aria-hidden="true">{payload.icon}</span>
            </div>
            <div className="space-y-2">
              <p className="mx-auto w-fit rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/75">
                {payload.xpLabel ?? payload.levelLabel ?? "Proof"}
              </p>
              <h2 className="text-3xl font-bold leading-tight tracking-tight">{payload.headline}</h2>
              <p className="text-sm font-medium text-white/78">{payload.proofLine}</p>
            </div>
          </div>

          <div className="relative flex items-end justify-between">
            <p className="max-w-[9rem] text-[10px] font-semibold uppercase tracking-[0.18em] text-white/55">Stay Charged</p>
            <div className="flex gap-0.5">
              {DAILY_MOVE_DEFINITIONS.map((d) => (
                <div
                  key={d.key}
                  className={`w-2 h-2 rounded-full ${
                    ringKey === "fully_charged" || d.key === ringKey
                      ? "bg-white"
                      : "bg-white/20"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button onClick={handleDownload} disabled={downloading} className="flex-1 gap-1.5" size="sm" variant="secondary">
            <Download className="w-3.5 h-3.5" />
            {downloading ? "Saving..." : "Save Image"}
          </Button>
          <Button onClick={onClose} variant="outline" size="sm" className="gap-1.5">
            <X className="w-3.5 h-3.5" />
            Close
          </Button>
        </div>
      </div>
    </motion.div>
  );
};
