import { useMemo } from "react";
import { useHealthData } from "@/hooks/useHealthData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AreaChart, Area, ResponsiveContainer, Tooltip, YAxis } from "recharts";
import { TrendingUp, Lock } from "lucide-react";
import { format, parseISO } from "date-fns";

interface WearableTrendsCardProps {
  userId: string | undefined;
  isPaid?: boolean;
  onUpgrade?: () => void;
}

const PROVIDER_LABELS: Record<string, string> = {
  whoop: "WHOOP",
  fitbit: "Fitbit",
  oura: "Oura Ring",
};

const WEARABLE_FREE_WINDOW_DAYS = 7;

function MiniSparkline({
  data,
  dataKey,
  color,
  label,
  unit,
}: {
  data: any[];
  dataKey: string;
  color: string;
  label: string;
  unit: string;
}) {
  const filtered = data.filter((d) => d[dataKey] != null);
  if (!filtered.length) return null;

  return (
    <div className="space-y-1">
      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
      <div className="h-12">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={filtered} margin={{ top: 2, right: 2, bottom: 0, left: 2 }}>
            <defs>
              <linearGradient id={`grad-${label}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <YAxis hide domain={["dataMin - 5", "dataMax + 5"]} />
            <Tooltip
              contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11 }}
              labelFormatter={(_, payload) => {
                const d = payload?.[0]?.payload?.date;
                return d ? format(parseISO(d), "MMM d") : "";
              }}
              formatter={(value: number) => [`${Math.round(value)}${unit}`, label]}
            />
            <Area type="monotone" dataKey={dataKey} stroke={color} fill={`url(#grad-${label})`} strokeWidth={1.5} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function WearableTrendsCard({ userId, isPaid, onUpgrade }: WearableTrendsCardProps) {
  const { isConnected, provider, trend, connectedAt } = useHealthData(userId);

  const isGated = useMemo(() => {
    if (isPaid) return false;
    if (!connectedAt) return false;
    const daysSince = (Date.now() - new Date(connectedAt).getTime()) / (1000 * 60 * 60 * 24);
    return daysSince > WEARABLE_FREE_WINDOW_DAYS;
  }, [isPaid, connectedAt]);

  if (!isConnected || !trend.length) return null;

  const providerLabel = provider ? (PROVIDER_LABELS[provider] || provider) : "Wearable";
  const ascending = [...trend].reverse();

  const hasRecovery = trend.some((t) => t.recovery != null);
  const hasSleep = trend.some((t) => t.sleepMinutes != null);
  const hasStrain = trend.some((t) => t.strain != null);

  if (!hasRecovery && !hasSleep && !hasStrain) return null;

  if (isGated) {
    return (
      <Card className="relative overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            7-Day {providerLabel} Trends
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-4">
          <div className="h-24 blur-sm pointer-events-none select-none bg-muted/30 rounded-lg" aria-hidden />
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-[2px] rounded-lg">
            <Lock className="h-5 w-5 text-muted-foreground mb-2" />
            <p className="text-sm font-medium text-foreground mb-1">Trends locked</p>
            <p className="text-xs text-muted-foreground mb-3 text-center px-6">
              Upgrade to keep viewing your wearable trends.
            </p>
            {onUpgrade && (
              <Button size="sm" onClick={onUpgrade}>
                Upgrade to Unlock
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
          7-Day {providerLabel} Trends
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        {hasRecovery && (
          <MiniSparkline data={ascending} dataKey="recovery" color="hsl(142, 71%, 45%)" label="Recovery" unit="%" />
        )}
        {hasSleep && (
          <MiniSparkline data={ascending} dataKey="sleepMinutes" color="hsl(217, 91%, 60%)" label="Sleep" unit=" min" />
        )}
        {hasStrain && (
          <MiniSparkline data={ascending} dataKey="strain" color="hsl(25, 95%, 53%)" label="Strain" unit="" />
        )}
      </CardContent>
    </Card>
  );
}
