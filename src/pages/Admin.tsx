import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft, Shield, RefreshCw, BarChart3, Route, Mail,
  User, AlertTriangle, Radar, DollarSign, HeartPulse, Zap, Sparkles, Megaphone, Bot, BookOpenCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type {
  AdminUser, AppEvent, AppError, PageView, UserActivity,
  UserActivityStats, ActionFlow, AnalyticsSummary,
  NudgeLog, NudgeStats, NudgePotentialIssue
} from "@/components/admin/types";

// Modular tab components
import ExecutiveOverview from "@/components/admin/ExecutiveOverview";
import ActivationFunnel from "@/components/admin/ActivationFunnel";
import BehavioralIntelligence from "@/components/admin/BehavioralIntelligence";
import RetentionRadar from "@/components/admin/RetentionRadar";
import RevenueIntelligence from "@/components/admin/RevenueIntelligence";
import ProductHealth from "@/components/admin/ProductHealth";
import UserManagement from "@/components/admin/UserManagement";
import NudgesTab from "@/components/admin/NudgesTab";
import ActionCenter from "@/components/admin/ActionCenter";
import AIInsightsPanel from "@/components/admin/AIInsightsPanel";
import CampaignComposer from "@/components/admin/CampaignComposer";
import AIUsageDashboard from "@/components/admin/AIUsageDashboard";
import FormationContentStudio from "@/components/admin/FormationContentStudio";
import { formationContentAdminEnabled } from "@/lib/featureFlags";

export default function Admin() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [errors, setErrors] = useState<AppError[]>([]);
  const [pageViews, setPageViews] = useState<PageView[]>([]);
  const [userActivities, setUserActivities] = useState<UserActivity[]>([]);
  const [userActivityStats, setUserActivityStats] = useState<UserActivityStats | null>(null);
  const [actionFlows, setActionFlows] = useState<ActionFlow[]>([]);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [nudgeLogs, setNudgeLogs] = useState<NudgeLog[]>([]);
  const [nudgeStats, setNudgeStats] = useState<NudgeStats | null>(null);
  const [nudgePotentialIssues, setNudgePotentialIssues] = useState<NudgePotentialIssue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const { toast } = useToast();
  const navigate = useNavigate();

  const getErrorMessage = (error: unknown) => error instanceof Error ? error.message : "Unknown error";

  useEffect(() => {
    checkAuthAndLoad();
    // Admin bootstrapping should run once on page entry.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getAuthHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return {
      Authorization: `Bearer ${session?.access_token}`,
      "Content-Type": "application/json",
    };
  };

  const checkAuthAndLoad = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/auth"); return; }

    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-users?action=verify_admin`,
        { headers }
      );
      if (!response.ok) {
        const errorData = await response.json();
        if (!errorData.isAdmin) {
          toast({ title: "Access Denied", description: "You don't have permission to view this page.", variant: "destructive" });
          navigate("/dashboard");
          return;
        }
        throw new Error(errorData.error || "Admin verification failed");
      }
      setIsAuthorized(true);
      loadAllData();
    } catch (error: unknown) {
      console.error("Admin verification failed:", error);
      toast({ title: "Access Denied", description: "You don't have permission to view this page.", variant: "destructive" });
      navigate("/dashboard");
    }
  };

  const loadAllData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        loadResource<{ users?: AdminUser[] }>("admin-users", "", (d) => setUsers(d.users || [])),
        loadResource<{ events?: AppEvent[] }>("admin-users", "resource=events&limit=100", (d) => setEvents(d.events || [])),
        loadResource<{ errors?: AppError[] }>("admin-users", "resource=errors&limit=100", (d) => setErrors(d.errors || [])),
        loadResource<{ page_views?: PageView[] }>("admin-users", "resource=page_views&limit=100", (d) => setPageViews(d.page_views || [])),
        loadResource<{ summary?: AnalyticsSummary | null }>("admin-users", "resource=analytics_summary", (d) => setSummary(d.summary || null)),
        loadResource<{ users?: UserActivity[]; stats?: UserActivityStats | null }>("admin-users", "resource=user_activity", (d) => {
          setUserActivities(d.users || []);
          setUserActivityStats(d.stats || null);
        }),
        loadResource<{ commonFlows?: ActionFlow[] }>("admin-users", "resource=action_flow", (d) => setActionFlows(d.commonFlows || [])),
        loadResource<{ logs?: NudgeLog[]; stats?: NudgeStats | null; potentialIssues?: NudgePotentialIssue[] }>("admin-users", "resource=nudge_logs&limit=100", (d) => {
          setNudgeLogs(d.logs || []);
          setNudgeStats(d.stats || null);
          setNudgePotentialIssues(d.potentialIssues || []);
        }),
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadResource = async <TData,>(fn: string, query: string, onSuccess: (data: TData) => void) => {
    try {
      const headers = await getAuthHeaders();
      const sep = query ? (query.startsWith("?") ? "" : "?") : "";
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${fn}${query ? sep + query : ""}`,
        { headers }
      );
      if (response.ok) {
        const data = await response.json() as TData;
        onSuccess(data);
      }
    } catch (error) {
      console.error(`Error loading ${fn} ${query}:`, error);
    }
  };

  const handleResolveError = async (errorId: string) => {
    setActionLoading(errorId);
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-users?action=resolve_error`,
        { method: "POST", headers, body: JSON.stringify({ errorId }) }
      );
      if (!response.ok) throw new Error("Failed to resolve error");
      toast({ title: "Error marked as resolved" });
      loadResource<{ errors?: AppError[] }>("admin-users", "resource=errors&limit=100", (d) => setErrors(d.errors || []));
      loadResource<{ summary?: AnalyticsSummary | null }>("admin-users", "resource=analytics_summary", (d) => setSummary(d.summary || null));
    } catch (error: unknown) {
      toast({ title: "Error", description: getErrorMessage(error), variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Checking authorization...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-6"
        >
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold">Command Center</h1>
            </div>
          </div>
          <Button onClick={loadAllData} disabled={isLoading} variant="outline" size="sm">
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </motion.div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="flex flex-wrap h-auto gap-1 w-full max-w-5xl">
            <TabsTrigger value="overview" className="flex items-center gap-1">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="funnel" className="flex items-center gap-1">
              <Route className="h-4 w-4" />
              <span className="hidden sm:inline">Funnel</span>
            </TabsTrigger>
            <TabsTrigger value="behavior" className="flex items-center gap-1">
              <HeartPulse className="h-4 w-4" />
              <span className="hidden sm:inline">Behavior</span>
            </TabsTrigger>
            <TabsTrigger value="retention" className="flex items-center gap-1">
              <Radar className="h-4 w-4" />
              <span className="hidden sm:inline">Retention</span>
            </TabsTrigger>
            <TabsTrigger value="revenue" className="flex items-center gap-1">
              <DollarSign className="h-4 w-4" />
              <span className="hidden sm:inline">Revenue</span>
            </TabsTrigger>
            <TabsTrigger value="insights" className="flex items-center gap-1">
              <Sparkles className="h-4 w-4" />
              <span className="hidden sm:inline">Insights</span>
            </TabsTrigger>
            <TabsTrigger value="ai-usage" className="flex items-center gap-1">
              <Bot className="h-4 w-4" />
              <span className="hidden sm:inline">AI Usage</span>
            </TabsTrigger>
            <TabsTrigger value="health" className="flex items-center gap-1">
              <AlertTriangle className="h-4 w-4" />
              <span className="hidden sm:inline">Health</span>
              {summary && summary.unresolvedErrors > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {summary.unresolvedErrors}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="nudges" className="flex items-center gap-1">
              <Mail className="h-4 w-4" />
              <span className="hidden sm:inline">Nudges</span>
              {nudgeStats && nudgeStats.potentialIssuesCount > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs bg-amber-500/20 text-amber-600">
                  {nudgeStats.potentialIssuesCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-1">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Users</span>
            </TabsTrigger>
            <TabsTrigger value="actions" className="flex items-center gap-1">
              <Zap className="h-4 w-4" />
              <span className="hidden sm:inline">Actions</span>
            </TabsTrigger>
            <TabsTrigger value="campaigns" className="flex items-center gap-1">
              <Megaphone className="h-4 w-4" />
              <span className="hidden sm:inline">Campaigns</span>
            </TabsTrigger>
            {formationContentAdminEnabled() ? <TabsTrigger value="formation-content" className="flex items-center gap-1">
              <BookOpenCheck className="h-4 w-4" />
              <span className="hidden sm:inline">Formation Content</span>
            </TabsTrigger> : null}
          </TabsList>

          <TabsContent value="overview">
            <ExecutiveOverview />
          </TabsContent>

          <TabsContent value="funnel">
            <ActivationFunnel summary={summary} />
          </TabsContent>

          <TabsContent value="behavior">
            <BehavioralIntelligence
              userActivities={userActivities}
              userActivityStats={userActivityStats}
              actionFlows={actionFlows}
              summary={summary}
            />
          </TabsContent>

          <TabsContent value="retention">
            <RetentionRadar />
          </TabsContent>

          <TabsContent value="revenue">
            <RevenueIntelligence />
          </TabsContent>

          <TabsContent value="insights">
            <AIInsightsPanel />
          </TabsContent>

          <TabsContent value="ai-usage">
            <AIUsageDashboard />
          </TabsContent>

          <TabsContent value="health">
            <ProductHealth
              errors={errors}
              pageViews={pageViews}
              events={events}
              summary={summary}
              onResolveError={handleResolveError}
              actionLoading={actionLoading}
            />
          </TabsContent>

          <TabsContent value="nudges">
            <NudgesTab
              nudgeLogs={nudgeLogs}
              nudgeStats={nudgeStats}
              nudgePotentialIssues={nudgePotentialIssues}
            />
          </TabsContent>

          <TabsContent value="users">
            <UserManagement
              users={users}
              onRefresh={() => loadResource<{ users?: AdminUser[] }>("admin-users", "", (d) => setUsers(d.users || []))}
            />
          </TabsContent>

          <TabsContent value="actions">
            <ActionCenter users={users} />
          </TabsContent>

          <TabsContent value="campaigns">
            <CampaignComposer />
          </TabsContent>

          {formationContentAdminEnabled() ? <TabsContent value="formation-content">
            <FormationContentStudio />
          </TabsContent> : null}

        </Tabs>
      </div>
    </div>
  );
}
