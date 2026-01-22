import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  ArrowLeft, Shield, Crown, User, RefreshCw, Activity, AlertTriangle, 
  BarChart3, Eye, CheckCircle, XCircle, Clock, Route, MousePointerClick,
  ChevronDown, ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const ADMIN_EMAIL = "developwithjb@gmail.com";

interface AdminUser {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  isPaid: boolean;
  entitlement: any | null;
}

interface AppEvent {
  id: string;
  event_type: string;
  event_name: string;
  event_data: Record<string, any>;
  page_path: string;
  session_id: string;
  created_at: string;
}

interface AppError {
  id: string;
  error_message: string;
  error_stack: string | null;
  error_type: string;
  component_name: string | null;
  page_path: string;
  session_id: string;
  resolved: boolean;
  created_at: string;
}

interface PageView {
  id: string;
  page_path: string;
  referrer: string | null;
  session_id: string;
  screen_size: string;
  load_time_ms: number;
  created_at: string;
}

interface UserJourney {
  session_id: string;
  started_at: string;
  duration_ms: number;
  activity_count: number;
  screen_size: string;
  activities: Array<{
    type: string;
    name: string;
    timestamp: string;
    data: Record<string, any>;
  }>;
}

interface ActionFlow {
  flow: string;
  count: number;
}

interface AnalyticsSummary {
  pageViews24h: number;
  pageViews7d: number;
  uniqueSessions24h: number;
  errors24h: number;
  unresolvedErrors: number;
  events24h: number;
  topPages: { path: string; count: number }[];
  eventBreakdown: { type: string; count: number }[];
  errorBreakdown: { type: string; count: number }[];
  actionBreakdown: { action: string; count: number }[];
}

export default function Admin() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [errors, setErrors] = useState<AppError[]>([]);
  const [pageViews, setPageViews] = useState<PageView[]>([]);
  const [journeys, setJourneys] = useState<UserJourney[]>([]);
  const [actionFlows, setActionFlows] = useState<ActionFlow[]>([]);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    checkAuthAndLoad();
  }, []);

  const checkAuthAndLoad = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      navigate("/auth");
      return;
    }

    if (user.email !== ADMIN_EMAIL) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to view this page.",
        variant: "destructive",
      });
      navigate("/dashboard");
      return;
    }

    setIsAuthorized(true);
    loadAllData();
  };

  const getAuthHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return {
      Authorization: `Bearer ${session?.access_token}`,
      "Content-Type": "application/json",
    };
  };

  const loadAllData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        loadUsers(),
        loadEvents(),
        loadErrors(),
        loadPageViews(),
        loadSummary(),
        loadJourneys(),
        loadActionFlows(),
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-users`,
        { headers }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to load users");
      }

      const data = await response.json();
      setUsers(data.users);
    } catch (error: any) {
      console.error("Error loading users:", error);
    }
  };

  const loadEvents = async () => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-users?resource=events&limit=100`,
        { headers }
      );

      if (response.ok) {
        const data = await response.json();
        setEvents(data.events || []);
      }
    } catch (error) {
      console.error("Error loading events:", error);
    }
  };

  const loadErrors = async () => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-users?resource=errors&limit=100`,
        { headers }
      );

      if (response.ok) {
        const data = await response.json();
        setErrors(data.errors || []);
      }
    } catch (error) {
      console.error("Error loading errors:", error);
    }
  };

  const loadPageViews = async () => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-users?resource=page_views&limit=100`,
        { headers }
      );

      if (response.ok) {
        const data = await response.json();
        setPageViews(data.page_views || []);
      }
    } catch (error) {
      console.error("Error loading page views:", error);
    }
  };

  const loadSummary = async () => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-users?resource=analytics_summary`,
        { headers }
      );

      if (response.ok) {
        const data = await response.json();
        setSummary(data.summary);
      }
    } catch (error) {
      console.error("Error loading summary:", error);
    }
  };

  const loadJourneys = async () => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-users?resource=user_journeys&limit=20`,
        { headers }
      );

      if (response.ok) {
        const data = await response.json();
        setJourneys(data.journeys || []);
      }
    } catch (error) {
      console.error("Error loading journeys:", error);
    }
  };

  const loadActionFlows = async () => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-users?resource=action_flow`,
        { headers }
      );

      if (response.ok) {
        const data = await response.json();
        setActionFlows(data.commonFlows || []);
      }
    } catch (error) {
      console.error("Error loading action flows:", error);
    }
  };

  const toggleSession = (sessionId: string) => {
    setExpandedSessions(prev => {
      const next = new Set(prev);
      if (next.has(sessionId)) {
        next.delete(sessionId);
      } else {
        next.add(sessionId);
      }
      return next;
    });
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "page_view": return "📄";
      case "button_click": return "👆";
      case "quest": return "🎯";
      case "reset": return "🔄";
      case "guide": return "🤖";
      case "build": return "🏗️";
      case "navigation": return "🧭";
      case "feature": return "⚡";
      case "modal": return "📦";
      case "upgrade": return "💎";
      case "time": return "⏰";
      case "integrity": return "🤝";
      case "xp": return "✨";
      default: return "📌";
    }
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  };

  const handleToggleAccess = async (userId: string, currentlyPaid: boolean) => {
    setActionLoading(userId);
    try {
      const headers = await getAuthHeaders();
      const action = currentlyPaid ? "revoke" : "grant";

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-users?action=${action}`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({ userId }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update access");
      }

      toast({
        title: currentlyPaid ? "Access Revoked" : "Access Granted",
        description: currentlyPaid 
          ? "User is now on Free tier" 
          : "User now has Paid access",
      });

      loadUsers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleResolveError = async (errorId: string) => {
    setActionLoading(errorId);
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-users?action=resolve_error`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({ errorId }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to resolve error");
      }

      toast({ title: "Error marked as resolved" });
      loadErrors();
      loadSummary();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Never";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const truncate = (str: string, len: number) => {
    return str.length > len ? str.slice(0, len) + "..." : str;
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
              <h1 className="text-2xl font-bold">Admin Panel</h1>
            </div>
          </div>
          <Button onClick={loadAllData} disabled={isLoading} variant="outline" size="sm">
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </motion.div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid grid-cols-7 w-full max-w-3xl">
            <TabsTrigger value="overview" className="flex items-center gap-1">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="journeys" className="flex items-center gap-1">
              <Route className="h-4 w-4" />
              <span className="hidden sm:inline">Journeys</span>
            </TabsTrigger>
            <TabsTrigger value="actions" className="flex items-center gap-1">
              <MousePointerClick className="h-4 w-4" />
              <span className="hidden sm:inline">Actions</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-1">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Users</span>
            </TabsTrigger>
            <TabsTrigger value="events" className="flex items-center gap-1">
              <Activity className="h-4 w-4" />
              <span className="hidden sm:inline">Events</span>
            </TabsTrigger>
            <TabsTrigger value="errors" className="flex items-center gap-1">
              <AlertTriangle className="h-4 w-4" />
              <span className="hidden sm:inline">Errors</span>
              {summary && summary.unresolvedErrors > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {summary.unresolvedErrors}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="pageviews" className="flex items-center gap-1">
              <Eye className="h-4 w-4" />
              <span className="hidden sm:inline">Views</span>
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Page Views (24h)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{summary?.pageViews24h || 0}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Unique Sessions (24h)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{summary?.uniqueSessions24h || 0}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Events (24h)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{summary?.events24h || 0}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Errors (24h)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-destructive">
                    {summary?.errors24h || 0}
                  </div>
                  {summary && summary.unresolvedErrors > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {summary.unresolvedErrors} unresolved
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Top Pages (7d)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {summary?.topPages?.map((page, i) => (
                      <div key={i} className="flex justify-between items-center text-sm">
                        <span className="truncate text-muted-foreground">{page.path}</span>
                        <Badge variant="secondary">{page.count}</Badge>
                      </div>
                    )) || <p className="text-muted-foreground text-sm">No data</p>}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Event Types (7d)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {summary?.eventBreakdown?.map((event, i) => (
                      <div key={i} className="flex justify-between items-center text-sm">
                        <span className="truncate text-muted-foreground">{event.type}</span>
                        <Badge variant="secondary">{event.count}</Badge>
                      </div>
                    )) || <p className="text-muted-foreground text-sm">No data</p>}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Error Types (7d)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {summary?.errorBreakdown?.map((error, i) => (
                      <div key={i} className="flex justify-between items-center text-sm">
                        <span className="truncate text-muted-foreground">{error.type}</span>
                        <Badge variant="destructive">{error.count}</Badge>
                      </div>
                    )) || <p className="text-muted-foreground text-sm">No errors</p>}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <MousePointerClick className="h-4 w-4" />
                    Top Actions (7d)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {summary?.actionBreakdown?.slice(0, 8).map((action, i) => (
                      <div key={i} className="flex justify-between items-center text-sm">
                        <span className="truncate text-muted-foreground font-mono text-xs">
                          {action.action}
                        </span>
                        <Badge variant="outline">{action.count}</Badge>
                      </div>
                    )) || <p className="text-muted-foreground text-sm">No actions tracked yet</p>}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">User Stats</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-8">
                    <div>
                      <div className="text-2xl font-bold">{users.length}</div>
                      <p className="text-xs text-muted-foreground">Total Users</p>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-500">
                        {users.filter(u => u.isPaid).length}
                      </div>
                      <p className="text-xs text-muted-foreground">Paid Users</p>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-muted-foreground">
                        {users.filter(u => !u.isPaid).length}
                      </div>
                      <p className="text-xs text-muted-foreground">Free Users</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* User Journeys Tab */}
          <TabsContent value="journeys">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Route className="h-5 w-5 text-purple-500" />
                  User Journeys
                </CardTitle>
                <CardDescription>
                  View session-by-session user flows through the app
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px]">
                  <div className="space-y-3">
                    {journeys.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">
                        No user journeys recorded yet
                      </p>
                    ) : (
                      journeys.map((journey) => (
                        <Collapsible
                          key={journey.session_id}
                          open={expandedSessions.has(journey.session_id)}
                          onOpenChange={() => toggleSession(journey.session_id)}
                        >
                          <Card>
                            <CollapsibleTrigger asChild>
                              <CardContent className="p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    {expandedSessions.has(journey.session_id) ? (
                                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                    ) : (
                                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                    )}
                                    <div>
                                      <p className="font-medium text-sm">
                                        Session: {journey.session_id.slice(0, 8)}...
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        {formatTime(journey.started_at)} • {journey.screen_size}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <Badge variant="outline">
                                      {journey.activity_count} actions
                                    </Badge>
                                    <Badge variant="secondary">
                                      {formatDuration(journey.duration_ms)}
                                    </Badge>
                                  </div>
                                </div>
                              </CardContent>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              <div className="px-4 pb-4 border-t">
                                <div className="pt-4 space-y-2">
                                  {journey.activities.map((activity, i) => (
                                    <div
                                      key={i}
                                      className="flex items-start gap-3 text-sm"
                                    >
                                      <span className="text-lg">
                                        {getActivityIcon(activity.type)}
                                      </span>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                          <Badge variant="outline" className="text-xs">
                                            {activity.type}
                                          </Badge>
                                          <span className="font-medium">{activity.name}</span>
                                        </div>
                                        {activity.data && Object.keys(activity.data).length > 0 && (
                                          <pre className="mt-1 text-xs text-muted-foreground bg-muted p-1 rounded overflow-x-auto">
                                            {JSON.stringify(activity.data, null, 0)}
                                          </pre>
                                        )}
                                      </div>
                                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                                        {new Date(activity.timestamp).toLocaleTimeString()}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </CollapsibleContent>
                          </Card>
                        </Collapsible>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Actions Tab */}
          <TabsContent value="actions">
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MousePointerClick className="h-5 w-5 text-blue-500" />
                    Common User Flows
                  </CardTitle>
                  <CardDescription>
                    Most frequent action sequences (7d)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-2">
                      {actionFlows.length === 0 ? (
                        <p className="text-muted-foreground text-sm">
                          Not enough data to show common flows yet
                        </p>
                      ) : (
                        actionFlows.map((flow, i) => (
                          <div
                            key={i}
                            className="flex justify-between items-center p-2 bg-muted/50 rounded text-sm"
                          >
                            <span className="font-mono text-xs truncate flex-1 mr-2">
                              {flow.flow}
                            </span>
                            <Badge>{flow.count}x</Badge>
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-green-500" />
                    Action Breakdown (7d)
                  </CardTitle>
                  <CardDescription>
                    All tracked actions by frequency
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-2">
                      {summary?.actionBreakdown?.map((action, i) => (
                        <div
                          key={i}
                          className="flex justify-between items-center text-sm"
                        >
                          <div className="flex items-center gap-2">
                            <span>{getActivityIcon(action.action.split(":")[0])}</span>
                            <span className="font-mono text-xs truncate">
                              {action.action}
                            </span>
                          </div>
                          <Badge variant="outline">{action.count}</Badge>
                        </div>
                      )) || (
                        <p className="text-muted-foreground text-sm">
                          No actions tracked yet
                        </p>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-yellow-500" />
                  User Management
                </CardTitle>
                <CardDescription>
                  {users.length} registered users
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Joined</TableHead>
                        <TableHead>Last Sign In</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">
                            {user.email}
                            {user.email === ADMIN_EMAIL && (
                              <Badge variant="outline" className="ml-2">Admin</Badge>
                            )}
                          </TableCell>
                          <TableCell>{formatDate(user.created_at)}</TableCell>
                          <TableCell>{formatDate(user.last_sign_in_at)}</TableCell>
                          <TableCell>
                            <Badge variant={user.isPaid ? "default" : "secondary"}>
                              {user.isPaid ? "Paid" : "Free"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant={user.isPaid ? "destructive" : "default"}
                              onClick={() => handleToggleAccess(user.id, user.isPaid)}
                              disabled={actionLoading === user.id || user.email === ADMIN_EMAIL}
                            >
                              {actionLoading === user.id
                                ? "..."
                                : user.isPaid
                                ? "Revoke"
                                : "Grant"}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Events Tab */}
          <TabsContent value="events">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-blue-500" />
                  Event Log
                </CardTitle>
                <CardDescription>
                  Last 100 tracked events
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Time</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Page</TableHead>
                        <TableHead>Session</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {events.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground">
                            No events recorded yet
                          </TableCell>
                        </TableRow>
                      ) : (
                        events.map((event) => (
                          <TableRow key={event.id}>
                            <TableCell className="text-muted-foreground text-xs">
                              {formatTime(event.created_at)}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{event.event_type}</Badge>
                            </TableCell>
                            <TableCell className="font-medium">{event.event_name}</TableCell>
                            <TableCell className="text-muted-foreground">
                              {event.page_path}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground font-mono">
                              {truncate(event.session_id, 8)}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Errors Tab */}
          <TabsContent value="errors">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  Error Tracking
                </CardTitle>
                <CardDescription>
                  {errors.filter(e => !e.resolved).length} unresolved errors
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <div className="space-y-3">
                    {errors.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">
                        No errors recorded yet 🎉
                      </p>
                    ) : (
                      errors.map((error) => (
                        <Card key={error.id} className={error.resolved ? "opacity-50" : ""}>
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  {error.resolved ? (
                                    <CheckCircle className="h-4 w-4 text-green-500" />
                                  ) : (
                                    <XCircle className="h-4 w-4 text-destructive" />
                                  )}
                                  <Badge variant="outline">{error.error_type}</Badge>
                                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {formatTime(error.created_at)}
                                  </span>
                                </div>
                                <p className="font-medium text-sm break-words">
                                  {error.error_message}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {error.page_path}
                                  {error.component_name && ` • ${error.component_name}`}
                                </p>
                                {error.error_stack && (
                                  <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-x-auto max-h-24">
                                    {truncate(error.error_stack, 300)}
                                  </pre>
                                )}
                              </div>
                              {!error.resolved && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleResolveError(error.id)}
                                  disabled={actionLoading === error.id}
                                >
                                  {actionLoading === error.id ? "..." : "Resolve"}
                                </Button>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Page Views Tab */}
          <TabsContent value="pageviews">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5 text-green-500" />
                  Page Views
                </CardTitle>
                <CardDescription>
                  Last 100 page views
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Time</TableHead>
                        <TableHead>Page</TableHead>
                        <TableHead>Referrer</TableHead>
                        <TableHead>Screen</TableHead>
                        <TableHead>Load Time</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pageViews.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground">
                            No page views recorded yet
                          </TableCell>
                        </TableRow>
                      ) : (
                        pageViews.map((view) => (
                          <TableRow key={view.id}>
                            <TableCell className="text-muted-foreground text-xs">
                              {formatTime(view.created_at)}
                            </TableCell>
                            <TableCell className="font-medium">{view.page_path}</TableCell>
                            <TableCell className="text-muted-foreground text-xs">
                              {view.referrer ? truncate(view.referrer, 30) : "-"}
                            </TableCell>
                            <TableCell className="text-xs font-mono">
                              {view.screen_size}
                            </TableCell>
                            <TableCell>
                              <Badge variant={view.load_time_ms < 1000 ? "secondary" : "destructive"}>
                                {view.load_time_ms}ms
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
