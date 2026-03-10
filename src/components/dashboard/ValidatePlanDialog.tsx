import { useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardCheck, CheckCircle2, Circle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ValidatePlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  onComplete: () => void;
}

export function ValidatePlanDialog({ open, onOpenChange, userId, onComplete }: ValidatePlanDialogProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const today = new Date().toLocaleDateString("sv-SE");

  // Fetch today's planner items
  const { data: plannerItems = [], isLoading: plannerLoading } = useQuery({
    queryKey: ["planner-items-today", userId, today],
    queryFn: async () => {
      const { data } = await supabase
        .from("planner_items")
        .select("id, title, status, item_type, start_time, end_time")
        .eq("user_id", userId)
        .eq("scheduled_date", today)
        .order("sort_order", { ascending: true });
      return data || [];
    },
    enabled: !!userId && open,
  });

  // Fetch pending promises
  const { data: pendingPromises = [], isLoading: promisesLoading } = useQuery({
    queryKey: ["pending-promises-validate", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("integrity_logs")
        .select("id, promise_text, promised_at, due_date")
        .eq("user_id", userId)
        .is("kept", null)
        .order("promised_at", { ascending: false })
        .limit(10);
      return data || [];
    },
    enabled: !!userId && open,
  });

  const [resolvedPromises, setResolvedPromises] = useState<Set<string>>(new Set());
  const [confirming, setConfirming] = useState(false);

  const handleResolvePromise = useCallback(async (promiseId: string, kept: boolean) => {
    await supabase
      .from("integrity_logs")
      .update({ kept, kept_at: new Date().toISOString() })
      .eq("id", promiseId)
      .eq("user_id", userId);

    if (kept) {
      await supabase.from("xp_logs").insert({
        user_id: userId,
        amount: 30,
        source: "integrity_rep",
        description: "Kept a promise",
      });
    }

    setResolvedPromises(prev => new Set(prev).add(promiseId));
  }, [userId]);

  const handleConfirmPlan = useCallback(async () => {
    setConfirming(true);

    // Mark in daily_checkins that user confirmed their plan
    await supabase.from("daily_checkins").upsert({
      user_id: userId,
      check_in_date: today,
      completed: true,
      daily_focus: "Plan validated",
    }, { onConflict: "user_id,check_in_date" });

    // Store completion in localStorage
    const key = `validate_plan_${userId}_${today}`;
    try { localStorage.setItem(key, "1"); } catch {}

    queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
    queryClient.invalidateQueries({ queryKey: ["pending-promises-validate"] });

    toast({ title: "Plan confirmed ✓", description: "You're set for today." });
    onComplete();
    onOpenChange(false);
    setConfirming(false);
  }, [userId, today, queryClient, toast, onComplete, onOpenChange]);

  const isLoading = plannerLoading || promisesLoading;
  const unresolvedPromises = pendingPromises.filter(p => !resolvedPromises.has(p.id));
  const hasContent = plannerItems.length > 0 || pendingPromises.length > 0;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="pb-2">
          <DrawerTitle className="text-center font-display flex items-center justify-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-primary" />
            Validate Today's Plan
          </DrawerTitle>
          <p className="text-xs text-muted-foreground text-center">Review your tasks & promises</p>
        </DrawerHeader>

        <div className="px-6 pb-8 space-y-5 max-h-[60vh] overflow-y-auto">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-10 bg-muted/50 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : !hasContent ? (
            <div className="text-center py-6 space-y-2">
              <p className="text-sm text-muted-foreground">No planner items or promises for today.</p>
              <p className="text-xs text-muted-foreground/70">Confirm to set your intention for the day.</p>
            </div>
          ) : (
            <>
              {/* Today's Planner Items */}
              {plannerItems.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Today's Tasks ({plannerItems.length})
                  </p>
                  {plannerItems.map((item) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/50",
                        item.status === "done" && "opacity-60"
                      )}
                    >
                      {item.status === "done" ? (
                        <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                      ) : (
                        <Circle className="w-4 h-4 text-muted-foreground shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-sm", item.status === "done" && "line-through text-muted-foreground")}>
                          {item.title}
                        </p>
                        {item.start_time && (
                          <p className="text-[10px] text-muted-foreground">
                            {item.start_time.slice(0, 5)}{item.end_time ? ` – ${item.end_time.slice(0, 5)}` : ""}
                          </p>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Pending Promises */}
              {pendingPromises.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Open Promises ({unresolvedPromises.length})
                  </p>
                  {pendingPromises.map((promise) => {
                    const isResolved = resolvedPromises.has(promise.id);
                    return (
                      <motion.div
                        key={promise.id}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={cn(
                          "p-3 rounded-lg bg-muted/30 border border-border/50 space-y-2",
                          isResolved && "opacity-50"
                        )}
                      >
                        <p className={cn("text-sm", isResolved && "line-through text-muted-foreground")}>
                          {promise.promise_text}
                        </p>
                        {!isResolved && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs h-7 flex-1"
                              onClick={() => handleResolvePromise(promise.id, true)}
                            >
                              ✓ Kept
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-xs h-7 flex-1 text-muted-foreground"
                              onClick={() => handleResolvePromise(promise.id, false)}
                            >
                              ✗ Not yet
                            </Button>
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* Confirm Button */}
          <Button
            className="w-full"
            onClick={handleConfirmPlan}
            disabled={confirming || isLoading}
          >
            {confirming ? "Confirming..." : "Confirm Today's Plan ✓"}
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
