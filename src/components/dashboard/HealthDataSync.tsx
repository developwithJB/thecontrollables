import { useState, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Apple, Smartphone, Upload, CheckCircle, AlertCircle, Loader2, Watch, Unlink, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface HealthDataSyncProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
}

export function HealthDataSync({ open, onOpenChange, userId }: HealthDataSyncProps) {
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState("apple");
  const [connecting, setConnecting] = useState<string | null>(null);
  const [syncing, setSyncing] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
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

  // Query wearable connections
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
      queryClient.invalidateQueries({ queryKey: ["brain-body"] });
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

  const handleUpload = async (file: File, source: "apple_health" | "google_fit") => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("source", source);

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) { toast.error("Please sign in first"); return; }

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/parse-health-export`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        }
      );

      const result = await response.json();
      if (!response.ok) { toast.error(result.error || "Upload failed"); return; }

      toast.success(`Imported ${result.days_imported} days of health data`);
      queryClient.invalidateQueries({ queryKey: ["health-sync-last"] });
      queryClient.invalidateQueries({ queryKey: ["brain-body"] });
      onOpenChange(false);
    } catch (err) {
      console.error("Upload error:", err);
      toast.error("Failed to upload health data");
    } finally {
      setUploading(false);
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const source = activeTab === "apple" ? "apple_health" : "google_fit";
    handleUpload(file, source as "apple_health" | "google_fit");
    e.target.value = "";
  };

  const lastSyncDate = lastSync?.synced_at
    ? new Date(lastSync.synced_at).toLocaleDateString()
    : null;

  const renderWearableTab = (provider: "fitbit" | "oura", connection: any) => {
    const label = provider === "fitbit" ? "Fitbit" : "Oura Ring";
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
            <Smartphone className="h-5 w-5 text-wellness" />
            Connect Health Data
          </DialogTitle>
        </DialogHeader>

        {lastSyncDate && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
            <CheckCircle className="h-3.5 w-3.5 text-perspective" />
            Last synced: {lastSyncDate}
            {lastSync?.source && (
              <Badge variant="secondary" className="text-[10px] ml-auto">
                {lastSync.source === "apple_health" ? "Apple" : lastSync.source === "google_fit" ? "Google" : lastSync.source === "fitbit" ? "Fitbit" : "Oura"}
              </Badge>
            )}
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="apple" className="gap-1 text-[10px] px-1.5">
              <Apple className="h-3 w-3" />
              Apple
            </TabsTrigger>
            <TabsTrigger value="google" className="gap-1 text-[10px] px-1.5">
              <Smartphone className="h-3 w-3" />
              Google
            </TabsTrigger>
            <TabsTrigger value="fitbit" className="gap-1 text-[10px] px-1.5">
              <Watch className="h-3 w-3" />
              Fitbit
            </TabsTrigger>
            <TabsTrigger value="oura" className="gap-1 text-[10px] px-1.5">
              <Watch className="h-3 w-3" />
              Oura
            </TabsTrigger>
          </TabsList>

          <TabsContent value="apple" className="space-y-3 mt-3">
            <div className="space-y-2 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">How to export:</p>
              <ol className="list-decimal list-inside space-y-1.5 text-xs">
                <li>Open the <strong>Health</strong> app on your iPhone</li>
                <li>Tap your <strong>profile picture</strong> (top right)</li>
                <li>Scroll down and tap <strong>Export All Health Data</strong></li>
                <li>Save the ZIP and unzip it</li>
                <li>Upload the <strong>export.xml</strong> file below</li>
              </ol>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground bg-muted/30 rounded px-2 py-1.5">
              <AlertCircle className="h-3 w-3 shrink-0" />
              Your data stays private — we only extract steps, sleep, and activity.
            </div>
          </TabsContent>

          <TabsContent value="google" className="space-y-3 mt-3">
            <div className="space-y-2 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">How to export:</p>
              <ol className="list-decimal list-inside space-y-1.5 text-xs">
                <li>Go to <strong>takeout.google.com</strong></li>
                <li>Deselect all, then select <strong>Fit</strong></li>
                <li>Click <strong>Next step</strong> → <strong>Create export</strong></li>
                <li>Download and extract the ZIP</li>
                <li>Upload the <strong>Daily activity metrics</strong> CSV below</li>
              </ol>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground bg-muted/30 rounded px-2 py-1.5">
              <AlertCircle className="h-3 w-3 shrink-0" />
              Your data stays private — we only extract steps, sleep, and activity.
            </div>
          </TabsContent>

          <TabsContent value="fitbit">
            {renderWearableTab("fitbit", fitbitConnection)}
          </TabsContent>

          <TabsContent value="oura">
            {renderWearableTab("oura", ouraConnection)}
          </TabsContent>
        </Tabs>

        {(activeTab === "apple" || activeTab === "google") && (
          <>
            <input
              ref={fileRef}
              type="file"
              accept={activeTab === "apple" ? ".xml" : ".csv"}
              className="hidden"
              onChange={onFileChange}
            />
            <Button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="w-full gap-2"
            >
              {uploading ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Parsing health data...</>
              ) : (
                <><Upload className="h-4 w-4" /> Upload {activeTab === "apple" ? "XML" : "CSV"} File</>
              )}
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
