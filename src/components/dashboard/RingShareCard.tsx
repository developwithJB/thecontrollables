import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Download, Share2, X } from "lucide-react";
import { RING_DEFINITIONS, type RingKey } from "@/hooks/useDailyRings";
import html2canvas from "html2canvas";
import { useToast } from "@/hooks/use-toast";

const RING_GRADIENTS: Record<string, string> = {
  notice: "from-[hsl(var(--awareness))] to-[hsl(var(--awareness)/0.7)]",
  choose: "from-[hsl(var(--perspective))] to-[hsl(var(--perspective)/0.7)]",
  prove: "from-[hsl(var(--habit))] to-[hsl(var(--habit)/0.7)]",
  charge: "from-[hsl(var(--wellness))] to-[hsl(var(--wellness)/0.7)]",
  align: "from-[hsl(var(--environment))] to-[hsl(var(--environment)/0.7)]",
  fully_charged: "from-[hsl(var(--accent))] to-[hsl(var(--wellness))]",
};

const RING_MESSAGES: Record<string, { title: string; subtitle: string; emoji: string }> = {
  notice: { title: "Circuit Check Complete", subtitle: "I noticed what's really going on today.", emoji: "🦉" },
  choose: { title: "Reframe Complete", subtitle: "I chose love over fear today.", emoji: "🐢" },
  prove: { title: "Proof Logged", subtitle: "I proved who I'm becoming.", emoji: "🦈" },
  charge: { title: "Recharged", subtitle: "I invested in my body today.", emoji: "🛰️" },
  align: { title: "Environment Reset", subtitle: "I shaped my space for growth.", emoji: "🚀" },
  fully_charged: { title: "Fully Charged", subtitle: "All 5 rings filled. Today I controlled the controllables.", emoji: "⚡" },
};

interface RingShareCardProps {
  ringKey: RingKey | "fully_charged";
  onClose: () => void;
  displayName?: string;
}

export const RingShareCard = ({ ringKey, onClose, displayName }: RingShareCardProps) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const [downloading, setDownloading] = useState(false);

  const msg = RING_MESSAGES[ringKey];
  const gradient = RING_GRADIENTS[ringKey];
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
      link.download = `ig-proof-${ringKey}-${Date.now()}.png`;
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
        {/* The shareable card */}
        <div
          ref={cardRef}
          className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${gradient} p-6 aspect-[9/16] flex flex-col justify-between`}
        >
          {/* Top branding */}
          <div>
            <p className="text-[10px] font-medium text-white/60 tracking-widest uppercase">The Controllables</p>
          </div>

          {/* Center content */}
          <div className="text-center space-y-3">
            <span className="text-5xl">{msg.emoji}</span>
            <h2 className="text-xl font-bold text-white tracking-tight">{msg.title}</h2>
            <p className="text-sm text-white/80 leading-relaxed">{msg.subtitle}</p>
          </div>

          {/* Bottom */}
          <div className="flex items-end justify-between">
            <div>
              {displayName && (
                <p className="text-xs font-medium text-white/70">{displayName}</p>
              )}
              <p className="text-[10px] text-white/50">{dateStr}</p>
            </div>
            <div className="flex gap-0.5">
              {RING_DEFINITIONS.map((d) => (
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
