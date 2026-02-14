import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { X, Zap, CheckCircle, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getDay, parseISO, format } from "date-fns";

const DAY_NAMES_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

interface DayDetailDrawerProps {
  dayIndex: number;
  userId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function DayDetailDrawer({ dayIndex, userId, isOpen, onClose }: DayDetailDrawerProps) {
  // Fetch actions for this day of week
  const { data: dayActions = [] } = useQuery({
    queryKey: ["day-detail-actions", userId, dayIndex],
    queryFn: async () => {
      const { data } = await supabase
        .from("completed_actions")
        .select("action_text, xp_awarded, completed_at, controllable")
        .eq("user_id", userId)
        .order("completed_at", { ascending: false });
      // Filter client-side by day of week
      return (data || []).filter(a => getDay(parseISO(a.completed_at)) === dayIndex);
    },
    enabled: !!userId && isOpen,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch checkins for this day
  const { data: dayCheckins = [] } = useQuery({
    queryKey: ["day-detail-checkins", userId, dayIndex],
    queryFn: async () => {
      const { data } = await supabase
        .from("daily_checkins")
        .select("check_in_date, created_at")
        .eq("user_id", userId)
        .order("check_in_date", { ascending: false });
      return (data || []).filter(c => getDay(new Date(c.check_in_date)) === dayIndex);
    },
    enabled: !!userId && isOpen,
    staleTime: 5 * 60 * 1000,
  });

  const totalXp = dayActions.reduce((sum, a) => sum + (a.xp_awarded || 0), 0);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/60 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          {/* Drawer */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 max-h-[70vh] bg-card border-t border-border rounded-t-2xl overflow-hidden"
          >
            {/* Handle */}
            <div className="flex justify-center py-2">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
            </div>

            {/* Header */}
            <div className="px-4 pb-3 flex items-center justify-between">
              <div>
                <h3 className="font-display font-semibold text-foreground text-lg">
                  {DAY_NAMES_FULL[dayIndex]}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {dayCheckins.length} check-in{dayCheckins.length !== 1 ? "s" : ""} • {dayActions.length} action{dayActions.length !== 1 ? "s" : ""}
                </p>
              </div>
              <button onClick={onClose} className="p-2 rounded-full hover:bg-muted transition-colors">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            {/* Stats bar */}
            <div className="px-4 pb-3 flex gap-3">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/10 text-accent text-sm">
                <Zap className="w-3.5 h-3.5" />
                <span className="font-medium">{totalXp.toLocaleString()} XP</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-sm">
                <CheckCircle className="w-3.5 h-3.5" />
                <span className="font-medium">{dayActions.length} actions</span>
              </div>
            </div>

            {/* Content */}
            <div className="px-4 pb-6 overflow-y-auto max-h-[calc(70vh-120px)]">
              {dayActions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No actions recorded on {DAY_NAMES_FULL[dayIndex]}s yet.
                </p>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
                    Recent Actions
                  </p>
                  {dayActions.slice(0, 15).map((action, i) => (
                    <motion.div
                      key={`${action.completed_at}-${i}`}
                      initial={{ opacity: 0, x: -5 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span className="text-sm text-foreground truncate">{action.action_text}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        <span className="text-xs text-accent flex items-center gap-0.5">
                          <Zap className="w-3 h-3" />+{action.xp_awarded}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {format(parseISO(action.completed_at), "MMM d")}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                  {dayActions.length > 15 && (
                    <p className="text-xs text-muted-foreground text-center pt-2">
                      +{dayActions.length - 15} more actions
                    </p>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
