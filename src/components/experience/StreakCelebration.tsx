import { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flame, Share2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ShareableStreakCard } from "./ShareableStreakCard";
import html2canvas from "html2canvas";
import { useToast } from "@/hooks/use-toast";

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

  useEffect(() => {
    // Generate confetti particles
    const newParticles = Array.from({ length: 24 }, (_, i) => ({
      id: i,
      emoji: CONFETTI_EMOJIS[Math.floor(Math.random() * CONFETTI_EMOJIS.length)],
      delay: Math.random() * 0.5,
      startX: Math.random() * (typeof window !== "undefined" ? window.innerWidth : 400),
    }));
    setParticles(newParticles);

    // Auto dismiss after 3 seconds
    const timer = setTimeout(onDismiss, 3000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onDismiss}
      >
        {/* Confetti particles */}
        {particles.map((p) => (
          <ConfettiParticle
            key={p.id}
            emoji={p.emoji}
            delay={p.delay}
            startX={p.startX}
          />
        ))}

        {/* Central badge */}
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
              🔥 {milestone}-Day Streak!
            </motion.h2>
            <motion.p
              className="text-lg text-wellness font-medium mt-2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              +{xpBonus} XP Bonus
            </motion.p>
          </div>

          <motion.p
            className="text-xs text-muted-foreground"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            Tap to dismiss
          </motion.p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
