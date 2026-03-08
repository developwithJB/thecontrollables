import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MORNING_HOUR = 7;

// Snapshot data for email context (inline since we can't import from src)
// IMPORTANT: Keep in sync with src/lib/snapshots.ts
const SNAPSHOT_DATA: Record<string, { name: string; tagline: string; focus: string }> = {
  // 🔄 Reset & Re-Entry
  "back-to-zero": { name: "Back to Zero", tagline: "Start fresh without shame", focus: "Awareness" },
  "just-show-up": { name: "Just Show Up", tagline: "Presence over performance", focus: "Habit" },
  "stabilize-basics": { name: "Stabilize the Basics", tagline: "Simple foundations first", focus: "Wellness" },
  "restart-without-shame": { name: "Restart Without Shame", tagline: "Grace over guilt", focus: "Perspective" },
  "get-grounded": { name: "Get Grounded Again", tagline: "Anchor in your space", focus: "Environment" },
  "one-day-at-time": { name: "One Day at a Time", tagline: "Today is enough", focus: "Awareness" },
  "environment-reset": { name: "Environment Reset", tagline: "Design your space for success", focus: "Environment" },
  
  // ⚡ Momentum & Consistency
  "one-thing-a-day": { name: "One Thing a Day", tagline: "Simple beats complex", focus: "Habit" },
  "tiny-wins": { name: "Tiny Wins Week", tagline: "Stack small victories", focus: "Habit" },
  "finish-what-you-start": { name: "Finish What You Start", tagline: "Completion over perfection", focus: "Habit" },
  "build-the-chain": { name: "Build the Chain", tagline: "Don't break the streak", focus: "Habit" },
  "show-up-anyway": { name: "Show Up Anyway", tagline: "Action despite resistance", focus: "Habit" },
  "consistency-over-intensity": { name: "Consistency Over Intensity", tagline: "Slow is fast", focus: "Perspective" },
  "replace-the-trigger": { name: "Replace the Trigger", tagline: "Swap the urge, keep the routine", focus: "Habit" },
  
  // 🧠 Clarity & Perspective
  "quiet-the-noise": { name: "Quiet the Noise", tagline: "Silence before clarity", focus: "Awareness" },
  "zoom-out": { name: "Zoom Out", tagline: "See the bigger picture", focus: "Perspective" },
  "what-actually-matters": { name: "What Actually Matters", tagline: "Cut through the noise", focus: "Perspective" },
  "pause-before-reacting": { name: "Pause Before Reacting", tagline: "Response over reaction", focus: "Awareness" },
  "see-it-clearly": { name: "See It Clearly", tagline: "Facts over feelings", focus: "Awareness" },
  "reframe-the-story": { name: "Reframe the Story", tagline: "Change the narrative", focus: "Perspective" },
  "less-mental-weight": { name: "Less Mental Weight", tagline: "Lighten the load", focus: "Environment" },
  "delay-the-impulse": { name: "Delay the Impulse", tagline: "10 minutes changes everything", focus: "Awareness" },
  "urge-surfing": { name: "Urge Surfing Week", tagline: "Ride the wave", focus: "Awareness" },
  "reduce-mental-noise": { name: "Quiet the Noise", tagline: "Silence before clarity", focus: "Awareness" },
  "refocus-on-what-matters": { name: "What Actually Matters", tagline: "Cut through the noise", focus: "Perspective" },
  
  // 🛰️ Energy & Care
  "protect-your-energy": { name: "Protect Your Energy", tagline: "Guard your reserves", focus: "Wellness" },
  "slow-down-week": { name: "Slow Down Week", tagline: "Less speed, more presence", focus: "Wellness" },
  "sleep-first": { name: "Sleep First", tagline: "Foundation of everything", focus: "Wellness" },
  "body-check-in": { name: "Body Check-In", tagline: "Listen to signals", focus: "Wellness" },
  "back-to-basics": { name: "Back to the Basics", tagline: "Simple foundations", focus: "Wellness" },
  "care-is-not-laziness": { name: "Care Is Not Laziness", tagline: "Rest is productive", focus: "Perspective" },
  "fuel-the-body": { name: "Fuel the Body", tagline: "Nourish to perform", focus: "Wellness" },
  "rest-without-guilt": { name: "Rest Without Guilt", tagline: "Permission granted", focus: "Perspective" },
  "take-care-first": { name: "Take Care First", tagline: "You before the to-do", focus: "Wellness" },
  
  // 🧱 Integrity & Self-Trust
  "keep-one-promise": { name: "Keep One Promise", tagline: "Build trust with yourself", focus: "Habit" },
  "keep-small-promises": { name: "Keep Small Promises", tagline: "Trust is built in micro-moments", focus: "Habit" },
  "follow-through": { name: "Follow Through", tagline: "Do what you said", focus: "Habit" },
  "rebuild-trust": { name: "Rebuild Trust", tagline: "One kept promise at a time", focus: "Perspective" },
  "say-what-you-mean": { name: "Say What You Mean", tagline: "Clarity over comfort", focus: "Awareness" },
  "say-less-do-more": { name: "Say Less, Do More", tagline: "Actions speak", focus: "Habit" },
  "word-equals-bond": { name: "Word = Bond", tagline: "Mean what you say", focus: "Awareness" },
  "boundaries-week": { name: "Boundaries Week", tagline: "Protect what matters", focus: "Environment" },
  "integrity-audit": { name: "Integrity Audit", tagline: "Align words and actions", focus: "Awareness" },
  "earn-trust-back": { name: "Earn Your Trust Back", tagline: "Rebuild through action", focus: "Perspective" },
  "do-what-you-said": { name: "Do What You Said", tagline: "Simple but powerful", focus: "Habit" },
  "rebuild-confidence-agb": { name: "Rebuild Your Confidence", tagline: "Confidence comes from kept promises", focus: "Habit" },
  "rebuild-momentum": { name: "Rebuild Your Momentum", tagline: "Start small, build up", focus: "Habit" },
  "reenter-the-game": { name: "Re-enter the Game", tagline: "Get back in action", focus: "Habit" },
  
  // 🌱 Growth & Expansion
  "try-something-new": { name: "Try Something New", tagline: "Expand your edges", focus: "Habit" },
  "push-one-edge": { name: "Push One Edge", tagline: "Controlled discomfort", focus: "Perspective" },
  "upgrade-one-habit": { name: "Upgrade One Habit", tagline: "Level up what works", focus: "Habit" },
  "learn-in-public": { name: "Learn in Public", tagline: "Share the journey", focus: "Perspective" },
  "ship-something": { name: "Ship Something", tagline: "Done beats perfect", focus: "Habit" },
  "reflect-and-plan": { name: "Reflect and Plan", tagline: "Review before moving forward", focus: "Awareness" },
  "raise-the-bar": { name: "Raise the Bar", tagline: "Incrementally level up", focus: "Habit" },
  "new-level-new-rules": { name: "New Level, New Rules", tagline: "Evolve your playbook", focus: "Perspective" },
  "build-next-version": { name: "Build the Next Version", tagline: "Intentional evolution", focus: "Awareness" },
  "step-into-more": { name: "Step Into More", tagline: "Expand your capacity", focus: "Habit" },
  "expand-capacity": { name: "Expand the Capacity", tagline: "Handle more without breaking", focus: "Wellness" },
  "play-bigger-game": { name: "Play a Bigger Game", tagline: "Think bigger, act bolder", focus: "Perspective" },
  "inputs-audit": { name: "Inputs Audit", tagline: "What you consume matters", focus: "Environment" },
  
  // Custom snapshots (generated from Build)
  "custom-awareness": { name: "Sharpen Your Awareness", tagline: "See more, react less", focus: "Awareness" },
  "custom-perspective": { name: "Reclaim Your Perspective", tagline: "Zoom out, realign", focus: "Perspective" },
  "custom-habit": { name: "Rebuild Your Habits", tagline: "Show up, stack wins", focus: "Habit" },
  "custom-wellness": { name: "Restore Your Foundation", tagline: "Energy first, output second", focus: "Wellness" },
  "custom-environment": { name: "Design Your Environment", tagline: "Remove friction, add flow", focus: "Environment" },
  
  // Legacy/alias keys (map to the canonical snapshot)
  "environment-reset-goal": { name: "Environment Reset", tagline: "Remove friction", focus: "Environment" },
};

interface ControllableLevelInfo {
  type: string;
  emoji: string;
  label: string;
  level: number;
}

const CONTROLLABLE_META: Record<string, { emoji: string; label: string }> = {
  awareness: { emoji: "🦉", label: "Awareness" },
  perspective: { emoji: "🐢", label: "Perspective" },
  habit: { emoji: "🦈", label: "Habit" },
  wellness: { emoji: "🛰️", label: "Wellness" },
  environment: { emoji: "🚀", label: "Environment" },
};

function getLevelFromXp(totalXp: number): number {
  if (totalXp <= 0) return 1;
  const raw = Math.floor(Math.sqrt(totalXp / 25));
  return Math.min(Math.max(raw, 1), 99);
}

async function getUserControllableLevels(
  supabase: SupabaseClient,
  userId: string
): Promise<ControllableLevelInfo[]> {
  const { data, error } = await supabase
    .from("completed_actions")
    .select("controllable, xp_awarded")
    .eq("user_id", userId)
    .not("controllable", "is", null);

  const xpMap: Record<string, number> = {};
  if (!error && data) {
    for (const row of data) {
      if (row.controllable) {
        xpMap[row.controllable] = (xpMap[row.controllable] || 0) + row.xp_awarded;
      }
    }
  }

  return Object.entries(CONTROLLABLE_META).map(([type, meta]) => ({
    type,
    emoji: meta.emoji,
    label: meta.label,
    level: getLevelFromXp(xpMap[type] || 0),
  }));
}

function renderBuildLevelsHtml(levels: ControllableLevelInfo[]): string {
  const overallLevel = Math.round(levels.reduce((s, l) => s + l.level, 0) / levels.length);
  const items = levels
    .map(
      (l) =>
        `<td style="text-align:center;padding:4px 6px;">
          <span style="font-size:18px;">${l.emoji}</span><br/>
          <span style="font-size:11px;color:#888;">${l.label}</span><br/>
          <span style="font-size:13px;font-weight:600;color:#333;">Lv.${l.level}</span>
        </td>`
    )
    .join("");

  return `
    <div style="background:#fff;border:1px solid #eee;border-radius:8px;padding:16px;margin:0 0 20px 0;">
      <p style="font-size:12px;color:#888;margin:0 0 4px 0;letter-spacing:0.5px;text-align:center;">YOUR BUILD — Lv.${overallLevel}</p>
      <table style="width:100%;border-collapse:collapse;"><tr>${items}</tr></table>
    </div>
  `;
}

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
        .select("id, current_day, journey_id, start_date")
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
      // Check if session has expired (7-day window elapsed)
      const startDate = new Date(sessionResult.data.start_date + "T00:00:00Z");
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 7); // Session is 7 days, so Day 7 is 6 days after start
      
      const today = new Date(localDate + "T00:00:00Z");
      
      if (today >= endDate) {
        // Session has expired - auto-complete it and skip nudge
        console.log(`[NUDGE] Session ${sessionResult.data.id} expired (started ${sessionResult.data.start_date}, ends ${endDate.toISOString().split('T')[0]}), auto-completing`);
        
        await supabase
          .from("reset_sessions")
          .update({ status: "completed", completed_at: new Date().toISOString() })
          .eq("id", sessionResult.data.id)
          .eq("status", "active");
        
        // Return context without session - will skip daily nudge
        return context;
      }
      
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

// Check if user is a paid subscriber
async function checkIsPaid(supabase: SupabaseClient, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from("user_entitlements")
    .select("id, expires_at")
    .eq("user_id", userId)
    .order("granted_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return false;
  if (!data.expires_at) return true; // lifetime
  return new Date(data.expires_at) > new Date();
}

// Map controllable names to scripture theme tags
function getThemeForControllable(controllable: string): string {
  const map: Record<string, string> = {
    awareness: "awareness",
    perspective: "perspective",
    habit: "habit",
    wellness: "wellness",
    environment: "environment",
  };
  return map[controllable.toLowerCase()] || "awareness";
}

// Get the user's lowest controllable from their build scores
async function getLowestControllable(supabase: SupabaseClient, userId: string): Promise<string | null> {
  const { data } = await supabase
    .from("user_build_current")
    .select("awareness, perspective, habit, wellness, environment")
    .eq("user_id", userId)
    .maybeSingle();

  if (!data) return null;

  const scores: Record<string, number> = {
    awareness: Number(data.awareness) || 0,
    perspective: Number(data.perspective) || 0,
    habit: Number(data.habit) || 0,
    wellness: Number(data.wellness) || 0,
    environment: Number(data.environment) || 0,
  };

  let lowest = "awareness";
  let lowestScore = Infinity;
  for (const [key, val] of Object.entries(scores)) {
    if (val < lowestScore) {
      lowestScore = val;
      lowest = key;
    }
  }
  return lowest;
}

// Select a scripture for the user, avoiding recent ones
async function selectScripture(
  supabase: SupabaseClient,
  userId: string,
  themeTag: string,
  localDate: string
): Promise<{ id: string; verse_reference: string; verse_text: string } | null> {
  // Get recently sent scripture IDs (last 14 days)
  const { data: recentLogs } = await supabase
    .from("daily_alignment_logs")
    .select("scripture_id")
    .eq("user_id", userId)
    .gte("nudge_date", new Date(new Date(localDate).getTime() - 14 * 86400000).toISOString().split("T")[0])
    .order("nudge_date", { ascending: false });

  const recentIds = (recentLogs || []).map((l: { scripture_id: string }) => l.scripture_id);

  // Try to find a matching theme scripture not recently sent
  let { data: scriptures } = await supabase
    .from("daily_scriptures")
    .select("id, verse_reference, verse_text")
    .eq("theme_tag", themeTag)
    .order("rotation_order", { ascending: true });

  if (scriptures && scriptures.length > 0) {
    const unsent = scriptures.filter((s: { id: string }) => !recentIds.includes(s.id));
    if (unsent.length > 0) return unsent[0];
    // All theme scriptures recently sent, use the first one (wrap around)
    return scriptures[0];
  }

  // Fallback: any scripture by rotation_order
  const { data: fallback } = await supabase
    .from("daily_scriptures")
    .select("id, verse_reference, verse_text")
    .order("rotation_order", { ascending: true })
    .limit(1);

  return fallback?.[0] || null;
}

// Get recent reflection/journal content for AI context
async function getRecentReflection(supabase: SupabaseClient, userId: string): Promise<string | null> {
  const { data } = await supabase
    .from("daily_resets")
    .select("reflection, commitment")
    .eq("user_id", userId)
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;
  const parts = [data.reflection, data.commitment].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : null;
}

// Get consecutive streak count
async function getStreakCount(supabase: SupabaseClient, userId: string): Promise<number> {
  const { data } = await supabase
    .from("daily_checkins")
    .select("check_in_date")
    .eq("user_id", userId)
    .order("check_in_date", { ascending: false })
    .limit(30);

  if (!data || data.length === 0) return 0;

  let streak = 0;
  const today = new Date();
  for (let i = 0; i < data.length; i++) {
    const expected = new Date(today);
    expected.setDate(expected.getDate() - i);
    const expectedStr = expected.toISOString().split("T")[0];
    if (data[i].check_in_date === expectedStr) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

// Generate AI content for Daily Alignment
async function generateAlignmentContent(
  displayName: string,
  lowestControllable: string,
  missionTitle: string | null,
  recentReflection: string | null,
  streakCount: number,
  verseReference: string,
  verseText: string
): Promise<{
  contextReflection: string;
  reflectionQuestion: string;
  microAction: string;
  eveningPrompt: string;
} | null> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) {
    console.error("[ALIGNMENT] LOVABLE_API_KEY not configured");
    return null;
  }

  const userVars = [
    `Name: ${displayName || "Friend"}`,
    `Area needing attention: ${lowestControllable}`,
    missionTitle ? `Current mission: ${missionTitle}` : null,
    recentReflection ? `Recent reflection: "${recentReflection.slice(0, 200)}"` : null,
    `Current streak: ${streakCount} day${streakCount !== 1 ? "s" : ""}`,
  ].filter(Boolean).join("\n");

  const prompt = `You are writing a concise, grounded, spiritually mature daily alignment email. Tie this scripture to the user's current growth journey using their recent activity data. Keep tone practical, not preachy. Keep total length under 250 words.

Scripture: ${verseReference}
"${verseText}"

User context:
${userVars}

Generate exactly four items in this JSON format:
{
  "contextReflection": "1-2 sentence reflection tying the scripture to their journey",
  "reflectionQuestion": "One thoughtful question for them to sit with today",
  "microAction": "One clear, specific behavior-based action for today",
  "eveningPrompt": "One sentence evening self-check question"
}

Rules:
- No long dashes
- No generic Christian cliches
- Tone: grounded, wise, clear
- No emojis
- Address them by first name naturally
- Reference their specific situation when possible`;

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "user", content: prompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "daily_alignment",
              description: "Return daily alignment content.",
              parameters: {
                type: "object",
                properties: {
                  contextReflection: { type: "string" },
                  reflectionQuestion: { type: "string" },
                  microAction: { type: "string" },
                  eveningPrompt: { type: "string" },
                },
                required: ["contextReflection", "reflectionQuestion", "microAction", "eveningPrompt"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "daily_alignment" } },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("[ALIGNMENT] AI gateway error:", response.status, errText);
      return null;
    }

    const result = await response.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      console.error("[ALIGNMENT] No tool call in response");
      return null;
    }

    const parsed = JSON.parse(toolCall.function.arguments);
    return {
      contextReflection: parsed.contextReflection || "",
      reflectionQuestion: parsed.reflectionQuestion || "",
      microAction: parsed.microAction || "",
      eveningPrompt: parsed.eveningPrompt || "",
    };
  } catch (err) {
    console.error("[ALIGNMENT] AI generation error:", err);
    return null;
  }
}

// Generate DAILY email content (basic for free users)
function generateDailyEmailContent(
  context: UserContext,
  levels: ControllableLevelInfo[]
): { subject: string; body: string } {
  const greeting = context.displayName ? `Hey ${context.displayName}` : "Hey";
  const dayNum = context.currentDay || 1;
  
  const subject = `${context.snapshotName}. Day ${dayNum}.`;
  const contextLine = getDayContextLine(dayNum);
  const permissionLine = PERMISSION_LINES[Math.floor(Math.random() * PERMISSION_LINES.length)];
  const buildSection = renderBuildLevelsHtml(levels);

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
      
      ${buildSection}
      
      <p style="font-size: 15px; color: #444; margin: 0 0 20px 0;">
        ${contextLine}
      </p>
      
      <p style="font-size: 14px; color: #666; margin: 0 0 24px 0;">
        If you want to check in, your next small action is waiting.
      </p>
      
      <a href="https://thedashboard.agbcoaching.com/dashboard" 
         style="display: inline-block; background: #6366f1; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 500; font-size: 15px;">
        Open Today's Actions
      </a>
      
      <div style="margin-top: 24px; padding: 16px; background: #f0f0ff; border-radius: 8px;">
        <p style="font-size: 13px; color: #555; margin: 0 0 8px 0; font-weight: 500;">
          Want personalized scripture and reflection each morning?
        </p>
        <a href="https://thedashboard.agbcoaching.com/billing" 
           style="font-size: 13px; color: #6366f1; text-decoration: none; font-weight: 500;">
          Unlock Daily Alignment
        </a>
      </div>
      
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

// Generate Daily Alignment email content (premium)
function generateDailyAlignmentEmailContent(
  context: UserContext,
  verseReference: string,
  verseText: string,
  aiContent: {
    contextReflection: string;
    reflectionQuestion: string;
    microAction: string;
    eveningPrompt: string;
  },
  levels: ControllableLevelInfo[]
): { subject: string; body: string } {
  const firstName = context.displayName || "Friend";
  const subject = `${firstName}, stay aligned today.`;
  const permissionLine = PERMISSION_LINES[Math.floor(Math.random() * PERMISSION_LINES.length)];
  const buildSection = renderBuildLevelsHtml(levels);

  const body = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 440px; margin: 0 auto; padding: 40px 20px; background: #fafafa;">
      <p style="font-size: 18px; color: #1a1a1a; margin: 0 0 24px 0;">
        Good morning ${firstName},
      </p>
      
      ${buildSection}
      
      <div style="background: #fff; border-left: 3px solid #6366f1; padding: 16px 20px; margin: 0 0 24px 0; border-radius: 0 8px 8px 0;">
        <p style="font-size: 12px; color: #888; margin: 0 0 8px 0; letter-spacing: 0.5px;">
          SCRIPTURE OF THE DAY
        </p>
        <p style="font-size: 15px; color: #333; margin: 0 0 6px 0; font-style: italic;">
          "${verseText}"
        </p>
        <p style="font-size: 13px; color: #666; margin: 0; font-weight: 500;">
          ${verseReference}
        </p>
      </div>
      
      <p style="font-size: 15px; color: #333; margin: 0 0 20px 0; line-height: 1.6;">
        ${aiContent.contextReflection}
      </p>
      
      <div style="background: #f8f8fc; padding: 16px; border-radius: 8px; margin: 0 0 20px 0;">
        <p style="font-size: 12px; color: #888; margin: 0 0 6px 0; letter-spacing: 0.5px;">
          REFLECT ON THIS
        </p>
        <p style="font-size: 14px; color: #444; margin: 0; font-style: italic;">
          "${aiContent.reflectionQuestion}"
        </p>
      </div>
      
      <div style="background: #f0fdf4; padding: 16px; border-radius: 8px; margin: 0 0 20px 0;">
        <p style="font-size: 12px; color: #888; margin: 0 0 6px 0; letter-spacing: 0.5px;">
          LIVE IT TODAY
        </p>
        <p style="font-size: 14px; color: #333; margin: 0;">
          ${aiContent.microAction}
        </p>
      </div>
      
      <div style="background: #fefce8; padding: 16px; border-radius: 8px; margin: 0 0 24px 0;">
        <p style="font-size: 12px; color: #888; margin: 0 0 6px 0; letter-spacing: 0.5px;">
          TONIGHT
        </p>
        <p style="font-size: 14px; color: #444; margin: 0; font-style: italic;">
          "${aiContent.eveningPrompt}"
        </p>
      </div>
      
      <p style="font-size: 14px; color: #666; margin: 0 0 16px 0; text-align: center;">
        Track how you live this inside The Dashboard.
      </p>
      
      <div style="text-align: center;">
        <a href="https://thedashboard.agbcoaching.com/dashboard" 
           style="display: inline-block; background: #6366f1; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 500; font-size: 15px;">
          Open My Dashboard
        </a>
      </div>
      
      <p style="font-size: 13px; color: #888; margin: 24px 0 0 0; font-style: italic; text-align: center;">
        ${permissionLine}
      </p>
      
      <p style="font-size: 11px; color: #aaa; margin-top: 32px; text-align: center;">
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
  context: UserContext,
  levels: ControllableLevelInfo[]
): { subject: string; body: string } {
  const greeting = context.displayName ? `Hey ${context.displayName}` : "Hey";
  
  // Subject: Your {{snapshot_name}} Snapshot.
  const subject = `Your ${context.snapshotName} Snapshot.`;
  
  // Permission line (rotate)
  const permissionLine = PERMISSION_LINES[Math.floor(Math.random() * PERMISSION_LINES.length)];
  const buildSection = renderBuildLevelsHtml(levels);

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
      
      ${buildSection}
      
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
        View Your Snapshot
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
    let alignmentCount = 0;
    const errors: string[] = [];

    // Process in batches of 10
    for (let i = 0; i < usersToNudge.length; i += 10) {
      const batch = usersToNudge.slice(i, i + 10);

      await Promise.all(batch.map(async ({ userId, localDate, isWeekly }) => {
        try {
          // ATOMIC DEDUPLICATION: Insert with unique constraint — only the first invocation wins
          const { error: claimError } = await supabase
            .from("email_nudge_logs")
            .insert({
              user_id: userId,
              nudge_date: localDate,
              status: "pending",
            });

          if (claimError) {
            // Unique constraint violation means another invocation already claimed this slot
            console.log(`[NUDGE] Already claimed for ${userId} on ${localDate}, skipping (${claimError.code})`);
            skippedCount++;
            return;
          }

          // Fetch user context for personalization
          const context = await getUserContext(supabase, userId, localDate);
          console.log(`[NUDGE] Context for ${userId}:`, JSON.stringify(context));

          // SUPPRESSION: Skip daily nudges if Today's Actions already completed
          if (!isWeekly && context.todayActionsCompleted) {
            console.log(`[NUDGE] User ${userId} already completed Today's Actions, marking as skipped`);
            await supabase
              .from("email_nudge_logs")
              .update({ status: "skipped" })
              .eq("user_id", userId)
              .eq("nudge_date", localDate);
            skippedCount++;
            return;
          }

          // RE-ENGAGEMENT: If no active session, send a "start your next snapshot" nudge instead of skipping
          if (!isWeekly && !context.sessionId) {
            console.log(`[NUDGE] User ${userId} has no active session, sending re-engagement nudge`);
            
            // Get user email for re-engagement
            const { data: reEngageUser, error: reEngageError } = await supabase.auth.admin.getUserById(userId);
            if (reEngageError || !reEngageUser?.user?.email) {
              console.warn(`[NUDGE] Could not get email for re-engagement user ${userId}`);
              await supabase
                .from("email_nudge_logs")
                .update({ status: "skipped" })
                .eq("user_id", userId)
                .eq("nudge_date", localDate);
              skippedCount++;
              return;
            }

            const reEngageEmail = reEngageUser.user.email;
            const firstName = context.displayName || "Friend";
            const permissionLine = PERMISSION_LINES[Math.floor(Math.random() * PERMISSION_LINES.length)];
            const reEngageLevels = await getUserControllableLevels(supabase, userId);
            const reEngageBuildSection = renderBuildLevelsHtml(reEngageLevels);

            const reEngageSubject = "Your next Snapshot is waiting";
            const reEngageBody = `
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 440px; margin: 0 auto; padding: 40px 20px; background: #fafafa;">
                <p style="font-size: 18px; color: #1a1a1a; margin: 0 0 24px 0;">
                  Good morning ${firstName},
                </p>
                
                <p style="font-size: 15px; color: #333; margin: 0 0 20px 0; line-height: 1.6;">
                  You've completed your last Snapshot — well done. When you're ready, a new 7-day focus is waiting for you inside The Dashboard.
                </p>
                
                <p style="font-size: 15px; color: #333; margin: 0 0 24px 0; line-height: 1.6;">
                  No pressure. Just showing up is the win.
                </p>
                
                ${reEngageBuildSection}
                
                <div style="text-align: center;">
                  <a href="https://thedashboard.agbcoaching.com/dashboard" 
                     style="display: inline-block; background: #6366f1; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 500; font-size: 15px;">
                    Start Your Next Snapshot →
                  </a>
                </div>
                
                <p style="font-size: 13px; color: #888; margin: 24px 0 0 0; font-style: italic; text-align: center;">
                  ${permissionLine}
                </p>
                
                <p style="font-size: 11px; color: #aaa; margin-top: 32px; text-align: center;">
                  <a href="https://thedashboard.agbcoaching.com/dashboard" style="color: #888; text-decoration: none;">
                    Turn off anytime in settings
                  </a>
                </p>
              </div>
            `;

            try {
              await resend.emails.send({
                from: "The Dashboard <noreply@thedashboard.agbcoaching.com>",
                to: [reEngageEmail],
                subject: reEngageSubject,
                html: reEngageBody,
              });

              await supabase
                .from("email_nudge_logs")
                .update({ status: "sent", sent_at: new Date().toISOString() })
                .eq("user_id", userId)
                .eq("nudge_date", localDate);

              console.log(`[NUDGE] Sent re-engagement nudge to ${reEngageEmail}`);
              sentCount++;
            } catch (reEngageErr) {
              console.error(`[NUDGE] Failed re-engagement for ${userId}:`, reEngageErr);
              await supabase
                .from("email_nudge_logs")
                .update({ status: "skipped" })
                .eq("user_id", userId)
                .eq("nudge_date", localDate);
              errors.push(`${userId}: re-engagement failed`);
            }
            return;
          }

          // Get user email
          const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);

          if (userError || !userData?.user?.email) {
            console.warn(`[NUDGE] Could not get email for user ${userId}:`, userError);
            return;
          }

          const email = userData.user.email;

          // Check if user is paid (for Daily Alignment) and fetch levels
          const [userIsPaid, userLevels] = await Promise.all([
            checkIsPaid(supabase, userId),
            getUserControllableLevels(supabase, userId),
          ]);
          
          let subject: string;
          let body: string;

          if (!isWeekly && userIsPaid) {
            // PREMIUM PATH: Daily Alignment with scripture + AI
            console.log(`[NUDGE] Generating Daily Alignment for paid user ${userId}`);
            
            // Gather data for personalization
            const [lowestControllable, recentReflection, streakCount] = await Promise.all([
              getLowestControllable(supabase, userId),
              getRecentReflection(supabase, userId),
              getStreakCount(supabase, userId),
            ]);

            const themeTag = getThemeForControllable(lowestControllable || context.focusArea.toLowerCase());
            const scripture = await selectScripture(supabase, userId, themeTag, localDate);

            if (scripture) {
              const aiContent = await generateAlignmentContent(
                context.displayName || "Friend",
                lowestControllable || context.focusArea.toLowerCase(),
                context.missionTitle,
                recentReflection,
                streakCount,
                scripture.verse_reference,
                scripture.verse_text
              );

              if (aiContent) {
                const result = generateDailyAlignmentEmailContent(context, scripture.verse_reference, scripture.verse_text, aiContent, userLevels);
                subject = result.subject;
                body = result.body;

                // Log alignment data
                await supabase.from("daily_alignment_logs").upsert({
                  user_id: userId,
                  scripture_id: scripture.id,
                  nudge_date: localDate,
                  generated_content: aiContent,
                }, { onConflict: "user_id,nudge_date" });

                alignmentCount++;
              } else {
                // AI failed, fall back to basic premium email with scripture only
                const fallbackResult = generateDailyAlignmentEmailContent(context, scripture.verse_reference, scripture.verse_text, {
                  contextReflection: `This verse speaks to your ${lowestControllable || "growth"} journey. Let it settle before you act on it.`,
                  reflectionQuestion: "What part of this verse challenges you most right now?",
                  microAction: "Choose one small action today that reflects what this verse is asking of you.",
                  eveningPrompt: "Did I live closer to this verse today than yesterday?",
                }, userLevels);
                subject = fallbackResult.subject;
                body = fallbackResult.body;
              }
            } else {
              // No scripture found, fall back to basic email
              const basicResult = generateDailyEmailContent(context, userLevels);
              subject = basicResult.subject;
              body = basicResult.body;
            }
          } else if (isWeekly) {
            const result = generateWeeklyEmailContent(context, userLevels);
            subject = result.subject;
            body = result.body;
          } else {
            // FREE PATH: Basic daily nudge with upgrade CTA
            const result = generateDailyEmailContent(context, userLevels);
            subject = result.subject;
            body = result.body;
          }

          // Send email via Resend
          const emailResult = await resend.emails.send({
            from: "The Dashboard <noreply@thedashboard.agbcoaching.com>",
            to: [email],
            subject: subject,
            html: body,
          });

          console.log(`[NUDGE] Sent ${isWeekly ? "weekly" : userIsPaid ? "alignment" : "daily"} to ${email} with subject "${subject}":`, emailResult);

          // Update the pending log to "sent" status
          await supabase
            .from("email_nudge_logs")
            .update({ status: "sent", sent_at: new Date().toISOString() })
            .eq("user_id", userId)
            .eq("nudge_date", localDate);

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

    console.log(`[NUDGE] Complete. Sent: ${sentCount} (${alignmentCount} alignment), Skipped: ${skippedCount}, Errors: ${errors.length}`);

    return new Response(
      JSON.stringify({
        message: "Nudge run complete",
        sent: sentCount,
        alignment: alignmentCount,
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
