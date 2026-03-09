import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type Provider = "google_calendar" | "gmail" | "todoist" | "notion";

export interface IntegrationConnection {
  id: string;
  user_id: string;
  provider: Provider;
  provider_account_id: string | null;
  status: string;
  error_message: string | null;
  last_synced_at: string | null;
  scopes: string[] | null;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface SyncLog {
  id: string;
  connection_id: string;
  provider: string;
  sync_type: string;
  status: string;
  items_processed: number;
  items_created: number;
  items_updated: number;
  items_skipped: number;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
  metadata: Record<string, any>;
}

export const PROVIDER_META: Record<Provider, { name: string; description: string; icon: string; color: string }> = {
  google_calendar: {
    name: "Google Calendar",
    description: "Sync events and time blocks with your Planner",
    icon: "📅",
    color: "hsl(var(--primary))",
  },
  gmail: {
    name: "Gmail",
    description: "Daily inbox summary for your Daily OS",
    icon: "✉️",
    color: "hsl(var(--destructive))",
  },
  todoist: {
    name: "Todoist",
    description: "Import tasks into your Planner",
    icon: "✅",
    color: "hsl(var(--accent))",
  },
  notion: {
    name: "Notion",
    description: "Export reviews and Vault entries to Notion",
    icon: "📝",
    color: "hsl(var(--muted-foreground))",
  },
};

export function useIntegrationConnections() {
  return useQuery({
    queryKey: ["integration-connections"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase
        .from("integration_connections")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as IntegrationConnection[];
    },
  });
}

export function useSyncLogs(connectionId?: string) {
  return useQuery({
    queryKey: ["integration-sync-logs", connectionId],
    queryFn: async () => {
      let query = supabase
        .from("integration_sync_logs")
        .select("*")
        .order("started_at", { ascending: false })
        .limit(10);
      if (connectionId) query = query.eq("connection_id", connectionId);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as SyncLog[];
    },
    enabled: !!connectionId,
  });
}

export function useConnectProvider() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (provider: Provider) => {
      const redirectUri = `${window.location.origin}/integrations`;
      const { data, error } = await supabase.functions.invoke("integration-oauth-start", {
        body: { provider, redirectUri },
      });
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data?.error || "Failed to start OAuth");
      }
    },
    onError: (err: any) => {
      toast({
        title: "Connection failed",
        description: err.message || "Could not initiate connection.",
        variant: "destructive",
      });
    },
  });
}

export function useDisconnectProvider() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (connectionId: string) => {
      const { data, error } = await supabase.functions.invoke("integration-disconnect", {
        body: { connectionId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integration-connections"] });
      toast({ title: "Disconnected", description: "Integration has been removed." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });
}

export function useSyncProvider() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (connectionId: string) => {
      const { data, error } = await supabase.functions.invoke("integration-sync", {
        body: { connectionId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["integration-connections"] });
      queryClient.invalidateQueries({ queryKey: ["integration-sync-logs"] });
      toast({
        title: "Sync complete",
        description: `Processed ${data?.items_processed || 0} items.`,
      });
    },
    onError: (err: any) => {
      queryClient.invalidateQueries({ queryKey: ["integration-connections"] });
      queryClient.invalidateQueries({ queryKey: ["integration-sync-logs"] });
      toast({ title: "Sync failed", description: err.message, variant: "destructive" });
    },
  });
}

export function useGmailSummary() {
  return useQuery({
    queryKey: ["gmail-summary"],
    queryFn: async () => {
      const { data: connections } = await supabase
        .from("integration_connections")
        .select("id")
        .eq("provider", "gmail")
        .eq("status", "active")
        .maybeSingle();
      if (!connections) return null;

      // Get latest sync log with gmail summary
      const { data: logs } = await supabase
        .from("integration_sync_logs")
        .select("metadata")
        .eq("connection_id", connections.id)
        .eq("status", "success")
        .order("completed_at", { ascending: false })
        .limit(1);

      if (logs && logs.length > 0) {
        const meta = logs[0].metadata as any;
        return meta?.summary || null;
      }
      return null;
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}
