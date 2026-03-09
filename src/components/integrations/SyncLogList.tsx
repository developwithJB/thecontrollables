import { format } from "date-fns";
import { CheckCircle2, XCircle, Loader2, AlertTriangle } from "lucide-react";
import type { SyncLog } from "@/hooks/useIntegrations";

const STATUS_CONFIG: Record<string, { icon: typeof CheckCircle2; className: string }> = {
  success: { icon: CheckCircle2, className: "text-primary" },
  failed: { icon: XCircle, className: "text-destructive" },
  started: { icon: Loader2, className: "text-muted-foreground animate-spin" },
  partial: { icon: AlertTriangle, className: "text-yellow-500" },
};

export function SyncLogList({ logs }: { logs: SyncLog[] }) {
  if (!logs.length) {
    return <p className="text-xs text-muted-foreground py-2">No sync history yet.</p>;
  }

  return (
    <div className="space-y-2 max-h-40 overflow-y-auto">
      {logs.map((log) => {
        const config = STATUS_CONFIG[log.status] || STATUS_CONFIG.started;
        const Icon = config.icon;
        return (
          <div key={log.id} className="flex items-start gap-2 text-xs">
            <Icon className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${config.className}`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-medium capitalize">{log.sync_type}</span>
                <span className="text-muted-foreground">
                  {format(new Date(log.started_at), "MMM d, h:mm a")}
                </span>
              </div>
              {log.status === "success" && (
                <span className="text-muted-foreground">
                  {log.items_created} new · {log.items_updated} updated · {log.items_skipped} skipped
                </span>
              )}
              {log.error_message && (
                <span className="text-destructive truncate block">{log.error_message}</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
