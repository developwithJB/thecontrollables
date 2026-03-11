import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Calendar, CheckCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface OnboardingCalendarConnectProps {
  onConnected: () => void;
  onSkip: () => void;
}

export function OnboardingCalendarConnect({ onConnected, onSkip }: OnboardingCalendarConnectProps) {
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);

  // Listen for OAuth popup callback
  const handleMessage = useCallback((event: MessageEvent) => {
    if (event.data?.type === "oauth-callback" && event.data?.provider === "google_calendar") {
      if (event.data?.success) {
        setConnected(true);
        setConnecting(false);
      } else {
        toast.error("Calendar connection failed. You can try again later.");
        setConnecting(false);
      }
    }
  }, []);

  useEffect(() => {
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [handleMessage]);

  // Auto-advance after connection
  useEffect(() => {
    if (connected) {
      const timer = setTimeout(onConnected, 1500);
      return () => clearTimeout(timer);
    }
  }, [connected, onConnected]);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const { data, error } = await supabase.functions.invoke("integration-oauth-start", {
        body: { provider: "google_calendar", redirect_uri: window.location.origin },
      });

      if (error || !data?.url) {
        toast.error("Failed to start calendar connection");
        setConnecting(false);
        return;
      }

      // Open popup
      const w = 500, h = 600;
      const left = window.screenX + (window.innerWidth - w) / 2;
      const top = window.screenY + (window.innerHeight - h) / 2;
      window.open(data.url, "gcal-connect", `width=${w},height=${h},left=${left},top=${top}`);
    } catch {
      toast.error("Failed to connect");
      setConnecting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="min-h-screen flex items-center justify-center px-6"
    >
      <div className="max-w-md w-full text-center space-y-8">
        {connected ? (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="space-y-3"
          >
            <CheckCircle className="h-12 w-12 text-primary mx-auto" />
            <p className="text-sm font-medium text-foreground">Calendar connected. We can see your week.</p>
          </motion.div>
        ) : (
          <>
            <div className="space-y-4">
              <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-primary/10 mx-auto">
                <Calendar className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-xl font-bold text-foreground">Google Calendar</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                We read your events to build your Plan. We write Snapshot actions and meal blocks back to your calendar.
              </p>
            </div>

            <Button
              onClick={handleConnect}
              disabled={connecting}
              size="lg"
              className="w-full gap-2"
            >
              {connecting ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Connecting...</>
              ) : (
                <>Connect Google Calendar</>
              )}
            </Button>

            <button
              onClick={onSkip}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Skip for now
            </button>
          </>
        )}
      </div>
    </motion.div>
  );
}
