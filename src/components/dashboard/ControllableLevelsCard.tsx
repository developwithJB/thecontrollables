import { motion } from "framer-motion";
import { Swords } from "lucide-react";
import { useControllableLevels } from "@/hooks/useControllableLevels";
import { getControllableTheme } from "@/lib/controllableTheme";
import { Progress } from "@/components/ui/progress";

interface ControllableLevelsCardProps {
  userId: string | null;
}

export function ControllableLevelsCard({ userId }: ControllableLevelsCardProps) {
  const { data: levels, isLoading } = useControllableLevels(userId);

  if (isLoading || !levels) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="rounded-2xl border border-border/60 bg-card p-4 space-y-3"
    >
      <div className="flex items-center gap-2">
        <Swords className="w-4 h-4 text-accent" />
        <h3 className="text-sm font-semibold text-foreground">Controllable Levels</h3>
      </div>

      <div className="space-y-2.5">
        {levels.map((cl) => {
          const theme = getControllableTheme(cl.type);
          return (
            <div key={cl.type} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5">
                  <span>{theme.emoji}</span>
                  <span className={`font-medium ${theme.textClass}`}>{theme.label}</span>
                </span>
                <span className="text-muted-foreground tabular-nums">
                  Lv.{cl.level}
                  <span className="ml-1.5 text-[10px]">
                    {cl.totalXp.toLocaleString()} / {cl.next.toLocaleString()} XP
                  </span>
                </span>
              </div>
              <Progress
                value={cl.progress * 100}
                className={`h-2 ${theme.bgClass}`}
              />
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
