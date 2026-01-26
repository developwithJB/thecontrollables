import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ADMIN_EMAIL = "developwithjb@gmail.com";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify the requesting user is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false },
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await anonClient.auth.getUser();
    if (userError || !user || user.email !== ADMIN_EMAIL) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role client for admin operations
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    const method = req.method;
    const url = new URL(req.url);
    const action = url.searchParams.get("action");
    const resource = url.searchParams.get("resource");

    // Handle different resources
    if (method === "GET") {
      // Get analytics data
      if (resource === "events") {
        const limit = parseInt(url.searchParams.get("limit") || "100");
        const { data: eventsData, error } = await adminClient
          .from("app_events")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(limit);
        if (error) throw error;

        // Get user emails for events that have user_id
        const userIds = [...new Set(eventsData?.filter(e => e.user_id).map(e => e.user_id) || [])];
        let userEmailMap = new Map<string, string>();
        
        if (userIds.length > 0) {
          const { data: authUsers } = await adminClient.auth.admin.listUsers();
          if (authUsers?.users) {
            authUsers.users.forEach(u => {
              if (userIds.includes(u.id) && u.email) {
                userEmailMap.set(u.id, u.email);
              }
            });
          }
        }

        // Enrich events with user email
        const enrichedEvents = eventsData?.map(e => ({
          ...e,
          user_email: e.user_id ? userEmailMap.get(e.user_id) || null : null,
        })) || [];

        return new Response(JSON.stringify({ events: enrichedEvents }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (resource === "errors") {
        const limit = parseInt(url.searchParams.get("limit") || "100");
        const unresolvedOnly = url.searchParams.get("unresolved") === "true";
        let query = adminClient
          .from("app_errors")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(limit);
        
        if (unresolvedOnly) {
          query = query.eq("resolved", false);
        }
        
        const { data: errorsData, error } = await query;
        if (error) throw error;

        // Get user emails for errors that have user_id
        const userIds = [...new Set(errorsData?.filter(e => e.user_id).map(e => e.user_id) || [])];
        let userEmailMap = new Map<string, string>();
        
        if (userIds.length > 0) {
          const { data: authUsers } = await adminClient.auth.admin.listUsers();
          if (authUsers?.users) {
            authUsers.users.forEach(u => {
              if (userIds.includes(u.id) && u.email) {
                userEmailMap.set(u.id, u.email);
              }
            });
          }
        }

        // Enrich errors with user email
        const enrichedErrors = errorsData?.map(e => ({
          ...e,
          user_email: e.user_id ? userEmailMap.get(e.user_id) || null : null,
        })) || [];

        return new Response(JSON.stringify({ errors: enrichedErrors }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (resource === "page_views") {
        const limit = parseInt(url.searchParams.get("limit") || "100");
        const { data: viewsData, error } = await adminClient
          .from("page_views")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(limit);
        if (error) throw error;

        // Get user emails for page views that have user_id
        const userIds = [...new Set(viewsData?.filter(v => v.user_id).map(v => v.user_id) || [])];
        let userEmailMap = new Map<string, string>();
        
        if (userIds.length > 0) {
          const { data: authUsers } = await adminClient.auth.admin.listUsers();
          if (authUsers?.users) {
            authUsers.users.forEach(u => {
              if (userIds.includes(u.id) && u.email) {
                userEmailMap.set(u.id, u.email);
              }
            });
          }
        }

        // Enrich page views with user email
        const enrichedViews = viewsData?.map(v => ({
          ...v,
          user_email: v.user_id ? userEmailMap.get(v.user_id) || null : null,
        })) || [];

        return new Response(JSON.stringify({ page_views: enrichedViews }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (resource === "analytics_summary") {
        // Get aggregated analytics
        const now = new Date();
        const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
        const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const previous7d = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();
        const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

        // Page views last 24h
        const { count: pageViews24h } = await adminClient
          .from("page_views")
          .select("*", { count: "exact", head: true })
          .gte("created_at", last24h);

        // Page views last 7d
        const { count: pageViews7d } = await adminClient
          .from("page_views")
          .select("*", { count: "exact", head: true })
          .gte("created_at", last7d);

        // Unique sessions last 24h
        const { data: sessions24h } = await adminClient
          .from("page_views")
          .select("session_id")
          .gte("created_at", last24h);
        const uniqueSessions24h = new Set(sessions24h?.map(s => s.session_id)).size;

        // Errors last 24h
        const { count: errors24h } = await adminClient
          .from("app_errors")
          .select("*", { count: "exact", head: true })
          .gte("created_at", last24h);

        // Unresolved errors
        const { count: unresolvedErrors } = await adminClient
          .from("app_errors")
          .select("*", { count: "exact", head: true })
          .eq("resolved", false);

        // Events last 24h
        const { count: events24h } = await adminClient
          .from("app_events")
          .select("*", { count: "exact", head: true })
          .gte("created_at", last24h);

        // Top pages last 7d
        const { data: topPagesData } = await adminClient
          .from("page_views")
          .select("page_path")
          .gte("created_at", last7d);

        const pageCounts: Record<string, number> = {};
        topPagesData?.forEach(p => {
          pageCounts[p.page_path] = (pageCounts[p.page_path] || 0) + 1;
        });
        const topPages = Object.entries(pageCounts)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5)
          .map(([path, count]) => ({ path, count }));

        // Event breakdown last 7d
        const { data: eventBreakdownData } = await adminClient
          .from("app_events")
          .select("event_type")
          .gte("created_at", last7d);

        const eventCounts: Record<string, number> = {};
        eventBreakdownData?.forEach(e => {
          eventCounts[e.event_type] = (eventCounts[e.event_type] || 0) + 1;
        });
        const eventBreakdown = Object.entries(eventCounts)
          .sort(([, a], [, b]) => b - a)
          .map(([type, count]) => ({ type, count }));

        // Error breakdown by type
        const { data: errorBreakdownData } = await adminClient
          .from("app_errors")
          .select("error_type")
          .gte("created_at", last7d);

        const errorCounts: Record<string, number> = {};
        errorBreakdownData?.forEach(e => {
          errorCounts[e.error_type || "unknown"] = (errorCounts[e.error_type || "unknown"] || 0) + 1;
        });
        const errorBreakdown = Object.entries(errorCounts)
          .sort(([, a], [, b]) => b - a)
          .map(([type, count]) => ({ type, count }));

        // Action breakdown - specific button/feature usage
        const { data: actionData } = await adminClient
          .from("app_events")
          .select("event_name, event_type")
          .gte("created_at", last7d)
          .in("event_type", ["button_click", "quest", "reset", "feature", "guide", "build", "upgrade"]);

        const actionCounts: Record<string, number> = {};
        actionData?.forEach(e => {
          const key = `${e.event_type}:${e.event_name}`;
          actionCounts[key] = (actionCounts[key] || 0) + 1;
        });
        const actionBreakdown = Object.entries(actionCounts)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 15)
          .map(([action, count]) => ({ action, count }));

        // === GROWTH METRICS ===
        
        // Get user signups this week vs previous week for growth comparison
        const { data: authUsers } = await adminClient.auth.admin.listUsers();
        const allUsers = authUsers?.users || [];
        
        const usersThisWeek = allUsers.filter(u => new Date(u.created_at) >= new Date(last7d)).length;
        const usersPreviousWeek = allUsers.filter(u => 
          new Date(u.created_at) >= new Date(previous7d) && 
          new Date(u.created_at) < new Date(last7d)
        ).length;
        const signupGrowth = usersPreviousWeek > 0 
          ? Math.round(((usersThisWeek - usersPreviousWeek) / usersPreviousWeek) * 100)
          : usersThisWeek > 0 ? 100 : 0;

        // Active users (users who had any activity in the last 7 days)
        const { data: activeUserEvents } = await adminClient
          .from("app_events")
          .select("user_id")
          .gte("created_at", last7d)
          .not("user_id", "is", null);
        const activeUsersThisWeek = new Set(activeUserEvents?.map(e => e.user_id) || []).size;

        const { data: prevActiveUserEvents } = await adminClient
          .from("app_events")
          .select("user_id")
          .gte("created_at", previous7d)
          .lt("created_at", last7d)
          .not("user_id", "is", null);
        const activeUsersPrevWeek = new Set(prevActiveUserEvents?.map(e => e.user_id) || []).size;
        
        const activeGrowth = activeUsersPrevWeek > 0
          ? Math.round(((activeUsersThisWeek - activeUsersPrevWeek) / activeUsersPrevWeek) * 100)
          : activeUsersThisWeek > 0 ? 100 : 0;

        // Retention: Users who came back (had activity on 2+ different days this week)
        const { data: retentionEvents } = await adminClient
          .from("app_events")
          .select("user_id, created_at")
          .gte("created_at", last7d)
          .not("user_id", "is", null);

        const userDaysMap = new Map<string, Set<string>>();
        retentionEvents?.forEach(e => {
          if (!e.user_id) return;
          if (!userDaysMap.has(e.user_id)) {
            userDaysMap.set(e.user_id, new Set());
          }
          userDaysMap.get(e.user_id)!.add(new Date(e.created_at).toDateString());
        });
        const returningUsers = Array.from(userDaysMap.values()).filter(days => days.size >= 2).length;
        const retentionRate = activeUsersThisWeek > 0 
          ? Math.round((returningUsers / activeUsersThisWeek) * 100) 
          : 0;

        // Feature adoption: Key feature usage rates
        const { data: featureEvents } = await adminClient
          .from("app_events")
          .select("event_type, event_name, user_id")
          .gte("created_at", last7d)
          .not("user_id", "is", null);

        const featureUserSets = {
          quest: new Set<string>(),
          aiChat: new Set<string>(),
          checkin: new Set<string>(),
          build: new Set<string>(),
          time: new Set<string>(),
          integrity: new Set<string>(),
        };

        featureEvents?.forEach(e => {
          if (!e.user_id) return;
          if (e.event_type === "quest") featureUserSets.quest.add(e.user_id);
          if (e.event_type === "guide" || e.event_name?.includes("controllable")) featureUserSets.aiChat.add(e.user_id);
          if (e.event_type === "reset" || e.event_name?.includes("checkin")) featureUserSets.checkin.add(e.user_id);
          if (e.event_type === "build") featureUserSets.build.add(e.user_id);
          if (e.event_type === "time") featureUserSets.time.add(e.user_id);
          if (e.event_type === "integrity") featureUserSets.integrity.add(e.user_id);
        });

        const featureAdoption = {
          quest: featureUserSets.quest.size,
          aiChat: featureUserSets.aiChat.size,
          checkin: featureUserSets.checkin.size,
          build: featureUserSets.build.size,
          time: featureUserSets.time.size,
          integrity: featureUserSets.integrity.size,
        };

        // Conversion funnel: Landing → Signup → Dashboard → Completed Action
        const { data: funnelViews } = await adminClient
          .from("page_views")
          .select("page_path, user_id, session_id")
          .gte("created_at", last7d);
        
        const landingVisitors = new Set(funnelViews?.filter(v => v.page_path === "/").map(v => v.session_id) || []).size;
        const signups = usersThisWeek;
        const dashboardUsers = new Set(funnelViews?.filter(v => v.page_path?.includes("/dashboard") && v.user_id).map(v => v.user_id) || []).size;
        
        const { data: completedActionUsers } = await adminClient
          .from("completed_actions")
          .select("user_id")
          .gte("created_at", last7d);
        const usersWithCompletedAction = new Set(completedActionUsers?.map(a => a.user_id) || []).size;

        const conversionFunnel = {
          landing: landingVisitors,
          signup: signups,
          dashboard: dashboardUsers,
          completedAction: usersWithCompletedAction,
        };

        // Onboarding funnel: Account Created → Assessment → Archetype → Snapshot → Day 1
        const { data: onboardingEvents } = await adminClient
          .from("app_events")
          .select("event_name, user_id")
          .eq("event_type", "onboarding")
          .gte("created_at", last7d)
          .not("user_id", "is", null);

        const onboardingUserSets = {
          accountCreated: new Set<string>(),
          assessmentCompleted: new Set<string>(),
          archetypeViewed: new Set<string>(),
          snapshotSelected: new Set<string>(),
          day1Started: new Set<string>(),
        };

        onboardingEvents?.forEach(e => {
          if (!e.user_id) return;
          switch (e.event_name) {
            case "account_created":
              onboardingUserSets.accountCreated.add(e.user_id);
              break;
            case "assessment_completed":
            case "assessment_skipped":
              onboardingUserSets.assessmentCompleted.add(e.user_id);
              break;
            case "archetype_viewed":
              onboardingUserSets.archetypeViewed.add(e.user_id);
              break;
            case "snapshot_selected":
              onboardingUserSets.snapshotSelected.add(e.user_id);
              break;
            case "day1_started":
              onboardingUserSets.day1Started.add(e.user_id);
              break;
          }
        });

        const onboardingFunnel = {
          accountCreated: onboardingUserSets.accountCreated.size,
          assessment: onboardingUserSets.assessmentCompleted.size,
          archetype: onboardingUserSets.archetypeViewed.size,
          snapshot: onboardingUserSets.snapshotSelected.size,
          day1: onboardingUserSets.day1Started.size,
        };

        // Drop-off points (pages with high exits)
        const { data: allPageViews } = await adminClient
          .from("page_views")
          .select("session_id, page_path, created_at")
          .gte("created_at", last7d)
          .order("created_at", { ascending: true });

        const sessionPaths = new Map<string, string[]>();
        allPageViews?.forEach(v => {
          if (!sessionPaths.has(v.session_id)) {
            sessionPaths.set(v.session_id, []);
          }
          sessionPaths.get(v.session_id)!.push(v.page_path);
        });

        const lastPageCounts: Record<string, number> = {};
        sessionPaths.forEach(paths => {
          const lastPage = paths[paths.length - 1];
          lastPageCounts[lastPage] = (lastPageCounts[lastPage] || 0) + 1;
        });

        const dropOffPoints = Object.entries(lastPageCounts)
          .filter(([path]) => path !== "/dashboard" && path !== "/dashboard/dashboard") // Exclude normal endpoints
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5)
          .map(([path, count]) => ({ path, count, percentage: Math.round((count / sessionPaths.size) * 100) }));

        return new Response(JSON.stringify({
          summary: {
            pageViews24h: pageViews24h || 0,
            pageViews7d: pageViews7d || 0,
            uniqueSessions24h,
            errors24h: errors24h || 0,
            unresolvedErrors: unresolvedErrors || 0,
            events24h: events24h || 0,
            topPages,
            eventBreakdown,
            errorBreakdown,
            actionBreakdown,
            // Growth metrics
            totalUsers: allUsers.length,
            usersThisWeek,
            signupGrowth,
            activeUsersThisWeek,
            activeGrowth,
            returningUsers,
            retentionRate,
            featureAdoption,
            conversionFunnel,
            onboardingFunnel,
            dropOffPoints,
          }
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // User activity - group by user with privacy-preserving identifiers
      if (resource === "user_activity") {
        const now = new Date();
        const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
        const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
        
        // Get all events and page views from last 24h
        const [eventsResult, viewsResult] = await Promise.all([
          adminClient
            .from("app_events")
            .select("user_id, session_id, event_type, event_name, created_at")
            .gte("created_at", last24h)
            .order("created_at", { ascending: false }),
          adminClient
            .from("page_views")
            .select("user_id, session_id, page_path, created_at")
            .gte("created_at", last24h)
            .order("created_at", { ascending: false }),
        ]);

        // Build user activity map
        const userActivityMap = new Map<string, {
          userId: string;
          anonymousId: string;
          sessions: Set<string>;
          firstSeen: string;
          lastSeen: string;
          activities: Array<{
            type: string;
            name: string;
            timestamp: string;
            category: string;
          }>;
        }>();

        // Helper to get activity category for display
        const getActivityCategory = (type: string, name: string): string => {
          if (type === "page_view") return "navigation";
          if (type === "guide" || name?.includes("guide") || name?.includes("controllable")) return "ai_chat";
          if (type === "reset" || name?.includes("checkin") || name?.includes("check_in")) return "daily_checkin";
          if (type === "quest") return "quest";
          if (type === "upgrade") return "upgrade";
          if (type === "build") return "build";
          if (type === "integrity") return "promise";
          if (type === "time") return "time_reflection";
          return "other";
        };

        // Process events
        eventsResult.data?.forEach(e => {
          const key = e.user_id || e.session_id; // Use user_id if available, otherwise session
          if (!userActivityMap.has(key)) {
            // Create anonymized user ID (User 1, User 2, etc.)
            const anonymousId = `User ${userActivityMap.size + 1}`;
            userActivityMap.set(key, {
              userId: key,
              anonymousId,
              sessions: new Set([e.session_id]),
              firstSeen: e.created_at,
              lastSeen: e.created_at,
              activities: [],
            });
          }
          
          const user = userActivityMap.get(key)!;
          user.sessions.add(e.session_id);
          if (new Date(e.created_at) < new Date(user.firstSeen)) {
            user.firstSeen = e.created_at;
          }
          if (new Date(e.created_at) > new Date(user.lastSeen)) {
            user.lastSeen = e.created_at;
          }
          
          user.activities.push({
            type: e.event_type,
            name: e.event_name,
            timestamp: e.created_at,
            category: getActivityCategory(e.event_type, e.event_name),
          });
        });

        // Process page views
        viewsResult.data?.forEach(v => {
          const key = v.user_id || v.session_id;
          if (!userActivityMap.has(key)) {
            const anonymousId = `User ${userActivityMap.size + 1}`;
            userActivityMap.set(key, {
              userId: key,
              anonymousId,
              sessions: new Set([v.session_id]),
              firstSeen: v.created_at,
              lastSeen: v.created_at,
              activities: [],
            });
          }
          
          const user = userActivityMap.get(key)!;
          user.sessions.add(v.session_id);
          if (new Date(v.created_at) < new Date(user.firstSeen)) {
            user.firstSeen = v.created_at;
          }
          if (new Date(v.created_at) > new Date(user.lastSeen)) {
            user.lastSeen = v.created_at;
          }
          
          user.activities.push({
            type: "page_view",
            name: v.page_path,
            timestamp: v.created_at,
            category: "navigation",
          });
        });

        // Convert to array and compute summary stats
        const userActivities = Array.from(userActivityMap.values())
          .map(user => {
            // Sort activities by time
            user.activities.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
            
            // Count activity categories
            const categoryCounts: Record<string, number> = {};
            user.activities.forEach(a => {
              categoryCounts[a.category] = (categoryCounts[a.category] || 0) + 1;
            });

            // Create activity summary (key actions)
            const keyActions: string[] = [];
            if (categoryCounts.daily_checkin) keyActions.push(`✅ Daily Check-in`);
            if (categoryCounts.ai_chat) keyActions.push(`💬 AI Chat (${categoryCounts.ai_chat}x)`);
            if (categoryCounts.quest) keyActions.push(`🎯 Quest Activity`);
            if (categoryCounts.time_reflection) keyActions.push(`⏰ Time Reflection`);
            if (categoryCounts.promise) keyActions.push(`🤝 Promise Made`);
            if (categoryCounts.build) keyActions.push(`🏗️ Build Assessment`);
            if (categoryCounts.upgrade) keyActions.push(`💎 Viewed Upgrade`);

            return {
              anonymousId: user.anonymousId,
              sessionCount: user.sessions.size,
              firstSeen: user.firstSeen,
              lastSeen: user.lastSeen,
              activityCount: user.activities.length,
              keyActions,
              categoryCounts,
              recentActivities: user.activities.slice(-10), // Last 10 activities
            };
          })
          .sort((a, b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime())
          .slice(0, 30); // Top 30 most recent users

        // Calculate overall stats
        const uniqueUsersToday = userActivities.length;
        const totalActivitiesToday = userActivities.reduce((sum, u) => sum + u.activityCount, 0);
        const usersWithCheckin = userActivities.filter(u => u.categoryCounts.daily_checkin).length;
        const usersWithAIChat = userActivities.filter(u => u.categoryCounts.ai_chat).length;

        return new Response(JSON.stringify({
          stats: {
            uniqueUsersToday,
            totalActivitiesToday,
            usersWithCheckin,
            usersWithAIChat,
          },
          users: userActivities,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // User journeys - group events by session to show flow (legacy)
      if (resource === "user_journeys") {
        const limit = parseInt(url.searchParams.get("limit") || "20");
        
        // Get recent sessions with their events
        const { data: recentSessions } = await adminClient
          .from("page_views")
          .select("session_id, created_at")
          .order("created_at", { ascending: false })
          .limit(200);

        // Get unique sessions
        const sessionMap = new Map<string, string>();
        recentSessions?.forEach(s => {
          if (!sessionMap.has(s.session_id)) {
            sessionMap.set(s.session_id, s.created_at);
          }
        });

        // Take the most recent unique sessions
        const uniqueSessionIds = Array.from(sessionMap.entries())
          .sort((a, b) => new Date(b[1]).getTime() - new Date(a[1]).getTime())
          .slice(0, limit)
          .map(([id]) => id);

        // Get all events and page views for these sessions
        const [eventsResult, viewsResult] = await Promise.all([
          adminClient
            .from("app_events")
            .select("*")
            .in("session_id", uniqueSessionIds)
            .order("created_at", { ascending: true }),
          adminClient
            .from("page_views")
            .select("*")
            .in("session_id", uniqueSessionIds)
            .order("created_at", { ascending: true }),
        ]);

        // Build journey for each session
        const journeys = uniqueSessionIds.map(sessionId => {
          const sessionEvents = eventsResult.data?.filter(e => e.session_id === sessionId) || [];
          const sessionViews = viewsResult.data?.filter(v => v.session_id === sessionId) || [];
          
          // Merge and sort all activities
          const allActivities = [
            ...sessionViews.map(v => ({
              type: "page_view" as const,
              name: v.page_path,
              timestamp: v.created_at,
              data: { screen_size: v.screen_size, load_time_ms: v.load_time_ms },
            })),
            ...sessionEvents.map(e => ({
              type: e.event_type as string,
              name: e.event_name,
              timestamp: e.created_at,
              data: e.event_data,
            })),
          ].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

          const startTime = allActivities[0]?.timestamp;
          const endTime = allActivities[allActivities.length - 1]?.timestamp;
          const durationMs = startTime && endTime 
            ? new Date(endTime).getTime() - new Date(startTime).getTime()
            : 0;

          return {
            session_id: sessionId,
            started_at: startTime,
            duration_ms: durationMs,
            activity_count: allActivities.length,
            activities: allActivities,
            screen_size: sessionViews[0]?.screen_size,
          };
        });

        return new Response(JSON.stringify({ journeys }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Action flow - shows common paths through the app
      if (resource === "action_flow") {
        const { data: flowData } = await adminClient
          .from("app_events")
          .select("session_id, event_type, event_name, created_at")
          .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
          .order("created_at", { ascending: true });

        // Group by session
        const sessionFlows = new Map<string, Array<{ type: string; name: string }>>();
        flowData?.forEach(e => {
          if (!sessionFlows.has(e.session_id)) {
            sessionFlows.set(e.session_id, []);
          }
          sessionFlows.get(e.session_id)?.push({ type: e.event_type, name: e.event_name });
        });

        // Count transition pairs (from action A to action B)
        const transitionCounts: Record<string, number> = {};
        sessionFlows.forEach(flow => {
          for (let i = 0; i < flow.length - 1; i++) {
            const from = `${flow[i].type}:${flow[i].name}`;
            const to = `${flow[i + 1].type}:${flow[i + 1].name}`;
            const key = `${from} → ${to}`;
            transitionCounts[key] = (transitionCounts[key] || 0) + 1;
          }
        });

        const commonFlows = Object.entries(transitionCounts)
          .filter(([, count]) => count >= 2)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 20)
          .map(([flow, count]) => ({ flow, count }));

        return new Response(JSON.stringify({ commonFlows }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Default: List all users with their entitlement status
      const { data: authUsers, error: authError } = await adminClient.auth.admin.listUsers();
      if (authError) throw authError;

      // Get all entitlements
      const { data: entitlements, error: entError } = await adminClient
        .from("user_entitlements")
        .select("*")
        .is("expires_at", null);
      if (entError) throw entError;

      const entitlementMap = new Map(entitlements?.map((e) => [e.user_id, e]) || []);

      const users = authUsers.users.map((u) => ({
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
        isPaid: entitlementMap.has(u.id),
        entitlement: entitlementMap.get(u.id) || null,
      }));

      // Sort by created_at descending
      users.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      return new Response(JSON.stringify({ users }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (method === "POST" && action === "grant") {
      const { userId } = await req.json();
      if (!userId) {
        return new Response(JSON.stringify({ error: "userId required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Insert entitlement
      const { error: insertError } = await adminClient.from("user_entitlements").insert({
        user_id: userId,
        entitlement_type: "full_access",
        source: "manual",
        granted_by: user.email,
      });

      if (insertError) throw insertError;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (method === "POST" && action === "revoke") {
      const { userId } = await req.json();
      if (!userId) {
        return new Response(JSON.stringify({ error: "userId required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Delete entitlement
      const { error: deleteError } = await adminClient
        .from("user_entitlements")
        .delete()
        .eq("user_id", userId);

      if (deleteError) throw deleteError;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (method === "POST" && action === "resolve_error") {
      const { errorId } = await req.json();
      if (!errorId) {
        return new Response(JSON.stringify({ error: "errorId required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error: updateError } = await adminClient
        .from("app_errors")
        .update({ resolved: true, resolved_at: new Date().toISOString() })
        .eq("id", errorId);

      if (updateError) throw updateError;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Admin function error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
