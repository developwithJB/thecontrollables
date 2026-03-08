import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface DaySummary {
  date: string;
  steps: number | null;
  sleep_minutes: number | null;
  active_minutes: number | null;
  heart_rate_avg: number | null;
}

function parseAppleHealthXML(xml: string): DaySummary[] {
  const dayMap = new Map<string, { steps: number; sleep: number; active: number; hrSum: number; hrCount: number }>();

  const getOrCreate = (date: string) => {
    if (!dayMap.has(date)) dayMap.set(date, { steps: 0, sleep: 0, active: 0, hrSum: 0, hrCount: 0 });
    return dayMap.get(date)!;
  };

  // Parse Record elements for steps, active energy, heart rate
  const recordRegex = /<Record\s[^>]*?type="([^"]*)"[^>]*?startDate="([^"]*)"[^>]*?value="([^"]*)"[^>]*?\/>/g;
  let match;
  while ((match = recordRegex.exec(xml)) !== null) {
    const [, type, startDate, value] = match;
    const date = startDate.substring(0, 10); // YYYY-MM-DD
    const numValue = parseFloat(value);
    if (isNaN(numValue)) continue;

    const day = getOrCreate(date);
    if (type === "HKQuantityTypeIdentifierStepCount") {
      day.steps += Math.round(numValue);
    } else if (type === "HKQuantityTypeIdentifierActiveEnergyBurned") {
      // Rough: 1 calorie ≈ 0.05 active minutes (heuristic)
      day.active += Math.round(numValue * 0.05);
    } else if (type === "HKQuantityTypeIdentifierHeartRate") {
      day.hrSum += numValue;
      day.hrCount++;
    }
  }

  // Parse sleep analysis
  const sleepRegex = /<Record\s[^>]*?type="HKCategoryTypeIdentifierSleepAnalysis"[^>]*?startDate="([^"]*)"[^>]*?endDate="([^"]*)"[^>]*?value="([^"]*)"[^>]*?\/>/g;
  while ((match = sleepRegex.exec(xml)) !== null) {
    const [, startDate, endDate, value] = match;
    // Only count actual sleep (InBed or Asleep)
    if (value.includes("Asleep") || value.includes("InBed")) {
      const start = new Date(startDate).getTime();
      const end = new Date(endDate).getTime();
      const minutes = Math.round((end - start) / 60000);
      if (minutes > 0 && minutes < 1440) {
        const date = startDate.substring(0, 10);
        getOrCreate(date).sleep += minutes;
      }
    }
  }

  // Convert to summaries, limit to last 30 days
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  const cutoffStr = cutoff.toISOString().split("T")[0];

  return Array.from(dayMap.entries())
    .filter(([date]) => date >= cutoffStr)
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 30)
    .map(([date, d]) => ({
      date,
      steps: d.steps || null,
      sleep_minutes: d.sleep || null,
      active_minutes: d.active || null,
      heart_rate_avg: d.hrCount > 0 ? Math.round(d.hrSum / d.hrCount) : null,
    }));
}

function parseGoogleFitCSV(csv: string): DaySummary[] {
  const lines = csv.split("\n").filter((l) => l.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].toLowerCase().split(",").map((h) => h.trim());
  const dateIdx = headers.findIndex((h) => h.includes("date"));
  const stepsIdx = headers.findIndex((h) => h.includes("step"));
  const sleepIdx = headers.findIndex((h) => h.includes("sleep"));
  const activeIdx = headers.findIndex((h) => h.includes("active") || h.includes("move"));
  const hrIdx = headers.findIndex((h) => h.includes("heart"));

  if (dateIdx === -1) return [];

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  const cutoffStr = cutoff.toISOString().split("T")[0];

  return lines
    .slice(1)
    .map((line) => {
      const cols = line.split(",").map((c) => c.trim());
      const date = cols[dateIdx]?.substring(0, 10);
      if (!date || date < cutoffStr) return null;
      return {
        date,
        steps: stepsIdx >= 0 ? parseInt(cols[stepsIdx]) || null : null,
        sleep_minutes: sleepIdx >= 0 ? parseInt(cols[sleepIdx]) || null : null,
        active_minutes: activeIdx >= 0 ? parseInt(cols[activeIdx]) || null : null,
        heart_rate_avg: hrIdx >= 0 ? parseInt(cols[hrIdx]) || null : null,
      };
    })
    .filter(Boolean)
    .slice(0, 30) as DaySummary[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }
    const userId = claimsData.claims.sub;

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const source = (formData.get("source") as string) || "apple_health";

    if (!file) {
      return new Response(JSON.stringify({ error: "No file provided" }), { status: 400, headers: corsHeaders });
    }

    // Limit file size to 50MB
    if (file.size > 50 * 1024 * 1024) {
      return new Response(JSON.stringify({ error: "File too large (max 50MB)" }), { status: 400, headers: corsHeaders });
    }

    const text = await file.text();
    let summaries: DaySummary[];

    if (source === "apple_health") {
      summaries = parseAppleHealthXML(text);
    } else if (source === "google_fit") {
      summaries = parseGoogleFitCSV(text);
    } else {
      return new Response(JSON.stringify({ error: "Invalid source" }), { status: 400, headers: corsHeaders });
    }

    if (summaries.length === 0) {
      return new Response(
        JSON.stringify({ error: "No health data found in file. Make sure you exported the correct format." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Upsert into health_sync_data
    const rows = summaries.map((s) => ({
      user_id: userId,
      sync_date: s.date,
      source,
      steps: s.steps,
      sleep_minutes: s.sleep_minutes,
      active_minutes: s.active_minutes,
      heart_rate_avg: s.heart_rate_avg,
      raw_data: {},
      synced_at: new Date().toISOString(),
    }));

    // Batch upsert (unique on user_id, sync_date, source)
    const { error: upsertError } = await supabase
      .from("health_sync_data")
      .upsert(rows, { onConflict: "user_id,sync_date,source" });

    if (upsertError) {
      console.error("Upsert error:", upsertError);
      return new Response(
        JSON.stringify({ error: "Failed to save health data" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, days_imported: summaries.length, source }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Parse error:", err);
    return new Response(
      JSON.stringify({ error: "Failed to parse health export" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
