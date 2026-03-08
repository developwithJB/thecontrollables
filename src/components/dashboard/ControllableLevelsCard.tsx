import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Swords } from "lucide-react";
import { useControllableLevels } from "@/hooks/useControllableLevels";
import { getControllableTheme } from "@/lib/controllableTheme";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";

interface ControllableLevelsCardProps {
  userId: string | null;
}

export function ControllableLevelsCard({ userId }: ControllableLevelsCardProps) {
  const { data: levels, isLoading } = useControllableLevels(userId);
  const { toast } = useToast();
  const prevLevelsRef = useRef<Record<string, number> | null>(null);

  // Detect level-ups by comparing to cached previous levels
  useEffect(() => {
    if (!levels || !userId) return;

    const currentMap: Record<string, number> = {};
    for (const cl of levels) {
      currentMap[cl.type] = cl.level;
    }

    const prev = prevLevelsRef.current;
    if (prev) {
      for (const cl of levels) {
        const oldLevel = prev[cl.type] ?? 0;
        if (cl.level > oldLevel && oldLevel > 0) {
          const theme = getControllableTheme(cl.type);
          toast({
            title: `${theme.emoji} ${theme.label} leveled up!`,
            description: `You reached Level ${cl.level}. Keep going!`,
          });
        }
      }
    }

    prevLevelsRef.current = currentMap;
  }, [levels, userId, toast]);

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
