import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, Unlink, Activity, Moon, Zap, Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useHealthData } from "@/hooks/useHealthData";
import { motion } from "framer-motion";

interface WearableSummaryCardProps {
  userId: string;
}

const PROVIDER_LABELS: Record<string, string> = {
  whoop: "WHOOP",
  fitbit: "Fitbit",
  oura: "Oura Ring",
  apple_health: "Apple Health",
  garmin: "Garmin",
};

function getRecoveryColor(score: number | null | undefined) {
  if (!score) return "text-muted-foreground";
  if (score >= 67) return "text-green-500";
  if (score >= 34) return "text-yellow-500";
  return "text-red-500";
}

function getRecoveryBg(score: number | null | undefined) {
  if (!score) return "bg-muted/50";
  if (score >= 67) return "bg-green-500/10";
  if (score >= 34) return "bg-yellow-500/10";
  return "bg-red-500/10";
}

function formatMinutes(mins: number | null | undefined): string {
  if (!mins) return "--";
  const hours = Math.floor(mins / 60);
  const m = mins % 60;
  return `${hours}h ${m}m`;
}

export function WearableSummaryCard({ userId }: WearableSummaryCardProps) {
  const { isConnected, provider, latest, lastSynced } = useHealthData(userId);
  const [syncing, setSyncing] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const queryClient = useQueryClient();

  const providerLabel = provider ? (PROVIDER_LABELS[provider] || provider) : "Wearable";

  const handleConnect = useCallback(async () => {
    setConnecting(true);
    try {
      const { data, error } = await supabase.functions.invoke("wearable-oauth-start", {
        body: { provider: "whoop", redirect_uri: window.location.origin },
      });
      if (error || !data?.url) {
        toast.error(data?.error || "Failed to start wearable connection");
        return;
      }
      window.location.href = data.url;
    } catch {
      toast.error("Failed to connect wearable");
    } finally {
      setConnecting(false);
    }
  }, []);

  const handleSync = useCallback(async () => {
    if (!provider) return;
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("wearable-sync", {
        body: { provider },
      });
      if (error || data?.error) {
        toast.error(data?.error || "Sync failed");
        return;
      }
      toast.success(`Synced ${data.days_synced} days from ${providerLabel}`);
      queryClient.invalidateQueries({ queryKey: ["health-data-trend"] });
      queryClient.invalidateQueries({ queryKey: ["wearable-connection-any"] });
      queryClient.invalidateQueries({ queryKey: ["brain-body"] });
    } catch {
      toast.error("Sync failed");
    } finally {
      setSyncing(false);
    }
  }, [provider, providerLabel, queryClient]);

  const handleDisconnect = useCallback(async () => {
    if (!provider) return;
    const { error } = await supabase
      .from("wearable_connections")
      .delete()
      .eq("user_id", userId)
      .eq("provider", provider);
    if (error) {
      toast.error("Failed to disconnect");
      return;
    }
    toast.success(`${providerLabel} disconnected`);
    queryClient.invalidateQueries({ queryKey: ["wearable-connection-any"] });
    queryClient.invalidateQueries({ queryKey: ["wearable-connections"] });
  }, [userId, provider, providerLabel, queryClient]);

  if (!isConnected) {
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="border-dashed border-muted-foreground/20">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Activity className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm text-foreground">Connect Wearable</p>
                  <p className="text-xs text-muted-foreground">WHOOP, Fitbit, Oura & more</p>
                </div>
              </div>
              <Button size="sm" onClick={handleConnect} disabled={connecting} className="gap-1.5">
                {connecting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Activity className="h-3.5 w-3.5" />}
                Connect
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  const recoveryScore = latest.recovery;
  const sleepMins = latest.sleepMinutes;
  const strain = latest.strain;

  const lastSyncedLabel = lastSynced
    ? new Date(lastSynced).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
    : "Never";

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              {providerLabel}
            </CardTitle>
            <div className="flex items-center gap-1.5">
              <Badge variant="secondary" className="text-[10px]">Synced {lastSyncedLabel}</Badge>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleSync} disabled={syncing} title="Sync now">
                {syncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={handleDisconnect} title={`Disconnect ${providerLabel}`}>
                <Unlink className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pb-4">
          <div className="grid grid-cols-3 gap-3">
            {/* Recovery */}
            <div className={`rounded-lg p-3 text-center ${getRecoveryBg(recoveryScore)}`}>
              <Heart className={`h-4 w-4 mx-auto mb-1 ${getRecoveryColor(recoveryScore)}`} />
              <p className={`text-xl font-bold ${getRecoveryColor(recoveryScore)}`}>
                {recoveryScore != null ? `${Math.round(recoveryScore)}%` : "--"}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Recovery</p>
              {latest.hrv != null && (
                <p className="text-[10px] text-muted-foreground">HRV {Math.round(latest.hrv)}ms</p>
              )}
            </div>

            {/* Sleep */}
            <div className="rounded-lg p-3 text-center bg-blue-500/10">
              <Moon className="h-4 w-4 mx-auto mb-1 text-blue-400" />
              <p className="text-xl font-bold text-blue-400">
                {sleepMins != null ? formatMinutes(sleepMins) : "--"}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Sleep</p>
            </div>

            {/* Strain */}
            <div className="rounded-lg p-3 text-center bg-orange-500/10">
              <Zap className="h-4 w-4 mx-auto mb-1 text-orange-400" />
              <p className="text-xl font-bold text-orange-400">
                {strain != null ? strain.toFixed(1) : "--"}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Strain</p>
            </div>
          </div>

          {/* Additional vitals row */}
          {(latest.restingHR != null || latest.steps != null) && (
            <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border/50">
              {latest.restingHR != null && (
                <div className="text-center flex-1">
                  <p className="text-xs font-medium text-foreground">{Math.round(latest.restingHR)} bpm</p>
                  <p className="text-[10px] text-muted-foreground">Resting HR</p>
                </div>
              )}
              {latest.steps != null && (
                <div className="text-center flex-1">
                  <p className="text-xs font-medium text-foreground">{latest.steps.toLocaleString()}</p>
                  <p className="text-[10px] text-muted-foreground">Steps</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
