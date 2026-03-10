import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function refreshFitbitToken(refreshToken: string) {
  const clientId = Deno.env.get("FITBIT_CLIENT_ID")!;
  const clientSecret = Deno.env.get("FITBIT_CLIENT_SECRET")!;
  const resp = await fetch("https://api.fitbit.com/oauth2/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken }),
  });
  if (!resp.ok) return null;
  return resp.json();
}

async function refreshOuraToken(refreshToken: string) {
  const clientId = Deno.env.get("OURA_CLIENT_ID")!;
  const clientSecret = Deno.env.get("OURA_CLIENT_SECRET")!;
  const resp = await fetch("https://api.ouraring.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken, client_id: clientId, client_secret: clientSecret }),
  });
  if (!resp.ok) return null;
  return resp.json();
}

async function refreshWhoopToken(refreshToken: string) {
  const clientId = Deno.env.get("WHOOP_CLIENT_ID")!;
  const clientSecret = Deno.env.get("WHOOP_CLIENT_SECRET")!;
  const resp = await fetch("https://api.prod.whoop.com/oauth/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken, client_id: clientId, client_secret: clientSecret }),
  });
  if (!resp.ok) return null;
  return resp.json();
}

function formatDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

async function syncFitbit(accessToken: string, userId: string, supabase: any) {
  const days: any[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const dateStr = formatDate(d);
    let steps: number | null = null, sleepMin: number | null = null, activeMin: number | null = null, heartRate: number | null = null;
    try {
      const r = await fetch(`https://api.fitbit.com/1/user/-/activities/date/${dateStr}.json`, { headers: { Authorization: `Bearer ${accessToken}` } });
      if (r.ok) { const d = await r.json(); steps = d.summary?.steps ?? null; activeMin = (d.summary?.veryActiveMinutes ?? 0) + (d.summary?.fairlyActiveMinutes ?? 0); }
    } catch (e) { console.error("Fitbit activities error:", e); }
    try {
      const r = await fetch(`https://api.fitbit.com/1/user/-/sleep/date/${dateStr}.json`, { headers: { Authorization: `Bearer ${accessToken}` } });
      if (r.ok) { const d = await r.json(); sleepMin = d.summary?.totalMinutesAsleep ?? null; }
    } catch (e) { console.error("Fitbit sleep error:", e); }
    try {
      const r = await fetch(`https://api.fitbit.com/1/user/-/activities/heart/date/${dateStr}/1d.json`, { headers: { Authorization: `Bearer ${accessToken}` } });
      if (r.ok) { const d = await r.json(); heartRate = d["activities-heart"]?.[0]?.value?.restingHeartRate ?? null; }
    } catch (e) { console.error("Fitbit heart error:", e); }
    days.push({ date: dateStr, steps, sleep_minutes: sleepMin, active_minutes: activeMin, heart_rate_avg: heartRate });
  }
  for (const day of days) {
    if (day.steps === null && day.sleep_minutes === null && day.active_minutes === null && day.heart_rate_avg === null) continue;
    await supabase.from("health_sync_data").upsert({ user_id: userId, sync_date: day.date, source: "fitbit", steps: day.steps, sleep_minutes: day.sleep_minutes, active_minutes: day.active_minutes, heart_rate_avg: day.heart_rate_avg, synced_at: new Date().toISOString() }, { onConflict: "user_id,sync_date,source" });
  }
  return days.filter(d => d.steps !== null || d.sleep_minutes !== null).length;
}

async function syncOura(accessToken: string, userId: string, supabase: any) {
  const endDate = formatDate(new Date());
  const startD = new Date(); startD.setDate(startD.getDate() - 7);
  const startDate = formatDate(startD);
  const dayMap: Record<string, any> = {};
  try {
    const r = await fetch(`https://api.ouraring.com/v2/usercollection/daily_sleep?start_date=${startDate}&end_date=${endDate}`, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (r.ok) { const d = await r.json(); for (const item of d.data || []) { const day = item.day; if (!dayMap[day]) dayMap[day] = {}; dayMap[day].sleep_minutes = item.contributors?.total_sleep ? Math.round(item.contributors.total_sleep / 60) : (item.total_sleep_duration ? Math.round(item.total_sleep_duration / 60) : null); } }
  } catch (e) { console.error("Oura sleep error:", e); }
  try {
    const r = await fetch(`https://api.ouraring.com/v2/usercollection/daily_activity?start_date=${startDate}&end_date=${endDate}`, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (r.ok) { const d = await r.json(); for (const item of d.data || []) { const day = item.day; if (!dayMap[day]) dayMap[day] = {}; dayMap[day].steps = item.steps ?? null; dayMap[day].active_minutes = item.high_activity_time ? Math.round(item.high_activity_time / 60) + Math.round((item.medium_activity_time || 0) / 60) : null; } }
  } catch (e) { console.error("Oura activity error:", e); }
  try {
    const r = await fetch(`https://api.ouraring.com/v2/usercollection/heartrate?start_date=${startDate}&end_date=${endDate}`, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (r.ok) { const d = await r.json(); const hrByDay: Record<string, number[]> = {}; for (const item of d.data || []) { const day = item.timestamp?.split("T")[0]; if (!day) continue; if (!hrByDay[day]) hrByDay[day] = []; if (item.bpm) hrByDay[day].push(item.bpm); } for (const [day, bpms] of Object.entries(hrByDay)) { if (!dayMap[day]) dayMap[day] = {}; dayMap[day].heart_rate_avg = Math.round(bpms.reduce((a, b) => a + b, 0) / bpms.length); } }
  } catch (e) { console.error("Oura heart rate error:", e); }
  let synced = 0;
  for (const [date, data] of Object.entries(dayMap)) {
    if (!data.steps && !data.sleep_minutes && !data.active_minutes && !data.heart_rate_avg) continue;
    await supabase.from("health_sync_data").upsert({ user_id: userId, sync_date: date, source: "oura", steps: data.steps ?? null, sleep_minutes: data.sleep_minutes ?? null, active_minutes: data.active_minutes ?? null, heart_rate_avg: data.heart_rate_avg ?? null, recovery_score: data.recovery_score ?? null, hrv_ms: data.hrv_ms ?? null, strain_score: null, synced_at: new Date().toISOString() }, { onConflict: "user_id,sync_date,source" });
    synced++;
  }
  return synced;
}

async function syncWhoop(accessToken: string, userId: string, supabase: any) {
  const now = new Date();
  const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(now.getDate() - 7);
  const startParam = sevenDaysAgo.toISOString();
  const endParam = now.toISOString();
  const headers = { Authorization: `Bearer ${accessToken}` };
  const baseUrl = "https://api.prod.whoop.com/developer/v1";

  let cyclesSynced = 0;

  // 1. Fetch Cycles (contains strain)
  try {
    const resp = await fetch(`${baseUrl}/cycle?start=${encodeURIComponent(startParam)}&end=${encodeURIComponent(endParam)}&limit=25`, { headers });
    if (resp.ok) {
      const data = await resp.json();
      for (const cycle of data.records || []) {
        const whoopId = String(cycle.id);
        await supabase.from("whoop_cycles").upsert({
          user_id: userId,
          whoop_id: whoopId,
          start_time: cycle.start,
          end_time: cycle.end,
          strain: cycle.score?.strain,
          kilojoules: cycle.score?.kilojoule,
          avg_heart_rate: cycle.score?.average_heart_rate,
          max_heart_rate: cycle.score?.max_heart_rate,
        }, { onConflict: "user_id,whoop_id" });
        cyclesSynced++;
      }
    }
  } catch (e) { console.error("WHOOP cycles error:", e); }

  // 2. Fetch Recovery
  try {
    const resp = await fetch(`${baseUrl}/recovery?start=${encodeURIComponent(startParam)}&end=${encodeURIComponent(endParam)}&limit=25`, { headers });
    if (resp.ok) {
      const data = await resp.json();
      for (const rec of data.records || []) {
        const whoopId = String(rec.cycle_id);
        await supabase.from("whoop_recoveries").upsert({
          user_id: userId,
          whoop_id: whoopId,
          whoop_cycle_id: String(rec.cycle_id),
          recovery_score: rec.score?.recovery_score,
          resting_heart_rate: rec.score?.resting_heart_rate,
          hrv_rmssd_milli: rec.score?.hrv_rmssd_milli,
          spo2_percentage: rec.score?.spo2_percentage,
          skin_temp_celsius: rec.score?.skin_temp_celsius,
          recorded_at: rec.created_at,
        }, { onConflict: "user_id,whoop_id" });
      }
    }
  } catch (e) { console.error("WHOOP recovery error:", e); }

  // 3. Fetch Sleep
  try {
    const resp = await fetch(`${baseUrl}/activity/sleep?start=${encodeURIComponent(startParam)}&end=${encodeURIComponent(endParam)}&limit=25`, { headers });
    if (resp.ok) {
      const data = await resp.json();
      for (const sleep of data.records || []) {
        const whoopId = String(sleep.id);
        await supabase.from("whoop_sleeps").upsert({
          user_id: userId,
          whoop_id: whoopId,
          sleep_performance_pct: sleep.score?.sleep_performance_percentage,
          sleep_consistency_pct: sleep.score?.sleep_consistency_percentage,
          sleep_efficiency_pct: sleep.score?.sleep_efficiency_percentage,
          respiratory_rate: sleep.score?.respiratory_rate,
          total_in_bed_ms: sleep.score?.stage_summary?.total_in_bed_time_milli,
          total_awake_ms: sleep.score?.stage_summary?.total_awake_time_milli,
          total_light_ms: sleep.score?.stage_summary?.total_light_sleep_time_milli,
          total_sws_ms: sleep.score?.stage_summary?.total_slow_wave_sleep_time_milli,
          total_rem_ms: sleep.score?.stage_summary?.total_rem_sleep_time_milli,
          sleep_cycle_count: sleep.score?.stage_summary?.sleep_cycle_count,
          disturbance_count: sleep.score?.stage_summary?.disturbance_count,
          start_time: sleep.start,
          end_time: sleep.end,
        }, { onConflict: "user_id,whoop_id" });
      }
    }
  } catch (e) { console.error("WHOOP sleep error:", e); }

  // 4. Fetch Workouts
  try {
    const resp = await fetch(`${baseUrl}/activity/workout?start=${encodeURIComponent(startParam)}&end=${encodeURIComponent(endParam)}&limit=25`, { headers });
    if (resp.ok) {
      const data = await resp.json();
      for (const workout of data.records || []) {
        const whoopId = String(workout.id);
        await supabase.from("whoop_workouts").upsert({
          user_id: userId,
          whoop_id: whoopId,
          activity_type: workout.sport_id ? String(workout.sport_id) : null,
          strain: workout.score?.strain,
          avg_heart_rate: workout.score?.average_heart_rate,
          start_time: workout.start,
          end_time: workout.end,
          whoop_cycle_id: workout.score?.zone_duration ? null : null,
        }, { onConflict: "user_id,whoop_id" });
      }
    }
  } catch (e) { console.error("WHOOP workouts error:", e); }

  // 5. Normalize into health_sync_data for BrainBodyTracker compatibility
  // Group by date from cycles and recovery
  const { data: recentRecoveries } = await supabase.from("whoop_recoveries").select("*").eq("user_id", userId).order("recorded_at", { ascending: false }).limit(7);
  const { data: recentSleeps } = await supabase.from("whoop_sleeps").select("*").eq("user_id", userId).order("end_time", { ascending: false }).limit(7);
  const { data: recentCycles } = await supabase.from("whoop_cycles").select("*").eq("user_id", userId).order("start_time", { ascending: false }).limit(7);

  const dayMap: Record<string, any> = {};

  for (const rec of recentRecoveries || []) {
    const date = rec.recorded_at ? rec.recorded_at.split("T")[0] : null;
    if (!date) continue;
    if (!dayMap[date]) dayMap[date] = {};
    dayMap[date].heart_rate_avg = rec.resting_heart_rate;
    dayMap[date].recovery_score = rec.recovery_score;
    dayMap[date].hrv_ms = rec.hrv_rmssd_milli;
  }

  for (const sleep of recentSleeps || []) {
    const date = sleep.end_time ? sleep.end_time.split("T")[0] : null;
    if (!date) continue;
    if (!dayMap[date]) dayMap[date] = {};
    const totalSleepMs = (sleep.total_light_ms || 0) + (sleep.total_sws_ms || 0) + (sleep.total_rem_ms || 0);
    dayMap[date].sleep_minutes = Math.round(totalSleepMs / 60000);
  }

  for (const cycle of recentCycles || []) {
    const date = cycle.start_time ? cycle.start_time.split("T")[0] : null;
    if (!date) continue;
    if (!dayMap[date]) dayMap[date] = {};
    // Use strain as a proxy for active minutes (WHOOP strain 0-21 → scale to minutes)
    if (cycle.strain) {
      dayMap[date].active_minutes = Math.round(cycle.strain * 5);
      dayMap[date].strain_score = cycle.strain;
    }
  }

  for (const [date, data] of Object.entries(dayMap)) {
    await supabase.from("health_sync_data").upsert({
      user_id: userId,
      sync_date: date,
      source: "whoop",
      steps: null,
      sleep_minutes: (data as any).sleep_minutes ?? null,
      active_minutes: (data as any).active_minutes ?? null,
      heart_rate_avg: (data as any).heart_rate_avg ?? null,
      recovery_score: (data as any).recovery_score ?? null,
      hrv_ms: (data as any).hrv_ms ?? null,
      strain_score: (data as any).strain_score ?? null,
      synced_at: new Date().toISOString(),
    }, { onConflict: "user_id,sync_date,source" });
  }

  return cyclesSynced;
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

    if (!provider || !["fitbit", "oura", "whoop"].includes(provider)) {
      return new Response(JSON.stringify({ error: "Invalid provider" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
      let refreshed;
      if (provider === "fitbit") refreshed = await refreshFitbitToken(conn.refresh_token);
      else if (provider === "oura") refreshed = await refreshOuraToken(conn.refresh_token);
      else refreshed = await refreshWhoopToken(conn.refresh_token);

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

    let daysSynced: number;
    if (provider === "fitbit") daysSynced = await syncFitbit(accessToken, userId, serviceSupabase);
    else if (provider === "oura") daysSynced = await syncOura(accessToken, userId, serviceSupabase);
    else daysSynced = await syncWhoop(accessToken, userId, serviceSupabase);

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
