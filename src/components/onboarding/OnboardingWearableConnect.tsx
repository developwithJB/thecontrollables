import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Activity, Watch, CheckCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type WearableProvider = "whoop" | "oura" | "fitbit";

interface OnboardingWearableConnectProps {
  onConnected: (provider?: string) => void;
  onSkip: () => void;
}

const PROVIDERS: { key: WearableProvider; label: string; icon: typeof Activity }[] = [
  { key: "whoop", label: "WHOOP", icon: Activity },
  { key: "oura", label: "Oura", icon: Watch },
  { key: "fitbit", label: "Fitbit", icon: Watch },
];

export function OnboardingWearableConnect({ onConnected, onSkip }: OnboardingWearableConnectProps) {
  const [activeTab, setActiveTab] = useState<WearableProvider>("whoop");
  const [connecting, setConnecting] = useState<WearableProvider | null>(null);
  const [connected, setConnected] = useState(false);

  const handleMessage = useCallback((event: MessageEvent) => {
    if (event.data?.type === "oauth-callback" && ["whoop", "oura", "fitbit"].includes(event.data?.provider)) {
      if (event.data?.success) {
        setConnected(true);
        setConnecting(null);
      } else {
        toast.error("Wearable connection failed. You can try again later.");
        setConnecting(null);
      }
    }
  }, []);

  useEffect(() => {
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [handleMessage]);

  useEffect(() => {
    if (connected) {
      const timer = setTimeout(onConnected, 1500);
      return () => clearTimeout(timer);
    }
  }, [connected, onConnected]);

  const handleConnect = async (provider: WearableProvider) => {
    setConnecting(provider);
    try {
      const { data, error } = await supabase.functions.invoke("wearable-oauth-start", {
        body: { provider, redirect_uri: window.location.origin },
      });

      if (error || !data?.url) {
        toast.error("Failed to start wearable connection");
        setConnecting(null);
        return;
      }

      const w = 500, h = 600;
      const left = window.screenX + (window.innerWidth - w) / 2;
      const top = window.screenY + (window.innerHeight - h) / 2;
      window.open(data.url, "wearable-connect", `width=${w},height=${h},left=${left},top=${top}`);
    } catch {
      toast.error("Failed to connect");
      setConnecting(null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="min-h-screen flex items-center justify-center px-6"
    >
      <div className="max-w-md w-full text-center space-y-6">
        {connected ? (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="space-y-3"
          >
            <CheckCircle className="h-12 w-12 text-primary mx-auto" />
            <p className="text-sm font-medium text-foreground">Wearable connected. We'll pull your data each morning.</p>
          </motion.div>
        ) : (
          <>
            <div className="space-y-4">
              <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-primary/10 mx-auto">
                <Activity className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-xl font-bold text-foreground">Connect Your Wearable</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                We read your daily recovery, HRV, sleep, and strain to show you why your days feel the way they do.
              </p>
            </div>

            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as WearableProvider)}>
              <TabsList className="grid w-full grid-cols-3">
                {PROVIDERS.map((p) => (
                  <TabsTrigger key={p.key} value={p.key} className="gap-1 text-xs">
                    <p.icon className="h-3 w-3" />
                    {p.label}
                  </TabsTrigger>
                ))}
              </TabsList>

              {PROVIDERS.map((p) => (
                <TabsContent key={p.key} value={p.key} className="mt-4">
                  <Button
                    onClick={() => handleConnect(p.key)}
                    disabled={connecting !== null}
                    size="lg"
                    className="w-full gap-2"
                  >
                    {connecting === p.key ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Connecting...</>
                    ) : (
                      <>Connect {p.label}</>
                    )}
                  </Button>
                </TabsContent>
              ))}
            </Tabs>

            <button
              onClick={onSkip}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              I don't use a wearable — skip this
            </button>
          </>
        )}
      </div>
    </motion.div>
  );
}
