import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function refreshFitbitToken(refreshToken: string): Promise<{ access_token: string; refresh_token: string; expires_in: number } | null> {
  const clientId = Deno.env.get("FITBIT_CLIENT_ID")!;
  const clientSecret = Deno.env.get("FITBIT_CLIENT_SECRET")!;

  const resp = await fetch("https://api.fitbit.com/oauth2/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!resp.ok) return null;
  return resp.json();
}

async function refreshOuraToken(refreshToken: string): Promise<{ access_token: string; refresh_token: string; expires_in: number } | null> {
  const clientId = Deno.env.get("OURA_CLIENT_ID")!;
  const clientSecret = Deno.env.get("OURA_CLIENT_SECRET")!;

  const resp = await fetch("https://api.ouraring.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!resp.ok) return null;
  return resp.json();
}

function formatDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

async function syncFitbit(accessToken: string, userId: string, supabase: any) {
  const days: { date: string; steps: number | null; sleep_minutes: number | null; active_minutes: number | null; heart_rate_avg: number | null }[] = [];

  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = formatDate(d);

    let steps: number | null = null;
    let sleepMin: number | null = null;
    let activeMin: number | null = null;
    let heartRate: number | null = null;

    try {
      const actResp = await fetch(`https://api.fitbit.com/1/user/-/activities/date/${dateStr}.json`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (actResp.ok) {
        const actData = await actResp.json();
        steps = actData.summary?.steps ?? null;
        activeMin = (actData.summary?.veryActiveMinutes ?? 0) + (actData.summary?.fairlyActiveMinutes ?? 0);
      }
    } catch (e) { console.error("Fitbit activities error:", e); }

    try {
      const sleepResp = await fetch(`https://api.fitbit.com/1/user/-/sleep/date/${dateStr}.json`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (sleepResp.ok) {
        const sleepData = await sleepResp.json();
        sleepMin = sleepData.summary?.totalMinutesAsleep ?? null;
      }
    } catch (e) { console.error("Fitbit sleep error:", e); }

    try {
      const hrResp = await fetch(`https://api.fitbit.com/1/user/-/activities/heart/date/${dateStr}/1d.json`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (hrResp.ok) {
        const hrData = await hrResp.json();
        heartRate = hrData["activities-heart"]?.[0]?.value?.restingHeartRate ?? null;
      }
    } catch (e) { console.error("Fitbit heart error:", e); }

    days.push({ date: dateStr, steps, sleep_minutes: sleepMin, active_minutes: activeMin, heart_rate_avg: heartRate });
  }

  // Upsert into health_sync_data
  for (const day of days) {
    if (day.steps === null && day.sleep_minutes === null && day.active_minutes === null && day.heart_rate_avg === null) continue;

    await supabase.from("health_sync_data").upsert(
      {
        user_id: userId,
        sync_date: day.date,
        source: "fitbit",
        steps: day.steps,
        sleep_minutes: day.sleep_minutes,
        active_minutes: day.active_minutes,
        heart_rate_avg: day.heart_rate_avg,
        synced_at: new Date().toISOString(),
      },
      { onConflict: "user_id,sync_date,source" }
    );
  }

  return days.filter(d => d.steps !== null || d.sleep_minutes !== null).length;
}

async function syncOura(accessToken: string, userId: string, supabase: any) {
  const endDate = formatDate(new Date());
  const startD = new Date();
  startD.setDate(startD.getDate() - 7);
  const startDate = formatDate(startD);

  const dayMap: Record<string, { steps: number | null; sleep_minutes: number | null; active_minutes: number | null; heart_rate_avg: number | null }> = {};

  try {
    const sleepResp = await fetch(`https://api.ouraring.com/v2/usercollection/daily_sleep?start_date=${startDate}&end_date=${endDate}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (sleepResp.ok) {
      const sleepData = await sleepResp.json();
      for (const item of sleepData.data || []) {
        const d = item.day;
        if (!dayMap[d]) dayMap[d] = { steps: null, sleep_minutes: null, active_minutes: null, heart_rate_avg: null };
        dayMap[d].sleep_minutes = item.contributors?.total_sleep ? Math.round(item.contributors.total_sleep / 60) : (item.total_sleep_duration ? Math.round(item.total_sleep_duration / 60) : null);
      }
    }
  } catch (e) { console.error("Oura sleep error:", e); }

  try {
    const actResp = await fetch(`https://api.ouraring.com/v2/usercollection/daily_activity?start_date=${startDate}&end_date=${endDate}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (actResp.ok) {
      const actData = await actResp.json();
      for (const item of actData.data || []) {
        const d = item.day;
        if (!dayMap[d]) dayMap[d] = { steps: null, sleep_minutes: null, active_minutes: null, heart_rate_avg: null };
        dayMap[d].steps = item.steps ?? null;
        dayMap[d].active_minutes = item.high_activity_time ? Math.round(item.high_activity_time / 60) + Math.round((item.medium_activity_time || 0) / 60) : null;
      }
    }
  } catch (e) { console.error("Oura activity error:", e); }

  try {
    const hrResp = await fetch(`https://api.ouraring.com/v2/usercollection/heartrate?start_date=${startDate}&end_date=${endDate}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (hrResp.ok) {
      const hrData = await hrResp.json();
      // Aggregate heart rate by day
      const hrByDay: Record<string, number[]> = {};
      for (const item of hrData.data || []) {
        const d = item.timestamp?.split("T")[0];
        if (!d) continue;
        if (!hrByDay[d]) hrByDay[d] = [];
        if (item.bpm) hrByDay[d].push(item.bpm);
      }
      for (const [d, bpms] of Object.entries(hrByDay)) {
        if (!dayMap[d]) dayMap[d] = { steps: null, sleep_minutes: null, active_minutes: null, heart_rate_avg: null };
        dayMap[d].heart_rate_avg = Math.round(bpms.reduce((a, b) => a + b, 0) / bpms.length);
      }
    }
  } catch (e) { console.error("Oura heart rate error:", e); }

  let synced = 0;
  for (const [date, data] of Object.entries(dayMap)) {
    if (data.steps === null && data.sleep_minutes === null && data.active_minutes === null && data.heart_rate_avg === null) continue;

    await supabase.from("health_sync_data").upsert(
      {
        user_id: userId,
        sync_date: date,
        source: "oura",
        steps: data.steps,
        sleep_minutes: data.sleep_minutes,
        active_minutes: data.active_minutes,
        heart_rate_avg: data.heart_rate_avg,
        synced_at: new Date().toISOString(),
      },
      { onConflict: "user_id,sync_date,source" }
    );
    synced++;
  }

  return synced;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonSupabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await anonSupabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub as string;
    const { provider } = await req.json();

    if (!provider || !["fitbit", "oura"].includes(provider)) {
      return new Response(JSON.stringify({ error: "Invalid provider" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role to read tokens
    const serviceSupabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: conn, error: connError } = await serviceSupabase
      .from("wearable_connections")
      .select("*")
      .eq("user_id", userId)
      .eq("provider", provider)
      .single();

    if (connError || !conn) {
      return new Response(JSON.stringify({ error: "Not connected" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let accessToken = conn.access_token;

    // Refresh token if expired
    const expiresAt = new Date(conn.token_expires_at).getTime();
    if (Date.now() > expiresAt - 60000) {
      const refreshed = provider === "fitbit"
        ? await refreshFitbitToken(conn.refresh_token)
        : await refreshOuraToken(conn.refresh_token);

      if (!refreshed) {
        return new Response(JSON.stringify({ error: "Token refresh failed. Please reconnect." }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      accessToken = refreshed.access_token;
      await serviceSupabase
        .from("wearable_connections")
        .update({
          access_token: refreshed.access_token,
          refresh_token: refreshed.refresh_token,
          token_expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
        })
        .eq("user_id", userId)
        .eq("provider", provider);
    }

    // Sync data
    const daysSynced = provider === "fitbit"
      ? await syncFitbit(accessToken, userId, serviceSupabase)
      : await syncOura(accessToken, userId, serviceSupabase);

    // Update last_synced_at
    await serviceSupabase
      .from("wearable_connections")
      .update({ last_synced_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("provider", provider);

    return new Response(JSON.stringify({ days_synced: daysSynced }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("wearable-sync error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
