import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MORNING_HOUR = 7;
const EVENING_HOUR = 19;

// Calm, grounded icons only — no hustle emojis
const CALM_ICONS = {
  default: "🌱",
  awareness: "🦉",
  perspective: "🐢",
  habit: "🧭",
  wellness: "🛰️",
  environment: "⏳",
};

interface UserContext {
  lowestControllable: string | null;
  lowestScore: number | null;
  currentSnapshotDay: number | null;
  journeyTitle: string | null;
  focusControllable: string | null;
  displayName: string | null;
  todayActionsCompleted: boolean;
}

interface NudgeRequest {
  nudgeTime?: "morning" | "evening";
  testMode?: boolean;
}

interface BuildScores {
  awareness: number;
  perspective: number;
  habit: number;
  wellness: number;
  environment: number;
}

interface ResetSession {
  current_day: number;
  journey_id: string | null;
}

interface Profile {
  display_name: string | null;
}

// Check if user already completed Today's Actions today
async function checkTodayActionsCompleted(
  supabase: SupabaseClient,
  userId: string,
  localDate: string
): Promise<boolean> {
  // Check if they did a check-in today
  const { data: checkin } = await supabase
    .from("daily_checkins")
    .select("id")
    .eq("user_id", userId)
    .eq("check_in_date", localDate)
    .maybeSingle();

  return !!checkin;
}

// Get user context for personalization
async function getUserContext(
  supabase: SupabaseClient,
  userId: string,
  localDate: string
): Promise<UserContext> {
  const context: UserContext = {
    lowestControllable: null,
    lowestScore: null,
    currentSnapshotDay: null,
    journeyTitle: null,
    focusControllable: null,
    displayName: null,
    todayActionsCompleted: false,
  };

  try {
    // Fetch in parallel
    const [buildResult, sessionResult, profileResult, actionsCompleted] = await Promise.all([
      supabase
        .from("user_build_current")
        .select("awareness, perspective, habit, wellness, environment")
        .eq("user_id", userId)
        .maybeSingle(),
      supabase
        .from("reset_sessions")
        .select("current_day, journey_id")
        .eq("user_id", userId)
        .eq("status", "active")
        .maybeSingle(),
      supabase
        .from("profiles")
        .select("display_name")
        .eq("id", userId)
        .maybeSingle(),
      checkTodayActionsCompleted(supabase, userId, localDate),
    ]);

    context.todayActionsCompleted = actionsCompleted;

    // Process build scores to find lowest
    if (buildResult.data) {
      const scores = buildResult.data as BuildScores;
      const controllableScores: [string, number][] = [
        ["awareness", Number(scores.awareness) || 0],
        ["perspective", Number(scores.perspective) || 0],
        ["habit", Number(scores.habit) || 0],
        ["wellness", Number(scores.wellness) || 0],
        ["environment", Number(scores.environment) || 0],
      ];

      // Find lowest score (only if they have build data)
      const validScores = controllableScores.filter(([_, score]) => score > 0);
      if (validScores.length > 0) {
        const lowest = validScores.reduce((min, current) =>
          current[1] < min[1] ? current : min
        );
        context.lowestControllable = lowest[0];
        context.lowestScore = lowest[1];
      }
    }

    // Process active session
    if (sessionResult.data) {
      const session = sessionResult.data as ResetSession;
      context.currentSnapshotDay = session.current_day;
      const journeyId = session.journey_id;
      if (journeyId) {
        // Extract controllable from journey_id (format: "bucket_controllable" e.g., "reset_awareness")
        const parts = journeyId.split("_");
        if (parts.length >= 2) {
          context.focusControllable = parts[parts.length - 1];
        }
        // Convert to title (e.g., "reset_awareness" -> "Reset & Awareness")
        context.journeyTitle = journeyId
          .split("_")
          .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ");
      }
    }

    // Display name
    if (profileResult.data) {
      const profile = profileResult.data as Profile;
      context.displayName = profile.display_name;
    }
  } catch (err) {
    console.warn(`[NUDGE] Error fetching context for ${userId}:`, err);
  }

  return context;
}

// Permission-giving lines — rotate, never stack
const PERMISSION_LINES = [
  "You don't need to do anything more right now unless you want to.",
  "This is here for you whenever you're ready.",
  "No pressure. Just a reminder that this exists.",
  "You're allowed to pause or continue at your own pace.",
  "Nothing is required today.",
];

// Generate personalized email content — calm, grounded tone
function generateEmailContent(
  context: UserContext,
  nudgeTime: "morning" | "evening"
): { subject: string; body: string } {
  const greeting = context.displayName ? `Hey ${context.displayName}` : "Hey";
  const isMorning = nudgeTime === "morning";

  // Build personalized message based on available context
  let subjectLine = "";
  let mainMessage = "";
  let emoji = CALM_ICONS.default;

  // Priority 1: Active snapshot progress — no pressure language
  if (context.currentSnapshotDay !== null && context.currentSnapshotDay > 0) {
    const dayNum = context.currentSnapshotDay;

    if (dayNum === 7) {
      subjectLine = "Day 7. Proof recorded.";
      mainMessage = "Day 7 of 7. This counts.";
      emoji = CALM_ICONS.default;
    } else {
      // Simple day count with calm framing
      subjectLine = `Day ${dayNum}. Still counts.`;
      mainMessage = `Day ${dayNum} of 7.`;
      emoji = CALM_ICONS.default;
    }
  }
  // Priority 2: Focus controllable from journey
  else if (context.focusControllable) {
    const focusIcon = CALM_ICONS[context.focusControllable as keyof typeof CALM_ICONS] || CALM_ICONS.default;
    emoji = focusIcon;
    subjectLine = "Today's check-in. No rush.";
    mainMessage = "Your Snapshot is ready.";
  }
  // Fallback: Generic grounded message
  else {
    const subjectOptions = isMorning
      ? ["Today's check-in. No rush.", "Just checking in.", "Coming back matters."]
      : ["You showed up. That matters.", "Just checking in.", "This counts."];
    subjectLine = subjectOptions[Math.floor(Math.random() * subjectOptions.length)];
    
    const messageOptions = isMorning
      ? ["Just today.", "Ready when you are.", "One small step."]
      : ["Just today.", "This still counts.", "No rush."];
    mainMessage = messageOptions[Math.floor(Math.random() * messageOptions.length)];
    emoji = CALM_ICONS.default;
  }

  // One grounding line — calm, supportive
  const groundingLines = isMorning
    ? [
        "You've been showing up.",
        "Just coming back matters.",
        "No extra effort required.",
      ]
    : [
        "This still counts.",
        "Just coming back matters.",
        "No pressure. Just presence.",
      ];
  const groundingLine = groundingLines[Math.floor(Math.random() * groundingLines.length)];

  // Permission-giving line — mandatory, placed before CTA
  const permissionLine = PERMISSION_LINES[Math.floor(Math.random() * PERMISSION_LINES.length)];

  // Build HTML body — standardized structure with permission line
  const body = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 440px; margin: 0 auto; padding: 40px 20px; text-align: center; background: #fafafa;">
      <div style="font-size: 36px; margin-bottom: 24px;">${emoji}</div>
      
      <p style="font-size: 20px; color: #1a1a1a; margin: 0 0 8px 0; font-weight: 500;">
        ${greeting},
      </p>
      
      <p style="font-size: 18px; color: #333; margin: 0 0 12px 0;">
        ${mainMessage}
      </p>
      
      <p style="font-size: 15px; color: #666; margin: 0 0 20px 0;">
        ${groundingLine}
      </p>
      
      <p style="font-size: 13px; color: #888; margin: 0 0 24px 0; font-style: italic;">
        ${permissionLine}
      </p>
      
      <a href="https://thedashboard.agbcoaching.com/dashboard" 
         style="display: inline-block; background: #6366f1; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 500; font-size: 15px;">
        Open Today's Actions
      </a>
      
      <p style="font-size: 11px; color: #aaa; margin-top: 40px;">
        <a href="https://thedashboard.agbcoaching.com/dashboard" style="color: #888; text-decoration: none;">
          Turn off anytime in settings
        </a>
      </p>
    </div>
  `;

  return { subject: subjectLine, body };
}

Deno.serve(async (req) => {
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
    // Note: We'll use each user's local date for duplicate checking, not UTC date

    console.log(`[NUDGE] Starting ${nudgeTime} nudge run (target hour: ${targetHour}:00 local time)`);

    // Get all users with nudges enabled
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, timezone, email_nudge_time, nudge_frequency")
      .eq("email_nudge_enabled", true);

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

    // Filter users whose local time and frequency matches
    interface ProfileRow {
      id: string;
      timezone: string | null;
      email_nudge_time: string;
      nudge_frequency: string | null;
    }

    // Helper to check if today is Monday in user's timezone
    function isMondayLocal(timezone: string): boolean {
      const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: timezone,
        weekday: "long",
      });
      return formatter.format(new Date()) === "Monday";
    }

    const usersToNudge: { userId: string; timezone: string; localDate: string }[] = [];
    const now = new Date();

    // Helper to get user's local hour and date correctly
    function getUserLocalTimeInfo(timezone: string): { hour: number; localDate: string } {
      // Use Intl.DateTimeFormat for reliable timezone conversion
      const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        hour12: false,
      });
      const parts = formatter.formatToParts(now);
      
      const year = parts.find(p => p.type === "year")?.value || "2026";
      const month = parts.find(p => p.type === "month")?.value || "01";
      const day = parts.find(p => p.type === "day")?.value || "01";
      const hourStr = parts.find(p => p.type === "hour")?.value || "0";
      
      // Handle hour "24" edge case (midnight)
      const hour = parseInt(hourStr, 10) % 24;
      const localDate = `${year}-${month}-${day}`;
      
      return { hour, localDate };
    }

    for (const profile of profiles as ProfileRow[]) {
      const userTimezone = profile.timezone || "America/New_York";
      const userFrequency = profile.nudge_frequency || "daily";
      const userPreferredTime = profile.email_nudge_time || "morning";

      try {
        const { hour: userHour, localDate } = getUserLocalTimeInfo(userTimezone);
        
        console.log(`[NUDGE] User ${profile.id} timezone=${userTimezone}, localHour=${userHour}, localDate=${localDate}, targetHour=${targetHour}, frequency=${userFrequency}, preferredTime=${userPreferredTime}`);

        if (testMode) {
          usersToNudge.push({ userId: profile.id, timezone: userTimezone, localDate });
          continue;
        }

        // Weekly nudges: only on Monday at morning time (7am)
        if (userFrequency === "weekly") {
          if (!isMondayLocal(userTimezone)) {
            console.log(`[NUDGE] User ${profile.id} has weekly frequency but today is not Monday, skipping`);
            continue;
          }
          // Weekly nudges always go out at morning time
          if (nudgeTime !== "morning" || userHour !== MORNING_HOUR) {
            continue;
          }
          usersToNudge.push({ userId: profile.id, timezone: userTimezone, localDate });
          continue;
        }

        // Daily nudges: check time preference matches this run
        if (userPreferredTime !== nudgeTime) {
          continue;
        }

        if (userHour === targetHour) {
          usersToNudge.push({ userId: profile.id, timezone: userTimezone, localDate });
        }
      } catch (tzError) {
        console.warn(`[NUDGE] Invalid timezone for user ${profile.id}: ${userTimezone}`, tzError);
      }
    }

    console.log(`[NUDGE] ${usersToNudge.length} users to nudge${testMode ? " (TEST MODE)" : ` at target hour (${targetHour}:00)`}`);

    if (usersToNudge.length === 0) {
      return new Response(
        JSON.stringify({ message: "No users at target hour", count: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let sentCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    // Process in batches of 10
    for (let i = 0; i < usersToNudge.length; i += 10) {
      const batch = usersToNudge.slice(i, i + 10);

      await Promise.all(batch.map(async ({ userId, localDate }) => {
        try {
          // Check if already sent for this user's local date
          const { data: existingLog } = await supabase
            .from("email_nudge_logs")
            .select("id")
            .eq("user_id", userId)
            .eq("nudge_date", localDate)
            .maybeSingle();

          if (existingLog) {
            console.log(`[NUDGE] Already sent to ${userId} today, skipping`);
            skippedCount++;
            return;
          }

          // Fetch user context for personalization
          const context = await getUserContext(supabase, userId, localDate);
          console.log(`[NUDGE] Context for ${userId}:`, JSON.stringify(context));

          // SUPPRESSION: Skip if Today's Actions already completed
          if (context.todayActionsCompleted) {
            console.log(`[NUDGE] User ${userId} already completed Today's Actions, skipping`);
            skippedCount++;
            return;
          }

          // Get user email
          const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);

          if (userError || !userData?.user?.email) {
            console.warn(`[NUDGE] Could not get email for user ${userId}:`, userError);
            return;
          }

          const email = userData.user.email;

          // Generate personalized content
          const { subject, body } = generateEmailContent(context, nudgeTime);

          // Send email via Resend
          const emailResult = await resend.emails.send({
            from: "The Dashboard <noreply@thedashboard.agbcoaching.com>",
            to: [email],
            subject: subject,
            html: body,
          });

          console.log(`[NUDGE] Sent to ${email} with subject "${subject}":`, emailResult);

          // Log the successful send using user's local date
          await supabase
            .from("email_nudge_logs")
            .insert({
              user_id: userId,
              nudge_date: localDate,
              status: "sent",
            });

          sentCount++;
        } catch (err: unknown) {
          const errorMsg = err instanceof Error ? err.message : String(err);
          console.error(`[NUDGE] Error sending to user ${userId}:`, errorMsg);
          errors.push(`${userId}: ${errorMsg}`);
        }
      }));

      // Small delay between batches
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
