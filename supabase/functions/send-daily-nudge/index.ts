import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUBJECTS = [
  "Your Snapshot is ready",
  "5 minutes. That's it.",
  "Just do today",
  "Ready when you are",
];

const MORNING_HOUR = 7;
const EVENING_HOUR = 19;

interface NudgeRequest {
  nudgeTime?: "morning" | "evening";
  testMode?: boolean; // Bypass timezone check for testing
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("[NUDGE] RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resend = new Resend(resendApiKey);
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    let nudgeTime: "morning" | "evening" = "morning";
    let testMode = false;
    try {
      const body: NudgeRequest = await req.json();
      if (body.nudgeTime === "evening") {
        nudgeTime = "evening";
      }
      if (body.testMode === true) {
        testMode = true;
      }
    } catch {
      // Default to morning if no body
    }

    const targetHour = nudgeTime === "morning" ? MORNING_HOUR : EVENING_HOUR;
    const today = new Date().toISOString().split("T")[0];

    console.log(`[NUDGE] Starting ${nudgeTime} nudge run for ${today} (target hour: ${targetHour})`);

    // Get all users with nudges enabled for this time preference
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, timezone, email_nudge_time")
      .eq("email_nudge_enabled", true)
      .eq("email_nudge_time", nudgeTime);

    if (profilesError) {
      console.error("[NUDGE] Error fetching profiles:", profilesError);
      throw profilesError;
    }

    if (!profiles || profiles.length === 0) {
      console.log(`[NUDGE] No users with ${nudgeTime} nudges enabled`);
      return new Response(
        JSON.stringify({ message: "No users to nudge", count: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[NUDGE] Found ${profiles.length} users with ${nudgeTime} nudges enabled`);

    // Filter users whose local time matches the target hour (or include all in test mode)
    const usersToNudge: { userId: string; timezone: string }[] = [];
    const now = new Date();

    for (const profile of profiles) {
      const userTimezone = profile.timezone || "America/New_York";
      
      // In test mode, skip timezone check and include all matching users
      if (testMode) {
        usersToNudge.push({ userId: profile.id, timezone: userTimezone });
        continue;
      }

      try {
        // Get current hour in user's timezone
        const userLocalTime = new Date(now.toLocaleString("en-US", { timeZone: userTimezone }));
        const userHour = userLocalTime.getHours();

        if (userHour === targetHour) {
          usersToNudge.push({ userId: profile.id, timezone: userTimezone });
        }
      } catch (tzError) {
        console.warn(`[NUDGE] Invalid timezone for user ${profile.id}: ${userTimezone}`);
      }
    }

    console.log(`[NUDGE] ${usersToNudge.length} users to nudge${testMode ? " (TEST MODE)" : ` at target hour (${targetHour}:00)`}`);

    if (usersToNudge.length === 0) {
      return new Response(
        JSON.stringify({ message: "No users at target hour", count: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user emails from auth.users (requires service role)
    let sentCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    // Process in batches of 10 to avoid rate limits
    for (let i = 0; i < usersToNudge.length; i += 10) {
      const batch = usersToNudge.slice(i, i + 10);
      
      await Promise.all(batch.map(async ({ userId }) => {
        try {
          // Check if already sent today
          const { data: existingLog } = await supabase
            .from("email_nudge_logs")
            .select("id")
            .eq("user_id", userId)
            .eq("nudge_date", today)
            .maybeSingle();

          if (existingLog) {
            console.log(`[NUDGE] Already sent to ${userId} today, skipping`);
            skippedCount++;
            return;
          }

          // Get user email from auth.users
          const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);
          
          if (userError || !userData?.user?.email) {
            console.warn(`[NUDGE] Could not get email for user ${userId}:`, userError);
            return;
          }

          const email = userData.user.email;
          const subject = SUBJECTS[Math.floor(Math.random() * SUBJECTS.length)];

          // Send email via Resend
          const emailResult = await resend.emails.send({
            from: "The Dashboard <noreply@thedashboard.agbcoaching.com>",
            to: [email],
            subject: subject,
            html: `
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 400px; margin: 0 auto; padding: 40px 20px; text-align: center;">
                <p style="font-size: 24px; color: #1a1a1a; margin-bottom: 24px;">
                  Just do today. That's it.
                </p>
                <a href="https://thedashboard.agbcoaching.com/dashboard" 
                   style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500;">
                  Open Today's Actions →
                </a>
                <p style="font-size: 12px; color: #888; margin-top: 32px;">
                  Turn off anytime in settings.
                </p>
              </div>
            `,
          });

          console.log(`[NUDGE] Sent to ${email}:`, emailResult);

          // Log the successful send
          await supabase
            .from("email_nudge_logs")
            .insert({
              user_id: userId,
              nudge_date: today,
              status: "sent",
            });

          sentCount++;
        } catch (err: unknown) {
          const errorMsg = err instanceof Error ? err.message : String(err);
          console.error(`[NUDGE] Error sending to user ${userId}:`, errorMsg);
          errors.push(`${userId}: ${errorMsg}`);
        }
      }));

      // Small delay between batches to avoid rate limits
      if (i + 10 < usersToNudge.length) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    console.log(`[NUDGE] Complete. Sent: ${sentCount}, Skipped: ${skippedCount}, Errors: ${errors.length}`);

    return new Response(
      JSON.stringify({
        message: "Nudge run complete",
        sent: sentCount,
        skipped: skippedCount,
        errors: errors.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("[NUDGE] Fatal error:", errorMsg);
    return new Response(
      JSON.stringify({ error: errorMsg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
