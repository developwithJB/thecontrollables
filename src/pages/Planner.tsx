import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { format, addWeeks, subWeeks, isToday, isBefore, startOfDay } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Plus, RotateCcw, BarChart3, UtensilsCrossed } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";
import { useLifeOSUser } from "@/hooks/useLifeOSAuth";
import { ControllablePoweredBy } from "@/components/layout/ControllablePoweredBy";

import {
  usePlannerItems,
  usePlannerMutations,
  usePlannerRoutines,
  usePlannerConnections,
  getWeekRange,
  type PlannerItem,
  type CreatePlannerItemInput,
  type UpdatePlannerItemInput,
} from "@/hooks/usePlanner";

import { usePlannerActivity, groupActivityByDate } from "@/hooks/usePlannerActivity";

import { PlannerDateStrip } from "@/components/planner/PlannerDateStrip";
import { PlannerDayView } from "@/components/planner/PlannerDayView";
import { PlannerWeekGrid } from "@/components/planner/PlannerWeekGrid";
import { PlannerItemEditor } from "@/components/planner/PlannerItemEditor";
import { PlannerFab } from "@/components/planner/PlannerFab";
import { QuickAddSheet } from "@/components/planner/QuickAddSheet";
import { PlannerRoutineManager } from "@/components/planner/PlannerRoutineManager";
import { PlannerCalendarConnect } from "@/components/planner/PlannerCalendarConnect";
import { PlanVsActualView } from "@/components/planner/PlanVsActualView";
import { PlannerWellnessBanner } from "@/components/planner/PlannerWellnessBanner";
import { useHealthData } from "@/hooks/useHealthData";

const Planner = () => {
  const user = useLifeOSUser();
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const callbackHandled = useRef(false);

  // Handle Google Calendar OAuth callback
  useEffect(() => {
    const code = searchParams.get("code");
    const isCallback = searchParams.get("gcal_callback");
    if (!code || !isCallback || callbackHandled.current) return;
    callbackHandled.current = true;

    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("Not authenticated");

        const redirectUri = `${window.location.origin}/planner?gcal_callback=true`;
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/planner-gcal-oauth-callback`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ code, redirect_uri: redirectUri }),
          }
        );

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || "Failed to connect Google Calendar");
        }

        toast({ title: "Google Calendar connected!" });
        queryClient.invalidateQueries({ queryKey: ["planner-connections"] });
      } catch (e: any) {
        toast({ title: "Connection failed", description: e.message, variant: "destructive" });
      } finally {
        navigate("/planner", { replace: true });
      }
    })();
  }, [searchParams, navigate, toast, queryClient]);
  const [showPvA, setShowPvA] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  // Week state
  const [referenceDate, setReferenceDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const weekRange = useMemo(() => getWeekRange(referenceDate), [referenceDate]);

  // Editor state
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PlannerItem | null>(null);
  const [routineManagerOpen, setRoutineManagerOpen] = useState(false);

  // Data
  const { data: items = [], isLoading: itemsLoading } = usePlannerItems(
    weekRange.start,
    weekRange.end,
    user.id
  );
  const { createItem, updateItem, completeItem, skipItem, reorderItems, deleteItem, rescheduleItem } =
    usePlannerMutations();
  const { routines, createRoutine, deleteRoutine } = usePlannerRoutines(user.id);
  const { connections, startGoogleCalSync, triggerSync, pushToGoogleCal } = usePlannerConnections(user.id);
  const { trend: healthTrend, isConnected: wearableConnected } = useHealthData(user.id);

  const googleConnection = connections.find((c) => c.provider === "google_calendar");

  const handlePushToCalendar = useCallback(
    (item: PlannerItem) => {
      if (!googleConnection) return;
      pushToGoogleCal.mutate(
        { connectionId: googleConnection.id, itemIds: [item.id] },
        {
          onSuccess: (data) => {
            toast({ title: `Pushed to Google Calendar`, description: `${data.pushed} event(s) synced` });
          },
          onError: (err: any) => {
            toast({ title: "Push failed", description: err.message, variant: "destructive" });
          },
        }
      );
    },
    [googleConnection, pushToGoogleCal, toast]
  );

  const handlePushToday = useCallback(() => {
    if (!googleConnection) return;
    pushToGoogleCal.mutate(
      { connectionId: googleConnection.id, date: format(selectedDate, "yyyy-MM-dd") },
      {
        onSuccess: (data) => {
          toast({ title: `Pushed to Google Calendar`, description: `${data.pushed} event(s) synced` });
        },
        onError: (err: any) => {
          toast({ title: "Push failed", description: err.message, variant: "destructive" });
        },
      }
    );
  }, [googleConnection, pushToGoogleCal, selectedDate, toast]);

  // Activity from other systems (rings, meals, actions)
  const { data: activityItems = [] } = usePlannerActivity(
    weekRange.start,
    weekRange.end,
    user.id
  );
  const activityByDate = useMemo(() => groupActivityByDate(activityItems), [activityItems]);

  // Group items by date
  const itemsByDate = useMemo(() => {
    const map: Record<string, PlannerItem[]> = {};
    for (const item of items) {
      const key = item.scheduled_date;
      if (!map[key]) map[key] = [];
      map[key].push(item);
    }
    return map;
  }, [items]);

  const itemCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    const allDateKeys = new Set([
      ...Object.keys(itemsByDate),
      ...Object.keys(activityByDate),
    ]);
    for (const key of allDateKeys) {
      counts[key] = (itemsByDate[key]?.length ?? 0) + (activityByDate[key]?.length ?? 0);
    }
    return counts;
  }, [itemsByDate, activityByDate]);

  const selectedDateKey = format(selectedDate, "yyyy-MM-dd");
  const dayItems = itemsByDate[selectedDateKey] ?? [];
  const dayActivity = activityByDate[selectedDateKey] ?? [];

  // Derive Plan vs Actual data with health metrics
  const pvaData = useMemo(() => {
    const today = startOfDay(new Date());
    return weekRange.days.map((date) => {
      const key = format(date, "yyyy-MM-dd");
      const dayItems = itemsByDate[key] ?? [];
      const isPast = isBefore(date, today) && !isToday(date);
      const healthForDay = healthTrend.find(h => h.date === key) ?? null;
      return {
        date,
        items: dayItems.map((item) => {
          let status: "done" | "partial" | "missed" | "planned" = "planned";
          if (item.status === "done") status = "done";
          else if (item.status === "skipped") status = "partial";
          else if (isPast) status = "missed";
          return {
            id: item.id,
            title: item.title,
            plannedTime: item.start_time ?? undefined,
            actualTime: item.completed_at ? format(new Date(item.completed_at), "HH:mm") : undefined,
            status,
            type: item.item_type as "task" | "time_block" | "routine_instance" | "external_event",
          };
        }),
        health: healthForDay,
      };
    });
  }, [weekRange.days, itemsByDate, healthTrend]);

  // Handlers
  const handleToggleStatus = useCallback(
    (item: PlannerItem) => {
      if (item.status === "done") {
        updateItem.mutate({ id: item.id, status: "todo" });
      } else if (item.status === "todo" || item.status === "in_progress") {
        completeItem.mutate({ id: item.id, userId: user.id });
      } else if (item.status === "skipped") {
        updateItem.mutate({ id: item.id, status: "todo" });
      }
    },
    [user.id, updateItem, completeItem]
  );

  const handleSave = useCallback(
    (input: CreatePlannerItemInput | UpdatePlannerItemInput) => {
      if ("id" in input) {
        updateItem.mutate(input, {
          onSuccess: () => { setEditorOpen(false); setEditingItem(null); },
        });
      } else {
        createItem.mutate(
          { ...input, user_id: user.id },
          {
            onSuccess: () => { setEditorOpen(false); setEditingItem(null); toast({ title: "Added to plan" }); },
          }
        );
      }
    },
    [user.id, createItem, updateItem, toast]
  );

  const handleEdit = useCallback((item: PlannerItem) => {
    setEditingItem(item);
    setEditorOpen(true);
  }, []);

  const handleDelete = useCallback((id: string) => { deleteItem.mutate(id); }, [deleteItem]);

  const handleReorder = useCallback(
    (reordered: { id: string; sort_order: number }[]) => { reorderItems.mutate(reordered); },
    [reorderItems]
  );

  return (
    <div className="space-y-0 -mx-4 sm:-mx-6 -my-6">
      {/* Controllable bar */}
      <div className="px-4 sm:px-6 pt-4 pb-2">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-display font-semibold">Planner</h1>
            <span className="text-xs text-muted-foreground font-mono">
              {format(weekRange.days[0], "MMM d")} – {format(weekRange.days[6], "MMM d")}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Button variant={showPvA ? "default" : "ghost"} size="icon" className="h-8 w-8" onClick={() => setShowPvA((v) => !v)} title="Plan vs Actual">
              <BarChart3 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setRoutineManagerOpen(true)}>
              <RotateCcw className="h-4 w-4" />
            </Button>
            {!isMobile && (
              <>
                <Button variant="outline" size="sm" onClick={() => setQuickAddOpen(true)}>
                  <UtensilsCrossed className="h-4 w-4 mr-1" /> Quick Log
                </Button>
                <Button variant="outline" size="sm" onClick={() => { setEditingItem(null); setEditorOpen(true); }}>
                  <Plus className="h-4 w-4 mr-1" /> Add
                </Button>
              </>
            )}
          </div>
        </div>
        <ControllablePoweredBy controllables={["awareness", "habit", "wellness", "environment"]} />
        <PlannerWellnessBanner userId={user.id} selectedDate={selectedDate} />
      </div>

      {/* Date strip (mobile) */}
      {isMobile && (
        <PlannerDateStrip
          days={weekRange.days}
          selectedDate={selectedDate}
          onSelect={setSelectedDate}
          onPrevWeek={() => setReferenceDate((d) => subWeeks(d, 1))}
          onNextWeek={() => setReferenceDate((d) => addWeeks(d, 1))}
          itemCounts={itemCounts}
        />
      )}

      {/* Plan vs Actual overlay */}
      {showPvA && (
        <div className="px-4 py-3 border-b border-border bg-card/50">
          <PlanVsActualView days={pvaData} view="week" isWearableConnected={wearableConnected} />
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden" style={{ height: "calc(100vh - 200px)" }}>
        {!isMobile && (
          <div className="w-[55%] border-r border-border p-4 overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => setReferenceDate((d) => subWeeks(d, 1))}>← Prev</Button>
                <Button variant="ghost" size="sm" onClick={() => setReferenceDate((d) => addWeeks(d, 1))}>Next →</Button>
                <Button variant="outline" size="sm" onClick={() => { setReferenceDate(new Date()); setSelectedDate(new Date()); }}>Today</Button>
              </div>
            </div>
            <PlannerWeekGrid
              days={weekRange.days}
              selectedDate={selectedDate}
              onSelect={setSelectedDate}
              itemsByDate={itemsByDate}
              activityByDate={activityByDate}
            />
            <div className="mt-4">
              <PlannerCalendarConnect
                connections={connections}
                onConnect={() => startGoogleCalSync.mutate()}
                onSync={(id) => triggerSync.mutate(id)}
                onPushToday={handlePushToday}
                isConnecting={startGoogleCalSync.isPending}
                isSyncing={triggerSync.isPending}
                isPushing={pushToGoogleCal.isPending}
              />
            </div>
          </div>
        )}

        <div className={isMobile ? "flex-1 overflow-y-auto" : "w-[45%] overflow-y-auto"}>
          <PlannerDayView
            date={selectedDate}
            items={dayItems}
            activityItems={dayActivity}
            onToggleStatus={handleToggleStatus}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onReschedule={(item) => { setEditingItem(item); setEditorOpen(true); }}
            onReorder={handleReorder}
            onPushToCalendar={handlePushToCalendar}
            hasGoogleConnection={!!googleConnection}
          />
          {isMobile && (
            <div className="px-4 pb-20">
              <PlannerCalendarConnect
                connections={connections}
                onConnect={() => startGoogleCalSync.mutate()}
                onSync={(id) => triggerSync.mutate(id)}
                onPushToday={handlePushToday}
                isConnecting={startGoogleCalSync.isPending}
                isSyncing={triggerSync.isPending}
                isPushing={pushToGoogleCal.isPending}
              />
            </div>
          )}
        </div>
      </div>

      {/* FAB for mobile */}
      {isMobile && (
        <PlannerFab
          onAddTask={() => { setEditingItem(null); setEditorOpen(true); }}
          onQuickAdd={() => setQuickAddOpen(true)}
        />
      )}

      <QuickAddSheet open={quickAddOpen} onClose={() => setQuickAddOpen(false)} userId={user.id} selectedDate={selectedDateKey} />

      <PlannerItemEditor
        open={editorOpen}
        onClose={() => { setEditorOpen(false); setEditingItem(null); }}
        onSave={handleSave}
        item={editingItem}
        defaultDate={selectedDateKey}
        isSaving={createItem.isPending || updateItem.isPending}
      />

      <PlannerRoutineManager
        open={routineManagerOpen}
        onClose={() => setRoutineManagerOpen(false)}
        routines={routines}
        onCreateRoutine={(input) => createRoutine.mutate(input)}
        onDeleteRoutine={(id) => deleteRoutine.mutate(id)}
        userId={user.id}
      />
    </div>
  );
};

export default Planner;
