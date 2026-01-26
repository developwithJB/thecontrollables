import { motion } from "framer-motion";
import { Flame, Zap } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface GreetingBannerProps {
  userId?: string;
  totalXp: number;
  streakDays?: number;
  visitCount: number;
}

export function GreetingBanner({ 
  userId, 
  totalXp, 
  streakDays = 0, 
  visitCount,
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

      {/* Intentional check-in message for new users */}
      {visitCount <= 5 && (
        <p className="text-xs text-muted-foreground/70">
          Designed for intentional check-ins. Desktop or mobile.
        </p>
      )}
    </motion.div>
  );
}