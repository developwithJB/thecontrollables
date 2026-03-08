import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Swords, ChevronDown, Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useControllableLevels } from "@/hooks/useControllableLevels";
import { getControllableTheme } from "@/lib/controllableTheme";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import type { ControllableType } from "@/components/ControllableCard";

interface ControllableLevelsCardProps {
  userId: string | null;
}

export function ControllableLevelsCard({ userId }: ControllableLevelsCardProps) {
  const { data: levels, isLoading } = useControllableLevels(userId);
  const { toast } = useToast();
  const prevLevelsRef = useRef<Record<string, number> | null>(null);
  const [expandedType, setExpandedType] = useState<ControllableType | null>(null);

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

      <div className="space-y-1">
        {levels.map((cl) => {
          const theme = getControllableTheme(cl.type);
          const isExpanded = expandedType === cl.type;
          return (
            <div key={cl.type}>
              <button
                onClick={() => setExpandedType(isExpanded ? null : cl.type)}
                className="w-full text-left space-y-1 rounded-lg px-2 py-1.5 -mx-2 transition-colors hover:bg-muted/50 active:bg-muted/70"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5">
                    <span>{theme.emoji}</span>
                    <span className={`font-medium ${theme.textClass}`}>{theme.label}</span>
                  </span>
                  <span className="flex items-center gap-1 text-muted-foreground tabular-nums">
                    Lv.{cl.level}
                    <span className="ml-1 text-[10px]">
                      {cl.totalXp.toLocaleString()} / {cl.next.toLocaleString()} XP
                    </span>
                    <ChevronDown className={`w-3 h-3 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                  </span>
                </div>
                <Progress
                  value={cl.progress * 100}
                  className={`h-2 ${theme.bgClass}`}
                />
              </button>
              <AnimatePresence>
                {isExpanded && userId && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <XpHistoryPanel userId={userId} controllable={cl.type} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

function XpHistoryPanel({ userId, controllable }: { userId: string; controllable: ControllableType }) {
  const { data: history, isLoading } = useQuery({
    queryKey: ["xp-history", userId, controllable],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("completed_actions")
        .select("action_text, xp_awarded, completed_at")
        .eq("user_id", userId)
        .eq("controllable", controllable)
        .order("completed_at", { ascending: false })
        .limit(15);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60 * 1000,
  });

  const theme = getControllableTheme(controllable);

  return (
    <div className="px-2 pb-2 pt-1">
      {isLoading ? (
        <p className="text-[10px] text-muted-foreground py-2">Loading…</p>
      ) : !history || history.length === 0 ? (
        <p className="text-[10px] text-muted-foreground py-2">No XP earned yet for {theme.label}.</p>
      ) : (
        <div className="space-y-1 max-h-40 overflow-y-auto">
          {history.map((entry, i) => (
            <div key={i} className="flex items-center justify-between text-[11px] py-0.5 border-b border-border/20 last:border-0">
              <div className="flex items-center gap-1.5 min-w-0">
                <Clock className="w-2.5 h-2.5 text-muted-foreground shrink-0" />
                <span className="text-foreground truncate">{entry.action_text}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-2">
                <span className={`font-medium ${theme.textClass}`}>+{entry.xp_awarded}</span>
                <span className="text-[9px] text-muted-foreground">
                  {format(new Date(entry.completed_at), "MMM d")}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
