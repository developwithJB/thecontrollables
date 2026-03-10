import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useDailyRings, RING_DEFINITIONS, type RingKey } from "@/hooks/useDailyRings";
import { RingActionCard } from "./RingActionCard";
import { cn } from "@/lib/utils";
import { DailyRecapCard } from "./DailyRecapCard";
import { RingShareCard } from "./RingShareCard";
import { supabase } from "@/integrations/supabase/client";
import { Share2 } from "lucide-react";

interface DailyRingsProps {
  userId?: string;
}

const RING_CONFIGS = [
  { key: "notice" as RingKey, radius: 100, stroke: 8 },
  { key: "choose" as RingKey, radius: 84, stroke: 8 },
  { key: "prove" as RingKey, radius: 68, stroke: 8 },
  { key: "charge" as RingKey, radius: 52, stroke: 8 },
  { key: "align" as RingKey, radius: 36, stroke: 8 },
];

const COLOR_MAP: Record<string, string> = {
  awareness: "hsl(var(--awareness))",
  perspective: "hsl(var(--perspective))",
  habit: "hsl(var(--habit))",
  wellness: "hsl(var(--wellness))",
  environment: "hsl(var(--environment))",
};

const BG_COLOR_MAP: Record<string, string> = {
  awareness: "hsl(var(--awareness) / 0.15)",
  perspective: "hsl(var(--perspective) / 0.15)",
  habit: "hsl(var(--habit) / 0.15)",
  wellness: "hsl(var(--wellness) / 0.15)",
  environment: "hsl(var(--environment) / 0.15)",
};

function RingSVG({
  radius, strokeWidth, progress, color, bgColor, onClick, isActive,
}: {
  radius: number; strokeWidth: number; progress: number; color: string; bgColor: string; onClick: () => void; isActive: boolean;
}) {
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - progress);

  return (
    <g onClick={onClick} className="cursor-pointer">
      <circle cx="110" cy="110" r={radius} fill="none" stroke={bgColor} strokeWidth={strokeWidth} />
      <motion.circle
        cx="110" cy="110" r={radius} fill="none" stroke={color}
        strokeWidth={strokeWidth} strokeLinecap="round"
        strokeDasharray={circumference}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        style={{ transform: "rotate(-90deg)", transformOrigin: "110px 110px" }}
        filter={isActive ? "drop-shadow(0 0 6px currentColor)" : undefined}
      />
    </g>
  );
}

export const DailyRings = ({ userId }: DailyRingsProps) => {
  const { rings, completedCount, statusLabel, completeRing, isCompleted, loading, definitions, rowId } = useDailyRings(userId);
  const [activeRing, setActiveRing] = useState<RingKey | null>(null);
  const [lowEnergy, setLowEnergy] = useState(false);

  // Check if today's notice entry has low energy
  useEffect(() => {
    if (!userId) return;
    const todayStr = new Date().toLocaleDateString("sv-SE");
    const check = async () => {
      const { data } = await supabase
        .from("notice_entries" as any)
        .select("energy_level")
        .eq("user_id", userId)
        .eq("entry_date", todayStr)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data && (data as any).energy_level <= 2) setLowEnergy(true);
    };
    check();
  }, [userId, rings.notice_completed]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-10 h-10 rounded-full border-2 border-accent border-t-transparent animate-spin" />
      </div>
    );
  }

  const handleRingClick = (key: RingKey) => {
    setActiveRing((prev) => (prev === key ? null : key));
  };

  const handleComplete = async (key: RingKey, response?: string) => {
    await completeRing(key, response);
    setActiveRing(null);
  };

  const isFullyCharged = completedCount === 5;

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Status banner */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-center">
        <p className="text-xs text-muted-foreground tracking-wide uppercase">
          {isFullyCharged ? "Fully Charged ⚡" : "Fill your rings for today."}
        </p>
      </motion.div>

      {/* SVG Rings */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative"
      >
        <svg width="220" height="220" viewBox="0 0 220 220" className="md:w-[260px] md:h-[260px]">
          {RING_CONFIGS.map(({ key, radius, stroke }) => {
            const def = RING_DEFINITIONS.find((d) => d.key === key)!;
            const completed = isCompleted(key);
            return (
              <RingSVG
                key={key} radius={radius} strokeWidth={stroke}
                progress={completed ? 1 : 0}
                color={COLOR_MAP[def.controllable]}
                bgColor={BG_COLOR_MAP[def.controllable]}
                onClick={() => handleRingClick(key)}
                isActive={activeRing === key}
              />
            );
          })}
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <motion.span
            key={completedCount}
            initial={{ scale: 1.3, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={cn("text-3xl font-bold", isFullyCharged ? "text-accent" : "text-foreground")}
          >
            {completedCount}/5
          </motion.span>
          <span className="text-[10px] text-muted-foreground font-medium mt-0.5">{statusLabel}</span>
        </div>
      </motion.div>

      {/* Ring labels */}
      <div className="flex gap-3 flex-wrap justify-center">
        {definitions.map((def) => {
          const completed = isCompleted(def.key);
          return (
            <button
              key={def.key}
              onClick={() => handleRingClick(def.key)}
              className={cn(
                "flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all",
                completed
                  ? "bg-accent/10 text-accent line-through opacity-70"
                  : activeRing === def.key
                  ? "bg-muted ring-1 ring-border text-foreground"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              )}
            >
              <span>{def.emoji}</span>
              <span>{def.name}</span>
            </button>
          );
        })}
      </div>

      {/* Active ring card */}
      <AnimatePresence mode="wait">
        {activeRing && !isCompleted(activeRing) && (
          <motion.div
            key={activeRing}
            initial={{ opacity: 0, y: 20, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -10, height: 0 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-sm overflow-hidden"
          >
            <RingActionCard
              definition={definitions.find((d) => d.key === activeRing)!}
              onComplete={(response) => handleComplete(activeRing, response)}
              onDismiss={() => setActiveRing(null)}
              userId={userId}
              lowEnergy={lowEnergy}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Daily Recap — shows after 3+ rings */}
      <div className="w-full max-w-sm">
        <DailyRecapCard
          userId={userId}
          rings={rings}
          completedCount={completedCount}
          rowId={rowId}
        />
      </div>

      {/* Motivational footer */}
      {completedCount > 0 && completedCount < 5 && (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-muted-foreground text-center">
          {5 - completedCount} ring{5 - completedCount > 1 ? "s" : ""} to go. Small actions, big shifts.
        </motion.p>
      )}

      {isFullyCharged && (
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-2">
          <p className="text-sm font-semibold text-accent">🔥 All 5 rings filled. You're Fully Charged today.</p>
          <p className="text-xs text-muted-foreground mt-1">Your daily reps power the whole system.</p>
        </motion.div>
      )}
    </div>
  );
};
