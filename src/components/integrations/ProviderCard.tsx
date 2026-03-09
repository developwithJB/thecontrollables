import { useState } from "react";
import { format } from "date-fns";
import { RefreshCw, Unlink, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SyncLogList } from "./SyncLogList";
import {
  type Provider,
  type IntegrationConnection,
  type SyncLog,
  PROVIDER_META,
  useConnectProvider,
  useDisconnectProvider,
  useSyncProvider,
} from "@/hooks/useIntegrations";

const STATUS_BADGE: Record<string, { label: string; variant: "default" | "destructive" | "secondary" | "outline" }> = {
  active: { label: "Connected", variant: "default" },
  error: { label: "Error", variant: "destructive" },
  expired: { label: "Expired", variant: "secondary" },
  disconnected: { label: "Disconnected", variant: "outline" },
};

interface ProviderCardProps {
  provider: Provider;
  connection?: IntegrationConnection;
  logs: SyncLog[];
}

export function ProviderCard({ provider, connection, logs }: ProviderCardProps) {
  const [showLogs, setShowLogs] = useState(false);
  const meta = PROVIDER_META[provider];
  const connect = useConnectProvider();
  const disconnect = useDisconnectProvider();
  const sync = useSyncProvider();
  const isConnected = connection && connection.status !== "disconnected";
  const badge = connection ? STATUS_BADGE[connection.status] || STATUS_BADGE.active : null;

  return (
    <Card className="relative overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl" role="img" aria-label={meta.name}>{meta.icon}</span>
            <div>
              <CardTitle className="text-base">{meta.name}</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">{meta.description}</p>
            </div>
          </div>
          {badge && (
            <Badge variant={badge.variant} className="text-[10px]">
              {badge.label}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Account info */}
        {connection?.provider_account_id && (
          <p className="text-xs text-muted-foreground truncate">
            {connection.provider_account_id}
          </p>
        )}

        {/* Last synced */}
        {connection?.last_synced_at && (
          <p className="text-xs text-muted-foreground">
            Last synced {format(new Date(connection.last_synced_at), "MMM d, h:mm a")}
          </p>
        )}

        {/* Error message */}
        {connection?.error_message && (
          <div className="text-xs text-destructive bg-destructive/10 rounded px-2 py-1.5">
            {connection.error_message}
          </div>
        )}

        {/* Scopes */}
        {isConnected && connection.scopes && connection.scopes.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {connection.scopes.map((scope) => {
              const shortScope = scope.split("/").pop() || scope;
              return (
                <span key={scope} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                  {shortScope}
                </span>
              );
            })}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1">
          {isConnected ? (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => sync.mutate(connection.id)}
                disabled={sync.isPending}
                className="flex-1"
              >
                <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${sync.isPending ? "animate-spin" : ""}`} />
                Sync Now
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => disconnect.mutate(connection.id)}
                disabled={disconnect.isPending}
                className="text-muted-foreground hover:text-destructive"
              >
                <Unlink className="w-3.5 h-3.5" />
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              onClick={() => connect.mutate(provider)}
              disabled={connect.isPending}
              className="w-full"
            >
              <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
              Connect
            </Button>
          )}
        </div>

        {/* Sync logs toggle */}
        {isConnected && logs.length > 0 && (
          <div>
            <button
              onClick={() => setShowLogs(!showLogs)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {showLogs ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              Sync History ({logs.length})
            </button>
            {showLogs && <div className="mt-2"><SyncLogList logs={logs} /></div>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
