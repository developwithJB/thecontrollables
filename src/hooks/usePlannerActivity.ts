import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

export interface ActivityItem {
  id: string;
  title: string;
  subtitle: string | null;
  source: "ring" | "wellness" | "meal" | "action";
  time: string; // ISO timestamp
  dateKey: string; // yyyy-MM-dd
  isConfirmed: boolean;
}

export const usePlannerActivity = (
  startDate: string,
  endDate: string,
  userId?: string
) => {
  return useQuery({
    queryKey: ["planner-activity", startDate, endDate, userId],
    queryFn: async (): Promise<ActivityItem[]> => {
      const items: ActivityItem[] = [];

      // 1. Daily rings
      const { data: rings } = await supabase
        .from("daily_rings")
        .select("*")
        .gte("ring_date", startDate)
        .lte("ring_date", endDate);

      if (rings) {
        for (const ring of rings) {
          const dateKey = ring.ring_date;
          const ringNames = [
            { key: "notice", label: "Notice Ring", field: "notice_completed", response: "notice_response" },
            { key: "choose", label: "Choose Ring", field: "choose_completed", response: "choose_response" },
            { key: "prove", label: "Prove Ring", field: "prove_completed", response: "prove_response" },
            { key: "charge", label: "Charge Ring", field: "charge_completed", response: "charge_response" },
            { key: "align", label: "Align Ring", field: "align_completed", response: "align_response" },
          ] as const;

          for (const r of ringNames) {
            const completed = (ring as any)[r.field] as boolean;
            const response = (ring as any)[r.response] as string | null;
            items.push({
              id: `ring-${ring.id}-${r.key}`,
              title: completed ? `✓ ${r.label}` : r.label,
              subtitle: response ? (response.length > 60 ? response.slice(0, 60) + "…" : response) : null,
              source: "ring",
              time: ring.updated_at || ring.created_at,
              dateKey,
              isConfirmed: completed,
            });
          }
        }
      }

      // 2. Completed actions
      const { data: actions } = await supabase
        .from("completed_actions")
        .select("*")
        .gte("completed_at", `${startDate}T00:00:00`)
        .lte("completed_at", `${endDate}T23:59:59`);

      if (actions) {
        for (const action of actions) {
          // Skip planner-originated actions to avoid duplicates
          if (action.action_text?.startsWith("Planner:")) continue;
          items.push({
            id: `action-${action.id}`,
            title: action.action_text,
            subtitle: action.controllable ? `${action.controllable} · ${action.xp_awarded} XP` : `${action.xp_awarded} XP`,
            source: "action",
            time: action.completed_at,
            dateKey: format(new Date(action.completed_at), "yyyy-MM-dd"),
            isConfirmed: true,
          });
        }
      }

      // 3. Meal plans
      const { data: meals } = await supabase
        .from("meal_plans")
        .select("*")
        .gte("plan_date", startDate)
        .lte("plan_date", endDate);

      if (meals) {
        for (const meal of meals) {
          const mealsArr = Array.isArray(meal.meals) ? meal.meals : [];
          const mealTypes = mealsArr
            .map((m: any) => m?.meal_type || m?.type)
            .filter(Boolean)
            .join(", ");
          items.push({
            id: `meal-${meal.id}`,
            title: "Meal Plan",
            subtitle: mealTypes || `${mealsArr.length} meal(s)`,
            source: "meal",
            time: meal.created_at,
            dateKey: meal.plan_date,
            isConfirmed: true, // meal plans are logged = confirmed
          });
        }
      }

      return items;
    },
    enabled: !!userId,
    staleTime: 30_000,
  });
};

/** Group activity items by date key */
export const groupActivityByDate = (items: ActivityItem[]): Record<string, ActivityItem[]> => {
  const map: Record<string, ActivityItem[]> = {};
  for (const item of items) {
    if (!map[item.dateKey]) map[item.dateKey] = [];
    map[item.dateKey].push(item);
  }
  return map;
};
