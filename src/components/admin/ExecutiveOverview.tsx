import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { AreaChart, Area, ResponsiveContainer } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { ExecutiveMetrics, MetricCard } from "./types";
import { formatMetricValue, getHealthColor } from "./helpers";

type Period = "7d" | "30d" | "90d";

function MetricSparkline({ data }: { data?: number[] }) {
  if (!data || data.length < 2) return null;
  const chartData = data.map((v, i) => ({ i, v }));
  return (
    <ResponsiveContainer width="100%" height={32}>
      <AreaChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="v"
          stroke="hsl(var(--primary))"
          strokeWidth={1.5}
          fill="url(#sparkGrad)"
          dot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function MetricTile({ metric }: { metric: MetricCard }) {
  const isPositive = (metric.changePercent ?? 0) >= 0;
  const isNeutral = metric.changePercent === undefined || metric.changePercent === 0;

  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-1">
          <p className="text-xs font-medium text-muted-foreground truncate pr-2">
            {metric.label}
          </p>
          <div className="flex items-center gap-1.5">
            {metric.healthStatus && (
              <span className={`w-2 h-2 rounded-full ${getHealthColor(metric.healthStatus)}`} />
            )}
          </div>
        </div>
        <div className="text-2xl font-bold tracking-tight">
          {formatMetricValue(metric.value, metric.format)}
        </div>
        <div className="flex items-center gap-1.5 mt-1">
          {!isNeutral && (
            <Badge
              variant="outline"
              className={`text-xs px-1.5 py-0 ${
                isPositive
                  ? "text-emerald-600 border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-800"
                  : "text-red-600 border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-800"
              }`}
            >
              {isPositive ? (
                <TrendingUp className="h-3 w-3 mr-0.5" />
              ) : (
                <TrendingDown className="h-3 w-3 mr-0.5" />
              )}
              {Math.abs(metric.changePercent!).toFixed(1)}%
            </Badge>
          )}
          {isNeutral && (
            <span className="text-xs text-muted-foreground flex items-center gap-0.5">
              <Minus className="h-3 w-3" /> No change
            </span>
          )}
        </div>
        <div className="mt-2">
          <MetricSparkline data={metric.trend} />
        </div>
      </CardContent>
    </Card>
  );
}

export default function ExecutiveOverview() {
  const [period, setPeriod] = useState<Period>("30d");
  const [metrics, setMetrics] = useState<ExecutiveMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const loadMetrics = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-analytics?period=${period}`,
        {
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to load analytics");
      }

      const data = await response.json();
      setMetrics(data.metrics);
    } catch (error: any) {
      console.error("Error loading executive metrics:", error);
      toast({
        title: "Analytics Error",
        description: "Could not load executive metrics",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [period, toast]);

  useEffect(() => {
    loadMetrics();
  }, [loadMetrics]);

  const metricGroups = metrics
    ? [
        { title: "Growth", items: [metrics.totalUsers, metrics.newUsers7d, metrics.dau, metrics.wau] },
        { title: "Engagement", items: [metrics.activationRate, metrics.snapshotCompletionRate, metrics.mau] },
        { title: "Revenue", items: [metrics.paidConversionRate, metrics.mrr, metrics.arpu, metrics.churnRate] },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* Period selector + refresh */}
      <div className="flex items-center justify-between">
        <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <TabsList className="h-8">
            <TabsTrigger value="7d" className="text-xs px-3">7 Days</TabsTrigger>
            <TabsTrigger value="30d" className="text-xs px-3">30 Days</TabsTrigger>
            <TabsTrigger value="90d" className="text-xs px-3">90 Days</TabsTrigger>
          </TabsList>
        </Tabs>
        <Button
          variant="outline"
          size="sm"
          onClick={loadMetrics}
          disabled={isLoading}
        >
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Loading state */}
      {isLoading && !metrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-3 w-20 bg-muted rounded mb-3" />
                <div className="h-7 w-16 bg-muted rounded mb-2" />
                <div className="h-4 w-24 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Metric groups */}
      {metricGroups.map((group) => (
        <div key={group.title}>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            {group.title}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {group.items.map((metric) => (
              <MetricTile key={metric.label} metric={metric} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
