import { useMemo } from "react";
import { format, isToday } from "date-fns";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { PlannerItemRow } from "./PlannerItemRow";
import { ActivityItemRow } from "./ActivityItemRow";
import type { PlannerItem } from "@/hooks/usePlanner";
import type { ActivityItem } from "@/hooks/usePlannerActivity";
import { CalendarOff, UtensilsCrossed } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const HOURS = Array.from({ length: 20 }, (_, i) => i + 4); // 4 AM – 11 PM

interface PlannerDayViewProps {
  date: Date;
  items: PlannerItem[];
  activityItems?: ActivityItem[];
  onToggleStatus: (item: PlannerItem) => void;
  onEdit: (item: PlannerItem) => void;
  onDelete: (id: string) => void;
  onReschedule: (item: PlannerItem) => void;
  onReorder: (items: { id: string; sort_order: number }[]) => void;
  onPushToCalendar?: (item: PlannerItem) => void;
  hasGoogleConnection?: boolean;
  userId?: string;
}

function parseTime(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h + m / 60;
}

export const PlannerDayView = ({
  date,
  items,
  activityItems = [],
  onToggleStatus,
  onEdit,
  onDelete,
  onReschedule,
  onReorder,
  onPushToCalendar,
  hasGoogleConnection,
  userId,
}: PlannerDayViewProps) => {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const { timedItems, untimedItems } = useMemo(() => {
    const sorted = [...items].sort((a, b) => a.sort_order - b.sort_order);
    const timed: PlannerItem[] = [];
    const untimed: PlannerItem[] = [];
    for (const item of sorted) {
      if (item.start_time) {
        timed.push(item);
      } else {
        untimed.push(item);
      }
    }
    timed.sort((a, b) => parseTime(a.start_time!) - parseTime(b.start_time!));
    return { timedItems: timed, untimedItems: untimed };
  }, [items]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = untimedItems.findIndex((i) => i.id === active.id);
    const newIndex = untimedItems.findIndex((i) => i.id === over.id);
    const reordered = arrayMove(untimedItems, oldIndex, newIndex);
    onReorder(
      reordered.map((item, idx) => ({ id: item.id, sort_order: idx }))
    );
  };

  const todayLabel = isToday(date) ? "Today" : format(date, "EEEE, MMM d");

  // Meal details for this day
  const dateKey = format(date, "yyyy-MM-dd");
  const { data: mealData } = useQuery({
    queryKey: ["meal-plan-detail", userId, dateKey],
    queryFn: async () => {
      if (!userId) return null;
      const { data } = await supabase
        .from("meal_plans")
        .select("meals")
        .eq("user_id", userId)
        .eq("plan_date", dateKey)
        .maybeSingle();
      return data ? ((data.meals as any[]) || []) : [];
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  const meals = mealData || [];
  const lunch = meals.find((m: any) => m.meal_type === "lunch");
  const dinner = meals.find((m: any) => m.meal_type === "dinner");
  const isBusyDay = items.length >= 5;
  const hasEmptySlots = !lunch || !dinner;

  // Current time indicator position
  const now = new Date();
  const currentHour = now.getHours() + now.getMinutes() / 60;
  const showCurrentTime = isToday(date) && currentHour >= 4 && currentHour <= 23;

  return (
    <div className="flex-1 px-4 py-3">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold text-foreground">{todayLabel}</h2>
        {meals.length > 0 && (
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <UtensilsCrossed className="w-3 h-3" /> {meals.length} meals
          </span>
        )}
      </div>

      {/* Meal slot summary */}
      {meals.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-3 text-[10px] text-muted-foreground">
          {lunch ? (
            <span>🍽️ Lunch: <span className="text-foreground/80 font-medium">{lunch.name}</span></span>
          ) : isBusyDay ? (
            <span className="text-accent italic">Light lunch suggested — busy day</span>
          ) : null}
          {dinner ? (
            <span>🍽️ Dinner: <span className="text-foreground/80 font-medium">{dinner.name}</span></span>
          ) : isBusyDay ? (
            <span className="text-accent italic">Simple dinner suggested — busy day</span>
          ) : null}
        </div>
      )}
      {isBusyDay && hasEmptySlots && meals.length === 0 && (
        <div className="flex items-center gap-1.5 mb-3 text-[10px] text-accent italic">
          <UtensilsCrossed className="w-3 h-3" /> Busy day — keep meals light
        </div>
      )}

      {items.length === 0 && activityItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <CalendarOff className="h-10 w-10 text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">Nothing planned yet</p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            Tap + to add a task or time block
          </p>
        </div>
      ) : (
        <>
          {/* Untimed tasks — sortable list */}
          {untimedItems.length > 0 && (
            <div className="mb-4">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                Tasks
              </h3>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={untimedItems.map((i) => i.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {untimedItems.map((item) => (
                      <PlannerItemRow
                        key={item.id}
                        item={item}
                        onToggleStatus={onToggleStatus}
                        onEdit={onEdit}
                        onDelete={onDelete}
                        onReschedule={onReschedule}
                        onPushToCalendar={onPushToCalendar}
                        hasGoogleConnection={hasGoogleConnection}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          )}

          {/* Timeline — timed events */}
          {timedItems.length > 0 && (
            <div className="mb-4">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                Schedule
              </h3>
              <div className="relative border-l border-border/40 ml-3">
                {/* Current time indicator */}
                {showCurrentTime && (
                  <div
                    className="absolute left-0 right-0 flex items-center z-10 pointer-events-none"
                    style={{
                      top: `${((currentHour - 4) / 16) * 100}%`,
                    }}
                  >
                    <div className="w-2 h-2 rounded-full bg-destructive -ml-1" />
                    <div className="flex-1 h-px bg-destructive" />
                  </div>
                )}

                {/* Hour markers + timed items */}
                {HOURS.filter((h) => {
                  // Only show hours that have items nearby
                  return timedItems.some((item) => {
                    const startH = parseTime(item.start_time!);
                    const endH = item.end_time ? parseTime(item.end_time) : startH + 1;
                    return (h >= Math.floor(startH) - 1 && h <= Math.ceil(endH));
                  });
                }).map((hour) => {
                  const hourItems = timedItems.filter((item) => {
                    const startH = parseTime(item.start_time!);
                    return Math.floor(startH) === hour;
                  });

                  return (
                    <div key={hour} className="flex min-h-[48px]">
                      <div className="w-10 text-[10px] text-muted-foreground font-mono pt-0.5 text-right pr-2 shrink-0">
                        {hour === 0 ? "12a" : hour < 12 ? `${hour}a` : hour === 12 ? "12p" : `${hour - 12}p`}
                      </div>
                      <div className="flex-1 border-t border-border/20 pt-1 pb-2 space-y-1">
                        {hourItems.map((item) => (
                          <button
                            key={item.id}
                            onClick={() => onEdit(item)}
                            className={cn(
                              "w-full text-left rounded-lg px-2.5 py-1.5 text-xs border transition-colors",
                              item.status === "done"
                                ? "bg-perspective/10 border-perspective/30 text-perspective"
                                : "bg-accent/8 border-accent/20 text-foreground hover:bg-accent/15"
                            )}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium truncate">{item.title}</span>
                              <span className="text-[10px] text-muted-foreground ml-2 shrink-0">
                                {item.start_time?.slice(0, 5)}
                                {item.end_time && ` – ${item.end_time.slice(0, 5)}`}
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activityItems.length > 0 && (
            <div>
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                Activity Log
              </h3>
              <div className="space-y-1.5">
                {activityItems.map((item) => (
                  <ActivityItemRow key={item.id} item={item} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
