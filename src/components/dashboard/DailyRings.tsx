import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Share2 } from "lucide-react";
import {
  useDailyMoves,
  DAILY_MOVE_DEFINITIONS,
  type DailyMoveKey,
} from "@/hooks/useDailyRings";
import { useDashboardIntelligence } from "@/hooks/useDashboardIntelligence";
import { RingActionCard } from "./RingActionCard";
import { DailyRecapCard } from "./DailyRecapCard";
import { AIInsightCard } from "./AIInsightCard";
import { AISignalsRow } from "./AISignalsRow";
import { WhyFullyChargedCard } from "./WhyFullyChargedCard";
import { MemoryComparisonRow } from "./MemoryComparisonRow";
import { SmartCenterState } from "./SmartCenterState";
import { RingShareCard } from "./RingShareCard";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface DailyRingsProps {
  userId?: string;
}

const MOVE_CONFIGS = [
  { key: "notice" as DailyMoveKey, radius: 100, stroke: 8 },
  { key: "choose" as DailyMoveKey, radius: 84, stroke: 8 },
  { key: "prove" as DailyMoveKey, radius: 68, stroke: 8 },
  { key: "align" as DailyMoveKey, radius: 52, stroke: 8 },
  { key: "charge" as DailyMoveKey, radius: 36, stroke: 8 },
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
  radius,
  strokeWidth,
  progress,
  color,
  bgColor,
  onClick,
  isActive,
}: {
  radius: number;
  strokeWidth: number;
  progress: number;
  color: string;
  bgColor: string;
  onClick: () => void;
  isActive: boolean;
}) {
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - progress);

  return (
    <g onClick={onClick} className="cursor-pointer">
      <circle cx="110" cy="110" r={radius} fill="none" stroke={bgColor} strokeWidth={strokeWidth} />
      <motion.circle
        cx="110"
        cy="110"
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
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
  const {
    rings,
    completedCount,
    completeMove,
    isMoveCompleted,
    loading,
    moveDefinitions,
    rowId,
  } = useDailyMoves(userId);
  const intelligence = useDashboardIntelligence(userId, completedCount, rings);
  const [activeMove, setActiveMove] = useState<DailyMoveKey | null>(null);
  const [lowEnergy, setLowEnergy] = useState(false);
  const [shareMove, setShareMove] = useState<DailyMoveKey | "fully_charged" | null>(null);

  useEffect(() => {
    if (!userId) return;

    const todayStr = new Date().toLocaleDateString("sv-SE");

    const check = async () => {
      const { data } = await supabase
        .from("notice_entries")
        .select("energy_level")
        .eq("user_id", userId)
        .eq("entry_date", todayStr)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data && data.energy_level <= 2) setLowEnergy(true);
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

  const handleMoveClick = (key: DailyMoveKey) => {
    setActiveMove((prev) => (prev === key ? null : key));
  };

  const handleComplete = async (key: DailyMoveKey, response?: string) => {
    await completeMove(key, response);
    setActiveMove(null);
  };

  const isFullyCharged = completedCount === 5;
  const showIntelligence = completedCount >= 3;

  return (
    <div className="flex flex-col items-center gap-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-1">
        <p className="text-xs text-muted-foreground tracking-wide uppercase">
          {isFullyCharged ? "Fully Charged" : "Charge your Controllables"}
        </p>
        {!isFullyCharged && <p className="text-[11px] text-muted-foreground/80">One step, one habit, one choice.</p>}
      </motion.div>

      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative"
      >
        <svg width="220" height="220" viewBox="0 0 220 220" className="md:w-[260px] md:h-[260px]">
          {MOVE_CONFIGS.map(({ key, radius, stroke }) => {
            const definition = DAILY_MOVE_DEFINITIONS.find((move) => move.key === key)!;
            const completed = isMoveCompleted(key);

            return (
              <RingSVG
                key={key}
                radius={radius}
                strokeWidth={stroke}
                progress={completed ? 1 : 0}
                color={COLOR_MAP[definition.controllable]}
                bgColor={BG_COLOR_MAP[definition.controllable]}
                onClick={() => handleMoveClick(key)}
                isActive={activeMove === key}
              />
            );
          })}
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <SmartCenterState
            completedCount={completedCount}
            isFullyCharged={isFullyCharged}
            rotations={intelligence.data?.center_rotations}
          />
        </div>
      </motion.div>

      {showIntelligence && (
        <div className="w-full max-w-sm">
          <AISignalsRow signals={intelligence.data?.signals} isLoading={intelligence.isLoading} />
        </div>
      )}

      <div className="flex gap-2.5 flex-wrap justify-center max-w-sm">
        {moveDefinitions.map((definition) => {
          const completed = isMoveCompleted(definition.key);

          return (
            <button
              key={definition.key}
              onClick={() => handleMoveClick(definition.key)}
              className={cn(
                "flex items-center gap-2 rounded-full border px-3 py-1.5 text-left transition-all",
                completed
                  ? "border-accent/20 bg-accent/10 text-accent opacity-80"
                  : activeMove === definition.key
                    ? "border-border bg-muted text-foreground"
                    : "border-border/50 bg-muted/40 text-muted-foreground hover:bg-muted",
              )}
            >
              <span className="text-sm">{definition.emoji}</span>
              <span className="flex flex-col leading-none">
                <span className="text-[11px] font-medium">{definition.shortName}</span>
                <span className="text-[9px] uppercase tracking-[0.16em] opacity-70">
                  {completed ? "Charged" : "Ready"}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {activeMove && !isMoveCompleted(activeMove) && (
          <motion.div
            key={activeMove}
            initial={{ opacity: 0, y: 20, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -10, height: 0 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-sm overflow-hidden"
          >
            <RingActionCard
              definition={moveDefinitions.find((definition) => definition.key === activeMove)!}
              onComplete={(response) => handleComplete(activeMove, response)}
              onDismiss={() => setActiveMove(null)}
              userId={userId}
              lowEnergy={lowEnergy}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="w-full max-w-sm space-y-3">
        {showIntelligence ? (
          <AIInsightCard
            data={intelligence.data}
            isLoading={intelligence.isLoading}
            onRefresh={intelligence.refresh}
          />
        ) : (
          <DailyRecapCard
            userId={userId}
            rings={rings}
            completedCount={completedCount}
            rowId={rowId}
          />
        )}

        {isFullyCharged && <WhyFullyChargedCard data={intelligence.data} />}
        {showIntelligence && <MemoryComparisonRow data={intelligence.data} />}
      </div>

      {completedCount > 0 && completedCount < 5 && (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-muted-foreground text-center">
          {5 - completedCount} Controllable{5 - completedCount > 1 ? "s" : ""} left. Return with one small move.
        </motion.p>
      )}

      {isFullyCharged && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-2 space-y-2"
        >
          <p className="text-sm font-semibold text-accent">All 5 Controllables charged today.</p>
          <button
            onClick={() => setShareMove("fully_charged")}
            className="inline-flex items-center gap-1 text-xs text-accent hover:underline"
          >
            <Share2 className="w-3 h-3" />
            Share proof
          </button>
        </motion.div>
      )}

      <AnimatePresence>
        {shareMove && <RingShareCard ringKey={shareMove} onClose={() => setShareMove(null)} />}
      </AnimatePresence>
    </div>
  );
};

export const DailyMoves = DailyRings;
