import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { RefreshCw, AlertTriangle, Send, Gift } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface RiskUser {
  user_id: string;
  email: string;
  days_inactive: number;
  risk_tier: "healthy" | "slipping" | "at_risk" | "dormant";
  last_action: string | null;
  has_active_session: boolean;
}

interface RiskDistribution {
  healthy: number;
  slipping: number;
  at_risk: number;
  dormant: number;
}

const TIER_CONFIG = {
  healthy: { label: "Healthy", color: "hsl(152, 45%, 45%)", badgeClass: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400" },
  slipping: { label: "Slipping", color: "hsl(38, 92%, 50%)", badgeClass: "bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400" },
  at_risk: { label: "At Risk", color: "hsl(0, 84%, 60%)", badgeClass: "bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400" },
  dormant: { label: "Dormant", color: "hsl(220, 9%, 46%)", badgeClass: "bg-muted text-muted-foreground" },
};

export default function RetentionRadar() {
  const [riskUsers, setRiskUsers] = useState<RiskUser[]>([]);
  const [distribution, setDistribution] = useState<RiskDistribution | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filterTier, setFilterTier] = useState<string>("all");
  const { toast } = useToast();

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-analytics?resource=retention_radar`,
        {
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) throw new Error("Failed to load retention data");

      const data = await response.json();
      setRiskUsers(data.users || []);
      setDistribution(data.distribution || null);
    } catch (error) {
      console.error("Error loading retention radar:", error);
      toast({
        title: "Error",
        description: "Could not load retention data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const chartData = distribution
    ? Object.entries(distribution)
        .filter(([_, v]) => v > 0)
        .map(([key, value]) => ({
          name: TIER_CONFIG[key as keyof typeof TIER_CONFIG].label,
          value,
          color: TIER_CONFIG[key as keyof typeof TIER_CONFIG].color,
        }))
    : [];

  const filteredUsers = filterTier === "all"
    ? riskUsers.filter((u) => u.risk_tier !== "healthy")
    : riskUsers.filter((u) => u.risk_tier === filterTier);

  return (
    <div className="space-y-6">
      {/* Distribution overview */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Donut chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Risk Distribution</CardTitle>
            <CardDescription>Based on last activity date</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground">Loading...</div>
            ) : chartData.length > 0 ? (
              <div className="flex items-center gap-6">
                <ResponsiveContainer width={160} height={160}>
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={70}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {chartData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => [value, "Users"]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2">
                  {Object.entries(TIER_CONFIG).map(([key, config]) => (
                    <button
                      key={key}
                      className={`flex items-center gap-2 text-sm w-full rounded px-2 py-1 transition-colors ${
                        filterTier === key ? "bg-muted" : "hover:bg-muted/50"
                      }`}
                      onClick={() => setFilterTier(filterTier === key ? "all" : key)}
                    >
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: config.color }} />
                      <span>{config.label}</span>
                      <span className="ml-auto font-bold">
                        {distribution?.[key as keyof RiskDistribution] ?? 0}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm text-center py-8">No user data available</p>
            )}
          </CardContent>
        </Card>

        {/* Quick stats */}
        <div className="grid grid-cols-2 gap-4">
          {Object.entries(TIER_CONFIG).map(([key, config]) => (
            <Card key={key}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: config.color }} />
                  <span className="text-xs font-medium text-muted-foreground">{config.label}</span>
                </div>
                <div className="text-2xl font-bold">
                  {distribution?.[key as keyof RiskDistribution] ?? 0}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* At-risk user table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-sm">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Users Needing Attention
              </CardTitle>
              <CardDescription>
                {filterTier === "all" ? "Slipping, At Risk, and Dormant users" : TIER_CONFIG[filterTier as keyof typeof TIER_CONFIG]?.label + " users"}
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={loadData} disabled={isLoading}>
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Risk</TableHead>
                  <TableHead>Days Inactive</TableHead>
                  <TableHead>Last Action</TableHead>
                  <TableHead>Active Session</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      {isLoading ? "Loading..." : "No users in this category 🎉"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user.user_id}>
                      <TableCell className="font-medium text-sm">{user.email}</TableCell>
                      <TableCell>
                        <Badge className={TIER_CONFIG[user.risk_tier].badgeClass}>
                          {TIER_CONFIG[user.risk_tier].label}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {user.days_inactive}d
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground truncate max-w-[150px]">
                        {user.last_action || "Unknown"}
                      </TableCell>
                      <TableCell>
                        {user.has_active_session ? (
                          <Badge variant="outline" className="text-emerald-600 border-emerald-200">Active</Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground">None</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
