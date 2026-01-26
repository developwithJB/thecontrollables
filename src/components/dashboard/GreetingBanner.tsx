import { motion } from "framer-motion";
import { Flame, Zap, Target, Compass, ChevronRight, Pencil } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface MainQuest {
  id: string;
  title: string;
  duration_days: number;
  ends_at: string | null;
}

interface GreetingBannerProps {
  userId?: string;
  totalXp: number;
  streakDays?: number;
  visitCount: number;
  // Mission integration
  activeQuest?: MainQuest | null;
  onEditQuest?: () => void;
  // Snapshot Focus integration
  snapshotFocus?: string | null;
  snapshotEmoji?: string | null;
  onChangeSnapshot?: () => void;
}

export function GreetingBanner({ 
  userId, 
  totalXp, 
  streakDays = 0, 
  visitCount,
  activeQuest,
  onEditQuest,
  snapshotFocus,
  snapshotEmoji,
  onChangeSnapshot,
}: GreetingBannerProps) {
  // Fetch user's display name from profiles
  const { data: profile } = useQuery({
    queryKey: ["user-profile", userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", userId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  // Get first name or fallback
  const displayName = profile?.display_name?.split(" ")[0] || "";

  // Calculate level from XP
  const level = Math.floor(totalXp / 500) + 1;

  // Days remaining for quest
  const questDaysRemaining = activeQuest?.ends_at 
    ? Math.max(0, Math.ceil((new Date(activeQuest.ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6 space-y-4"
    >
      {/* Main greeting with name */}
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground mb-2">
          {getGreeting()}{displayName ? `, ${displayName}` : ""}
        </h1>

        {/* Stats row */}
        <div className="flex items-center gap-4">
          {/* Streak indicator */}
          {streakDays > 0 && (
            <div className="flex items-center gap-1.5">
              <motion.div 
                className="p-1 rounded-lg bg-orange-500/10 relative"
                animate={{
                  boxShadow: [
                    "0 0 8px rgba(249, 115, 22, 0.3)",
                    "0 0 16px rgba(249, 115, 22, 0.5)",
                    "0 0 8px rgba(249, 115, 22, 0.3)",
                  ],
                }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              >
                <motion.div
                  animate={{
                    scale: [1, 1.1, 1],
                    rotate: [-3, 3, -3],
                  }}
                  transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut" }}
                >
                  <Flame className="w-4 h-4 text-orange-500" />
                </motion.div>
              </motion.div>
              <span className="text-sm font-medium text-foreground">{streakDays}</span>
              <span className="text-sm text-muted-foreground">day streak</span>
            </div>
          )}

          {/* XP/Level indicator */}
          <div className="flex items-center gap-1.5">
            <div className="p-1 rounded-lg bg-accent/10">
              <Zap className="w-4 h-4 text-accent" />
            </div>
            <span className="text-sm font-medium text-foreground">Level {level}</span>
            <span className="text-sm text-muted-foreground">• {totalXp.toLocaleString()} XP</span>
          </div>
        </div>
      </div>

      {/* Integrated Mission + Snapshot Focus row */}
      {(activeQuest || snapshotFocus) && (
        <div className="flex flex-col sm:flex-row gap-2">
          {/* Mission pill */}
          {activeQuest && (
            <button
              onClick={onEditQuest}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20 
                         hover:bg-primary/15 hover:border-primary/30 transition-all group text-left flex-1"
            >
              <Target className="w-4 h-4 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Mission</p>
                <p className="text-sm font-medium text-foreground truncate">{activeQuest.title}</p>
              </div>
              {questDaysRemaining !== null && (
                <span className="text-xs text-muted-foreground shrink-0">{questDaysRemaining}d</span>
              )}
              <Pencil className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            </button>
          )}

          {/* Snapshot Focus pill */}
          {snapshotFocus && (
            <button
              onClick={onChangeSnapshot}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 border border-border 
                         hover:bg-muted hover:border-border/80 transition-all group text-left flex-1"
            >
              <Compass className="w-4 h-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Snapshot Focus</p>
                <p className="text-sm font-medium text-foreground truncate">
                  {snapshotEmoji && <span className="mr-1">{snapshotEmoji}</span>}
                  {snapshotFocus}
                </p>
              </div>
              <ChevronRight className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            </button>
          )}
        </div>
      )}

      {/* Intentional check-in message for new users */}
      {visitCount <= 5 && (
        <p className="text-xs text-muted-foreground/70">
          Designed for intentional check-ins. Desktop or mobile.
        </p>
      )}
    </motion.div>
  );
}
