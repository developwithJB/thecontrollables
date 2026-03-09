import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
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

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub as string;
    const { connection_id } = await req.json();

    const adminSupabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get connection
    const { data: connection, error: connError } = await adminSupabase
      .from("planner_connections")
      .select("*")
      .eq("id", connection_id)
      .eq("user_id", userId)
      .single();

    if (connError || !connection) {
      return new Response(JSON.stringify({ error: "Connection not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let accessToken = connection.access_token;

    // Check if token is expired and refresh if needed
    if (connection.token_expires_at && new Date(connection.token_expires_at) < new Date()) {
      const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID")!;
      const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET")!;

      const refreshResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          refresh_token: connection.refresh_token,
          grant_type: "refresh_token",
        }),
      });

      if (!refreshResponse.ok) {
        throw new Error("Failed to refresh Google token");
      }

      const tokens = await refreshResponse.json();
      accessToken = tokens.access_token;

      await adminSupabase
        .from("planner_connections")
        .update({
          access_token: tokens.access_token,
          token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
        })
        .eq("id", connection_id);
    }

    // Fetch events from Google Calendar (next 14 days)
    const now = new Date();
    const timeMin = now.toISOString();
    const timeMax = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString();

    const calendarResponse = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true&orderBy=startTime&maxResults=100`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!calendarResponse.ok) {
      const errText = await calendarResponse.text();
      throw new Error(`Google Calendar API failed [${calendarResponse.status}]: ${errText}`);
    }

    const calendarData = await calendarResponse.json();
    const events = calendarData.items || [];

    let imported = 0;
    let updated = 0;
    const errors: string[] = [];

    for (const event of events) {
      try {
        if (!event.summary) continue;

        const startDate = event.start?.date || event.start?.dateTime?.split("T")[0];
        const startTime = event.start?.dateTime
          ? new Date(event.start.dateTime).toTimeString().slice(0, 8)
          : null;
        const endTime = event.end?.dateTime
          ? new Date(event.end.dateTime).toTimeString().slice(0, 8)
          : null;

        if (!startDate) continue;

        // Upsert by external_event_id
        const { data: existing } = await adminSupabase
          .from("planner_items")
          .select("id")
          .eq("user_id", userId)
          .eq("external_event_id", event.id)
          .eq("connection_id", connection_id)
          .maybeSingle();

        if (existing) {
          await adminSupabase
            .from("planner_items")
            .update({
              title: event.summary,
              description: event.description || null,
              scheduled_date: startDate,
              start_time: startTime,
              end_time: endTime,
            })
            .eq("id", existing.id);
          updated++;
        } else {
          await adminSupabase.from("planner_items").insert({
            user_id: userId,
            item_type: "external_event",
            status: "todo",
            title: event.summary,
            description: event.description || null,
            scheduled_date: startDate,
            start_time: startTime,
            end_time: endTime,
            external_event_id: event.id,
            connection_id: connection_id,
            sort_order: 0,
          });
          imported++;
        }
      } catch (e) {
        errors.push(e instanceof Error ? e.message : "Unknown event error");
      }
    }

    // Log sync
    await adminSupabase.from("planner_sync_logs").insert({
      connection_id,
      user_id: userId,
      events_imported: imported,
      events_updated: updated,
      errors,
    });

    // Update last_synced_at
    await adminSupabase
      .from("planner_connections")
      .update({ last_synced_at: new Date().toISOString() })
      .eq("id", connection_id);

    return new Response(
      JSON.stringify({ success: true, imported, updated, errors: errors.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in planner-gcal-sync:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
