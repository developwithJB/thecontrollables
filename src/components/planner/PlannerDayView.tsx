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
import { format } from "date-fns";

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

  const sortedItems = useMemo(
    () => [...items].sort((a, b) => a.sort_order - b.sort_order),
    [items]
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = sortedItems.findIndex((i) => i.id === active.id);
    const newIndex = sortedItems.findIndex((i) => i.id === over.id);
    const reordered = arrayMove(sortedItems, oldIndex, newIndex);

    onReorder(
      reordered.map((item, idx) => ({ id: item.id, sort_order: idx }))
    );
  };

  const todayLabel = isToday(date) ? "Today" : format(date, "EEEE, MMM d");

  // Meal count for this day
  const dateKey = format(date, "yyyy-MM-dd");
  const { data: mealCount = 0 } = useQuery({
    queryKey: ["meal-plan-count", userId, dateKey],
    queryFn: async () => {
      if (!userId) return 0;
      const { data } = await supabase
        .from("meal_plans")
        .select("meals")
        .eq("user_id", userId)
        .eq("plan_date", dateKey)
        .maybeSingle();
      return data ? ((data.meals as any[])?.length || 0) : 0;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  return (
    <div className="flex-1 px-4 py-3">
      <h2 className="text-base font-semibold text-foreground mb-3">{todayLabel}</h2>

      {sortedItems.length === 0 && activityItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <CalendarOff className="h-10 w-10 text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">Nothing planned yet</p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            Tap + to add a task or time block
          </p>
        </div>
      ) : (
        <>
          {sortedItems.length > 0 && (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={sortedItems.map((i) => i.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {sortedItems.map((item) => (
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
          )}

          {activityItems.length > 0 && (
            <div className={sortedItems.length > 0 ? "mt-4" : ""}>
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
