import { useCallback, useEffect, useMemo, useState } from "react";
import type { ElementType } from "react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Bot, CheckCircle2, CircleDollarSign, RefreshCw, ShieldCheck, Sparkles, Zap } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  formatAIUsageCurrency,
  formatAIUsagePercent,
  getAIDepthAdminLabel,
  getAIModeAdminLabel,
} from "@/lib/adminAIUsage";

type CostGroup = {
  key: string;
  requests: number;
  estimated_cost_usd: number;
};

type ExpensiveRequest = {
  id: string;
  created_at: string;
  surface: string | null;
  mode: string | null;
  ai_depth: string | null;
  model_tier: string | null;
  provider: string | null;
  model: string | null;
  cache_hit: boolean;
  input_tokens: number;
  output_tokens: number;
  estimated_cost_usd: number;
  prompt_hash_prefix: string | null;
};

type AIUsageMetrics = {
  totalCostToday: number;
  totalCost7d: number;
  cacheHitRate: number;
  averageCostPerRequest: number;
  requestCount7d: number;
  dailyBriefGenerations: number;
  adjustments: number;
  approvedProposals: number;
  costPerApprovedProposal: number;
};

type AIUsageResponse = {
  generatedAt: string;
  window: {
    from: string;
    to: string;
  };
  metrics: AIUsageMetrics;
  costByModel: CostGroup[];
  costByDepth: CostGroup[];
  topRequests: ExpensiveRequest[];
};

type MetricTileProps = {
  label: string;
  value: string;
  detail: string;
  icon: ElementType;
};

function MetricTile({ label, value, detail, icon: Icon }: MetricTileProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground">{label}</p>
            <div className="mt-1 text-2xl font-semibold tracking-tight">{value}</div>
            <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
          </div>
          <div className="rounded-md border bg-muted/30 p-2 text-muted-foreground">
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CostBarChart({ data, kind }: { data: CostGroup[]; kind: "model" | "depth" }) {
  const chartData = useMemo(
    () =>
      data.slice(0, 8).map((item) => ({
        name: kind === "depth" ? getAIDepthAdminLabel(item.key) : item.key,
        cost: Number(item.estimated_cost_usd.toFixed(6)),
        requests: item.requests,
      })),
    [data, kind]
  );

  if (chartData.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
        No AI usage logged in the last 7 days.
      </div>
    );
  }

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
          <XAxis
            dataKey="name"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11 }}
            interval={0}
            height={48}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11 }}
            tickFormatter={(value) => formatAIUsageCurrency(Number(value), 3)}
            width={58}
          />
          <Tooltip
            cursor={{ fill: "hsl(var(--muted))", opacity: 0.35 }}
            formatter={(value, name, item) => [
              `${formatAIUsageCurrency(Number(value), 5)} (${item.payload.requests} requests)`,
              name === "cost" ? "Cost" : name,
            ]}
            labelStyle={{ color: "hsl(var(--foreground))" }}
            contentStyle={{
              borderRadius: 8,
              borderColor: "hsl(var(--border))",
              background: "hsl(var(--popover))",
            }}
          />
          <Bar dataKey="cost" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function AIUsageDashboard() {
  const [data, setData] = useState<AIUsageResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const loadUsage = useCallback(async () => {
    setIsLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-analytics?resource=ai_usage`,
        {
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to load AI usage");
      }

      setData(await response.json());
    } catch (error) {
      console.error("Error loading AI usage dashboard:", error);
      toast({
        title: "AI usage unavailable",
        description: "Could not load AI usage metrics.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadUsage();
  }, [loadUsage]);

  const metrics = data?.metrics;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">AI Usage</h2>
          <p className="text-sm text-muted-foreground">
            Aggregated cost, model, cache, and action-value signals for the last 7 days.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadUsage} disabled={isLoading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="rounded-md border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
        <div className="flex items-start gap-2">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <p>
            Prompt content is not shown here. Expensive requests use redacted operational metadata and short prompt-hash
            prefixes only.
          </p>
        </div>
      </div>

      {isLoading && !data ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <Card key={index} className="animate-pulse">
              <CardContent className="p-4">
                <div className="mb-3 h-3 w-24 rounded bg-muted" />
                <div className="mb-2 h-8 w-20 rounded bg-muted" />
                <div className="h-3 w-32 rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : metrics ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricTile
              label="Estimated cost today"
              value={formatAIUsageCurrency(metrics.totalCostToday)}
              detail="UTC day, all AI surfaces"
              icon={CircleDollarSign}
            />
            <MetricTile
              label="Estimated cost, 7 days"
              value={formatAIUsageCurrency(metrics.totalCost7d)}
              detail={`${metrics.requestCount7d} logged requests`}
              icon={CircleDollarSign}
            />
            <MetricTile
              label="Cache hit rate"
              value={formatAIUsagePercent(metrics.cacheHitRate)}
              detail="Higher means fewer paid generations"
              icon={Zap}
            />
            <MetricTile
              label="Average cost/request"
              value={formatAIUsageCurrency(metrics.averageCostPerRequest)}
              detail="Includes cached requests"
              icon={Bot}
            />
            <MetricTile
              label="Brief generations"
              value={String(metrics.dailyBriefGenerations)}
              detail="Non-cached Daily Operator Briefs"
              icon={Sparkles}
            />
            <MetricTile
              label="Adjustments"
              value={String(metrics.adjustments)}
              detail="Ask/Adjust requests"
              icon={Bot}
            />
            <MetricTile
              label="Approved proposals"
              value={String(metrics.approvedProposals)}
              detail="Approved or executed actions"
              icon={CheckCircle2}
            />
            <MetricTile
              label="Cost/approved proposal"
              value={formatAIUsageCurrency(metrics.costPerApprovedProposal)}
              detail="7-day AI cost divided by approvals"
              icon={CircleDollarSign}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Cost by Model</CardTitle>
              </CardHeader>
              <CardContent>
                <CostBarChart data={data.costByModel} kind="model" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Cost by Depth</CardTitle>
              </CardHeader>
              <CardContent>
                <CostBarChart data={data.costByDepth} kind="depth" />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle className="text-base">Top 10 Most Expensive Requests</CardTitle>
                <Badge variant="outline">Safe metadata only</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {data.topRequests.length === 0 ? (
                <div className="flex h-28 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
                  No expensive AI requests in this window.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>Mode</TableHead>
                      <TableHead>Depth</TableHead>
                      <TableHead>Model</TableHead>
                      <TableHead>Tokens</TableHead>
                      <TableHead>Cache</TableHead>
                      <TableHead>Prompt hash</TableHead>
                      <TableHead className="text-right">Cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.topRequests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                          {new Date(request.created_at).toLocaleString()}
                        </TableCell>
                        <TableCell>{getAIModeAdminLabel(request.mode || "unknown")}</TableCell>
                        <TableCell>{getAIDepthAdminLabel(request.ai_depth || "unknown")}</TableCell>
                        <TableCell>
                          <div className="max-w-[180px] truncate font-medium">{request.model || "Unknown"}</div>
                          <div className="text-xs text-muted-foreground">{request.provider || "No provider"}</div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-xs">
                          {request.input_tokens + request.output_tokens}
                        </TableCell>
                        <TableCell>
                          <Badge variant={request.cache_hit ? "secondary" : "outline"}>
                            {request.cache_hit ? "Hit" : "Miss"}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {request.prompt_hash_prefix || "none"}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatAIUsageCurrency(request.estimated_cost_usd, 5)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
          AI usage metrics are not available yet.
        </div>
      )}
    </div>
  );
}
