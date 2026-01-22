import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper to get user's local date as YYYY-MM-DD
const getLocalDateString = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = user.id;
    const today = getLocalDateString();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Run all queries in parallel for maximum efficiency
    const [
      activeQuestResult,
      xpLogsResult,
      integrityLogsResult,
      todayTimeLogResult,
      userBuildResult,
    ] = await Promise.all([
      // Active quest
      supabase
        .from("main_quests")
        .select("*")
        .eq("user_id", userId)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      
      // XP logs (last 100) - include description for component compatibility
      supabase
        .from("xp_logs")
        .select("id, amount, source, description, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(100),
      
      // Integrity logs (last 30 days)
      supabase
        .from("integrity_logs")
        .select("id, promise_text, promised_at, due_date, kept, kept_at")
        .eq("user_id", userId)
        .gte("promised_at", thirtyDaysAgo.toISOString())
        .order("promised_at", { ascending: false }),
      
      // Today's time log
      supabase
        .from("time_logs")
        .select("*")
        .eq("user_id", userId)
        .eq("log_date", today)
        .maybeSingle(),
      
      // User build
      supabase
        .from("user_builds")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle(),
    ]);

    // Calculate derived values server-side
    const xpLogs = xpLogsResult.data || [];
    const totalXp = xpLogs.reduce((sum: number, log: { amount: number }) => sum + log.amount, 0);
    
    const integrityLogs = integrityLogsResult.data || [];
    const resolvedPromises = integrityLogs.filter((log: { kept: boolean | null }) => log.kept !== null);
    const keptPromises = resolvedPromises.filter((log: { kept: boolean | null }) => log.kept === true);
    const integrityScore = resolvedPromises.length > 0 
      ? Math.round((keptPromises.length / resolvedPromises.length) * 100) 
      : null;
    const pendingPromises = integrityLogs.filter((log: { kept: boolean | null }) => log.kept === null);

    return new Response(
      JSON.stringify({
        activeQuest: activeQuestResult.data,
        totalXp,
        integrityScore,
        pendingPromises,
        todayTimeLog: todayTimeLogResult.data,
        userBuild: userBuildResult.data,
        // Include raw logs for components that need them
        xpLogs,
        integrityLogs,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Dashboard summary error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
