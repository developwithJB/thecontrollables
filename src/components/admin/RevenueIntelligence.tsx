import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, AreaChart, Area,
} from "recharts";
import { RefreshCw, DollarSign, TrendingUp, Users, Clock, Lightbulb } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ConversionData {
  user_id: string;
  email: string;
  signup_date: string;
  conversion_date: string;
  days_to_convert: number;
  source: string;
}

interface CohortRow {
  cohort: string;
  total: number;
  converted: number;
  rate: number;
}

export default function RevenueIntelligence() {
  const [conversionData, setConversionData] = useState<ConversionData[]>([]);
  const [cohorts, setCohorts] = useState<CohortRow[]>([]);
  const [freeUsers, setFreeUsers] = useState(0);
  const [paidUsers, setPaidUsers] = useState(0);
  const [avgDaysToConvert, setAvgDaysToConvert] = useState(0);
  const [mrr, setMrr] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers = {
        Authorization: `Bearer ${session?.access_token}`,
        "Content-Type": "application/json",
      };

      // Fetch from admin-analytics revenue resource
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-analytics?resource=revenue`,
        { headers }
      );

      if (!response.ok) throw new Error("Failed to load revenue data");

      const data = await response.json();
      setConversionData(data.conversions || []);
      setCohorts(data.cohorts || []);
      setFreeUsers(data.freeUsers || 0);
      setPaidUsers(data.paidUsers || 0);
      setAvgDaysToConvert(data.avgDaysToConvert || 0);
      setMrr(data.mrr || 0);
    } catch (error) {
      console.error("Error loading revenue intelligence:", error);
      toast({
        title: "Error",
        description: "Could not load revenue data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const conversionRate = freeUsers + paidUsers > 0
    ? ((paidUsers / (freeUsers + paidUsers)) * 100).toFixed(1)
    : "0.0";

  // Conversion timeline chart data
  const timelineData = conversionData.reduce<Record<string, number>>((acc, c) => {
    const month = c.conversion_date.slice(0, 7);
    acc[month] = (acc[month] || 0) + 1;
    return acc;
  }, {});

  const timelineChartData = Object.entries(timelineData)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, count]) => ({ month, conversions: count }));

  // Insights (rule-based)
  const insights: string[] = [];
  if (avgDaysToConvert > 0 && avgDaysToConvert <= 10) {
    insights.push(`Users who convert do so in an average of ${avgDaysToConvert.toFixed(0)} days — fast activation is working.`);
  } else if (avgDaysToConvert > 10) {
    insights.push(`Average time to convert is ${avgDaysToConvert.toFixed(0)} days. Consider adding a value recap or limited-time offer around day 7.`);
  }
  if (parseFloat(conversionRate) < 5) {
    insights.push(`Conversion rate is ${conversionRate}%. Trial-end messaging and feature gating may need adjustment.`);
  }
  if (cohorts.length > 1) {
    const latestCohort = cohorts[cohorts.length - 1];
    const prevCohort = cohorts[cohorts.length - 2];
    if (latestCohort.rate > prevCohort.rate) {
      insights.push(`Latest cohort (${latestCohort.cohort}) converts at ${latestCohort.rate.toFixed(1)}%, up from ${prevCohort.rate.toFixed(1)}% — momentum is building.`);
    }
  }

  return (
    <div className="space-y-6">
      {/* Top-level metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Free Users</span>
            </div>
            <div className="text-2xl font-bold">{isLoading ? "—" : freeUsers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-4 w-4 text-emerald-500" />
              <span className="text-xs text-muted-foreground">Paid Users</span>
            </div>
            <div className="text-2xl font-bold text-emerald-600">{isLoading ? "—" : paidUsers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">Conversion Rate</span>
            </div>
            <div className="text-2xl font-bold text-primary">{isLoading ? "—" : `${conversionRate}%`}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Avg Days to Convert</span>
            </div>
            <div className="text-2xl font-bold">{isLoading ? "—" : avgDaysToConvert > 0 ? `${avgDaysToConvert.toFixed(0)}d` : "N/A"}</div>
          </CardContent>
        </Card>
      </div>

      {/* MRR Card */}
      <Card>
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Estimated MRR</p>
            <p className="text-3xl font-bold text-emerald-600">${mrr.toFixed(0)}</p>
            <p className="text-xs text-muted-foreground mt-1">{paidUsers} paid × $9.99/mo</p>
          </div>
          <Button variant="outline" size="sm" onClick={loadData} disabled={isLoading}>
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Conversion Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Conversion Timeline</CardTitle>
            <CardDescription>New paid conversions by month</CardDescription>
          </CardHeader>
          <CardContent>
            {timelineChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={timelineChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar dataKey="conversions" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground text-sm text-center py-8">No conversion data yet</p>
            )}
          </CardContent>
        </Card>

        {/* Cohort Retention Grid */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Cohort Conversion</CardTitle>
            <CardDescription>Signup month vs paid conversion rate</CardDescription>
          </CardHeader>
          <CardContent>
            {cohorts.length > 0 ? (
              <ScrollArea className="h-[200px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Cohort</TableHead>
                      <TableHead className="text-xs text-right">Total</TableHead>
                      <TableHead className="text-xs text-right">Converted</TableHead>
                      <TableHead className="text-xs text-right">Rate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cohorts.map((c) => (
                      <TableRow key={c.cohort}>
                        <TableCell className="font-mono text-xs">{c.cohort}</TableCell>
                        <TableCell className="text-right text-sm">{c.total}</TableCell>
                        <TableCell className="text-right text-sm">{c.converted}</TableCell>
                        <TableCell className="text-right">
                          <Badge
                            variant="outline"
                            className={`text-xs ${
                              c.rate >= 10
                                ? "text-emerald-600 border-emerald-200"
                                : c.rate >= 3
                                ? "text-amber-600 border-amber-200"
                                : "text-muted-foreground"
                            }`}
                          >
                            {c.rate.toFixed(1)}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            ) : (
              <p className="text-muted-foreground text-sm text-center py-8">No cohort data yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Revenue Insights */}
      {insights.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-amber-500" />
              Revenue Insights
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {insights.map((insight, i) => (
              <div key={i} className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <Lightbulb className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-amber-700 dark:text-amber-400">{insight}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
