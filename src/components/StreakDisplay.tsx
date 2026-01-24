import { motion } from "framer-motion";
import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";

interface StreakDisplayProps {
  currentStreak: number;
  longestStreak?: number;
  className?: string;
}

export function StreakDisplay({ currentStreak, longestStreak, className }: StreakDisplayProps) {
  return (
    <motion.div
      className={cn(
        "flex items-center gap-4 p-4 rounded-xl bg-card border shadow-soft",
        className
      )}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="relative">
        <motion.div
          className={cn(
            "w-14 h-14 rounded-full flex items-center justify-center",
            currentStreak > 0 ? "bg-orange-500/10" : "bg-muted"
          )}
          animate={currentStreak > 0 ? { 
            boxShadow: [
              "0 0 20px rgba(249, 115, 22, 0.3)", 
              "0 0 40px rgba(249, 115, 22, 0.5)", 
              "0 0 20px rgba(249, 115, 22, 0.3)"
            ] 
          } : {}}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        >
          <motion.div
            animate={currentStreak > 0 ? {
              scale: [1, 1.15, 1],
              rotate: [-5, 5, -5],
            } : {}}
            transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut" }}
          >
            <Flame 
              className={cn(
                "w-7 h-7",
                currentStreak > 0 ? "text-orange-500" : "text-muted-foreground"
              )} 
            />
          </motion.div>
        </motion.div>
      </div>
      
      <div className="flex-1">
        <div className="flex items-baseline gap-2">
          <span className="font-display text-3xl font-bold text-foreground">
            {currentStreak}
          </span>
          <span className="text-sm text-muted-foreground">
            day{currentStreak !== 1 ? "s" : ""}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          Current streak
        </p>
      </div>

      {longestStreak !== undefined && longestStreak > 0 && (
        <div className="text-right">
          <p className="font-display text-lg font-semibold text-foreground">
            {longestStreak}
          </p>
          <p className="text-xs text-muted-foreground">Best</p>
        </div>
      )}
    </motion.div>
  );
}
