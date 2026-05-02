/* eslint-disable @typescript-eslint/no-explicit-any */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Check admin role
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Not authorized", isAdmin: false }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const resource = url.searchParams.get("resource") || "executive";
    const period = url.searchParams.get("period") || "30d";

    const periodDays = period === "7d" ? 7 : period === "90d" ? 90 : 30;
    const now = new Date();
    const periodStart = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);
    const prevPeriodStart = new Date(periodStart.getTime() - periodDays * 24 * 60 * 60 * 1000);

    if (resource === "retention_radar") {
      return await handleRetentionRadar(adminClient, corsHeaders);
    }

    if (resource === "revenue") {
      return await handleRevenue(adminClient, corsHeaders);
    }

    if (resource === "ai_usage") {
      return await handleAIUsage(adminClient, corsHeaders);
    }

    // Executive metrics
    const [
      totalUsersResult,
      newUsersResult,
      prevNewUsersResult,
      activeUsersResult,
      prevActiveUsersResult,
      dauResult,
      wauResult,
      mauResult,
      onboardingResult,
      snapshotsResult,
      completedSnapshotsResult,
      entitlementsResult,
      circlesResult,
      circleParticipantsResult,
      seasonsResult,
      pushSubsResult,
    ] = await Promise.all([
      // Total users
      adminClient.auth.admin.listUsers({ perPage: 1000 }),
      // New users in period
      adminClient.auth.admin.listUsers({ perPage: 1000 }),
      // Prev period users (for comparison)
      adminClient.auth.admin.listUsers({ perPage: 1000 }),
      // Active users (distinct in app_events)
      adminClient.from("app_events").select("user_id").gte("created_at", periodStart.toISOString()).not("user_id", "is", null),
      // Prev period active
      adminClient.from("app_events").select("user_id").gte("created_at", prevPeriodStart.toISOString()).lt("created_at", periodStart.toISOString()).not("user_id", "is", null),
      // DAU (last 1 day)
      adminClient.from("app_events").select("user_id").gte("created_at", new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString()).not("user_id", "is", null),
      // WAU (last 7 days)
      adminClient.from("app_events").select("user_id").gte("created_at", new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()).not("user_id", "is", null),
      // MAU (last 30 days)
      adminClient.from("app_events").select("user_id").gte("created_at", new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()).not("user_id", "is", null),
      // Onboarding completion
      adminClient.from("user_onboarding").select("user_id, simplified_mode_completed"),
      // Total snapshots
      adminClient.from("reset_sessions").select("id, status, user_id"),
      // Completed snapshots
      adminClient.from("reset_sessions").select("id").eq("status", "completed"),
      // Entitlements
      adminClient.from("user_entitlements").select("user_id, granted_at, expires_at, source"),
      // Circles (non-solo challenges)
      adminClient.from("challenges").select("id").eq("is_solo", false),
      // Circle participants
      adminClient.from("challenge_participants").select("id, challenge_id"),
      // Seasons
      adminClient.from("seasons").select("id, status"),
      // Push subscribers
      adminClient.from("push_subscriptions").select("user_id"),
    ]);

    const allUsers = totalUsersResult.data?.users || [];
    const totalUsers = allUsers.length;

    const newUsersInPeriod = allUsers.filter(
      (u) => new Date(u.created_at) >= periodStart
    ).length;
    const prevNewUsers = allUsers.filter(
      (u) => new Date(u.created_at) >= prevPeriodStart && new Date(u.created_at) < periodStart
    ).length;

    // Distinct active users
    const distinctActive = new Set((activeUsersResult.data || []).map((e: any) => e.user_id)).size;
    const prevDistinctActive = new Set((prevActiveUsersResult.data || []).map((e: any) => e.user_id)).size;
    const dau = new Set((dauResult.data || []).map((e: any) => e.user_id)).size;
    const wau = new Set((wauResult.data || []).map((e: any) => e.user_id)).size;
    const mau = new Set((mauResult.data || []).map((e: any) => e.user_id)).size;

    // Activation rate
    const onboardingData = onboardingResult.data || [];
    const completedOnboarding = onboardingData.filter((o: any) => o.simplified_mode_completed).length;
    const activationRate = totalUsers > 0 ? (completedOnboarding / totalUsers) * 100 : 0;

    // Snapshot completion
    const allSnapshots = snapshotsResult.data || [];
    const completedSnapshots = completedSnapshotsResult.data || [];
    const snapshotCompletionRate = allSnapshots.length > 0
      ? (completedSnapshots.length / allSnapshots.length) * 100
      : 0;

    // Paid conversion
    const entitlements = entitlementsResult.data || [];
    const activeEntitlements = entitlements.filter(
      (e: any) => !e.expires_at || new Date(e.expires_at) > now
    );
    const paidUsers = new Set(activeEntitlements.map((e: any) => e.user_id)).size;
    const paidConversionRate = totalUsers > 0 ? (paidUsers / totalUsers) * 100 : 0;

    // MRR estimate (simplified: count active paid * assumed $9.99/month)
    const monthlyPrice = 9.99;
    const mrr = paidUsers * monthlyPrice;
    const arpu = totalUsers > 0 ? mrr / totalUsers : 0;

    // Churn: expired in last 30d and not renewed
    const recentExpired = entitlements.filter(
      (e: any) => e.expires_at && new Date(e.expires_at) < now && new Date(e.expires_at) >= new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    );
    const renewedUserIds = new Set(activeEntitlements.map((e: any) => e.user_id));
    const churned = recentExpired.filter((e: any) => !renewedUserIds.has(e.user_id)).length;
    const churnRate = paidUsers + churned > 0 ? (churned / (paidUsers + churned)) * 100 : 0;

    // Build sparkline trends (7 data points)
    const trendPoints = 7;
    const bucketSize = Math.max(1, Math.floor(periodDays / trendPoints));
    const newUserTrend: number[] = [];
    const activeUserTrend: number[] = [];
    
    for (let i = 0; i < trendPoints; i++) {
      const bucketStart = new Date(periodStart.getTime() + i * bucketSize * 24 * 60 * 60 * 1000);
      const bucketEnd = new Date(bucketStart.getTime() + bucketSize * 24 * 60 * 60 * 1000);
      
      newUserTrend.push(
        allUsers.filter((u) => {
          const d = new Date(u.created_at);
          return d >= bucketStart && d < bucketEnd;
        }).length
      );

      activeUserTrend.push(
        new Set(
          (activeUsersResult.data || [])
            .filter((e: any) => {
              const d = new Date(e.created_at);
              return d >= bucketStart && d < bucketEnd;
            })
            .map((e: any) => e.user_id)
        ).size
      );
    }

    const calcChange = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    const getHealth = (val: number, good: number, warn: number): "healthy" | "warning" | "critical" => {
      if (val >= good) return "healthy";
      if (val >= warn) return "warning";
      return "critical";
    };

    const metrics = {
      totalUsers: {
        label: "Total Users",
        value: totalUsers,
        changePercent: calcChange(newUsersInPeriod, prevNewUsers),
        trend: newUserTrend,
        healthStatus: getHealth(totalUsers, 10, 5),
      },
      newUsers7d: {
        label: `New Users (${period})`,
        value: newUsersInPeriod,
        changePercent: calcChange(newUsersInPeriod, prevNewUsers),
        trend: newUserTrend,
        healthStatus: getHealth(newUsersInPeriod, 3, 1),
      },
      newUsers30d: {
        label: "New Users (30d)",
        value: allUsers.filter((u) => new Date(u.created_at) >= new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)).length,
        trend: newUserTrend,
      },
      dau: {
        label: "DAU",
        value: dau,
        trend: activeUserTrend,
        healthStatus: getHealth(dau, 5, 2),
      },
      wau: {
        label: "WAU",
        value: wau,
        trend: activeUserTrend,
        changePercent: calcChange(distinctActive, prevDistinctActive),
        healthStatus: getHealth(wau, 10, 5),
      },
      mau: {
        label: "MAU",
        value: mau,
        trend: activeUserTrend,
        healthStatus: getHealth(mau, 20, 10),
      },
      activationRate: {
        label: "Activation Rate",
        value: activationRate,
        format: "percent" as const,
        healthStatus: getHealth(activationRate, 50, 25),
      },
      snapshotCompletionRate: {
        label: "Snapshot Completion",
        value: snapshotCompletionRate,
        format: "percent" as const,
        healthStatus: getHealth(snapshotCompletionRate, 40, 20),
      },
      paidConversionRate: {
        label: "Paid Conversion",
        value: paidConversionRate,
        format: "percent" as const,
        healthStatus: getHealth(paidConversionRate, 10, 3),
      },
      churnRate: {
        label: "Churn Rate",
        value: churnRate,
        format: "percent" as const,
        healthStatus: churnRate <= 5 ? "healthy" as const : churnRate <= 15 ? "warning" as const : "critical" as const,
      },
      mrr: {
        label: "MRR",
        value: mrr,
        format: "currency" as const,
        healthStatus: getHealth(mrr, 100, 20),
      },
      arpu: {
        label: "ARPU",
        value: arpu,
        format: "currency" as const,
      },
      activeCircles: {
        label: "Active Circles",
        value: (() => {
          const circles = circlesResult.data || [];
          const participants = circleParticipantsResult.data || [];
          const circleIds = new Set(circles.map((c: any) => c.id));
          const activeCircleIds = new Set(participants.filter((p: any) => circleIds.has(p.challenge_id)).map((p: any) => p.challenge_id));
          return activeCircleIds.size;
        })(),
        healthStatus: getHealth((circlesResult.data || []).length, 3, 1),
      },
      circleMembers: {
        label: "Circle Members",
        value: (() => {
          const circles = circlesResult.data || [];
          const circleIds = new Set(circles.map((c: any) => c.id));
          return (circleParticipantsResult.data || []).filter((p: any) => circleIds.has(p.challenge_id)).length;
        })(),
        healthStatus: getHealth((circleParticipantsResult.data || []).length, 5, 2),
      },
      activeSeasons: {
        label: "Active Seasons",
        value: (seasonsResult.data || []).filter((s: any) => s.status === "active").length,
        healthStatus: getHealth((seasonsResult.data || []).filter((s: any) => s.status === "active").length, 3, 1),
      },
      completedSeasons: {
        label: "Completed Seasons",
        value: (seasonsResult.data || []).filter((s: any) => s.status === "completed").length,
      },
      pushSubscribers: {
        label: "Push Subscribers",
        value: new Set((pushSubsResult.data || []).map((p: any) => p.user_id)).size,
        healthStatus: getHealth(new Set((pushSubsResult.data || []).map((p: any) => p.user_id)).size, 5, 2),
      },
    };

    return new Response(
      JSON.stringify({ metrics, period }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("admin-analytics error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function handleRetentionRadar(adminClient: any, corsHeaders: any) {
  try {
    const now = new Date();

    // Get all users with their last activity
    const { data: allUsers } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
    const users = allUsers?.users || [];

    // Get last event per user
    const { data: lastEvents } = await adminClient
      .from("app_events")
      .select("user_id, created_at, event_name")
      .not("user_id", "is", null)
      .order("created_at", { ascending: false });

    // Get active sessions
    const { data: activeSessions } = await adminClient
      .from("reset_sessions")
      .select("user_id")
      .eq("status", "active");

    const activeSessionUserIds = new Set((activeSessions || []).map((s: any) => s.user_id));

    // Build last activity map
    const lastActivityMap = new Map<string, { created_at: string; event_name: string }>();
    for (const event of lastEvents || []) {
      if (!lastActivityMap.has(event.user_id)) {
        lastActivityMap.set(event.user_id, { created_at: event.created_at, event_name: event.event_name });
      }
    }

    const riskUsers = users.map((u: any) => {
      const lastActivity = lastActivityMap.get(u.id);
      const lastDate = lastActivity ? new Date(lastActivity.created_at) : new Date(u.created_at);
      const daysInactive = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

      let risk_tier: string;
      if (daysInactive <= 3) risk_tier = "healthy";
      else if (daysInactive <= 7) risk_tier = "slipping";
      else if (daysInactive <= 14) risk_tier = "at_risk";
      else risk_tier = "dormant";

      return {
        user_id: u.id,
        email: u.email || "Unknown",
        days_inactive: daysInactive,
        risk_tier,
        last_action: lastActivity?.event_name || null,
        has_active_session: activeSessionUserIds.has(u.id),
      };
    });

    // Sort: most at risk first
    riskUsers.sort((a: any, b: any) => b.days_inactive - a.days_inactive);

    const distribution = {
      healthy: riskUsers.filter((u: any) => u.risk_tier === "healthy").length,
      slipping: riskUsers.filter((u: any) => u.risk_tier === "slipping").length,
      at_risk: riskUsers.filter((u: any) => u.risk_tier === "at_risk").length,
      dormant: riskUsers.filter((u: any) => u.risk_tier === "dormant").length,
    };

    return new Response(
      JSON.stringify({ users: riskUsers, distribution }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Retention radar error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
}

type AIUsageRow = {
  id: string;
  surface: string | null;
  mode: string | null;
  ai_depth: string | null;
  model_tier: string | null;
  provider: string | null;
  model: string | null;
  prompt_hash: string | null;
  cache_hit: boolean | null;
  input_tokens: number | null;
  output_tokens: number | null;
  estimated_cost_usd: number | string | null;
  created_at: string;
};

type AIProposalRow = {
  id: string;
  status: string | null;
};

type AdminAuthUser = {
  id: string;
  email?: string | null;
  created_at: string;
};

const toNumber = (value: number | string | null | undefined) => {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
};

const sumEstimatedCost = (rows: AIUsageRow[]) =>
  rows.reduce((sum, row) => sum + toNumber(row.estimated_cost_usd), 0);

const groupCostBy = (rows: AIUsageRow[], key: keyof AIUsageRow, fallback: string) => {
  const groups = new Map<string, { key: string; requests: number; estimated_cost_usd: number }>();

  for (const row of rows) {
    const rawKey = row[key];
    const groupKey = typeof rawKey === "string" && rawKey.trim() ? rawKey : fallback;
    const current = groups.get(groupKey) || { key: groupKey, requests: 0, estimated_cost_usd: 0 };
    current.requests += 1;
    current.estimated_cost_usd += toNumber(row.estimated_cost_usd);
    groups.set(groupKey, current);
  }

  return Array.from(groups.values()).sort((a, b) => b.estimated_cost_usd - a.estimated_cost_usd);
};

async function handleAIUsage(adminClient: any, corsHeaders: any) {
  try {
    const now = new Date();
    const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const last7dStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [usageResult, proposalsResult] = await Promise.all([
      adminClient
        .from("ai_usage_events")
        .select("id, surface, mode, ai_depth, model_tier, provider, model, prompt_hash, cache_hit, input_tokens, output_tokens, estimated_cost_usd, created_at")
        .gte("created_at", last7dStart.toISOString())
        .order("created_at", { ascending: false })
        .limit(5000),
      adminClient
        .from("ai_action_proposals")
        .select("id, status, updated_at, approved_at, executed_at")
        .in("status", ["approved", "executed"])
        .gte("updated_at", last7dStart.toISOString())
        .limit(5000),
    ]);

    if (usageResult.error) throw usageResult.error;
    if (proposalsResult.error) throw proposalsResult.error;

    const usageRows = (usageResult.data || []) as AIUsageRow[];
    const proposalRows = (proposalsResult.data || []) as AIProposalRow[];
    const todayRows = usageRows.filter((row) => new Date(row.created_at) >= todayStart);
    const requestCount = usageRows.length;
    const totalCost7d = sumEstimatedCost(usageRows);
    const approvedProposals = proposalRows.length;
    const generatedBriefs = usageRows.filter((row) => row.mode === "daily_brief" && !row.cache_hit).length;
    const adjustmentRequests = usageRows.filter((row) => row.mode === "adjust").length;
    const cacheHits = usageRows.filter((row) => row.cache_hit).length;

    const topRequests = [...usageRows]
      .sort((a, b) => toNumber(b.estimated_cost_usd) - toNumber(a.estimated_cost_usd))
      .slice(0, 10)
      .map((row) => ({
        id: row.id,
        created_at: row.created_at,
        surface: row.surface,
        mode: row.mode,
        ai_depth: row.ai_depth,
        model_tier: row.model_tier,
        provider: row.provider,
        model: row.model,
        cache_hit: Boolean(row.cache_hit),
        input_tokens: row.input_tokens || 0,
        output_tokens: row.output_tokens || 0,
        estimated_cost_usd: toNumber(row.estimated_cost_usd),
        prompt_hash_prefix: row.prompt_hash ? row.prompt_hash.slice(0, 12) : null,
      }));

    return new Response(
      JSON.stringify({
        generatedAt: now.toISOString(),
        window: {
          from: last7dStart.toISOString(),
          to: now.toISOString(),
        },
        metrics: {
          totalCostToday: sumEstimatedCost(todayRows),
          totalCost7d,
          cacheHitRate: requestCount > 0 ? (cacheHits / requestCount) * 100 : 0,
          averageCostPerRequest: requestCount > 0 ? totalCost7d / requestCount : 0,
          requestCount7d: requestCount,
          dailyBriefGenerations: generatedBriefs,
          adjustments: adjustmentRequests,
          approvedProposals,
          costPerApprovedProposal: approvedProposals > 0 ? totalCost7d / approvedProposals : 0,
        },
        costByModel: groupCostBy(usageRows, "model", "unknown model"),
        costByDepth: groupCostBy(usageRows, "ai_depth", "unknown depth"),
        topRequests,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("AI usage dashboard error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
}

async function handleRevenue(adminClient: any, corsHeaders: any) {
  try {
    const now = new Date();
    const monthlyPrice = 9.99;

    // Get all users and entitlements
    const [usersResult, entitlementsResult] = await Promise.all([
      adminClient.auth.admin.listUsers({ perPage: 1000 }),
      adminClient.from("user_entitlements").select("user_id, granted_at, expires_at, source"),
    ]);

    const allUsers = (usersResult.data?.users || []) as AdminAuthUser[];
    const entitlements = entitlementsResult.data || [];

    // Active paid users
    const activeEntitlements = entitlements.filter(
      (e: any) => !e.expires_at || new Date(e.expires_at) > now
    );
    const paidUserIds = new Set(activeEntitlements.map((e: any) => e.user_id));
    const paidUsers = paidUserIds.size;
    const freeUsers = allUsers.length - paidUsers;
    const mrr = paidUsers * monthlyPrice;

    // Conversion data: users who have entitlements
    const userMap = new Map(allUsers.map((u) => [u.id, u]));
    const conversions = entitlements
      .filter((e: any) => userMap.has(e.user_id))
      .map((e: any) => {
        const user = userMap.get(e.user_id)!;
        const signupDate = new Date(user.created_at);
        const conversionDate = new Date(e.granted_at);
        return {
          user_id: e.user_id,
          email: user.email || "Unknown",
          signup_date: user.created_at,
          conversion_date: e.granted_at,
          days_to_convert: Math.max(0, Math.floor((conversionDate.getTime() - signupDate.getTime()) / (1000 * 60 * 60 * 24))),
          source: e.source,
        };
      });

    const avgDaysToConvert = conversions.length > 0
      ? conversions.reduce((sum: number, c: any) => sum + c.days_to_convert, 0) / conversions.length
      : 0;

    // Cohort analysis: group users by signup month
    const cohortMap = new Map<string, { total: number; converted: number }>();
    for (const user of allUsers) {
      const month = user.created_at.slice(0, 7);
      if (!cohortMap.has(month)) cohortMap.set(month, { total: 0, converted: 0 });
      cohortMap.get(month)!.total++;
      if (paidUserIds.has(user.id)) cohortMap.get(month)!.converted++;
    }

    const cohorts = Array.from(cohortMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([cohort, data]) => ({
        cohort,
        total: data.total,
        converted: data.converted,
        rate: data.total > 0 ? (data.converted / data.total) * 100 : 0,
      }));

    return new Response(
      JSON.stringify({ conversions, cohorts, freeUsers, paidUsers, avgDaysToConvert, mrr }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Revenue intelligence error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
}
