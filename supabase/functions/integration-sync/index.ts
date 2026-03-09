import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function refreshGoogleToken(connection: any, serviceClient: any) {
  if (!connection.refresh_token) return connection.access_token;
  const expiresAt = connection.token_expires_at ? new Date(connection.token_expires_at) : null;
  if (expiresAt && expiresAt > new Date(Date.now() + 5 * 60 * 1000)) return connection.access_token;

  const clientId = Deno.env.get("GOOGLE_CLIENT_ID")!;
  const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET")!;
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: connection.refresh_token,
      grant_type: "refresh_token",
    }),
  });
  const data = await res.json();
  if (data.access_token) {
    await serviceClient.from("integration_connections").update({
      access_token: data.access_token,
      token_expires_at: new Date(Date.now() + data.expires_in * 1000).toISOString(),
    }).eq("id", connection.id);
    return data.access_token;
  }
  throw new Error("Token refresh failed");
}

async function syncGoogleCalendar(connection: any, serviceClient: any, userId: string) {
  const accessToken = await refreshGoogleToken(connection, serviceClient);
  const now = new Date();
  const timeMin = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const timeMax = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString();

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime&maxResults=100`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) throw new Error(`Calendar API: ${res.status}`);
  const data = await res.json();
  const events = data.items || [];

  let created = 0, updated = 0, skipped = 0;

  for (const event of events) {
    if (!event.summary || event.status === "cancelled") { skipped++; continue; }
    const startDate = event.start?.date || event.start?.dateTime?.split("T")[0];
    if (!startDate) { skipped++; continue; }

    const startTime = event.start?.dateTime ? event.start.dateTime.split("T")[1]?.substring(0, 5) : null;
    const endTime = event.end?.dateTime ? event.end.dateTime.split("T")[1]?.substring(0, 5) : null;

    const { data: existing } = await serviceClient
      .from("planner_items")
      .select("id")
      .eq("user_id", userId)
      .eq("external_event_id", `gcal_${event.id}`)
      .maybeSingle();

    if (existing) {
      await serviceClient.from("planner_items").update({
        title: event.summary,
        description: event.description || null,
        scheduled_date: startDate,
        start_time: startTime,
        end_time: endTime,
      }).eq("id", existing.id);
      updated++;
    } else {
      await serviceClient.from("planner_items").insert({
        user_id: userId,
        title: event.summary,
        description: event.description || null,
        scheduled_date: startDate,
        start_time: startTime,
        end_time: endTime,
        item_type: "event",
        external_event_id: `gcal_${event.id}`,
        connection_id: connection.id,
      });
      created++;
    }
  }

  return { items_processed: events.length, items_created: created, items_updated: updated, items_skipped: skipped };
}

async function syncGmail(connection: any, serviceClient: any) {
  const accessToken = await refreshGoogleToken(connection, serviceClient);

  // Unread count
  const unreadRes = await fetch(
    "https://gmail.googleapis.com/gmail/v1/users/me/messages?q=is:unread&maxResults=1",
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const unreadData = await unreadRes.json();
  const unreadCount = unreadData.resultSizeEstimate || 0;

  // Starred count
  const starredRes = await fetch(
    "https://gmail.googleapis.com/gmail/v1/users/me/messages?q=is:starred&maxResults=1",
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const starredData = await starredRes.json();
  const starredCount = starredData.resultSizeEstimate || 0;

  // Needs reply heuristic: unread from contacts, last 2 days
  const needsReplyRes = await fetch(
    "https://gmail.googleapis.com/gmail/v1/users/me/messages?q=is:unread newer_than:2d -category:promotions -category:social -category:updates&maxResults=1",
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const needsReplyData = await needsReplyRes.json();
  const needsReplyCount = needsReplyData.resultSizeEstimate || 0;

  return {
    summary: { unread: unreadCount, starred: starredCount, needsReply: needsReplyCount },
    items_processed: 3, items_created: 0, items_updated: 0, items_skipped: 0,
  };
}

async function syncTodoist(connection: any, serviceClient: any, userId: string) {
  const accessToken = connection.access_token;
  const res = await fetch("https://api.todoist.com/rest/v2/tasks?filter=today|overdue", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Todoist API: ${res.status}`);
  const tasks = await res.json();

  let created = 0, updated = 0, skipped = 0;
  const today = new Date().toISOString().split("T")[0];

  for (const task of tasks) {
    const scheduledDate = task.due?.date || today;
    const { data: existing } = await serviceClient
      .from("planner_items")
      .select("id")
      .eq("user_id", userId)
      .eq("external_event_id", `todoist_${task.id}`)
      .maybeSingle();

    if (existing) {
      await serviceClient.from("planner_items").update({
        title: task.content,
        description: task.description || null,
        scheduled_date: scheduledDate,
      }).eq("id", existing.id);
      updated++;
    } else {
      await serviceClient.from("planner_items").insert({
        user_id: userId,
        title: task.content,
        description: task.description || null,
        scheduled_date: scheduledDate,
        item_type: "task",
        external_event_id: `todoist_${task.id}`,
        connection_id: connection.id,
      });
      created++;
    }
  }

  return { items_processed: tasks.length, items_created: created, items_updated: updated, items_skipped: skipped };
}

async function syncNotion(_connection: any, _serviceClient: any, _userId: string) {
  // Notion export is triggered separately with specific content; this is a placeholder for the sync button
  return { items_processed: 0, items_created: 0, items_updated: 0, items_skipped: 0, message: "Notion exports are triggered from specific content." };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

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
    const userId = claimsData.claims.sub as string;

    const { connectionId } = await req.json();
    const serviceClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: connection, error: connError } = await serviceClient
      .from("integration_connections")
      .select("*")
      .eq("id", connectionId)
      .eq("user_id", userId)
      .single();

    if (connError || !connection) {
      return new Response(JSON.stringify({ error: "Connection not found" }), { status: 404, headers: corsHeaders });
    }

    // Create sync log
    const { data: syncLog } = await serviceClient.from("integration_sync_logs").insert({
      connection_id: connectionId,
      user_id: userId,
      provider: connection.provider,
      sync_type: "full",
      status: "started",
    }).select().single();

    try {
      let result: any;
      switch (connection.provider) {
        case "google_calendar": result = await syncGoogleCalendar(connection, serviceClient, userId); break;
        case "gmail": result = await syncGmail(connection, serviceClient); break;
        case "todoist": result = await syncTodoist(connection, serviceClient, userId); break;
        case "notion": result = await syncNotion(connection, serviceClient, userId); break;
        default: throw new Error(`Unknown provider: ${connection.provider}`);
      }

      // Update sync log
      await serviceClient.from("integration_sync_logs").update({
        status: "success",
        items_processed: result.items_processed,
        items_created: result.items_created,
        items_updated: result.items_updated,
        items_skipped: result.items_skipped,
        completed_at: new Date().toISOString(),
        metadata: result.summary ? { summary: result.summary } : {},
      }).eq("id", syncLog!.id);

      // Update connection
      await serviceClient.from("integration_connections").update({
        last_synced_at: new Date().toISOString(),
        status: "active",
        error_message: null,
      }).eq("id", connectionId);

      return new Response(JSON.stringify({ success: true, ...result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (syncErr: any) {
      console.error(`Sync error for ${connection.provider}:`, syncErr);
      await serviceClient.from("integration_sync_logs").update({
        status: "failed",
        error_message: syncErr.message,
        completed_at: new Date().toISOString(),
      }).eq("id", syncLog!.id);

      await serviceClient.from("integration_connections").update({
        status: "error",
        error_message: syncErr.message,
      }).eq("id", connectionId);

      return new Response(JSON.stringify({ error: syncErr.message }), { status: 500, headers: corsHeaders });
    }
  } catch (err: any) {
    console.error("integration-sync error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
