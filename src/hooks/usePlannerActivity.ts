import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

export interface ActivityItem {
  id: string;
  title: string;
  subtitle: string | null;
  detail?: string | null;
  source: "ring" | "wellness" | "meal" | "action" | "recharge" | "notice";
  time: string; // ISO timestamp
  dateKey: string; // yyyy-MM-dd
  isConfirmed: boolean;
  meta?: Record<string, any>;
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

      // 1. Daily moves
      const { data: rings } = await supabase
        .from("daily_rings")
        .select("*")
        .gte("ring_date", startDate)
        .lte("ring_date", endDate);

      if (rings) {
        for (const ring of rings) {
          const dateKey = ring.ring_date;
          const ringNames = [
            { key: "notice", label: "Awareness Move", field: "notice_completed", response: "notice_response" },
            { key: "choose", label: "Perspective Move", field: "choose_completed", response: "choose_response" },
            { key: "prove", label: "Habit Move", field: "prove_completed", response: "prove_response" },
            { key: "align", label: "Environment Move", field: "align_completed", response: "align_response" },
            { key: "charge", label: "Wellness Move", field: "charge_completed", response: "charge_response" },
          ] as const;

          for (const r of ringNames) {
            const completed = (ring as any)[r.field] as boolean;
            if (!completed) continue;
            const response = (ring as any)[r.response] as string | null;
            items.push({
              id: `ring-${ring.id}-${r.key}`,
              title: `✓ ${r.label}`,
              subtitle: response ? (response.length > 80 ? response.slice(0, 80) + "…" : response) : null,
              source: "ring",
              time: ring.updated_at || ring.created_at,
              dateKey,
              isConfirmed: true,
            });
          }
        }
      }

      // 2. Wellness logs (sleep, movement, nutrition)
      const { data: wellness } = await supabase
        .from("wellness_logs")
        .select("*")
        .gte("log_date", startDate)
        .lte("log_date", endDate);

      if (wellness) {
        for (const log of wellness as any[]) {
          const parts: string[] = [];
          if (log.sleep_rating) parts.push(`Sleep ${log.sleep_rating}/5`);
          if (log.movement_rating) parts.push(`Movement ${log.movement_rating}/5`);
          if (log.nutrition_rating) parts.push(`Nutrition ${log.nutrition_rating}/5`);

          items.push({
            id: `wellness-${log.id}`,
            title: "Wellness Log",
            subtitle: parts.join(" · ") || "Logged",
            detail: log.notes || null,
            source: "wellness",
            time: log.created_at,
            dateKey: log.log_date,
            isConfirmed: true,
            meta: { sleep: log.sleep_rating, movement: log.movement_rating, nutrition: log.nutrition_rating },
          });
        }
      }

      // 3. Recharge logs
      const { data: recharges } = await supabase
        .from("recharge_logs" as any)
        .select("*")
        .gte("log_date", startDate)
        .lte("log_date", endDate);

      if (recharges) {
        // Group by date
        const byDate: Record<string, any[]> = {};
        for (const r of recharges as any[]) {
          const d = r.log_date;
          if (!byDate[d]) byDate[d] = [];
          byDate[d].push(r);
        }
        for (const [dateKey, logs] of Object.entries(byDate)) {
          const types = logs.map((l: any) => l.recharge_type).join(", ");
          items.push({
            id: `recharge-${dateKey}`,
            title: `⚡ Recharged`,
            subtitle: types,
            source: "recharge",
            time: logs[0].created_at,
            dateKey,
            isConfirmed: true,
          });
        }
      }

      // 4. Notice entries (Awareness check-ins)
      const { data: notices } = await supabase
        .from("notice_entries" as any)
        .select("*")
        .gte("entry_date", startDate)
        .lte("entry_date", endDate);

      if (notices) {
        for (const n of notices as any[]) {
          items.push({
            id: `notice-${n.id}`,
            title: "🦉 Awareness Check-in",
            subtitle: `${n.mood} · Energy ${n.energy_level}/5 · Stress ${n.stress_level}/5`,
            detail: n.interpretation || null,
            source: "notice",
            time: n.created_at,
            dateKey: n.entry_date,
            isConfirmed: true,
            meta: { mood: n.mood, energy: n.energy_level, stress: n.stress_level },
          });
        }
      }

      // 5. Completed actions
      const { data: actions } = await supabase
        .from("completed_actions")
        .select("*")
        .gte("completed_at", `${startDate}T00:00:00`)
        .lte("completed_at", `${endDate}T23:59:59`);

      if (actions) {
        for (const action of actions) {
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

      // 6. Meal plans — show actual food names
      const { data: meals } = await supabase
        .from("meal_plans")
        .select("*")
        .gte("plan_date", startDate)
        .lte("plan_date", endDate);

      if (meals) {
        for (const meal of meals) {
          const mealsArr = Array.isArray(meal.meals) ? meal.meals : [];
          const mealLines: string[] = [];
          for (const m of mealsArr as any[]) {
            const type = m?.meal_type || m?.type || "Meal";
            const name = m?.name || m?.title || m?.recipe_name || "";
            if (name) {
              mealLines.push(`${type}: ${name}`);
            } else {
              mealLines.push(type);
            }
          }
          items.push({
            id: `meal-${meal.id}`,
            title: "🍽️ Meal Plan",
            subtitle: mealLines.length > 0 ? mealLines.join(" · ") : `${mealsArr.length} meal(s)`,
            detail: mealLines.length > 2 ? mealLines.join("\n") : null,
            source: "meal",
            time: meal.created_at,
            dateKey: meal.plan_date,
            isConfirmed: true,
          });
        }
      }

      // 7. Meal logs (photos/descriptions)
      const { data: mealLogs } = await supabase
        .from("meal_logs")
        .select("*")
        .gte("log_date", startDate)
        .lte("log_date", endDate);

      if (mealLogs) {
        for (const log of mealLogs) {
          items.push({
            id: `meallog-${log.id}`,
            title: `🍴 ${log.meal_type.charAt(0).toUpperCase() + log.meal_type.slice(1)}`,
            subtitle: log.description || "Logged",
            source: "meal",
            time: log.created_at,
            dateKey: log.log_date,
            isConfirmed: true,
          });
        }
      }

      // Sort by time descending within each day
      items.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

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
