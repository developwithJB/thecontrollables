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

    // Fetch the template image from storage
    const { data: templateData, error: templateError } = await supabaseAdmin.storage
      .from("certificates")
      .download("Certificate Template.png");

    if (templateError || !templateData) {
      console.error("Template error:", templateError);
      return new Response(
        JSON.stringify({ error: "Certificate template not found" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Template loaded, generating certificate image...");

    // Convert template to base64
    const templateArrayBuffer = await templateData.arrayBuffer();
    const templateBase64 = btoa(
      new Uint8Array(templateArrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
    );

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
    const dateRange = `${startFormatted} – ${endFormatted}`;

    // Generate SVG with text overlay on template
    // We'll create an SVG that includes the template as background and overlays text
    const svgWidth = 1200;
    const svgHeight = 800;

    const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" 
     width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}">
  <defs>
    <style type="text/css">
      @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital@0;1&amp;display=swap');
      .name { font-family: 'Playfair Display', Georgia, serif; font-style: italic; font-size: 48px; fill: #1a1a1a; }
      .description { font-family: system-ui, -apple-system, sans-serif; font-size: 16px; fill: #404040; }
      .date { font-family: system-ui, -apple-system, sans-serif; font-size: 14px; fill: #404040; }
      .branding { font-family: 'Playfair Display', Georgia, serif; font-style: italic; font-size: 18px; fill: #1a1a1a; }
    </style>
  </defs>
  
  <!-- Background template image -->
  <image href="data:image/png;base64,${templateBase64}" x="0" y="0" width="${svgWidth}" height="${svgHeight}" preserveAspectRatio="xMidYMid slice"/>
  
  <!-- User's display name -->
  <text x="50%" y="50%" text-anchor="middle" class="name">${escapeXml(displayName)}</text>
  
  <!-- Description lines -->
  <text x="50%" y="60%" text-anchor="middle" class="description">For completing the 7-Day Reset Challenge</text>
  <text x="50%" y="64%" text-anchor="middle" class="description">I committed to controlling what I could and surrendering what I could not.</text>
  
  <!-- Date range -->
  <text x="33%" y="83%" text-anchor="middle" class="date">${escapeXml(dateRange)}</text>
  
  <!-- Branding -->
  <text x="67%" y="83%" text-anchor="middle" class="branding">The Controllables</text>
</svg>`;

    // Convert SVG to PNG using resvg-wasm or a similar approach
    // For edge functions, we'll use a simpler approach: return SVG as-is and convert client-side
    // OR use a cloud service for conversion
    
    // Actually, let's use a different approach: create the certificate as SVG 
    // and use a PNG conversion service, or store as SVG which most browsers can display
    
    // For now, let's store the SVG and generate a PNG using fetch to an SVG-to-PNG service
    // OR we can use the native Image API approach
    
    // Simplest reliable approach: Store the template-based PNG by overlaying text
    // Since we can't use canvas in Deno Edge Functions easily, let's use a workaround:
    // We'll store the SVG and use it as the certificate (SVG is vector, displays well)
    
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
      // Non-fatal, continue
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