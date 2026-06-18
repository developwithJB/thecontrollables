import { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flame, Share2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ShareableStreakCard } from "./ShareableStreakCard";
import html2canvas from "html2canvas";
import { useToast } from "@/hooks/use-toast";
import { buildShareProofPayload } from "@/lib/shareProof";

interface StreakCelebrationProps {
  milestone: number;
  xpBonus: number;
  displayName?: string;
  onDismiss: () => void;
}

const CONFETTI_EMOJIS = ["🎉", "🔥", "⭐", "✨", "💪", "🏆"];

function ConfettiParticle({ emoji, delay, startX }: { emoji: string; delay: number; startX: number }) {
  return (
    <motion.div
      className="absolute text-2xl pointer-events-none"
      initial={{ 
        x: startX, 
        y: "100vh", 
        opacity: 1,
        rotate: 0,
        scale: 0.5
      }}
      animate={{ 
        y: "-20vh",
        opacity: [1, 1, 0],
        rotate: Math.random() > 0.5 ? 360 : -360,
        scale: [0.5, 1.2, 0.8]
      }}
      transition={{ 
        duration: 2.5 + Math.random(),
        delay,
        ease: "easeOut"
      }}
    >
      {emoji}
    </motion.div>
  );
}

export function StreakCelebration({ milestone, xpBonus, onDismiss }: StreakCelebrationProps) {
  const [particles, setParticles] = useState<Array<{ id: number; emoji: string; delay: number; startX: number }>>([]);
  const [isSharing, setIsSharing] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    const newParticles = Array.from({ length: 24 }, (_, i) => ({
      id: i,
      emoji: CONFETTI_EMOJIS[Math.floor(Math.random() * CONFETTI_EMOJIS.length)],
      delay: Math.random() * 0.5,
      startX: Math.random() * (typeof window !== "undefined" ? window.innerWidth : 400),
    }));
    setParticles(newParticles);

    const timer = setTimeout(() => {
      if (!isSharing) onDismiss();
    }, 5000);
    return () => clearTimeout(timer);
  }, [onDismiss, isSharing]);

  const generateImage = useCallback(async (): Promise<Blob | null> => {
    if (!cardRef.current) return null;
    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        backgroundColor: null,
        logging: false,
      });
      return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
    } catch {
      return null;
    }
  }, []);

  const downloadBlob = useCallback((blob: Blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `streak-${milestone}-days.png`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Image downloaded!", description: "Share it on your socials 🔥" });
  }, [milestone, toast]);

  const handleShare = useCallback(async () => {
    setIsSharing(true);
    const blob = await generateImage();
    if (!blob) {
      toast({ title: "Couldn't generate image", variant: "destructive" });
      setIsSharing(false);
      return;
    }

    const file = new File([blob], `streak-${milestone}-days.png`, { type: "image/png" });
    const payload = buildShareProofPayload({
      kind: "charge_stage",
      controllable: "wellness",
      chargeStage: milestone >= 30 ? "fully charged" : "charged",
      xp: xpBonus,
      level: milestone,
      visibility: "anonymous",
    });

    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({
          title: payload.headline,
          text: payload.shareText,
          files: [file],
        });
      } catch (error: unknown) {
        const errorName = error instanceof Error ? error.name : "";
        if (errorName !== "AbortError") {
          downloadBlob(blob);
        }
      }
    } else {
      downloadBlob(blob);
    }
    setIsSharing(false);
  }, [downloadBlob, generateImage, milestone, toast, xpBonus]);

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={(e) => {
          if (e.target === e.currentTarget && !isSharing) onDismiss();
        }}
      >
        {particles.map((p) => (
          <ConfettiParticle key={p.id} emoji={p.emoji} delay={p.delay} startX={p.startX} />
        ))}

        <motion.div
          className="relative z-10 flex flex-col items-center gap-4 p-8 rounded-2xl bg-card border border-border shadow-2xl"
          initial={{ scale: 0, rotate: -10 }}
          animate={{ scale: 1, rotate: 0 }}
          exit={{ scale: 0, rotate: 10 }}
          transition={{ type: "spring", damping: 15, stiffness: 200 }}
        >
          <motion.div
            className="w-20 h-20 rounded-full bg-wellness/20 flex items-center justify-center"
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 0.5, repeat: 2 }}
          >
            <Flame className="w-10 h-10 text-wellness" />
          </motion.div>

          <div className="text-center">
            <motion.h2
              className="text-2xl font-display font-bold text-foreground"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              Wellness Charged
            </motion.h2>
            <motion.p
              className="text-lg text-wellness font-medium mt-2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              +{xpBonus} Wellness XP
            </motion.p>
          </div>

          <motion.div
            className="flex gap-2 mt-2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Button
              size="sm"
              variant="default"
              className="gap-2"
              onClick={handleShare}
              disabled={isSharing}
            >
              {navigator.share ? <Share2 className="w-4 h-4" /> : <Download className="w-4 h-4" />}
              {isSharing ? "Creating…" : "Share Proof"}
            </Button>
            <Button size="sm" variant="ghost" onClick={onDismiss}>
              Dismiss
            </Button>
          </motion.div>
        </motion.div>

        {/* Off-screen card for html2canvas capture */}
        <div className="fixed" style={{ left: -9999, top: -9999 }}>
          <ShareableStreakCard
            ref={cardRef}
            milestone={milestone}
            xpBonus={xpBonus}
          />
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
