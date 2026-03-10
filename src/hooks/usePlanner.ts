import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAnalytics } from "./useAnalytics";
import { format, startOfWeek, endOfWeek, addDays } from "date-fns";

// Types matching the DB enums (not in generated types yet, so define manually)
export type PlannerItemType = "task" | "time_block" | "routine_instance" | "external_event";
export type PlannerItemStatus = "todo" | "in_progress" | "done" | "skipped";
export type EnergyLevel = "low" | "medium" | "high";
export type Recurrence = "daily" | "weekdays" | "weekly";

export interface PlannerItem {
  id: string;
  user_id: string;
  item_type: PlannerItemType;
  status: PlannerItemStatus;
  title: string;
  description: string | null;
  scheduled_date: string;
  start_time: string | null;
  end_time: string | null;
  energy_level: EnergyLevel | null;
  sort_order: number;
  routine_id: string | null;
  external_event_id: string | null;
  connection_id: string | null;
  snapshot_action_ref: Record<string, any> | null;
  promise_id: string | null;
  completed_at: string | null;
  skipped_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlannerRoutine {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  recurrence: Recurrence;
  recurrence_days: number[];
  default_start_time: string | null;
  default_end_time: string | null;
  energy_level: EnergyLevel | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PlannerConnection {
  id: string;
  user_id: string;
  provider: string;
  provider_account_id: string | null;
  calendar_ids: string[];
  last_synced_at: string | null;
  is_active: boolean;
  created_at: string;
}

export interface CreatePlannerItemInput {
  title: string;
  item_type?: PlannerItemType;
  scheduled_date: string;
  start_time?: string | null;
  end_time?: string | null;
  energy_level?: EnergyLevel | null;
  description?: string | null;
  snapshot_action_ref?: Record<string, any> | null;
  promise_id?: string | null;
}

export interface UpdatePlannerItemInput {
  id: string;
  title?: string;
  item_type?: PlannerItemType;
  status?: PlannerItemStatus;
  scheduled_date?: string;
  start_time?: string | null;
  end_time?: string | null;
  energy_level?: EnergyLevel | null;
  description?: string | null;
  sort_order?: number;
}

// Helper to get current week range
export const getWeekRange = (referenceDate: Date) => {
  const start = startOfWeek(referenceDate, { weekStartsOn: 1 });
  const end = endOfWeek(referenceDate, { weekStartsOn: 1 });
  return {
    start: format(start, "yyyy-MM-dd"),
    end: format(end, "yyyy-MM-dd"),
    days: Array.from({ length: 7 }, (_, i) => addDays(start, i)),
  };
};

/**
 * Fetch planner items for a date range
 */
export const usePlannerItems = (startDate: string, endDate: string, userId?: string) => {
  return useQuery({
    queryKey: ["planner-items", startDate, endDate, userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("planner_items" as any)
        .select("*")
        .gte("scheduled_date", startDate)
        .lte("scheduled_date", endDate)
        .order("sort_order", { ascending: true })
        .order("start_time", { ascending: true, nullsFirst: false });

      if (error) throw error;
      return (data ?? []) as unknown as PlannerItem[];
    },
    enabled: !!userId,
    staleTime: 30_000,
  });
};

/**
 * Today's planner items for dashboard card
 */
export const useTodayPlannerItems = (userId?: string) => {
  const today = format(new Date(), "yyyy-MM-dd");
  return useQuery({
    queryKey: ["planner-items-today", today, userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("planner_items" as any)
        .select("*")
        .eq("scheduled_date", today)
        .order("sort_order", { ascending: true })
        .order("start_time", { ascending: true, nullsFirst: false })
        .limit(10);

      if (error) throw error;
      return (data ?? []) as unknown as PlannerItem[];
    },
    enabled: !!userId,
    staleTime: 30_000,
  });
};

/**
 * CRUD mutations for planner items
 */
export const usePlannerMutations = () => {
  const queryClient = useQueryClient();
  const { trackEvent } = useAnalytics();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["planner-items"] });
    queryClient.invalidateQueries({ queryKey: ["planner-items-today"] });
  };

  const createItem = useMutation({
    mutationFn: async (input: CreatePlannerItemInput & { user_id: string }) => {
      // Get max sort_order for the day
      const { data: existing } = await supabase
        .from("planner_items" as any)
        .select("sort_order")
        .eq("scheduled_date", input.scheduled_date)
        .order("sort_order", { ascending: false })
        .limit(1);

      const nextOrder = existing && (existing as any[]).length > 0
        ? ((existing as any[])[0].sort_order ?? 0) + 1
        : 0;

      const { data, error } = await supabase
        .from("planner_items" as any)
        .insert({
          ...input,
          sort_order: nextOrder,
        })
        .select()
        .single();

      if (error) throw error;
      return data as unknown as PlannerItem;
    },
    onSuccess: (data) => {
      invalidate();
      trackEvent("planner", "planner_item_created", {
        item_type: (data as any).item_type,
      });
    },
  });

  const updateItem = useMutation({
    mutationFn: async (input: UpdatePlannerItemInput) => {
      const { id, ...updates } = input;
      const { data, error } = await supabase
        .from("planner_items" as any)
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as PlannerItem;
    },
    onSuccess: () => invalidate(),
  });

  const completeItem = useMutation({
    mutationFn: async ({ id, userId }: { id: string; userId: string }) => {
      const { data, error } = await supabase
        .from("planner_items" as any)
        .update({
          status: "done",
          completed_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      const item = data as unknown as PlannerItem;

      // Award XP via completed_actions for history visibility
      await supabase.from("completed_actions").insert({
        user_id: userId,
        action_text: `Planner: ${item.title}`,
        controllable: null,
        xp_awarded: 10,
      });

      await supabase.from("xp_logs").insert({
        user_id: userId,
        amount: 10,
        source: "planner_task",
        description: item.title,
      });

      return item;
    },
    onSuccess: () => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: ["completed-actions"] });
      queryClient.invalidateQueries({ queryKey: ["xp"] });
      trackEvent("planner", "planner_item_completed");
    },
  });

  const skipItem = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("planner_items" as any)
        .update({
          status: "skipped",
          skipped_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as PlannerItem;
    },
    onSuccess: () => {
      invalidate();
      trackEvent("planner", "planner_item_skipped");
    },
  });

  const rescheduleItem = useMutation({
    mutationFn: async ({ id, newDate }: { id: string; newDate: string }) => {
      const { data, error } = await supabase
        .from("planner_items" as any)
        .update({ scheduled_date: newDate, status: "todo" })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as PlannerItem;
    },
    onSuccess: () => invalidate(),
  });

  const reorderItems = useMutation({
    mutationFn: async (items: { id: string; sort_order: number }[]) => {
      // Update each item's sort_order
      const promises = items.map(({ id, sort_order }) =>
        supabase
          .from("planner_items" as any)
          .update({ sort_order })
          .eq("id", id)
      );
      await Promise.all(promises);
    },
    onSuccess: () => invalidate(),
  });

  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("planner_items" as any)
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => invalidate(),
  });

  return {
    createItem,
    updateItem,
    completeItem,
    skipItem,
    rescheduleItem,
    reorderItems,
    deleteItem,
  };
};

/**
 * Planner routines CRUD
 */
export const usePlannerRoutines = (userId?: string) => {
  const queryClient = useQueryClient();

  const routinesQuery = useQuery({
    queryKey: ["planner-routines", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("planner_routines" as any)
        .select("*")
        .order("created_at", { ascending: true });

      if (error) throw error;
      return (data ?? []) as unknown as PlannerRoutine[];
    },
    enabled: !!userId,
  });

  const createRoutine = useMutation({
    mutationFn: async (input: Omit<PlannerRoutine, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("planner_routines" as any)
        .insert(input)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as PlannerRoutine;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["planner-routines"] }),
  });

  const updateRoutine = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PlannerRoutine> & { id: string }) => {
      const { data, error } = await supabase
        .from("planner_routines" as any)
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as PlannerRoutine;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["planner-routines"] }),
  });

  const deleteRoutine = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("planner_routines" as any)
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["planner-routines"] }),
  });

  return {
    routines: routinesQuery.data ?? [],
    isLoading: routinesQuery.isLoading,
    createRoutine,
    updateRoutine,
    deleteRoutine,
  };
};

/**
 * Planner connections (calendar integrations)
 */
export const usePlannerConnections = (userId?: string) => {
  const queryClient = useQueryClient();

  const connectionsQuery = useQuery({
    queryKey: ["planner-connections", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("planner_connections" as any)
        .select("*")
        .order("created_at", { ascending: true });

      if (error) throw error;
      return (data ?? []) as unknown as PlannerConnection[];
    },
    enabled: !!userId,
  });

  const startGoogleCalSync = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/planner-gcal-oauth-start`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            redirect_uri: `${window.location.origin}/planner?gcal_callback=true`,
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to start OAuth");
      const result = await response.json();
      return result.auth_url as string;
    },
    onSuccess: (authUrl) => {
      window.location.href = authUrl;
    },
  });

  const triggerSync = useMutation({
    mutationFn: async (connectionId: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/planner-gcal-sync`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ connection_id: connectionId }),
        }
      );

      if (!response.ok) throw new Error("Sync failed");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["planner-items"] });
      queryClient.invalidateQueries({ queryKey: ["planner-items-today"] });
      queryClient.invalidateQueries({ queryKey: ["planner-connections"] });
    },
  });

  const pushToGoogleCal = useMutation({
    mutationFn: async ({ connectionId, itemIds, date }: { connectionId: string; itemIds?: string[]; date?: string }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/planner-gcal-push`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            connection_id: connectionId,
            ...(itemIds ? { item_ids: itemIds } : {}),
            ...(date ? { date } : {}),
          }),
        }
      );

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || "Failed to push to Google Calendar");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["planner-items"] });
      queryClient.invalidateQueries({ queryKey: ["planner-items-today"] });
    },
  });

  return {
    connections: connectionsQuery.data ?? [],
    isLoading: connectionsQuery.isLoading,
    startGoogleCalSync,
    triggerSync,
    pushToGoogleCal,
  };
};
