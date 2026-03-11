import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type ControllableFocus = "awareness" | "perspective" | "habit" | "wellness" | "environment";
export type ProjectStatus = "active" | "paused" | "complete";

export interface Project {
  id: string;
  user_id: string;
  season_id: string | null;
  name: string;
  emoji: string;
  color_hex: string;
  controllable: ControllableFocus | null;
  status: ProjectStatus;
  momentum_score: number;
  created_at: string;
}

export interface CalendarMapping {
  id: string;
  user_id: string;
  project_id: string;
  calendar_event_keyword: string;
  gcal_calendar_id: string | null;
  created_at: string;
}

export interface CreateProjectInput {
  name: string;
  emoji?: string;
  color_hex?: string;
  controllable?: ControllableFocus | null;
  season_id?: string | null;
}

export function useProjects(userId?: string, seasonId?: string | null) {
  const queryClient = useQueryClient();

  const projectsQuery = useQuery({
    queryKey: ["projects", userId, seasonId],
    queryFn: async () => {
      if (!userId) return [];
      let query = supabase
        .from("projects")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: true });
      if (seasonId) query = query.eq("season_id", seasonId);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as Project[];
    },
    enabled: !!userId,
  });

  const activeProjects = (projectsQuery.data ?? []).filter(p => p.status === "active");

  const createProject = useMutation({
    mutationFn: async (input: CreateProjectInput & { user_id: string }) => {
      const { data, error } = await supabase
        .from("projects")
        .insert(input as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as Project;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });

  const updateProject = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Project> & { id: string }) => {
      const { data, error } = await supabase
        .from("projects")
        .update(updates as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as Project;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });

  const deleteProject = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("projects").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });

  return {
    projects: projectsQuery.data ?? [],
    activeProjects,
    isLoading: projectsQuery.isLoading,
    createProject,
    updateProject,
    deleteProject,
    canAddProject: activeProjects.length < 5,
  };
}

export function useCalendarMappings(userId?: string) {
  const queryClient = useQueryClient();

  const mappingsQuery = useQuery({
    queryKey: ["calendar-mappings", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("project_calendar_mappings")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as CalendarMapping[];
    },
    enabled: !!userId,
  });

  const createMapping = useMutation({
    mutationFn: async (input: { user_id: string; project_id: string; calendar_event_keyword: string; gcal_calendar_id?: string | null }) => {
      const { data, error } = await supabase
        .from("project_calendar_mappings")
        .insert(input as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as CalendarMapping;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-mappings"] });
    },
  });

  const deleteMapping = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("project_calendar_mappings").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-mappings"] });
    },
  });

  return {
    mappings: mappingsQuery.data ?? [],
    isLoading: mappingsQuery.isLoading,
    createMapping,
    deleteMapping,
  };
}
