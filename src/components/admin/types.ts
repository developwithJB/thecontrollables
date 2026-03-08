export interface AdminUser {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  isPaid: boolean;
  isAdmin?: boolean;
  entitlement: {
    expires_at: string | null;
    granted_at: string;
    source: string;
  } | null;
}

export interface AppEvent {
  id: string;
  event_type: string;
  event_name: string;
  event_data: Record<string, any>;
  page_path: string;
  session_id: string;
  created_at: string;
}

export interface AppError {
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

export interface PageView {
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

export interface UserActivity {
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

export interface UserActivityStats {
  uniqueUsersToday: number;
  totalActivitiesToday: number;
  usersWithCheckin: number;
  usersWithAIChat: number;
}

export interface ActionFlow {
  flow: string;
  count: number;
}

export interface AnalyticsSummary {
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
  freeTrialMetrics?: {
    started: number;
    completed: number;
    converted: number;
    conversionRate: number;
    activeFreeTrial: number;
  };
}

export interface NudgeLog {
  id: string;
  user_id: string;
  nudge_date: string;
  sent_at: string;
  status: string;
  user_email: string | null;
  user_timezone: string;
}

export interface NudgeStats {
  sentToday: number;
  sentThisWeek: number;
  failedToday: number;
  failedThisWeek: number;
  nudgeEnabledUsers: number;
  coverageRate: number;
  potentialIssuesCount: number;
}

export interface NudgePotentialIssue {
  user_id: string;
  email: string;
  timezone: string;
  nudge_time: string;
}

// Executive Overview types
export interface MetricCard {
  label: string;
  value: number;
  previousValue?: number;
  changePercent?: number;
  trend?: number[];
  healthStatus?: 'healthy' | 'warning' | 'critical';
  format?: 'number' | 'percent' | 'currency';
}

export interface ExecutiveMetrics {
  totalUsers: MetricCard;
  newUsers7d: MetricCard;
  newUsers30d: MetricCard;
  dau: MetricCard;
  wau: MetricCard;
  mau: MetricCard;
  activationRate: MetricCard;
  snapshotCompletionRate: MetricCard;
  paidConversionRate: MetricCard;
  churnRate: MetricCard;
  mrr: MetricCard;
  arpu: MetricCard;
  activeCircles: MetricCard;
  circleMembers: MetricCard;
  activeSeasons: MetricCard;
  completedSeasons: MetricCard;
  pushSubscribers: MetricCard;
}

export interface AdminAnalyticsResponse {
  metrics: ExecutiveMetrics;
  period: string;
}
