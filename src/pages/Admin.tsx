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
  user_id: string | null;
  user_email?: string | null;
}

interface PageView {
  id: string;
  page_path: string;
  referrer: string | null;
  session_id: string;
  screen_size: string;
  load_time_ms: number | null;
  created_at: string;
  user_id: string | null;
  user_email?: string | null;
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

interface UserActivity {
  anonymousId: string;
  sessionCount: number;
  firstSeen: string;
  lastSeen: string;
  activityCount: number;
  keyActions: string[];
  categoryCounts: Record<string, number>;
  recentActivities: Array<{
    type: string;
    name: string;
    timestamp: string;
    category: string;
  }>;
}

interface UserActivityStats {
  uniqueUsersToday: number;
  totalActivitiesToday: number;
  usersWithCheckin: number;
  usersWithAIChat: number;
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
  // Growth metrics
  totalUsers: number;
  usersThisWeek: number;
  signupGrowth: number;
  activeUsersThisWeek: number;
  activeGrowth: number;
  returningUsers: number;
  retentionRate: number;
  featureAdoption: {
    quest: number;
    aiChat: number;
    checkin: number;
    build: number;
    time: number;
    integrity: number;
  };
  conversionFunnel: {
    landing: number;
    signup: number;
    dashboard: number;
    completedAction: number;
  };
  onboardingFunnel: {
    accountCreated: number;
    assessment: number;
    archetype: number;
    snapshot: number;
    day1: number;
  };
  dropOffPoints: { path: string; count: number; percentage: number }[];
}

export default function Admin() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [errors, setErrors] = useState<AppError[]>([]);
  const [pageViews, setPageViews] = useState<PageView[]>([]);
  const [journeys, setJourneys] = useState<UserJourney[]>([]);
  const [userActivities, setUserActivities] = useState<UserActivity[]>([]);
  const [userActivityStats, setUserActivityStats] = useState<UserActivityStats | null>(null);
  const [actionFlows, setActionFlows] = useState<ActionFlow[]>([]);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());
  const [errorUserFilter, setErrorUserFilter] = useState<string>("");
  const [pageViewUserFilter, setPageViewUserFilter] = useState<string>("");
  const [pageViewPathFilter, setPageViewPathFilter] = useState<string>("");
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
        loadUserActivity(),
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

  const loadUserActivity = async () => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-users?resource=user_activity`,
        { headers }
      );

      if (response.ok) {
        const data = await response.json();
        setUserActivities(data.users || []);
        setUserActivityStats(data.stats || null);
      }
    } catch (error) {
      console.error("Error loading user activity:", error);
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
              <span className="hidden sm:inline">Activity</span>
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
            {/* Growth Metrics - Most Important */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="border-l-4 border-l-primary">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Users
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{summary?.totalUsers || 0}</div>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-xs text-muted-foreground">+{summary?.usersThisWeek || 0} this week</span>
                    {summary?.signupGrowth !== undefined && (
                      <Badge variant={summary.signupGrowth >= 0 ? "default" : "destructive"} className="text-xs">
                        {summary.signupGrowth >= 0 ? "↑" : "↓"}{Math.abs(summary.signupGrowth)}%
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border-l-4 border-l-green-500">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Active Users (7d)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{summary?.activeUsersThisWeek || 0}</div>
                  <div className="flex items-center gap-1 mt-1">
                    {summary?.activeGrowth !== undefined && (
                      <Badge variant={summary.activeGrowth >= 0 ? "secondary" : "destructive"} className="text-xs">
                        {summary.activeGrowth >= 0 ? "↑" : "↓"}{Math.abs(summary.activeGrowth)}% vs prev week
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-blue-500">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Returning Users (7d)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">{summary?.returningUsers || 0}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {summary?.retentionRate || 0}% retention rate
                  </p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-destructive">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Unresolved Errors
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-destructive">
                    {summary?.unresolvedErrors || 0}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {summary?.errors24h || 0} in last 24h
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Conversion Funnel */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  📊 Conversion Funnel (7d)
                </CardTitle>
                <CardDescription>Track user progression through key milestones</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between gap-2 overflow-x-auto">
                  {[
                    { label: "Landing", value: summary?.conversionFunnel?.landing || 0, color: "bg-muted" },
                    { label: "Signed Up", value: summary?.conversionFunnel?.signup || 0, color: "bg-blue-100 dark:bg-blue-900/30" },
                    { label: "Reached Dashboard", value: summary?.conversionFunnel?.dashboard || 0, color: "bg-green-100 dark:bg-green-900/30" },
                    { label: "Completed Action", value: summary?.conversionFunnel?.completedAction || 0, color: "bg-primary/20" },
                  ].map((step, i, arr) => (
                    <div key={step.label} className="flex items-center gap-2 min-w-0">
                      <div className={`flex-shrink-0 p-4 rounded-lg ${step.color} text-center min-w-[100px]`}>
                        <div className="text-xl font-bold">{step.value}</div>
                        <div className="text-xs text-muted-foreground whitespace-nowrap">{step.label}</div>
                        {i > 0 && arr[i-1].value > 0 && (
                          <div className="text-xs text-primary font-medium mt-1">
                            {Math.round((step.value / arr[i-1].value) * 100)}%
                          </div>
                        )}
                      </div>
                      {i < arr.length - 1 && (
                        <span className="text-muted-foreground text-lg flex-shrink-0">→</span>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Onboarding Funnel */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  🚀 Onboarding Funnel (7d)
                </CardTitle>
                <CardDescription>Track new user progression through onboarding steps</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between gap-2 overflow-x-auto">
                  {[
                    { label: "Account Created", value: summary?.onboardingFunnel?.accountCreated || 0, color: "bg-blue-100 dark:bg-blue-900/30" },
                    { label: "Assessment", value: summary?.onboardingFunnel?.assessment || 0, color: "bg-purple-100 dark:bg-purple-900/30" },
                    { label: "Archetype", value: summary?.onboardingFunnel?.archetype || 0, color: "bg-pink-100 dark:bg-pink-900/30" },
                    { label: "Snapshot", value: summary?.onboardingFunnel?.snapshot || 0, color: "bg-orange-100 dark:bg-orange-900/30" },
                    { label: "Day 1 Started", value: summary?.onboardingFunnel?.day1 || 0, color: "bg-green-100 dark:bg-green-900/30" },
                  ].map((step, i, arr) => (
                    <div key={step.label} className="flex items-center gap-2 min-w-0">
                      <div className={`flex-shrink-0 p-4 rounded-lg ${step.color} text-center min-w-[100px]`}>
                        <div className="text-xl font-bold">{step.value}</div>
                        <div className="text-xs text-muted-foreground whitespace-nowrap">{step.label}</div>
                        {i > 0 && arr[i-1].value > 0 && (
                          <div className="text-xs text-primary font-medium mt-1">
                            {Math.round((step.value / arr[i-1].value) * 100)}%
                          </div>
                        )}
                      </div>
                      {i < arr.length - 1 && (
                        <span className="text-muted-foreground text-lg flex-shrink-0">→</span>
                      )}
                    </div>
                  ))}
                </div>
                {/* Overall conversion rate */}
                {(summary?.onboardingFunnel?.accountCreated || 0) > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Overall Completion Rate</span>
                      <span className="font-semibold text-primary">
                        {Math.round(((summary?.onboardingFunnel?.day1 || 0) / (summary?.onboardingFunnel?.accountCreated || 1)) * 100)}%
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Feature Adoption */}
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    🎯 Feature Adoption (7d)
                  </CardTitle>
                  <CardDescription>Users who used each feature this week</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      { label: "Daily Check-in", value: summary?.featureAdoption?.checkin || 0, icon: "✅", color: "bg-green-500" },
                      { label: "AI Chat", value: summary?.featureAdoption?.aiChat || 0, icon: "💬", color: "bg-blue-500" },
                      { label: "Quest System", value: summary?.featureAdoption?.quest || 0, icon: "🎯", color: "bg-purple-500" },
                      { label: "Time Reflection", value: summary?.featureAdoption?.time || 0, icon: "⏰", color: "bg-orange-500" },
                      { label: "Integrity Promises", value: summary?.featureAdoption?.integrity || 0, icon: "🤝", color: "bg-cyan-500" },
                      { label: "Build Assessment", value: summary?.featureAdoption?.build || 0, icon: "🏗️", color: "bg-pink-500" },
                    ].map((feature) => {
                      const maxUsers = summary?.activeUsersThisWeek || 1;
                      const percentage = Math.round((feature.value / maxUsers) * 100);
                      return (
                        <div key={feature.label} className="space-y-1">
                          <div className="flex justify-between items-center text-sm">
                            <span className="flex items-center gap-2">
                              <span>{feature.icon}</span>
                              <span>{feature.label}</span>
                            </span>
                            <span className="font-medium">{feature.value} <span className="text-muted-foreground text-xs">({percentage}%)</span></span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${feature.color} transition-all`}
                              style={{ width: `${Math.min(percentage, 100)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    🚪 Drop-off Points (7d)
                  </CardTitle>
                  <CardDescription>Where users leave the app most often</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {summary?.dropOffPoints?.length ? (
                      summary.dropOffPoints.map((point, i) => (
                        <div key={i} className="flex justify-between items-center text-sm p-2 bg-muted/50 rounded">
                          <span className="truncate font-mono text-xs">{point.path}</span>
                          <div className="flex items-center gap-2">
                            <Badge variant="destructive">{point.count}</Badge>
                            <span className="text-muted-foreground text-xs">{point.percentage}%</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-muted-foreground text-sm text-center py-4">
                        Not enough data yet
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Stats */}
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
                    Paid Users
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-500">
                    {users.filter(u => u.isPaid).length}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {users.length > 0 ? Math.round((users.filter(u => u.isPaid).length / users.length) * 100) : 0}% conversion
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Detailed Breakdowns */}
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
          </TabsContent>

          {/* User Activity Tab */}
          <TabsContent value="journeys" className="space-y-4">
            {/* Stats Cards */}
            {userActivityStats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold text-primary">
                      {userActivityStats.uniqueUsersToday}
                    </div>
                    <p className="text-xs text-muted-foreground">Active Users (24h)</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold text-green-600">
                      {userActivityStats.usersWithCheckin}
                    </div>
                    <p className="text-xs text-muted-foreground">Completed Check-in</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold text-blue-600">
                      {userActivityStats.usersWithAIChat}
                    </div>
                    <p className="text-xs text-muted-foreground">Used AI Chat</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold text-muted-foreground">
                      {userActivityStats.totalActivitiesToday}
                    </div>
                    <p className="text-xs text-muted-foreground">Total Actions</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* User Activity List */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Route className="h-5 w-5 text-purple-500" />
                  User Activity (Last 24h)
                </CardTitle>
                <CardDescription>
                  See who was active, when, and what they did — privacy-preserving view
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <div className="space-y-3">
                    {userActivities.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">
                        No user activity recorded in the last 24 hours
                      </p>
                    ) : (
                      userActivities.map((user) => (
                        <Collapsible
                          key={user.anonymousId}
                          open={expandedSessions.has(user.anonymousId)}
                          onOpenChange={() => toggleSession(user.anonymousId)}
                        >
                          <Card className="border-l-4 border-l-primary/30">
                            <CollapsibleTrigger asChild>
                              <CardContent className="p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    {expandedSessions.has(user.anonymousId) ? (
                                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                    ) : (
                                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                    )}
                                    <div className="flex items-center gap-2">
                                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                        <User className="h-4 w-4 text-primary" />
                                      </div>
                                      <div>
                                        <p className="font-medium text-sm">
                                          {user.anonymousId}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                          Active: {new Date(user.lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                          {user.sessionCount > 1 && ` • ${user.sessionCount} sessions`}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-xs">
                                      {user.activityCount} actions
                                    </Badge>
                                  </div>
                                </div>
                                
                                {/* Key Actions Summary */}
                                {user.keyActions.length > 0 && (
                                  <div className="mt-3 flex flex-wrap gap-1.5 ml-11">
                                    {user.keyActions.map((action, i) => (
                                      <Badge 
                                        key={i} 
                                        variant="secondary" 
                                        className="text-xs font-normal"
                                      >
                                        {action}
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                              </CardContent>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              <div className="px-4 pb-4 border-t">
                                <p className="text-xs text-muted-foreground pt-3 mb-2">
                                  Recent Activity Timeline
                                </p>
                                <div className="space-y-2">
                                  {user.recentActivities.map((activity, i) => (
                                    <div
                                      key={i}
                                      className="flex items-center gap-3 text-sm"
                                    >
                                      <span className="text-base">
                                        {getActivityIcon(activity.type)}
                                      </span>
                                      <div className="flex-1 min-w-0">
                                        <span className="text-muted-foreground">
                                          {activity.type === "page_view" 
                                            ? `Viewed ${activity.name}` 
                                            : activity.name}
                                        </span>
                                      </div>
                                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                                        {new Date(activity.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-destructive" />
                      Error Tracking
                    </CardTitle>
                    <CardDescription>
                      {errors.filter(e => !e.resolved).length} unresolved errors
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={errorUserFilter}
                      onChange={(e) => setErrorUserFilter(e.target.value)}
                      className="text-sm border rounded-md px-2 py-1 bg-background"
                    >
                      <option value="">All Users</option>
                      <option value="__anonymous__">Anonymous Only</option>
                      {[...new Set(errors.filter(e => e.user_email).map(e => e.user_email))]
                        .sort()
                        .map(email => (
                          <option key={email} value={email || ""}>{email}</option>
                        ))
                      }
                    </select>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[500px]">
                  <div className="space-y-3 p-6">
                    {errors.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">
                        No errors recorded yet 🎉
                      </p>
                    ) : (
                      errors
                        .filter(error => {
                          if (!errorUserFilter) return true;
                          if (errorUserFilter === "__anonymous__") return !error.user_id;
                          return error.user_email === errorUserFilter;
                        })
                        .map((error) => (
                        <Card key={error.id} className={error.resolved ? "opacity-50" : ""}>
                          <CardContent className="p-4">
                            <div className="flex flex-col gap-3">
                              {/* Header row */}
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                  {error.resolved ? (
                                    <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                                  ) : (
                                    <XCircle className="h-4 w-4 text-destructive flex-shrink-0" />
                                  )}
                                  <Badge variant="outline" className="flex-shrink-0">{error.error_type}</Badge>
                                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {formatTime(error.created_at)}
                                  </span>
                                </div>
                                {!error.resolved && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleResolveError(error.id)}
                                    disabled={actionLoading === error.id}
                                    className="flex-shrink-0"
                                  >
                                    {actionLoading === error.id ? "..." : "Mark Resolved"}
                                  </Button>
                                )}
                              </div>
                              
                              {/* Error message */}
                              <p className="font-medium text-sm break-words">
                                {error.error_message}
                              </p>
                              
                              {/* Metadata */}
                              <p className="text-xs text-muted-foreground">
                                {error.page_path}
                                {error.component_name && ` • ${error.component_name}`}
                                {error.user_email && (
                                  <span className="ml-2 text-primary">• {error.user_email}</span>
                                )}
                                {!error.user_email && error.user_id && (
                                  <span className="ml-2 text-muted-foreground/60">• User ID: {truncate(error.user_id, 8)}</span>
                                )}
                              </p>
                              
                              {/* Stack trace */}
                              {error.error_stack && (
                                <pre className="p-2 bg-muted rounded text-xs overflow-x-auto max-h-24">
                                  {truncate(error.error_stack, 300)}
                                </pre>
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
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Eye className="h-5 w-5 text-green-500" />
                      Page Views
                    </CardTitle>
                    <CardDescription>
                      Last 100 page views (includes virtual tab navigations)
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <select
                      value={pageViewPathFilter}
                      onChange={(e) => setPageViewPathFilter(e.target.value)}
                      className="text-sm border rounded-md px-2 py-1 bg-background"
                    >
                      <option value="">All Pages</option>
                      <option value="/dashboard">Dashboard (main)</option>
                      <option value="/dashboard/dashboard">Dashboard Tab</option>
                      <option value="/dashboard/experience">Experience Tab</option>
                      <option value="/dashboard/guide">Guide Tab</option>
                      <option value="/auth">Auth</option>
                      <option value="/">Landing</option>
                    </select>
                    <select
                      value={pageViewUserFilter}
                      onChange={(e) => setPageViewUserFilter(e.target.value)}
                      className="text-sm border rounded-md px-2 py-1 bg-background"
                    >
                      <option value="">All Users</option>
                      <option value="__anonymous__">Anonymous Only</option>
                      {[...new Set(pageViews.filter(v => v.user_email).map(v => v.user_email))]
                        .sort()
                        .map(email => (
                          <option key={email} value={email || ""}>{email}</option>
                        ))
                      }
                    </select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Time</TableHead>
                        <TableHead>Page</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Referrer</TableHead>
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
                        pageViews
                          .filter(view => {
                            // Path filter
                            if (pageViewPathFilter && !view.page_path.startsWith(pageViewPathFilter)) {
                              return false;
                            }
                            // User filter
                            if (pageViewUserFilter) {
                              if (pageViewUserFilter === "__anonymous__") return !view.user_id;
                              return view.user_email === pageViewUserFilter;
                            }
                            return true;
                          })
                          .map((view) => (
                          <TableRow key={view.id}>
                            <TableCell className="text-muted-foreground text-xs">
                              {formatTime(view.created_at)}
                            </TableCell>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-1">
                                {view.page_path.includes("/dashboard/") && (
                                  <Badge variant="outline" className="text-xs">tab</Badge>
                                )}
                                {view.page_path}
                              </div>
                            </TableCell>
                            <TableCell className="text-xs">
                              {view.user_email ? (
                                <span className="text-primary">{view.user_email}</span>
                              ) : view.user_id ? (
                                <span className="text-muted-foreground font-mono">{truncate(view.user_id, 8)}</span>
                              ) : (
                                <span className="text-muted-foreground/50">anonymous</span>
                              )}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-xs">
                              {view.referrer ? truncate(view.referrer, 25) : "-"}
                            </TableCell>
                            <TableCell>
                              {view.load_time_ms !== null ? (
                                <Badge variant={view.load_time_ms < 1000 ? "secondary" : "destructive"}>
                                  {view.load_time_ms}ms
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs">virtual</Badge>
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
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
