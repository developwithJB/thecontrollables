import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, AlertCircle, Loader2, Watch, Unlink, RefreshCw, Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface HealthDataSyncProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
}

export function HealthDataSync({ open, onOpenChange, userId }: HealthDataSyncProps) {
  const [activeTab, setActiveTab] = useState("whoop");
  const [connecting, setConnecting] = useState<string | null>(null);
  const [syncing, setSyncing] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: lastSync } = useQuery({
    queryKey: ["health-sync-last", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("health_sync_data")
        .select("synced_at, source")
        .eq("user_id", userId)
        .order("synced_at", { ascending: false })
        .limit(1);
      return data?.[0] || null;
    },
    enabled: !!userId,
  });

  const { data: wearableConnections = [], refetch: refetchConnections } = useQuery({
    queryKey: ["wearable-connections", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("wearable_connections")
        .select("provider, connected_at, last_synced_at")
        .eq("user_id", userId);
      return data || [];
    },
    enabled: !!userId,
  });

  const fitbitConnection = wearableConnections.find((c: any) => c.provider === "fitbit");
  const ouraConnection = wearableConnections.find((c: any) => c.provider === "oura");
  const whoopConnection = wearableConnections.find((c: any) => c.provider === "whoop");

  const handleConnect = useCallback(async (provider: "fitbit" | "oura" | "whoop") => {
    setConnecting(provider);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) { toast.error("Please sign in first"); return; }

      const { data, error } = await supabase.functions.invoke("wearable-oauth-start", {
        body: { provider, redirect_uri: window.location.origin },
      });

      if (error || !data?.url) {
        toast.error(data?.error || "Failed to start connection");
        return;
      }

      window.location.href = data.url;
    } catch (err) {
      console.error("Connect error:", err);
      toast.error("Failed to connect");
    } finally {
      setConnecting(null);
    }
  }, []);

  const handleSync = useCallback(async (provider: "fitbit" | "oura" | "whoop") => {
    setSyncing(provider);
    try {
      const { data, error } = await supabase.functions.invoke("wearable-sync", {
        body: { provider },
      });

      if (error || data?.error) {
        toast.error(data?.error || "Sync failed");
        return;
      }

      toast.success(`Synced ${data.days_synced} days from ${provider === "fitbit" ? "Fitbit" : provider === "whoop" ? "WHOOP" : "Oura"}`);
      queryClient.invalidateQueries({ queryKey: ["health-sync-last"] });
      queryClient.invalidateQueries({ queryKey: ["health-sync-today"] });
      queryClient.invalidateQueries({ queryKey: ["health-data-trend"] });
      queryClient.invalidateQueries({ queryKey: ["brain-body"] });
      queryClient.invalidateQueries({ queryKey: ["wellness-goals"] });
      refetchConnections();
    } catch (err) {
      console.error("Sync error:", err);
      toast.error("Sync failed");
    } finally {
      setSyncing(null);
    }
  }, [queryClient, refetchConnections]);

  const handleDisconnect = useCallback(async (provider: "fitbit" | "oura" | "whoop") => {
    const { error } = await supabase
      .from("wearable_connections")
      .delete()
      .eq("user_id", userId)
      .eq("provider", provider);

    if (error) {
      toast.error("Failed to disconnect");
      return;
    }

    toast.success(`${provider === "fitbit" ? "Fitbit" : provider === "whoop" ? "WHOOP" : "Oura"} disconnected`);
    refetchConnections();
  }, [userId, refetchConnections]);

  const lastSyncDate = lastSync?.synced_at
    ? new Date(lastSync.synced_at).toLocaleDateString()
    : null;

  const renderWearableTab = (provider: "fitbit" | "oura" | "whoop", connection: any) => {
    const label = provider === "fitbit" ? "Fitbit" : provider === "whoop" ? "WHOOP" : "Oura Ring";
    const isConnecting = connecting === provider;
    const isSyncing = syncing === provider;

    if (connection) {
      const lastSynced = connection.last_synced_at
        ? new Date(connection.last_synced_at).toLocaleDateString()
        : "Never";

      return (
        <div className="space-y-3 mt-3">
          <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2">
            <CheckCircle className="h-4 w-4 text-perspective" />
            <span className="text-sm font-medium text-foreground">Connected</span>
            <Badge variant="secondary" className="text-[10px] ml-auto">
              Last synced: {lastSynced}
            </Badge>
          </div>

          <p className="text-xs text-muted-foreground">
            Your {label} data syncs automatically into Brain & Body. Tap below to pull the latest 7 days.
          </p>

          <div className="flex gap-2">
            <Button
              onClick={() => handleSync(provider)}
              disabled={isSyncing}
              className="flex-1 gap-2"
            >
              {isSyncing ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Syncing...</>
              ) : (
                <><RefreshCw className="h-4 w-4" /> Sync Now</>
              )}
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => handleDisconnect(provider)}
              title={`Disconnect ${label}`}
            >
              <Unlink className="h-4 w-4" />
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-3 mt-3">
        <p className="text-sm text-muted-foreground">
          Connect your {label} account to automatically sync sleep, steps, heart rate, and activity data.
        </p>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground bg-muted/30 rounded px-2 py-1.5">
          <AlertCircle className="h-3 w-3 shrink-0" />
          Your data stays private — we only read health metrics, never write to your {label}.
        </div>
        <Button
          onClick={() => handleConnect(provider)}
          disabled={isConnecting}
          className="w-full gap-2"
        >
          {isConnecting ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Connecting...</>
          ) : (
            <><Watch className="h-4 w-4" /> Connect {label}</>
          )}
        </Button>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-wellness" />
            Connect Wearable
          </DialogTitle>
        </DialogHeader>

        {lastSyncDate && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
            <CheckCircle className="h-3.5 w-3.5 text-perspective" />
            Last synced: {lastSyncDate}
            {lastSync?.source && (
              <Badge variant="secondary" className="text-[10px] ml-auto">
                {lastSync.source === "fitbit" ? "Fitbit" : lastSync.source === "whoop" ? "WHOOP" : "Oura"}
              </Badge>
            )}
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="whoop" className="gap-1 text-xs">
              <Activity className="h-3 w-3" />
              WHOOP
            </TabsTrigger>
            <TabsTrigger value="fitbit" className="gap-1 text-xs">
              <Watch className="h-3 w-3" />
              Fitbit
            </TabsTrigger>
            <TabsTrigger value="oura" className="gap-1 text-xs">
              <Watch className="h-3 w-3" />
              Oura
            </TabsTrigger>
          </TabsList>

          <TabsContent value="whoop">
            {renderWearableTab("whoop", whoopConnection)}
          </TabsContent>

          <TabsContent value="fitbit">
            {renderWearableTab("fitbit", fitbitConnection)}
          </TabsContent>

          <TabsContent value="oura">
            {renderWearableTab("oura", ouraConnection)}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
