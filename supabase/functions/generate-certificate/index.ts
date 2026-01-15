import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CertificateRequest {
  reset_session_id: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("No authorization header provided");
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase clients
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // User client for auth validation
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Admin client for storage operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      console.error("Auth error:", authError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`User ${user.id} requesting certificate generation`);

    // Parse request body
    const body: CertificateRequest = await req.json();
    const { reset_session_id } = body;

    if (!reset_session_id) {
      return new Response(
        JSON.stringify({ error: "reset_session_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing reset_session_id: ${reset_session_id}`);

    // Verify reset session belongs to user and is completed
    const { data: session, error: sessionError } = await supabaseAdmin
      .from("reset_sessions")
      .select("*")
      .eq("id", reset_session_id)
      .eq("user_id", user.id)
      .single();

    if (sessionError || !session) {
      console.error("Session error:", sessionError);
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

    // Verify all 7 days are completed
    const { data: completedDays, error: daysError } = await supabaseAdmin
      .from("daily_resets")
      .select("day_number")
      .eq("session_id", reset_session_id)
      .eq("user_id", user.id);

    if (daysError) {
      console.error("Days error:", daysError);
      return new Response(
        JSON.stringify({ error: "Failed to verify completion" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!completedDays || completedDays.length < 7) {
      return new Response(
        JSON.stringify({ error: "All 7 days must be completed" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user profile for display name
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .single();

    const displayName = profile?.display_name || user.email?.split("@")[0] || "Participant";

    // Calculate dates
    const startDate = session.start_date;
    const endDateObj = new Date(startDate + "T00:00:00");
    endDateObj.setDate(endDateObj.getDate() + 6);
    const endDate = endDateObj.toISOString().split("T")[0];

    console.log(`Generating certificate for ${displayName}, ${startDate} to ${endDate}`);

    // Check if certificate already exists
    const { data: existingCert } = await supabaseAdmin
      .from("certificates")
      .select("*")
      .eq("reset_session_id", reset_session_id)
      .single();

    if (existingCert?.certificate_url) {
      console.log("Certificate already exists, returning existing URL");
      return new Response(
        JSON.stringify({ certificate_url: existingCert.certificate_url }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Upsert certificate record first
    const { data: certRecord, error: upsertError } = await supabaseAdmin
      .from("certificates")
      .upsert(
        {
          user_id: user.id,
          reset_session_id,
          display_name: displayName,
          start_date: startDate,
          end_date: endDate,
        },
        { onConflict: "reset_session_id" }
      )
      .select()
      .single();

    if (upsertError || !certRecord) {
      console.error("Upsert error:", upsertError);
      return new Response(
        JSON.stringify({ error: "Failed to create certificate record" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const certificateId = certRecord.id;
    console.log(`Certificate record created: ${certificateId}`);

    // Format dates for display
    const formatDate = (dateStr: string) => {
      const date = new Date(dateStr + "T00:00:00");
      return date.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    };

    const startFormatted = formatDate(startDate);
    const endFormatted = formatDate(endDate);

    // Generate premium dark certificate SVG (QuestCard style)
    const svgWidth = 1200;
    const svgHeight = 800; // Taller for 5 controllables

    // The 5 Controllables with emojis
    const controllables = [
      { name: "Awareness", emoji: "🧘" },
      { name: "Perspective", emoji: "🔭" },
      { name: "Habit", emoji: "⚡" },
      { name: "Wellness", emoji: "💪" },
      { name: "Environment", emoji: "🏠" },
    ];

    const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}">
  <defs>
    <!-- Background gradient -->
    <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0f172a"/>
      <stop offset="50%" style="stop-color:#1e293b"/>
      <stop offset="100%" style="stop-color:#0f172a"/>
    </linearGradient>
    
    <!-- Accent glow -->
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
    
    <!-- Gold gradient for text -->
    <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#f59e0b"/>
      <stop offset="50%" style="stop-color:#fbbf24"/>
      <stop offset="100%" style="stop-color:#f59e0b"/>
    </linearGradient>
    
    <!-- Border gradient -->
    <linearGradient id="borderGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#f59e0b;stop-opacity:0.4"/>
      <stop offset="50%" style="stop-color:#f59e0b;stop-opacity:0.2"/>
      <stop offset="100%" style="stop-color:#f59e0b;stop-opacity:0.4"/>
    </linearGradient>
  </defs>
  
  <!-- Background -->
  <rect width="${svgWidth}" height="${svgHeight}" fill="url(#bgGradient)"/>
  
  <!-- Decorative glows -->
  <rect width="${svgWidth}" height="${svgHeight}" fill="url(#accentGlow1)"/>
  <rect width="${svgWidth}" height="${svgHeight}" fill="url(#accentGlow2)"/>
  <rect width="${svgWidth}" height="${svgHeight}" fill="url(#centerGlow)"/>
  
  <!-- Border -->
  <rect x="20" y="20" width="${svgWidth - 40}" height="${svgHeight - 40}" rx="24" ry="24" 
        fill="none" stroke="url(#borderGradient)" stroke-width="2"/>
  
  <!-- Inner border accent -->
  <rect x="40" y="40" width="${svgWidth - 80}" height="${svgHeight - 80}" rx="16" ry="16" 
        fill="none" stroke="#f59e0b" stroke-width="0.5" stroke-opacity="0.2"/>
  
  <!-- Top badge -->
  <rect x="${svgWidth/2 - 100}" y="50" width="200" height="36" rx="18" ry="18" 
        fill="#f59e0b" fill-opacity="0.15" stroke="#f59e0b" stroke-opacity="0.3"/>
  <text x="${svgWidth/2}" y="74" text-anchor="middle" 
        font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="500" 
        fill="#f59e0b" letter-spacing="3">THE CONTROLLABLES</text>
  
  <!-- Completion badge -->
  <text x="${svgWidth/2}" y="120" text-anchor="middle" 
        font-family="Georgia, 'Times New Roman', serif" font-size="14" font-style="italic" 
        fill="#94a3b8" letter-spacing="1">Certificate of Completion</text>
  
  <!-- Decorative line -->
  <line x1="${svgWidth/2 - 80}" y1="140" x2="${svgWidth/2 + 80}" y2="140" 
        stroke="#f59e0b" stroke-opacity="0.3" stroke-width="1"/>
  
  <!-- Trophy emoji -->
  <text x="${svgWidth/2}" y="195" text-anchor="middle" font-size="48">🏆</text>
  
  <!-- Main title -->
  <text x="${svgWidth/2}" y="250" text-anchor="middle" 
        font-family="Georgia, 'Times New Roman', serif" font-size="22" font-weight="600" 
        fill="#ffffff" letter-spacing="2">7-DAY RESET COMPLETE</text>
  
  <!-- User name -->
  <text x="${svgWidth/2}" y="310" text-anchor="middle" 
        font-family="Georgia, 'Times New Roman', serif" font-size="42" font-style="italic" 
        fill="url(#goldGradient)">${escapeXml(displayName)}</text>
  
  <!-- Commitment statement -->
  <text x="${svgWidth/2}" y="365" text-anchor="middle" 
        font-family="system-ui, -apple-system, sans-serif" font-size="14" 
        fill="#cbd5e1" font-style="italic">"I committed to controlling what I could and surrendering what I could not."</text>
  
  <!-- Decorative line before controllables -->
  <line x1="${svgWidth/2 - 180}" y1="400" x2="${svgWidth/2 + 180}" y2="400" 
        stroke="#f59e0b" stroke-opacity="0.2" stroke-width="1"/>
  
  <!-- 5 Controllables Section -->
  <text x="${svgWidth/2}" y="440" text-anchor="middle" 
        font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="500" 
        fill="#64748b" letter-spacing="2">MASTERED THE 5 CONTROLLABLES</text>
  
  <!-- Controllable badges - evenly spaced across the width -->
  ${controllables.map((c, i) => {
    const spacing = 200;
    const startX = (svgWidth - (controllables.length - 1) * spacing) / 2;
    const x = startX + i * spacing;
    return `
  <g transform="translate(${x}, 520)">
    <rect x="-70" y="-40" width="140" height="80" rx="12" ry="12" 
          fill="#ffffff" fill-opacity="0.05" stroke="#f59e0b" stroke-opacity="0.3"/>
    <text x="0" y="-5" text-anchor="middle" font-size="28">${c.emoji}</text>
    <text x="0" y="25" text-anchor="middle" 
          font-family="system-ui, -apple-system, sans-serif" font-size="11" font-weight="500" 
          fill="#f59e0b">${c.name}</text>
  </g>`;
  }).join('')}
  
  <!-- Decorative line after controllables -->
  <line x1="${svgWidth/2 - 180}" y1="600" x2="${svgWidth/2 + 180}" y2="600" 
        stroke="#f59e0b" stroke-opacity="0.2" stroke-width="1"/>
  
  <!-- Date range box -->
  <rect x="${svgWidth/2 - 180}" y="630" width="360" height="50" rx="12" ry="12" 
        fill="#ffffff" fill-opacity="0.05" stroke="#ffffff" stroke-opacity="0.1"/>
  <text x="${svgWidth/2}" y="662" text-anchor="middle" 
        font-family="system-ui, -apple-system, sans-serif" font-size="15" 
        fill="#94a3b8">${escapeXml(startFormatted)} — ${escapeXml(endFormatted)}</text>
  
  <!-- Verification checkmark -->
  <g transform="translate(${svgWidth/2}, 720)">
    <circle cx="0" cy="0" r="16" fill="#22c55e" fill-opacity="0.2"/>
    <text x="0" y="5" text-anchor="middle" font-size="16">✓</text>
    <text x="26" y="5" text-anchor="start" 
          font-family="system-ui, -apple-system, sans-serif" font-size="11" 
          fill="#64748b">Verified Completion</text>
  </g>
  
  <!-- Footer URL -->
  <text x="${svgWidth/2}" y="${svgHeight - 30}" text-anchor="middle" 
        font-family="system-ui, -apple-system, sans-serif" font-size="12" 
        fill="#64748b">thecontrollables.lovable.app</text>
</svg>`;

    const svgBlob = new Blob([svgContent], { type: "image/svg+xml" });
    const storagePath = `${user.id}/${certificateId}.svg`;

    console.log(`Uploading certificate to ${storagePath}`);

    const { error: uploadError } = await supabaseAdmin.storage
      .from("certificates")
      .upload(storagePath, svgBlob, {
        contentType: "image/svg+xml",
        upsert: true,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return new Response(
        JSON.stringify({ error: "Failed to upload certificate" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from("certificates")
      .getPublicUrl(storagePath);

    const certificateUrl = urlData.publicUrl;
    console.log(`Certificate URL: ${certificateUrl}`);

    // Update certificate record with URL
    const { error: updateError } = await supabaseAdmin
      .from("certificates")
      .update({ certificate_url: certificateUrl })
      .eq("id", certificateId);

    if (updateError) {
      console.error("Update error:", updateError);
    }

    console.log("Certificate generation complete!");

    return new Response(
      JSON.stringify({ certificate_url: certificateUrl }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Helper to escape XML special characters
function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
