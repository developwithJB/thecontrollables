import { Calendar, RefreshCw, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PlannerConnection } from "@/hooks/usePlanner";
import { formatDistanceToNow } from "date-fns";

interface PlannerCalendarConnectProps {
  connections: PlannerConnection[];
  onConnect: () => void;
  onSync: (connectionId: string) => void;
  isConnecting?: boolean;
  isSyncing?: boolean;
}

export const PlannerCalendarConnect = ({
  connections,
  onConnect,
  onSync,
  isConnecting,
  isSyncing,
}: PlannerCalendarConnectProps) => {
  const googleConnection = connections.find((c) => c.provider === "google_calendar");

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          Calendar Sync
        </CardTitle>
      </CardHeader>
      <CardContent>
        {googleConnection ? (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Google Calendar</p>
              <p className="text-xs text-muted-foreground">
                {googleConnection.last_synced_at
                  ? `Synced ${formatDistanceToNow(new Date(googleConnection.last_synced_at), { addSuffix: true })}`
                  : "Never synced"}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onSync(googleConnection.id)}
              disabled={isSyncing}
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isSyncing ? "animate-spin" : ""}`} />
              Sync
            </Button>
          </div>
        ) : (
          <div className="text-center py-2">
            <p className="text-xs text-muted-foreground mb-2">
              Import events from Google Calendar
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={onConnect}
              disabled={isConnecting}
            >
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
              Connect Google Calendar
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
