import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MORNING_HOUR = 7;

// Snapshot data for email context (inline since we can't import from src)
const SNAPSHOT_DATA: Record<string, { name: string; tagline: string; focus: string }> = {
  "back-to-zero": { name: "Back to Zero", tagline: "Start fresh without shame", focus: "Awareness" },
  "just-show-up": { name: "Just Show Up", tagline: "Presence over performance", focus: "Habit" },
  "stabilize-basics": { name: "Stabilize the Basics", tagline: "Simple foundations first", focus: "Wellness" },
  "restart-without-shame": { name: "Restart Without Shame", tagline: "Grace over guilt", focus: "Perspective" },
  "get-grounded": { name: "Get Grounded Again", tagline: "Anchor in your space", focus: "Environment" },
  "one-day-at-time": { name: "One Day at a Time", tagline: "Today is enough", focus: "Awareness" },
  "one-thing-a-day": { name: "One Thing a Day", tagline: "Simple beats complex", focus: "Habit" },
  "tiny-wins": { name: "Tiny Wins Week", tagline: "Stack small victories", focus: "Habit" },
  "finish-what-you-start": { name: "Finish What You Start", tagline: "Completion over perfection", focus: "Habit" },
  "build-the-chain": { name: "Build the Chain", tagline: "Don't break the streak", focus: "Habit" },
  "show-up-anyway": { name: "Show Up Anyway", tagline: "Action despite resistance", focus: "Habit" },
  "consistency-over-intensity": { name: "Consistency Over Intensity", tagline: "Slow is fast", focus: "Perspective" },
  "quiet-the-noise": { name: "Quiet the Noise", tagline: "Silence before clarity", focus: "Awareness" },
  "zoom-out": { name: "Zoom Out", tagline: "See the bigger picture", focus: "Perspective" },
  "what-actually-matters": { name: "What Actually Matters", tagline: "Cut through the noise", focus: "Perspective" },
  "pause-before-reacting": { name: "Pause Before Reacting", tagline: "Response over reaction", focus: "Awareness" },
  "see-it-clearly": { name: "See It Clearly", tagline: "Facts over feelings", focus: "Awareness" },
  "reframe-the-story": { name: "Reframe the Story", tagline: "Change the narrative", focus: "Perspective" },
  "protect-your-energy": { name: "Protect Your Energy", tagline: "Guard your reserves", focus: "Wellness" },
  "slow-down-week": { name: "Slow Down Week", tagline: "Less speed, more presence", focus: "Wellness" },
  "sleep-first": { name: "Sleep First", tagline: "Foundation of everything", focus: "Wellness" },
  "body-check-in": { name: "Body Check-In", tagline: "Listen to signals", focus: "Wellness" },
  "inputs-audit": { name: "Inputs Audit", tagline: "What you consume matters", focus: "Environment" },
  "environment-reset": { name: "Environment Reset", tagline: "Space shapes behavior", focus: "Environment" },
  "keep-one-promise": { name: "Keep One Promise", tagline: "Build trust with yourself", focus: "Habit" },
  "follow-through": { name: "Follow Through", tagline: "Do what you said", focus: "Habit" },
  "rebuild-trust": { name: "Rebuild Trust", tagline: "One kept promise at a time", focus: "Perspective" },
  "say-what-you-mean": { name: "Say What You Mean", tagline: "Clarity over comfort", focus: "Awareness" },
  "boundaries-week": { name: "Boundaries Week", tagline: "Protect what matters", focus: "Environment" },
  "integrity-audit": { name: "Integrity Audit", tagline: "Align words and actions", focus: "Awareness" },
  "try-something-new": { name: "Try Something New", tagline: "Expand your edges", focus: "Habit" },
  "push-one-edge": { name: "Push One Edge", tagline: "Controlled discomfort", focus: "Perspective" },
  "upgrade-one-habit": { name: "Upgrade One Habit", tagline: "Level up what works", focus: "Habit" },
  "learn-in-public": { name: "Learn in Public", tagline: "Share the journey", focus: "Perspective" },
  "ship-something": { name: "Ship Something", tagline: "Done beats perfect", focus: "Habit" },
  "reflect-and-plan": { name: "Reflect and Plan", tagline: "Review before moving forward", focus: "Awareness" },
  // Goal-based snapshots
  "replace-the-trigger": { name: "Replace the Trigger", tagline: "Swap the cue", focus: "Habit" },
  "delay-the-impulse": { name: "Delay the Impulse", tagline: "Create space before action", focus: "Awareness" },
  "environment-reset-goal": { name: "Environment Reset", tagline: "Remove friction", focus: "Environment" },
  "urge-surfing": { name: "Urge Surfing Week", tagline: "Ride the wave", focus: "Awareness" },
};

interface UserContext {
  snapshotName: string;
  snapshotTagline: string;
  focusArea: string;
  currentDay: number;
  daysCompleted: number;
  displayName: string | null;
  todayActionsCompleted: boolean;
  missionTitle: string | null;
  sessionId: string | null;
}

interface NudgeRequest {
  testMode?: boolean;
}

// Permission-giving lines — rotate, never stack
const PERMISSION_LINES = [
  "Nothing is required today.",
  "This is here whenever you're ready.",
  "No pressure. Just a quiet check-in.",
  "You're allowed to pause or continue at your own pace.",
  "You don't need to do anything more unless you want to.",
];

// Check if user already completed Today's Actions today
async function checkTodayActionsCompleted(
  supabase: SupabaseClient,
  userId: string,
  localDate: string
): Promise<boolean> {
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
    snapshotName: "Your Snapshot",
    snapshotTagline: "Your weekly focus",
    focusArea: "Focus",
    currentDay: 0,
    daysCompleted: 0,
    displayName: null,
    todayActionsCompleted: false,
    missionTitle: null,
    sessionId: null,
  };

  try {
    // Fetch in parallel
    const [sessionResult, profileResult, actionsCompleted, questResult] = await Promise.all([
      supabase
        .from("reset_sessions")
        .select("id, current_day, journey_id")
        .eq("user_id", userId)
        .eq("status", "active")
        .maybeSingle(),
      supabase
        .from("profiles")
        .select("display_name")
        .eq("id", userId)
        .maybeSingle(),
      checkTodayActionsCompleted(supabase, userId, localDate),
      supabase
        .from("main_quests")
        .select("title")
        .eq("user_id", userId)
        .eq("status", "active")
        .maybeSingle(),
    ]);

    context.todayActionsCompleted = actionsCompleted;
    
    // Mission title
    if (questResult.data?.title) {
      context.missionTitle = questResult.data.title;
    }

    // Display name
    if (profileResult.data?.display_name) {
      context.displayName = profileResult.data.display_name;
    }

    // Process active session
    if (sessionResult.data) {
      context.sessionId = sessionResult.data.id;
      context.currentDay = sessionResult.data.current_day || 0;
      const journeyId = sessionResult.data.journey_id;
      
      if (journeyId) {
        const snapshotData = SNAPSHOT_DATA[journeyId];
        if (snapshotData) {
          context.snapshotName = snapshotData.name;
          context.snapshotTagline = snapshotData.tagline;
          context.focusArea = snapshotData.focus;
        }
      }

      // Count days completed in this session
      const { count } = await supabase
        .from("daily_resets")
        .select("id", { count: "exact", head: true })
        .eq("session_id", sessionResult.data.id);
      
      context.daysCompleted = count || 0;
    }
  } catch (err) {
    console.warn(`[NUDGE] Error fetching context for ${userId}:`, err);
  }

  return context;
}

// Day-based context lines
function getDayContextLine(day: number): string {
  switch (day) {
    case 1:
      return "Starting fresh. No pressure to be perfect.";
    case 4:
      return "Day 4 — the wobble is normal. It's part of the process.";
    case 7:
      return "This is what proof looks like. One week of showing up.";
    default:
      return "Still here. That matters.";
  }
}

// Generate DAILY email content
function generateDailyEmailContent(
  context: UserContext
): { subject: string; body: string } {
  const greeting = context.displayName ? `Hey ${context.displayName}` : "Hey";
  const dayNum = context.currentDay || 1;
  
  // Subject: {{snapshot_name}}. Day {{day_number}}.
  const subject = `${context.snapshotName}. Day ${dayNum}.`;
  
  // Context line based on day
  const contextLine = getDayContextLine(dayNum);
  
  // Permission line (rotate)
  const permissionLine = PERMISSION_LINES[Math.floor(Math.random() * PERMISSION_LINES.length)];

  const body = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 440px; margin: 0 auto; padding: 40px 20px; text-align: center; background: #fafafa;">
      <div style="font-size: 36px; margin-bottom: 24px;">🌱</div>
      
      <p style="font-size: 18px; color: #1a1a1a; margin: 0 0 16px 0;">
        ${greeting},
      </p>
      
      <p style="font-size: 16px; color: #333; margin: 0 0 8px 0;">
        You're on Day ${dayNum} of your <strong>${context.snapshotName}</strong> Snapshot.
      </p>
      
      <p style="font-size: 14px; color: #666; margin: 0 0 4px 0;">
        This week's focus: <strong>${context.snapshotTagline}</strong>
      </p>
      
      <p style="font-size: 14px; color: #666; margin: 0 0 20px 0;">
        Focus area: <strong>${context.focusArea}</strong>
      </p>
      
      <p style="font-size: 15px; color: #444; margin: 0 0 20px 0;">
        ${contextLine}
      </p>
      
      <p style="font-size: 14px; color: #666; margin: 0 0 24px 0;">
        If you want to check in, your next small action is waiting.
      </p>
      
      <a href="https://thedashboard.agbcoaching.com/dashboard" 
         style="display: inline-block; background: #6366f1; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 500; font-size: 15px;">
        Open Today's Actions →
      </a>
      
      <p style="font-size: 13px; color: #888; margin: 24px 0 0 0; font-style: italic;">
        ${permissionLine}
      </p>
      
      <p style="font-size: 11px; color: #aaa; margin-top: 32px;">
        <a href="https://thedashboard.agbcoaching.com/dashboard" style="color: #888; text-decoration: none;">
          Turn off anytime in settings
        </a>
      </p>
    </div>
  `;

  return { subject, body };
}

// Generate WEEKLY email content
function generateWeeklyEmailContent(
  context: UserContext
): { subject: string; body: string } {
  const greeting = context.displayName ? `Hey ${context.displayName}` : "Hey";
  
  // Subject: Your {{snapshot_name}} Snapshot.
  const subject = `Your ${context.snapshotName} Snapshot.`;
  
  // Permission line (rotate)
  const permissionLine = PERMISSION_LINES[Math.floor(Math.random() * PERMISSION_LINES.length)];

  const body = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 440px; margin: 0 auto; padding: 40px 20px; text-align: center; background: #fafafa;">
      <div style="font-size: 36px; margin-bottom: 24px;">🏁</div>
      
      <p style="font-size: 18px; color: #1a1a1a; margin: 0 0 16px 0;">
        ${greeting},
      </p>
      
      <p style="font-size: 16px; color: #333; margin: 0 0 20px 0;">
        Here's your Snapshot from this past week.
      </p>
      
      <div style="background: #fff; border: 1px solid #eee; border-radius: 8px; padding: 20px; margin: 0 0 20px 0; text-align: left;">
        <p style="font-size: 14px; color: #666; margin: 0 0 8px 0;">
          <strong>Snapshot:</strong> ${context.snapshotName}
        </p>
        <p style="font-size: 14px; color: #666; margin: 0 0 8px 0;">
          <strong>Focus:</strong> ${context.snapshotTagline}
        </p>
        <p style="font-size: 14px; color: #666; margin: 0;">
          <strong>Days shown up:</strong> ${context.daysCompleted} / 7
        </p>
      </div>
      
      <p style="font-size: 15px; color: #444; margin: 0 0 8px 0;">
        This week still counts.
      </p>
      
      <p style="font-size: 14px; color: #666; margin: 0 0 24px 0;">
        What matters most is that you showed up at least once.
      </p>
      
      <p style="font-size: 14px; color: #666; margin: 0 0 24px 0;">
        If you want to review or start another Snapshot, it's ready.
      </p>
      
      <a href="https://thedashboard.agbcoaching.com/dashboard" 
         style="display: inline-block; background: #6366f1; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 500; font-size: 15px;">
        View Your Snapshot →
      </a>
      
      <p style="font-size: 13px; color: #888; margin: 24px 0 0 0; font-style: italic;">
        ${permissionLine}
      </p>
      
      <p style="font-size: 14px; color: #666; margin: 16px 0 0 0;">
        You're always allowed to pause or return later.
      </p>
      
      <p style="font-size: 11px; color: #aaa; margin-top: 32px;">
        <a href="https://thedashboard.agbcoaching.com/dashboard" style="color: #888; text-decoration: none;">
          Turn off anytime in settings
        </a>
      </p>
    </div>
  `;

  return { subject, body };
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
    let testMode = false;
    try {
      const body: NudgeRequest = await req.json();
      if (body.testMode === true) {
        testMode = true;
      }
    } catch {
      // Default to production mode
    }

    console.log(`[NUDGE] Starting nudge run (target hour: ${MORNING_HOUR}:00 local time)`);

    // Get all users with nudges enabled
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, timezone, nudge_frequency")
      .eq("email_nudge_enabled", true);

    if (profilesError) {
      console.error("[NUDGE] Error fetching profiles:", profilesError);
      throw profilesError;
    }

    if (!profiles || profiles.length === 0) {
      console.log(`[NUDGE] No users with nudges enabled`);
      return new Response(
        JSON.stringify({ message: "No users to nudge", count: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[NUDGE] Found ${profiles.length} users with nudges enabled`);

    interface ProfileRow {
      id: string;
      timezone: string | null;
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

    const usersToNudge: { userId: string; timezone: string; localDate: string; isWeekly: boolean }[] = [];
    const now = new Date();

    // Helper to get user's local hour and date correctly
    function getUserLocalTimeInfo(timezone: string): { hour: number; localDate: string } {
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
      
      const hour = parseInt(hourStr, 10) % 24;
      const localDate = `${year}-${month}-${day}`;
      
      return { hour, localDate };
    }

    for (const profile of profiles as ProfileRow[]) {
      const userTimezone = profile.timezone || "America/New_York";
      const userFrequency = profile.nudge_frequency || "daily";

      try {
        const { hour: userHour, localDate } = getUserLocalTimeInfo(userTimezone);
        
        console.log(`[NUDGE] User ${profile.id} timezone=${userTimezone}, localHour=${userHour}, frequency=${userFrequency}`);

        if (testMode) {
          usersToNudge.push({ userId: profile.id, timezone: userTimezone, localDate, isWeekly: userFrequency === "weekly" });
          continue;
        }

        // All nudges go out at morning time (7am)
        if (userHour !== MORNING_HOUR) {
          continue;
        }

        // Weekly nudges: only on Monday
        if (userFrequency === "weekly") {
          if (!isMondayLocal(userTimezone)) {
            console.log(`[NUDGE] User ${profile.id} has weekly frequency but today is not Monday, skipping`);
            continue;
          }
          usersToNudge.push({ userId: profile.id, timezone: userTimezone, localDate, isWeekly: true });
          continue;
        }

        // Daily nudges
        usersToNudge.push({ userId: profile.id, timezone: userTimezone, localDate, isWeekly: false });
      } catch (tzError) {
        console.warn(`[NUDGE] Invalid timezone for user ${profile.id}: ${userTimezone}`, tzError);
      }
    }

    console.log(`[NUDGE] ${usersToNudge.length} users to nudge${testMode ? " (TEST MODE)" : ""}`);

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

      await Promise.all(batch.map(async ({ userId, localDate, isWeekly }) => {
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

          // SUPPRESSION: Skip daily nudges if Today's Actions already completed
          if (!isWeekly && context.todayActionsCompleted) {
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

          // Generate appropriate email content
          const { subject, body } = isWeekly 
            ? generateWeeklyEmailContent(context)
            : generateDailyEmailContent(context);

          // Send email via Resend
          const emailResult = await resend.emails.send({
            from: "The Dashboard <noreply@thedashboard.agbcoaching.com>",
            to: [email],
            subject: subject,
            html: body,
          });

          console.log(`[NUDGE] Sent ${isWeekly ? "weekly" : "daily"} to ${email} with subject "${subject}":`, emailResult);

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
