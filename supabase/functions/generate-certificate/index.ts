import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

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
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { type } = body;

    if (type === "season") {
      return await handleSeasonCertificate(body, user, supabaseAdmin);
    }

    // Default: snapshot certificate (existing logic)
    return await handleSnapshotCertificate(body, user, supabaseAdmin);
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ─── Season Certificate ───────────────────────────────────────────────────────

async function handleSeasonCertificate(body: any, user: any, supabaseAdmin: any) {
  const { season_id } = body;
  if (!season_id) {
    return new Response(
      JSON.stringify({ error: "season_id is required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Fetch season
  const { data: season, error: seasonErr } = await supabaseAdmin
    .from("seasons")
    .select("*")
    .eq("id", season_id)
    .eq("user_id", user.id)
    .single();

  if (seasonErr || !season) {
    return new Response(
      JSON.stringify({ error: "Season not found" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Check existing certificate
  const { data: existingCert } = await supabaseAdmin
    .from("certificates")
    .select("*")
    .eq("season_id", season_id)
    .eq("certificate_type", "season")
    .maybeSingle();

  if (existingCert?.certificate_url && existingCert?.reflection_text) {
    return new Response(
      JSON.stringify({ certificate_url: existingCert.certificate_url, reflection_text: existingCert.reflection_text }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Fetch projects for this season
  const { data: projects = [] } = await supabaseAdmin
    .from("projects")
    .select("*")
    .eq("season_id", season_id)
    .eq("user_id", user.id);

  // Calculate season duration
  const startDate = season.started_at?.split("T")[0] || season.created_at?.split("T")[0];
  const endDate = (season.completed_at || new Date().toISOString()).split("T")[0];
  const durationDays = Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000);

  // Fetch aggregate health data for the season
  const { data: healthRows = [] } = await supabaseAdmin
    .from("health_sync_data")
    .select("sync_date, recovery_score, hrv_ms, strain_score")
    .eq("user_id", user.id)
    .gte("sync_date", startDate)
    .lte("sync_date", endDate);

  // Calculate wearable aggregates
  const recoveryScores = healthRows.filter((h: any) => h.recovery_score != null).map((h: any) => h.recovery_score);
  const avgRecovery = recoveryScores.length > 0 ? Math.round(recoveryScores.reduce((a: number, b: number) => a + b, 0) / recoveryScores.length) : null;

  // Best/hardest week by recovery
  const weekMap: Record<string, number[]> = {};
  for (const h of healthRows) {
    if (h.recovery_score == null) continue;
    const d = new Date(h.sync_date + "T00:00:00");
    const weekStart = new Date(d);
    weekStart.setDate(d.getDate() - d.getDay());
    const weekKey = weekStart.toISOString().split("T")[0];
    if (!weekMap[weekKey]) weekMap[weekKey] = [];
    weekMap[weekKey].push(h.recovery_score);
  }
  const weekAvgs = Object.entries(weekMap).map(([wk, scores]) => ({
    week: wk,
    avg: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
  }));
  weekAvgs.sort((a, b) => b.avg - a.avg);
  const bestWeek = weekAvgs[0] || null;
  const hardestWeek = weekAvgs[weekAvgs.length - 1] || null;

  // Identify most momentum / most struggled project
  const sortedProjects = [...projects].sort((a: any, b: any) => (b.momentum_score || 0) - (a.momentum_score || 0));
  const mostMomentum = sortedProjects[0] || null;
  const mostStruggled = sortedProjects.length > 1 ? sortedProjects[sortedProjects.length - 1] : null;

  // Get profile
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .single();
  const displayName = profile?.display_name || user.email?.split("@")[0] || "Participant";

  // Generate AI reflection
  let reflectionText = "";
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (LOVABLE_API_KEY) {
    try {
      const projectList = projects.map((p: any) => `${p.emoji || "📁"} ${p.name} (momentum: ${p.momentum_score ?? "N/A"}, controllable: ${p.controllable || "general"})`).join("; ");
      const prompt = `Write one paragraph (3-4 sentences) reflecting on a user's Season. Be warm but direct. Reference project names specifically. Connect body data to output where available.

Season: "${season.name || "Untitled Season"}", ${durationDays} days.
Projects: ${projectList || "No projects tracked."}
${avgRecovery != null ? `Average recovery: ${avgRecovery}%` : "No wearable data."}
${bestWeek ? `Best week recovery: ${bestWeek.avg}% (week of ${bestWeek.week})` : ""}
${hardestWeek && hardestWeek !== bestWeek ? `Hardest week recovery: ${hardestWeek.avg}% (week of ${hardestWeek.week})` : ""}
${mostMomentum ? `Most momentum: ${mostMomentum.name}` : ""}
${mostStruggled ? `Most struggled: ${mostStruggled.name}` : ""}`;

      const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: "You write brief, insightful reflections about personal growth seasons. Be specific about project names and data. No bullet points." },
            { role: "user", content: prompt },
          ],
        }),
      });
      if (aiResp.ok) {
        const aiData = await aiResp.json();
        reflectionText = aiData.choices?.[0]?.message?.content || "";
      }
    } catch (e) {
      console.error("AI reflection error:", e);
    }
  }

  if (!reflectionText) {
    reflectionText = `Over ${durationDays} days, you navigated ${projects.length} project${projects.length !== 1 ? "s" : ""}${avgRecovery != null ? ` with an average recovery of ${avgRecovery}%` : ""}. ${mostMomentum ? `${mostMomentum.name} showed the most momentum.` : ""} Season complete.`;
  }

  // Generate SVG certificate
  const svgWidth = 1200;
  const svgHeight = 1000;
  const seasonTitle = escapeXml(season.name || "Season Complete");

  const projectLines = projects.slice(0, 5).map((p: any, i: number) => {
    const emoji = p.emoji || "📁";
    const momentum = p.momentum_score ?? 0;
    const barWidth = Math.max(20, (momentum / 100) * 300);
    const y = 560 + i * 55;
    return `
    <g transform="translate(200, ${y})">
      <text x="0" y="15" font-family="system-ui, sans-serif" font-size="18" fill="#e2e8f0">${emoji} ${escapeXml(p.name || "Project")}</text>
      <rect x="400" y="2" width="300" height="18" rx="9" fill="#1e293b" stroke="#334155" stroke-width="0.5"/>
      <rect x="400" y="2" width="${barWidth}" height="18" rx="9" fill="#f59e0b" fill-opacity="0.7"/>
      <text x="710" y="16" font-family="system-ui, sans-serif" font-size="12" fill="#94a3b8">${momentum}%</text>
    </g>`;
  }).join("");

  const wearableSection = avgRecovery != null ? `
    <g transform="translate(200, ${560 + Math.min(projects.length, 5) * 55 + 30})">
      <text x="0" y="0" font-family="system-ui, sans-serif" font-size="12" fill="#64748b" letter-spacing="2">BODY DATA</text>
      <text x="0" y="30" font-family="system-ui, sans-serif" font-size="16" fill="#94a3b8">Avg Recovery: ${avgRecovery}%${bestWeek ? `  ·  Best Week: ${bestWeek.avg}%` : ""}${hardestWeek && hardestWeek !== bestWeek ? `  ·  Hardest: ${hardestWeek.avg}%` : ""}</text>
    </g>
  ` : "";

  // Wrap reflection text for SVG display
  const reflectionWrapped = wrapText(escapeXml(reflectionText), 80);
  const reflectionY = 560 + Math.min(projects.length, 5) * 55 + (avgRecovery != null ? 90 : 30);
  const reflectionSvg = reflectionWrapped.map((line, i) =>
    `<text x="${svgWidth / 2}" y="${reflectionY + i * 22}" text-anchor="middle" font-family="Georgia, serif" font-size="14" font-style="italic" fill="#94a3b8">${line}</text>`
  ).join("\n");

  const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0f172a"/>
      <stop offset="50%" style="stop-color:#1e293b"/>
      <stop offset="100%" style="stop-color:#0f172a"/>
    </linearGradient>
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#f59e0b"/>
      <stop offset="50%" style="stop-color:#fbbf24"/>
      <stop offset="100%" style="stop-color:#f59e0b"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="20%" r="60%">
      <stop offset="0%" style="stop-color:#f59e0b;stop-opacity:0.12"/>
      <stop offset="100%" style="stop-color:#f59e0b;stop-opacity:0"/>
    </radialGradient>
  </defs>
  <rect width="${svgWidth}" height="${svgHeight}" fill="url(#bgGrad)"/>
  <rect width="${svgWidth}" height="${svgHeight}" fill="url(#glow)"/>
  <rect x="20" y="20" width="${svgWidth - 40}" height="${svgHeight - 40}" rx="24" fill="none" stroke="#f59e0b" stroke-opacity="0.3" stroke-width="2"/>

  <!-- Badge -->
  <rect x="${svgWidth / 2 - 100}" y="50" width="200" height="36" rx="18" fill="#f59e0b" fill-opacity="0.15" stroke="#f59e0b" stroke-opacity="0.3"/>
  <text x="${svgWidth / 2}" y="74" text-anchor="middle" font-family="system-ui, sans-serif" font-size="13" font-weight="500" fill="#f59e0b" letter-spacing="3">THE CONTROLLABLES</text>

  <text x="${svgWidth / 2}" y="130" text-anchor="middle" font-family="Georgia, serif" font-size="14" font-style="italic" fill="#94a3b8" letter-spacing="1">Season Certificate</text>
  <line x1="${svgWidth / 2 - 100}" y1="155" x2="${svgWidth / 2 + 100}" y2="155" stroke="#f59e0b" stroke-opacity="0.3"/>

  <text x="${svgWidth / 2}" y="220" text-anchor="middle" font-size="56">🏆</text>

  <text x="${svgWidth / 2}" y="290" text-anchor="middle" font-family="Georgia, serif" font-size="26" font-weight="600" fill="#ffffff" letter-spacing="3">SEASON COMPLETE</text>

  <!-- Season name -->
  <text x="${svgWidth / 2}" y="340" text-anchor="middle" font-family="Georgia, serif" font-size="22" fill="url(#goldGrad)">${seasonTitle}</text>

  <!-- User name -->
  <text x="${svgWidth / 2}" y="400" text-anchor="middle" font-family="Georgia, serif" font-size="48" font-style="italic" fill="url(#goldGrad)">${escapeXml(displayName)}</text>

  <!-- Duration -->
  <text x="${svgWidth / 2}" y="450" text-anchor="middle" font-family="system-ui, sans-serif" font-size="16" fill="#94a3b8">${durationDays} days · ${projects.length} project${projects.length !== 1 ? "s" : ""}</text>

  <!-- Divider -->
  <line x1="${svgWidth / 2 - 200}" y1="480" x2="${svgWidth / 2 + 200}" y2="480" stroke="#f59e0b" stroke-opacity="0.2"/>

  <!-- Projects header -->
  <text x="200" y="530" font-family="system-ui, sans-serif" font-size="12" fill="#64748b" letter-spacing="2">PROJECTS</text>
  ${projectLines}

  ${wearableSection}

  ${reflectionSvg}

  <!-- Footer -->
  <text x="${svgWidth / 2}" y="${svgHeight - 25}" text-anchor="middle" font-family="system-ui, sans-serif" font-size="12" fill="#64748b">thedashboard.agbcoaching.com</text>
</svg>`;

  const svgBlob = new Blob([svgContent], { type: "image/svg+xml" });
  const certId = existingCert?.id || crypto.randomUUID();
  const storagePath = `${user.id}/season-${certId}.svg`;

  const { error: uploadError } = await supabaseAdmin.storage
    .from("certificates")
    .upload(storagePath, svgBlob, { contentType: "image/svg+xml", upsert: true });

  if (uploadError) {
    console.error("Upload error:", uploadError);
    return new Response(
      JSON.stringify({ error: "Failed to upload certificate" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const { data: urlData } = supabaseAdmin.storage.from("certificates").getPublicUrl(storagePath);
  const certificateUrl = urlData.publicUrl;

  // Upsert certificate record
  await supabaseAdmin.from("certificates").upsert({
    id: certId,
    user_id: user.id,
    season_id: season_id,
    certificate_type: "season",
    display_name: displayName,
    start_date: startDate,
    end_date: endDate,
    certificate_url: certificateUrl,
    reflection_text: reflectionText,
    total_xp: null,
    level: null,
    badges_earned: null,
  }, { onConflict: "id" });

  return new Response(
    JSON.stringify({ certificate_url: certificateUrl, reflection_text: reflectionText }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// ─── Snapshot Certificate (original logic) ────────────────────────────────────

async function handleSnapshotCertificate(body: any, user: any, supabaseAdmin: any) {
  const { reset_session_id } = body;

  if (!reset_session_id) {
    return new Response(
      JSON.stringify({ error: "reset_session_id is required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Verify reset session belongs to user and is completed
  const { data: session, error: sessionError } = await supabaseAdmin
    .from("reset_sessions")
    .select("*")
    .eq("id", reset_session_id)
    .eq("user_id", user.id)
    .single();

  if (sessionError || !session) {
    return new Response(
      JSON.stringify({ error: "Reset session not found or does not belong to user" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (session.status !== "completed") {
    return new Response(
      JSON.stringify({ error: "Reset session is not completed" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const { data: completedDays, error: daysError } = await supabaseAdmin
    .from("daily_resets")
    .select("day_number")
    .eq("session_id", reset_session_id)
    .eq("user_id", user.id);

  if (daysError) {
    return new Response(
      JSON.stringify({ error: "Failed to verify completion" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const completedDayNumbers = completedDays?.map((d: any) => d.day_number) || [];
  if (completedDayNumbers.length < 7) {
    return new Response(
      JSON.stringify({
        error: "Certificate requires all 7 days completed",
        completed_days: completedDayNumbers.length,
        message: `You completed ${completedDayNumbers.length} of 7 days. Complete a full 7-day snapshot to earn your certificate.`
      }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .single();

  const displayName = profile?.display_name || user.email?.split("@")[0] || "Participant";

  const startDate = session.start_date;
  const endDateObj = new Date(startDate + "T00:00:00");
  endDateObj.setDate(endDateObj.getDate() + 6);
  const endDate = endDateObj.toISOString().split("T")[0];

  // Check if certificate already exists
  const { data: existingCert } = await supabaseAdmin
    .from("certificates")
    .select("*")
    .eq("reset_session_id", reset_session_id)
    .single();

  if (existingCert?.certificate_url) {
    return new Response(
      JSON.stringify({ certificate_url: existingCert.certificate_url }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const { data: userBadges } = await supabaseAdmin
    .from("user_badges")
    .select("badge_key, earned_at")
    .eq("user_id", user.id)
    .order("earned_at", { ascending: true });

  const earnedBadgeKeys = userBadges?.map((b: any) => b.badge_key) || [];

  const { data: xpLogs } = await supabaseAdmin
    .from("xp_logs")
    .select("amount")
    .eq("user_id", user.id);

  const totalXp = xpLogs?.reduce((sum: number, log: any) => sum + log.amount, 0) || 0;
  const level = Math.floor(totalXp / 500) + 1;

  const { data: certRecord, error: upsertError } = await supabaseAdmin
    .from("certificates")
    .upsert(
      {
        user_id: user.id,
        reset_session_id,
        display_name: displayName,
        start_date: startDate,
        end_date: endDate,
        badges_earned: earnedBadgeKeys,
        total_xp: totalXp,
        level: level,
        certificate_type: "snapshot",
      },
      { onConflict: "reset_session_id" }
    )
    .select()
    .single();

  if (upsertError || !certRecord) {
    return new Response(
      JSON.stringify({ error: "Failed to create certificate record" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const certificateId = certRecord.id;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  };

  const startFormatted = formatDate(startDate);
  const endFormatted = formatDate(endDate);

  const svgWidth = 1200;
  const svgHeight = 900;

  const controllables = [
    { name: "Awareness", emoji: "🦉" },
    { name: "Perspective", emoji: "🐢" },
    { name: "Habit", emoji: "🦈" },
    { name: "Wellness", emoji: "🛰️" },
    { name: "Environment", emoji: "🚀" },
  ];

  const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}">
  <defs>
    <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0f172a"/>
      <stop offset="50%" style="stop-color:#1e293b"/>
      <stop offset="100%" style="stop-color:#0f172a"/>
    </linearGradient>
    <radialGradient id="accentGlow1" cx="90%" cy="10%" r="40%">
      <stop offset="0%" style="stop-color:#f59e0b;stop-opacity:0.15"/>
      <stop offset="100%" style="stop-color:#f59e0b;stop-opacity:0"/>
    </radialGradient>
    <radialGradient id="accentGlow2" cx="10%" cy="90%" r="35%">
      <stop offset="0%" style="stop-color:#f59e0b;stop-opacity:0.1"/>
      <stop offset="100%" style="stop-color:#f59e0b;stop-opacity:0"/>
    </radialGradient>
    <radialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" style="stop-color:#f59e0b;stop-opacity:0.05"/>
      <stop offset="100%" style="stop-color:#f59e0b;stop-opacity:0"/>
    </radialGradient>
    <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#f59e0b"/>
      <stop offset="50%" style="stop-color:#fbbf24"/>
      <stop offset="100%" style="stop-color:#f59e0b"/>
    </linearGradient>
    <linearGradient id="borderGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#f59e0b;stop-opacity:0.4"/>
      <stop offset="50%" style="stop-color:#f59e0b;stop-opacity:0.2"/>
      <stop offset="100%" style="stop-color:#f59e0b;stop-opacity:0.4"/>
    </linearGradient>
  </defs>
  <rect width="${svgWidth}" height="${svgHeight}" fill="url(#bgGradient)"/>
  <rect width="${svgWidth}" height="${svgHeight}" fill="url(#accentGlow1)"/>
  <rect width="${svgWidth}" height="${svgHeight}" fill="url(#accentGlow2)"/>
  <rect width="${svgWidth}" height="${svgHeight}" fill="url(#centerGlow)"/>
  <rect x="20" y="20" width="${svgWidth - 40}" height="${svgHeight - 40}" rx="24" ry="24" fill="none" stroke="url(#borderGradient)" stroke-width="2"/>
  <rect x="40" y="40" width="${svgWidth - 80}" height="${svgHeight - 80}" rx="16" ry="16" fill="none" stroke="#f59e0b" stroke-width="0.5" stroke-opacity="0.2"/>
  <rect x="${svgWidth / 2 - 100}" y="50" width="200" height="36" rx="18" ry="18" fill="#f59e0b" fill-opacity="0.15" stroke="#f59e0b" stroke-opacity="0.3"/>
  <text x="${svgWidth / 2}" y="74" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="500" fill="#f59e0b" letter-spacing="3">THE CONTROLLABLES</text>
  <text x="${svgWidth / 2}" y="130" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="14" font-style="italic" fill="#94a3b8" letter-spacing="1">Certificate of Completion</text>
  <line x1="${svgWidth / 2 - 100}" y1="155" x2="${svgWidth / 2 + 100}" y2="155" stroke="#f59e0b" stroke-opacity="0.3" stroke-width="1"/>
  <text x="${svgWidth / 2}" y="220" text-anchor="middle" font-size="56">🏆</text>
  <text x="${svgWidth / 2}" y="290" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="26" font-weight="600" fill="#ffffff" letter-spacing="3">7-DAY SNAPSHOT COMPLETE</text>
  <text x="${svgWidth / 2}" y="370" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="52" font-style="italic" fill="url(#goldGradient)">${escapeXml(displayName)}</text>
  <text x="${svgWidth / 2}" y="440" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="20" fill="#e2e8f0" font-style="italic">"I committed to controlling what I could</text>
  <text x="${svgWidth / 2}" y="472" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="20" fill="#e2e8f0" font-style="italic">and surrendering what I could not."</text>
  <line x1="${svgWidth / 2 - 200}" y1="520" x2="${svgWidth / 2 + 200}" y2="520" stroke="#f59e0b" stroke-opacity="0.2" stroke-width="1"/>
  <text x="${svgWidth / 2}" y="565" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="500" fill="#64748b" letter-spacing="2">CONTROLLED THE 5 CONTROLLABLES</text>
  ${controllables.map((c, i) => {
    const spacing = 160;
    const startX = (svgWidth - (controllables.length - 1) * spacing) / 2;
    const x = startX + i * spacing;
    return `
  <g transform="translate(${x}, 640)">
    <rect x="-60" y="-35" width="120" height="70" rx="12" ry="12" fill="#ffffff" fill-opacity="0.05" stroke="#f59e0b" stroke-opacity="0.3"/>
    <text x="0" y="-3" text-anchor="middle" font-size="24">${c.emoji}</text>
    <text x="0" y="22" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="10" font-weight="500" fill="#f59e0b">${c.name}</text>
  </g>`;
  }).join('')}
  <line x1="${svgWidth / 2 - 200}" y1="710" x2="${svgWidth / 2 + 200}" y2="710" stroke="#f59e0b" stroke-opacity="0.2" stroke-width="1"/>
  <rect x="${svgWidth / 2 - 180}" y="730" width="360" height="50" rx="12" ry="12" fill="#ffffff" fill-opacity="0.05" stroke="#ffffff" stroke-opacity="0.1"/>
  <text x="${svgWidth / 2}" y="762" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="15" fill="#94a3b8">${escapeXml(startFormatted)} — ${escapeXml(endFormatted)}</text>
  <g transform="translate(${svgWidth / 2}, 820)">
    <circle cx="0" cy="0" r="16" fill="#22c55e" fill-opacity="0.2"/>
    <text x="0" y="5" text-anchor="middle" font-size="16">✓</text>
  </g>
  <text x="${svgWidth / 2}" y="850" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="11" fill="#64748b">Verified Completion</text>
  <text x="${svgWidth / 2}" y="${svgHeight - 25}" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="12" fill="#64748b">thedashboard.agbcoaching.com</text>
</svg>`;

  const svgBlob = new Blob([svgContent], { type: "image/svg+xml" });
  const storagePath = `${user.id}/${certificateId}.svg`;

  const { error: uploadError } = await supabaseAdmin.storage
    .from("certificates")
    .upload(storagePath, svgBlob, { contentType: "image/svg+xml", upsert: true });

  if (uploadError) {
    return new Response(
      JSON.stringify({ error: "Failed to upload certificate" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const { data: urlData } = supabaseAdmin.storage.from("certificates").getPublicUrl(storagePath);
  const certificateUrl = urlData.publicUrl;

  await supabaseAdmin
    .from("certificates")
    .update({ certificate_url: certificateUrl })
    .eq("id", certificateId);

  return new Response(
    JSON.stringify({ certificate_url: certificateUrl }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// Helpers
function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if ((current + " " + word).trim().length > maxChars) {
      if (current) lines.push(current.trim());
      current = word;
    } else {
      current = current ? current + " " + word : word;
    }
  }
  if (current.trim()) lines.push(current.trim());
  return lines;
}
