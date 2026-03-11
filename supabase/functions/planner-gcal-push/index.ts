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

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error("[GCAL-PUSH] Auth failed:", userError?.message);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = user.id;
    const body = await req.json();
    const { connection_id, item_ids, date, timezone } = body;
    const userTimezone = timezone || "America/New_York";

    console.log("[GCAL-PUSH] User:", userId, "connection:", connection_id, "items:", item_ids, "date:", date, "tz:", userTimezone);

    if (!connection_id) {
      return new Response(JSON.stringify({ error: "connection_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    // Refresh token if expired
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

    // Fetch planner items to push
    let query = adminSupabase
      .from("planner_items")
      .select("*")
      .eq("user_id", userId);

    if (item_ids && item_ids.length > 0) {
      query = query.in("id", item_ids);
    } else if (date) {
      // Push all non-external items for a given date
      query = query
        .eq("scheduled_date", date)
        .neq("item_type", "external_event");
    } else {
      return new Response(JSON.stringify({ error: "item_ids or date required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: plannerItems, error: itemsError } = await query;
    if (itemsError) throw itemsError;

    let pushed = 0;
    const errors: string[] = [];

    for (const item of plannerItems || []) {
      try {
        // Build Google Calendar event body
        const eventBody: Record<string, any> = {
          summary: item.title,
          description: item.description || undefined,
        };

        if (item.start_time && item.end_time) {
          // Timed event
          eventBody.start = {
            dateTime: `${item.scheduled_date}T${item.start_time}`,
            timeZone: userTimezone,
          };
          eventBody.end = {
            dateTime: `${item.scheduled_date}T${item.end_time}`,
            timeZone: userTimezone,
          };
        } else if (item.start_time) {
          // Start time only — default 1 hour
          eventBody.start = {
            dateTime: `${item.scheduled_date}T${item.start_time}`,
            timeZone: userTimezone,
          };
          // Parse start_time and add 1 hour
          const [h, m, s] = item.start_time.split(":").map(Number);
          const endH = String(Math.min(h + 1, 23)).padStart(2, "0");
          eventBody.end = {
            dateTime: `${item.scheduled_date}T${endH}:${String(m).padStart(2, "0")}:${String(s || 0).padStart(2, "0")}`,
            timeZone: userTimezone,
          };
        } else {
          // All-day event
          eventBody.start = { date: item.scheduled_date };
          eventBody.end = { date: item.scheduled_date };
        }

        // Check if already pushed (has external_event_id with same connection)
        if (item.external_event_id && item.connection_id === connection_id) {
          // PATCH existing event
          const patchRes = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/primary/events/${item.external_event_id}`,
            {
              method: "PATCH",
              headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(eventBody),
            }
          );

          if (!patchRes.ok) {
            const errText = await patchRes.text();
            throw new Error(`PATCH failed [${patchRes.status}]: ${errText}`);
          }
          pushed++;
        } else {
          // POST new event
          const postRes = await fetch(
            "https://www.googleapis.com/calendar/v3/calendars/primary/events",
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(eventBody),
            }
          );

          if (!postRes.ok) {
            const errText = await postRes.text();
            throw new Error(`POST failed [${postRes.status}]: ${errText}`);
          }

          const created = await postRes.json();

          // Save external_event_id back to planner item
          await adminSupabase
            .from("planner_items")
            .update({
              external_event_id: created.id,
              connection_id: connection_id,
            })
            .eq("id", item.id);

          pushed++;
        }
      } catch (e) {
        errors.push(`${item.title}: ${e instanceof Error ? e.message : "Unknown error"}`);
      }
    }

    return new Response(
      JSON.stringify({ success: true, pushed, errors }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in planner-gcal-push:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
