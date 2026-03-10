import { useWhoopData } from "@/hooks/useWhoopData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart, Area, ResponsiveContainer, Tooltip, YAxis } from "recharts";
import { TrendingUp } from "lucide-react";
import { format, parseISO } from "date-fns";

interface WhoopTrendsCardProps {
  userId: string | undefined;
}

function MiniSparkline({
  data,
  dataKey,
  color,
  label,
  unit,
  dateKey,
}: {
  data: any[];
  dataKey: string;
  color: string;
  label: string;
  unit: string;
  dateKey: string;
}) {
  if (!data.length) return null;

  return (
    <div className="space-y-1">
      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
      <div className="h-12">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 2, right: 2, bottom: 0, left: 2 }}>
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
                const d = payload?.[0]?.payload?.[dateKey];
                return d ? format(parseISO(d), "MMM d") : "";
              }}
              formatter={(value: number) => [`${value}${unit}`, label]}
            />
            <Area type="monotone" dataKey={dataKey} stroke={color} fill={`url(#grad-${label})`} strokeWidth={1.5} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function WhoopTrendsCard({ userId }: WhoopTrendsCardProps) {
  const { isConnected, recoveryTrend, strainTrend, sleepTrend } = useWhoopData(userId);

  if (!isConnected) return null;
  if (!recoveryTrend.length && !strainTrend.length && !sleepTrend.length) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
          7-Day WHOOP Trends
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        <MiniSparkline
          data={recoveryTrend}
          dataKey="recovery_score"
          dateKey="recorded_at"
          color="hsl(142, 71%, 45%)"
          label="Recovery"
          unit="%"
        />
        <MiniSparkline
          data={sleepTrend}
          dataKey="sleep_performance_pct"
          dateKey="end_time"
          color="hsl(217, 91%, 60%)"
          label="Sleep Performance"
          unit="%"
        />
        <MiniSparkline
          data={strainTrend}
          dataKey="strain"
          dateKey="start_time"
          color="hsl(25, 95%, 53%)"
          label="Strain"
          unit=""
        />
      </CardContent>
    </Card>
  );
}
