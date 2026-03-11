import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface SmartCenterStateProps {
  completedCount: number;
  isFullyCharged: boolean;
  rotations: string[] | undefined;
}

export const SmartCenterState = ({ completedCount, isFullyCharged, rotations }: SmartCenterStateProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const labels = rotations?.length ? rotations : [`${completedCount}/5`];

  useEffect(() => {
    if (!isFullyCharged || labels.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % labels.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [isFullyCharged, labels.length]);

  // Non-fully-charged: simple static display
  if (!isFullyCharged) {
    return (
      <div className="flex flex-col items-center justify-center pointer-events-none">
        <motion.span
          key={completedCount}
          initial={{ scale: 1.3, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-3xl font-bold text-foreground"
        >
          {completedCount}/5
        </motion.span>
        <span className="text-[10px] text-muted-foreground font-medium mt-0.5">
          {completedCount === 0 ? "Just Getting Started" : completedCount <= 2 ? "Building Momentum" : "Locked In"}
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center pointer-events-none">
      <AnimatePresence mode="wait">
        <motion.span
          key={currentIndex}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3 }}
          className={cn(
            "font-bold text-center leading-tight",
            currentIndex === 0
              ? "text-2xl text-accent"
              : "text-[11px] text-white bg-black/45 rounded-lg px-3 py-1.5 max-w-[120px]"
          )}
        >
          {labels[currentIndex]}
        </motion.span>
      </AnimatePresence>
    </div>
  );
};
