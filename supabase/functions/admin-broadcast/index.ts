import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TEMPLATES: Record<string, { subject: string; bodyFn: (vars: Record<string, string>) => string }> = {
  re_engagement: {
    subject: "We noticed you've been away — your next step is waiting",
    bodyFn: (vars) => `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 440px; margin: 0 auto; padding: 40px 20px; text-align: center; background: #fafafa;">
        <div style="font-size: 36px; margin-bottom: 24px;">👋</div>
        <p style="font-size: 18px; color: #1a1a1a; margin: 0 0 16px 0;">Hey${vars.name ? ` ${vars.name}` : ''},</p>
        <p style="font-size: 15px; color: #444; margin: 0 0 20px 0;">
          ${vars.customBody || "It's been a few days since you last checked in. No guilt — just a reminder that your Dashboard is still here, ready when you are."}
        </p>
        <p style="font-size: 14px; color: #666; margin: 0 0 24px 0;">
          Sometimes all it takes is one small action to rebuild momentum.
        </p>
        <a href="https://thecontrollables.lovable.app/dashboard" style="display: inline-block; background: #6366f1; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 500; font-size: 15px;">
          Open Your Dashboard
        </a>
        <p style="font-size: 11px; color: #aaa; margin-top: 32px;">
          <a href="https://thecontrollables.lovable.app/dashboard" style="color: #888; text-decoration: none;">Manage email preferences in settings</a>
        </p>
      </div>`,
  },
  milestone: {
    subject: "You're making progress — keep going",
    bodyFn: (vars) => `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 440px; margin: 0 auto; padding: 40px 20px; text-align: center; background: #fafafa;">
        <div style="font-size: 36px; margin-bottom: 24px;">🏆</div>
        <p style="font-size: 18px; color: #1a1a1a; margin: 0 0 16px 0;">Hey${vars.name ? ` ${vars.name}` : ''},</p>
        <p style="font-size: 15px; color: #444; margin: 0 0 20px 0;">
          ${vars.customBody || "You've been showing up consistently. That's not nothing — that's everything. Keep building on what you've started."}
        </p>
        <a href="https://thecontrollables.lovable.app/dashboard" style="display: inline-block; background: #6366f1; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 500; font-size: 15px;">
          Continue Your Journey
        </a>
        <p style="font-size: 11px; color: #aaa; margin-top: 32px;">
          <a href="https://thecontrollables.lovable.app/dashboard" style="color: #888; text-decoration: none;">Manage email preferences in settings</a>
        </p>
      </div>`,
  },
  announcement: {
    subject: "Something new inside The Dashboard",
    bodyFn: (vars) => `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 440px; margin: 0 auto; padding: 40px 20px; text-align: center; background: #fafafa;">
        <div style="font-size: 36px; margin-bottom: 24px;">📢</div>
        <p style="font-size: 18px; color: #1a1a1a; margin: 0 0 16px 0;">Hey${vars.name ? ` ${vars.name}` : ''},</p>
        <p style="font-size: 15px; color: #444; margin: 0 0 20px 0;">
          ${vars.customBody || "We've been working on something new. Come check it out."}
        </p>
        <a href="https://thecontrollables.lovable.app/dashboard" style="display: inline-block; background: #6366f1; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 500; font-size: 15px;">
          See What's New
        </a>
        <p style="font-size: 11px; color: #aaa; margin-top: 32px;">
          <a href="https://thecontrollables.lovable.app/dashboard" style="color: #888; text-decoration: none;">Manage email preferences in settings</a>
        </p>
      </div>`,
  },
  custom: {
    subject: "A message from The Dashboard",
    bodyFn: (vars) => `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 440px; margin: 0 auto; padding: 40px 20px; text-align: center; background: #fafafa;">
        <p style="font-size: 18px; color: #1a1a1a; margin: 0 0 16px 0;">Hey${vars.name ? ` ${vars.name}` : ''},</p>
        <div style="font-size: 15px; color: #444; margin: 0 0 24px 0; line-height: 1.6; text-align: left;">
          ${vars.customBody || "Thanks for being part of this journey."}
        </div>
        <a href="https://thecontrollables.lovable.app/dashboard" style="display: inline-block; background: #6366f1; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 500; font-size: 15px;">
          Open Dashboard
        </a>
        <p style="font-size: 11px; color: #aaa; margin-top: 32px;">
          <a href="https://thecontrollables.lovable.app/dashboard" style="color: #888; text-decoration: none;">Manage email preferences in settings</a>
        </p>
      </div>`,
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseUser.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }
    const adminUserId = claimsData.claims.sub as string;

    // Check admin role
    const { data: isAdmin } = await supabaseAdmin.rpc("has_role", { _user_id: adminUserId, _role: "admin" });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Admin access required" }), { status: 403, headers: corsHeaders });
    }

    const url = new URL(req.url);
    let action = url.searchParams.get("action");

    // Also support action in the request body
    let bodyData: any = {};
    if (req.method === "POST") {
      bodyData = await req.json();
      if (!action && bodyData.action) {
        action = bodyData.action;
      }
    }

    // Preview action - returns the resolved email list and sample HTML
    if (action === "preview") {
      const { segmentType, segmentEmails, templateKey, customSubject, customBody } = bodyData;
      const recipients = await resolveSegment(supabaseAdmin, segmentType, segmentEmails || []);
      const template = TEMPLATES[templateKey] || TEMPLATES.custom;
      const subject = customSubject || template.subject;
      const sampleHtml = template.bodyFn({ name: "Preview User", customBody: customBody || "" });

      return new Response(JSON.stringify({
        recipientCount: recipients.length,
        sampleEmails: recipients.slice(0, 10).map((r) => r.email),
        subject,
        previewHtml: sampleHtml,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Send action
    if (action === "send") {
      const { segmentType, segmentEmails, templateKey, customSubject, customBody } = bodyData;
      const resendKey = Deno.env.get("RESEND_API_KEY");
      if (!resendKey) {
        return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), { status: 500, headers: corsHeaders });
      }
      const resend = new Resend(resendKey);

      const recipients = await resolveSegment(supabaseAdmin, segmentType, segmentEmails || []);
      if (recipients.length === 0) {
        return new Response(JSON.stringify({ error: "No recipients found for this segment" }), { status: 400, headers: corsHeaders });
      }

      const template = TEMPLATES[templateKey] || TEMPLATES.custom;
      const subject = customSubject || template.subject;
      
      let sent = 0;
      let failed = 0;

      for (const recipient of recipients) {
        try {
          const html = template.bodyFn({
            name: recipient.displayName || "",
            customBody: customBody || "",
          });

          await resend.emails.send({
            from: "The Dashboard <noreply@thedashboard.agbcoaching.com>",
            to: recipient.email,
            subject,
            html,
          });
          sent++;
        } catch (err) {
          console.error(`[BROADCAST] Failed to send to ${recipient.email}:`, err);
          failed++;
        }
      }

      // Log the broadcast
      const finalHtml = template.bodyFn({ name: "", customBody: customBody || "" });
      await supabaseAdmin.from("admin_broadcasts").insert({
        sent_by: adminUserId,
        segment_type: segmentType,
        segment_emails: segmentType === "manual" ? segmentEmails : [],
        template_key: templateKey,
        subject,
        body_html: finalHtml,
        recipient_count: sent,
      });

      return new Response(JSON.stringify({ sent, failed, total: recipients.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // History action
    if (action === "history") {
      const { data, error } = await supabaseAdmin
        .from("admin_broadcasts")
        .select("*")
        .order("sent_at", { ascending: false })
        .limit(20);

      if (error) throw error;

      return new Response(JSON.stringify({ broadcasts: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400, headers: corsHeaders });
  } catch (err) {
    console.error("[BROADCAST] Error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});

interface Recipient {
  email: string;
  displayName: string | null;
  userId: string;
}

async function resolveSegment(
  supabase: any,
  segmentType: string,
  manualEmails: string[]
): Promise<Recipient[]> {
  // Get all users from auth
  const { data: authData } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const allUsers = authData?.users || [];

  // Get profiles for display names
  const { data: profiles } = await supabase.from("profiles").select("id, display_name");
  const profileMap = new Map((profiles || []).map((p: any) => [p.id, p.display_name]));

  // Get entitlements
  const { data: entitlements } = await supabase.from("user_entitlements").select("user_id, expires_at");
  const paidUserIds = new Set(
    (entitlements || [])
      .filter((e: any) => !e.expires_at || new Date(e.expires_at) > new Date())
      .map((e: any) => e.user_id)
  );

  const toRecipient = (user: any): Recipient => ({
    email: user.email,
    displayName: profileMap.get(user.id) || null,
    userId: user.id,
  });

  switch (segmentType) {
    case "manual": {
      const emailSet = new Set(manualEmails.map((e: string) => e.toLowerCase().trim()));
      return allUsers.filter((u: any) => emailSet.has(u.email?.toLowerCase())).map(toRecipient);
    }
    case "all":
      return allUsers.filter((u: any) => u.email).map(toRecipient);
    case "all_free":
      return allUsers.filter((u: any) => u.email && !paidUserIds.has(u.id)).map(toRecipient);
    case "all_paid":
      return allUsers.filter((u: any) => u.email && paidUserIds.has(u.id)).map(toRecipient);
    case "inactive_3d": {
      const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString();
      return allUsers
        .filter((u: any) => u.email && (!u.last_sign_in_at || u.last_sign_in_at < threeDaysAgo))
        .map(toRecipient);
    }
    case "inactive_7d": {
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
      return allUsers
        .filter((u: any) => u.email && (!u.last_sign_in_at || u.last_sign_in_at < sevenDaysAgo))
        .map(toRecipient);
    }
    case "no_snapshot": {
      const { data: sessionsData } = await supabase
        .from("reset_sessions")
        .select("user_id")
        .eq("status", "active");
      const activeSessionUserIds = new Set((sessionsData || []).map((s: any) => s.user_id));
      return allUsers
        .filter((u: any) => u.email && !activeSessionUserIds.has(u.id))
        .map(toRecipient);
    }
    case "completed_no_new": {
      const { data: completedSessions } = await supabase
        .from("reset_sessions")
        .select("user_id")
        .eq("status", "completed")
        .order("completed_at", { ascending: false });
      const { data: activeSessions } = await supabase
        .from("reset_sessions")
        .select("user_id")
        .eq("status", "active");
      
      const completedUserIds = new Set((completedSessions || []).map((s: any) => s.user_id));
      const activeUserIds = new Set((activeSessions || []).map((s: any) => s.user_id));
      
      return allUsers
        .filter((u: any) => u.email && completedUserIds.has(u.id) && !activeUserIds.has(u.id))
        .map(toRecipient);
    }
    default:
      return [];
  }
}
