import { useEffect } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Plug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ProviderCard } from "@/components/integrations/ProviderCard";
import {
  type Provider,
  type IntegrationConnection,
  PROVIDER_META,
  useIntegrationConnections,
  useSyncLogs,
} from "@/hooks/useIntegrations";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { getAuthRedirectPath } from "@/lib/safeNavigation";

const ALL_PROVIDERS: Provider[] = ["google_calendar", "gmail"];

export default function Integrations() {
  const navigate = useNavigate();
  const location = useLocation();
  const authPath = getAuthRedirectPath(location);
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const { data: connections, isLoading } = useIntegrationConnections();
  const [userId, setUserId] = useState<string | null>(null);

  // Auth check
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) navigate(authPath, { replace: true });
      else setUserId(user.id);
    });
  }, [authPath, navigate]);

  // Handle OAuth callback params
  useEffect(() => {
    const success = searchParams.get("integration_success");
    const error = searchParams.get("integration_error");
    if (success) {
      const meta = PROVIDER_META[success as Provider];
      toast({ title: `${meta?.name || success} connected!`, description: "You can now sync your data." });
      searchParams.delete("integration_success");
      setSearchParams(searchParams, { replace: true });
    }
    if (error) {
      toast({ title: "Connection failed", description: error.replace(/_/g, " "), variant: "destructive" });
      searchParams.delete("integration_error");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams, toast]);

  // Get all sync logs grouped by connection
  const connectionMap = new Map(
    (connections || []).map((c) => [c.provider, c])
  );

  // Fetch logs for all connections
  const allConnectionIds = (connections || []).map((c) => c.id);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl md:max-w-5xl lg:max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Plug className="w-5 h-5 text-primary" />
            <h1 className="text-xl font-display font-semibold">Integrations</h1>
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          Connect the tools you already use to enhance your Planner, Daily OS, and growth tracking.
        </p>

        {/* Provider grid */}
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-48 rounded-lg bg-muted/50 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {ALL_PROVIDERS.map((provider) => (
              <ProviderCardWithLogs
                key={provider}
                provider={provider}
                connection={connectionMap.get(provider)}
              />
            ))}
          </div>
        )}

        {/* Info */}
        <div className="text-xs text-muted-foreground space-y-1 pt-4 border-t border-border">
          <p>• OAuth tokens are stored securely server-side. We never store passwords.</p>
          <p>• Gmail provides a summary only — we don't read or store message content.</p>
          <p>• Syncs are idempotent and can be triggered manually anytime.</p>
        </div>
      </div>
    </div>
  );
}

function ProviderCardWithLogs({
  provider,
  connection,
}: {
  provider: Provider;
  connection?: IntegrationConnection;
}) {
  const { data: logs } = useSyncLogs(connection?.id);
  return (
    <ProviderCard
      provider={provider}
      connection={connection}
      logs={logs || []}
    />
  );
}
