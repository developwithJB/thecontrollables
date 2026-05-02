import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Clock, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useControllableLevels } from "@/hooks/useControllableLevels";
import { getControllableTheme } from "@/lib/controllableTheme";
import {
  getControllableEvolutionState,
  getControllableRosterProfile,
} from "@/lib/controllableRoster";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import type { ControllableType } from "@/components/ControllableCard";

interface ControllableLevelsCardProps {
  userId: string | null;
}

export function ControllableLevelsCard({ userId }: ControllableLevelsCardProps) {
  const { data: levels, isLoading } = useControllableLevels(userId);
  const { toast } = useToast();
  const initRef = useRef(false);
  const [expandedType, setExpandedType] = useState<ControllableType | null>(null);

  useEffect(() => {
    if (!levels || !userId) return;

    const storageKey = `controllable_levels_${userId}`;
    let saved: Record<string, number> = {};

    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) saved = JSON.parse(raw);
    } catch {}

    const updated: Record<string, number> = { ...saved };
    let changed = false;

    for (const controllableLevel of levels) {
      const previousLevel = saved[controllableLevel.type] ?? 0;

      if (initRef.current && controllableLevel.level > previousLevel && previousLevel > 0) {
        const theme = getControllableTheme(controllableLevel.type);
        const profile = getControllableRosterProfile(controllableLevel.type);

        toast({
          title: `${theme.label} evolved`,
          description: `Your ${profile.role} is carrying more of the load now.`,
        });
      }

      if (controllableLevel.level > (updated[controllableLevel.type] ?? 0)) {
        updated[controllableLevel.type] = controllableLevel.level;
        changed = true;
      }
    }

    if (changed) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(updated));
      } catch {}
    }

    initRef.current = true;
  }, [levels, userId, toast]);

  if (isLoading || !levels) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="rounded-2xl border border-border/60 bg-card p-4 space-y-4"
    >
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-accent" />
          <h3 className="text-sm font-semibold text-foreground">Starter Team</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Each Controllable plays a role. The more real moves you make, the more the team comes online.
        </p>
      </div>

      <div className="space-y-2">
        {levels.map((controllableLevel) => {
          const theme = getControllableTheme(controllableLevel.type);
          const profile = getControllableRosterProfile(controllableLevel.type);
          const evolution = getControllableEvolutionState(controllableLevel);
          const isExpanded = expandedType === controllableLevel.type;

          return (
            <div
              key={controllableLevel.type}
              className="rounded-xl border border-border/50 bg-background/40 overflow-hidden"
            >
              <button
                onClick={() => setExpandedType(isExpanded ? null : controllableLevel.type)}
                className="w-full text-left p-3 transition-colors hover:bg-muted/40 active:bg-muted/60"
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${theme.bgClass}`}
                  >
                    <span className="text-lg" aria-hidden="true">
                      {theme.emoji}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-sm font-semibold ${theme.textClass}`}>{theme.label}</span>
                          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                            {profile.roleLabel}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                          {profile.shortDescription}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-medium capitalize ${theme.bgClass} ${theme.textClass}`}>
                          {evolution.stageLabel}
                        </span>
                        <ChevronDown
                          className={`w-3 h-3 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`}
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Progress value={controllableLevel.progress * 100} className={`h-2 ${theme.bgClass}`} />
                      <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                        <span>{evolution.progressLabel}</span>
                        <span className="shrink-0">{evolution.nextMilestoneLabel}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </button>

              <AnimatePresence>
                {isExpanded && userId && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden border-t border-border/40 bg-background/60"
                  >
                    <MoveHistoryPanel userId={userId} controllable={controllableLevel.type} />
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

function MoveHistoryPanel({ userId, controllable }: { userId: string; controllable: ControllableType }) {
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
  const profile = getControllableRosterProfile(controllable);

  return (
    <div className="px-3 py-3">
      <div className="mb-2">
        <p className="text-[11px] font-medium text-foreground">Recent moves for your {profile.role}</p>
        <p className="text-[10px] text-muted-foreground">
          This is where {theme.label.toLowerCase()} has been gaining evolution progress.
        </p>
      </div>

      {isLoading ? (
        <p className="text-[10px] text-muted-foreground py-2">Loading recent moves...</p>
      ) : !history || history.length === 0 ? (
        <p className="text-[10px] text-muted-foreground py-2">No moves logged here yet.</p>
      ) : (
        <div className="space-y-1 max-h-40 overflow-y-auto">
          {history.map((entry, index) => (
            <div
              key={index}
              className="flex items-center justify-between gap-2 text-[11px] py-1 border-b border-border/20 last:border-0"
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <Clock className="w-2.5 h-2.5 text-muted-foreground shrink-0" />
                <span className="text-foreground truncate">{entry.action_text}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`font-medium ${theme.textClass}`}>+{entry.xp_awarded} progress</span>
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
