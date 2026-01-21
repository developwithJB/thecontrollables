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
        const { data, error } = await adminClient
          .from("app_events")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(limit);
        if (error) throw error;
        return new Response(JSON.stringify({ events: data }), {
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
        
        const { data, error } = await query;
        if (error) throw error;
        return new Response(JSON.stringify({ errors: data }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (resource === "page_views") {
        const limit = parseInt(url.searchParams.get("limit") || "100");
        const { data, error } = await adminClient
          .from("page_views")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(limit);
        if (error) throw error;
        return new Response(JSON.stringify({ page_views: data }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (resource === "analytics_summary") {
        // Get aggregated analytics
        const now = new Date();
        const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
        const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

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
          }
        }), {
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
