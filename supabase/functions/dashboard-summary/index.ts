import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

    // Get client's local date and timezone from request body if provided
    let clientDate: string | null = null;
    let clientTimezone: string = "UTC";
    try {
      const body = await req.json();
      clientDate = body?.localDate || null;
      clientTimezone = body?.timezone || "UTC";
    } catch {
      // No body or invalid JSON, use server date as fallback
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
    
    // Use client's local date if provided, otherwise fall back to UTC
    const today = clientDate || new Date().toISOString().split('T')[0];
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Run all queries in parallel for maximum efficiency
    const [
      activeQuestResult,
      xpLogsResult,
      integrityLogsResult,
      todayTimeLogResult,
      userBuildResult,
      dailyResetsResult,
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
      
      // Today's time log - use the client's date
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

      // All daily resets for streak calculation
      supabase
        .from("daily_resets")
        .select("completed_at")
        .eq("user_id", userId)
        .order("completed_at", { ascending: false }),
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
    // Helper function to convert UTC date to client's local date string
    const toLocalDateString = (utcDateString: string): string => {
      try {
        const date = new Date(utcDateString);
        return date.toLocaleDateString("sv-SE", { timeZone: clientTimezone });
      } catch {
        // Fallback to UTC date extraction
        return utcDateString.split('T')[0];
      }
    };

    // Check if any promise was made TODAY (in client's timezone)
    const todayPromiseMade = integrityLogs.some((log: { promised_at: string }) => {
      return toLocalDateString(log.promised_at) === today;
    });

    // Filter pending promises: exclude promises made TODAY (save for tomorrow's review)
    // Use timezone-aware comparison to handle late-night promises correctly
    const pendingPromises = integrityLogs.filter((log: { kept: boolean | null; promised_at: string }) => {
      if (log.kept !== null) return false; // Already resolved
      // Exclude promises made today (in client's timezone) - they should be reviewed tomorrow
      return toLocalDateString(log.promised_at) !== today;
    });

    // Calculate consecutive streak from all daily_resets
    const calculateConsecutiveStreak = (completedDates: string[], todayStr: string): number => {
      // Get unique dates in client's timezone, sorted descending
      const uniqueDates = [...new Set(
        completedDates.map(dateStr => toLocalDateString(dateStr))
      )].sort().reverse();
      
      if (uniqueDates.length === 0) return 0;
      
      // Check if user checked in today or yesterday (grace period)
      const todayDate = new Date(todayStr + "T12:00:00"); // Use noon to avoid DST issues
      const firstDate = new Date(uniqueDates[0] + "T12:00:00");
      const daysDiff = Math.round((todayDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24));
      
      // If last check-in was more than 1 day ago, streak is broken
      if (daysDiff > 1) return 0;
      
      // If checked in today, start streak at 1. If yesterday, start at 0 (grace period).
      let streak = daysDiff === 0 ? 1 : 0;
      let expectedPrevDateStr = uniqueDates[0];
      
      // Count consecutive days going backwards
      for (let i = 1; i < uniqueDates.length; i++) {
        const prevExpected = new Date(expectedPrevDateStr + "T12:00:00");
        prevExpected.setDate(prevExpected.getDate() - 1);
        const prevExpectedStr = prevExpected.toISOString().split('T')[0];
        
        if (uniqueDates[i] === prevExpectedStr) {
          streak++;
          expectedPrevDateStr = prevExpectedStr;
        } else {
          break;
        }
      }
      
      // If we started with yesterday (grace period), add 1 for today's potential
      // Actually, if daysDiff === 1, the streak is what they had up to yesterday
      if (daysDiff === 1 && streak > 0) {
        streak++; // Include yesterday's check-in in the count
      }
      
      return streak;
    };

    const dailyResets = dailyResetsResult.data || [];
    const consecutiveStreak = calculateConsecutiveStreak(
      dailyResets.map((r: { completed_at: string }) => r.completed_at),
      today
    );

    return new Response(
      JSON.stringify({
        activeQuest: activeQuestResult.data,
        totalXp,
        integrityScore,
        pendingPromises,
        todayPromiseMade, // NEW: timezone-aware "made promise today" flag
        consecutiveStreak, // NEW: actual consecutive days checked in
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