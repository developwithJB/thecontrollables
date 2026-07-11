import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import {
  buildDashboardRelaunchEmailPayload,
  buildDailyTrainingReengagementEmailPayload,
  buildMissionEmailPayload,
  buildMissionOfTheDay,
  normalizeMissionDayMode,
  type MissionDayMode,
} from "../_shared/mission-of-the-day.ts";
import {
  buildDatedGoalEmailPayload,
  getChicagoGoalWeek,
  getChicagoWeekDates,
  getGoalDriftSignal,
  type DatedGoalEmailPayload,
  type DatedGoalRecord,
  type GoalDailyLog,
} from "../_shared/dated-goal.ts";

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
  "build-the-chain": { name: "Build the Chain", tagline: "Keep showing up", focus: "Habit" },
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
  "new-level-new-rules": { name: "New Level, New Rules", tagline: "Upgrade your playbook", focus: "Perspective" },
  "build-next-version": { name: "Build the Next Version", tagline: "Intentional upgrade", focus: "Awareness" },
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

const DASHBOARD_URL = "https://thedashboard.agbcoaching.com/home";
const DATED_GOAL_URL = "https://thedashboard.agbcoaching.com/goal";
const DASHBOARD_QUICK_START_URL = "https://thedashboard.agbcoaching.com/quick-start";
const DEFAULT_DASHBOARD_RELAUNCH_EMAIL_DATE = "2026-06-23";

function getDashboardRelaunchEmailDate(): string {
  return Deno.env.get("DASHBOARD_RELAUNCH_EMAIL_DATE") || DEFAULT_DASHBOARD_RELAUNCH_EMAIL_DATE;
}

function shouldSendDashboardRelaunchEmail(localDate: string, request: NudgeRequest): boolean {
  return request.forceRelaunchEmail === true || localDate === getDashboardRelaunchEmailDate();
}

function getMissionDayModeForContext(context: UserContext): MissionDayMode {
  if (context.currentDay <= 1) return "Reset Day";
  if (context.focusArea === "Wellness") return "Recovery Day";
  if (context.focusArea === "Habit") return "Build Day";
  if (context.currentDay >= 6) return "Momentum Day";
  return normalizeMissionDayMode(context.snapshotName);
}

function generateMissionOfTheDayEmailContent(
  context: UserContext,
  localDate: string,
): { subject: string; body: string; previewText: string; text: string } {
  const mission = buildMissionOfTheDay({
    date: localDate,
    dayMode: getMissionDayModeForContext(context),
    targetControllable: context.focusArea,
    appCtaLabel: "Open The Dashboard",
    appCtaUrl: DASHBOARD_URL,
    completed: context.todayActionsCompleted,
  });
  const payload = buildMissionEmailPayload(mission);

  return {
    subject: payload.subject,
    body: payload.html,
    previewText: payload.previewText,
    text: payload.text,
  };
}

type DriftLevel = "low" | "moderate" | "high";

interface DriftAlignmentEmailPayload {
  alignmentScore: number;
  driftScore: number;
  driftLevel: DriftLevel;
  primaryDriftDrivers: string[];
  returnBonusApplied: boolean;
}

interface NudgeRequest {
  testMode?: boolean;
  forceRelaunchEmail?: boolean;
  targetUserId?: string;
  forceSend?: boolean;
}

const HONEST_MOODS = new Set(["anxious", "frustrated", "overwhelmed", "flat"]);

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
  const { data: scriptures } = await supabase
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

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function shiftLocalDate(localDate: string, days: number): string {
  const date = new Date(`${localDate}T12:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().split("T")[0];
}

function parseDateOnly(value: string | null | undefined): Date | null {
  if (!value) return null;
  const normalized = value.length <= 10 ? `${value}T12:00:00` : value;
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function daysBetween(dateA: Date, dateB: Date): number {
  const oneDay = 24 * 60 * 60 * 1000;
  return Math.floor(Math.abs(dateA.getTime() - dateB.getTime()) / oneDay);
}

function getDurationMinutes(startTime: string | null, endTime: string | null): number {
  if (!startTime || !endTime) return 0;

  const [startHour = "0", startMinute = "0"] = startTime.split(":");
  const [endHour = "0", endMinute = "0"] = endTime.split(":");

  const start = Number(startHour) * 60 + Number(startMinute);
  const end = Number(endHour) * 60 + Number(endMinute);

  if (Number.isNaN(start) || Number.isNaN(end)) return 0;
  return Math.max(end - start, 0);
}

function interpretDriftAlignmentForEmail(input: {
  daysSinceLastAction: number | null;
  awarenessCheckInsLast7: number;
  honestCheckInsLast7: number;
  dailyCheckInsLast7: number;
  dailyCheckInToday: boolean;
  completedMovesLast7: number;
  completedMovesToday: number;
  awarenessToday: boolean;
  keptPromiseRate14: number | null;
  resolvedPromises14: number;
  activeQuest: boolean;
  environmentResets7: number;
  recovery: number | null;
  sleepMinutes: number | null;
  strain: number | null;
  repeatedLowSleepHighStrainCount: number;
  meetingCount: number;
  meetingMinutes: number;
  protectedFocus: boolean;
  overloadedCalendar: boolean;
  lowEnergyToday: boolean;
  highStressToday: boolean;
  recentLowEnergyHighStressCount: number;
}): DriftAlignmentEmailPayload {
  const drivers: Array<{ label: string; impact: number }> = [];
  let driftScore = 0;
  let driftRelief = 0;
  let alignmentBoost = 0;

  const daysSinceLastAction = input.daysSinceLastAction ?? 0;
  const lowRecovery = input.recovery != null && input.recovery < 34;
  const strongRecovery = input.recovery != null && input.recovery >= 67;
  const shortSleep = input.sleepMinutes != null && input.sleepMinutes < 360;
  const highStrain =
    (input.strain != null && input.strain >= 14) ||
    input.repeatedLowSleepHighStrainCount >= 2;
  const stressedWindow = input.highStressToday || input.recentLowEnergyHighStressCount >= 2;
  const lowEnergyWindow = input.lowEnergyToday || input.recentLowEnergyHighStressCount >= 2;

  if (daysSinceLastAction >= 3) {
    const impact = clamp(18 + (daysSinceLastAction - 3) * 4, 18, 34);
    drivers.push({
      label: "Recent actions have gone a bit quiet",
      impact,
    });
    driftScore += impact;
  }

  if (input.awarenessCheckInsLast7 === 0) {
    drivers.push({
      label: "Check-ins with God have been sparse",
      impact: 18,
    });
    driftScore += 18;
  } else if (input.awarenessCheckInsLast7 <= 1) {
    drivers.push({
      label: "Spiritual grounding has been thinner than usual",
      impact: 10,
    });
    driftScore += 10;
  } else {
    alignmentBoost += 4;
  }

  if (input.honestCheckInsLast7 === 0 && input.awarenessCheckInsLast7 > 0) {
    drivers.push({
      label: "The inner picture may still need more honesty",
      impact: 6,
    });
    driftScore += 6;
  } else if (input.honestCheckInsLast7 >= 2) {
    alignmentBoost += 4;
  }

  if (input.dailyCheckInsLast7 === 0) {
    drivers.push({
      label: "Daily alignment has lost its place",
      impact: 12,
    });
    driftScore += 12;
  } else if (input.dailyCheckInsLast7 <= 2) {
    drivers.push({
      label: "Your daily rhythm looks lighter than this season needs",
      impact: 7,
    });
    driftScore += 7;
  } else {
    alignmentBoost += 4;
  }

  if (input.keptPromiseRate14 != null && input.resolvedPromises14 >= 2) {
    if (input.keptPromiseRate14 < 40) {
      drivers.push({
        label: "Kept promises and main-quest follow-through have slipped",
        impact: 14,
      });
      driftScore += 14;
    } else if (input.keptPromiseRate14 < 70) {
      drivers.push({
        label: "Follow-through looks a bit unsteady right now",
        impact: 8,
      });
      driftScore += 8;
    } else {
      alignmentBoost += 6;
    }
  } else if (input.activeQuest && input.completedMovesLast7 <= 2) {
    drivers.push({
      label: "The main quest may need a smaller promise to regain traction",
      impact: 10,
    });
    driftScore += 10;
  }

  if (lowRecovery || shortSleep || highStrain || stressedWindow || lowEnergyWindow) {
    const impact =
      (lowRecovery ? 8 : 0) +
      (shortSleep ? 6 : 0) +
      (highStrain ? 3 : 0) +
      (stressedWindow ? 4 : 0) +
      (lowEnergyWindow ? 4 : 0);

    drivers.push({
      label: "Recovery and inner load are asking for attention",
      impact,
    });
    driftScore += impact;
  } else if (strongRecovery || (input.sleepMinutes ?? 0) >= 420) {
    alignmentBoost += 5;
  }

  if (input.overloadedCalendar) {
    const impact = clamp(
      (input.meetingCount >= 4 ? 8 : 0) +
        (input.meetingMinutes >= 240 ? 4 : 0) +
        (input.protectedFocus ? -3 : 3),
      4,
      12,
    );

    drivers.push({
      label: "The calendar is louder than the protection around it",
      impact,
    });
    driftScore += impact;
  } else if (input.protectedFocus) {
    alignmentBoost += 4;
  }

  if (input.environmentResets7 === 0) {
    drivers.push({
      label: "Your environment has been carrying more friction",
      impact: 7,
    });
    driftScore += 7;
  } else if (input.environmentResets7 >= 2) {
    alignmentBoost += 4;
  }

  const returnBonusApplied =
    daysSinceLastAction >= 2 &&
    (input.awarenessToday || input.dailyCheckInToday || input.completedMovesToday > 0);

  if (returnBonusApplied) {
    driftRelief += input.awarenessToday && input.completedMovesToday > 0 ? 18 : 12;
    alignmentBoost += input.awarenessToday ? 10 : 7;
  }

  if (input.completedMovesToday >= 2 || input.dailyCheckInToday) {
    driftRelief += 4;
    alignmentBoost += 4;
  }

  driftScore = clamp(driftScore - driftRelief, 0, 100);

  const alignmentScore = clamp(
    Math.round(72 - driftScore * 0.65 + alignmentBoost),
    0,
    100,
  );

  const driftLevel: DriftLevel =
    driftScore >= 60 ? "high" : driftScore >= 35 ? "moderate" : "low";

  const primaryDriftDrivers = [...drivers]
    .sort((a, b) => b.impact - a.impact)
    .slice(0, 3)
    .map((driver) => driver.label);

  return {
    alignmentScore,
    driftScore,
    driftLevel,
    primaryDriftDrivers,
    returnBonusApplied,
  };
}

async function getDriftAlignmentPayload(
  supabase: SupabaseClient,
  userId: string,
  localDate: string,
): Promise<DriftAlignmentEmailPayload | null> {
  const sevenDaysAgo = shiftLocalDate(localDate, -6);
  const fourteenDaysAgo = shiftLocalDate(localDate, -13);
  const thirtyDaysAgo = shiftLocalDate(localDate, -29);

  const [
    noticeEntriesRes,
    dailyCheckinsRes,
    dailyRingsRes,
    integrityLogsRes,
    environmentResetsRes,
    activeQuestRes,
    completedActionsRes,
    healthRowsRes,
    plannerItemsRes,
  ] = await Promise.all([
    supabase
      .from("notice_entries")
      .select("entry_date, mood, stress_level, energy_level, note")
      .eq("user_id", userId)
      .gte("entry_date", thirtyDaysAgo)
      .order("entry_date", { ascending: false }),
    supabase
      .from("daily_checkins")
      .select("check_in_date, completed")
      .eq("user_id", userId)
      .gte("check_in_date", thirtyDaysAgo)
      .order("check_in_date", { ascending: false }),
    supabase
      .from("daily_rings")
      .select("ring_date, notice_completed, choose_completed, prove_completed, charge_completed, align_completed")
      .eq("user_id", userId)
      .gte("ring_date", thirtyDaysAgo)
      .order("ring_date", { ascending: false }),
    supabase
      .from("integrity_logs")
      .select("promised_at, kept, kept_at")
      .eq("user_id", userId)
      .gte("promised_at", thirtyDaysAgo)
      .order("promised_at", { ascending: false }),
    supabase
      .from("environment_resets")
      .select("reset_date")
      .eq("user_id", userId)
      .gte("reset_date", thirtyDaysAgo)
      .order("reset_date", { ascending: false }),
    supabase
      .from("main_quests")
      .select("id")
      .eq("user_id", userId)
      .eq("status", "active")
      .limit(1)
      .maybeSingle(),
    supabase
      .from("completed_actions")
      .select("completed_at")
      .eq("user_id", userId)
      .gte("completed_at", `${thirtyDaysAgo}T00:00:00`)
      .order("completed_at", { ascending: false }),
    supabase
      .from("health_sync_data")
      .select("sync_date, recovery_score, sleep_minutes, strain_score")
      .eq("user_id", userId)
      .gte("sync_date", shiftLocalDate(localDate, -7))
      .order("sync_date", { ascending: false })
      .limit(7),
    supabase
      .from("planner_items")
      .select("item_type, start_time, end_time, status")
      .eq("user_id", userId)
      .eq("scheduled_date", localDate),
  ]);

  if (noticeEntriesRes.error) throw noticeEntriesRes.error;
  if (dailyCheckinsRes.error) throw dailyCheckinsRes.error;
  if (dailyRingsRes.error) throw dailyRingsRes.error;
  if (integrityLogsRes.error) throw integrityLogsRes.error;
  if (environmentResetsRes.error) throw environmentResetsRes.error;
  if (activeQuestRes.error) throw activeQuestRes.error;
  if (completedActionsRes.error) throw completedActionsRes.error;
  if (healthRowsRes.error) throw healthRowsRes.error;
  if (plannerItemsRes.error) throw plannerItemsRes.error;

  const noticeEntries = noticeEntriesRes.data ?? [];
  const dailyCheckins = dailyCheckinsRes.data ?? [];
  const dailyRings = dailyRingsRes.data ?? [];
  const integrityLogs = integrityLogsRes.data ?? [];
  const environmentResets = environmentResetsRes.data ?? [];
  const completedActions = completedActionsRes.data ?? [];
  const healthRows = healthRowsRes.data ?? [];
  const plannerItems = plannerItemsRes.data ?? [];

  const hasHistory =
    noticeEntries.length > 0 ||
    dailyCheckins.length > 0 ||
    dailyRings.length > 0 ||
    integrityLogs.length > 0 ||
    environmentResets.length > 0 ||
    completedActions.length > 0;

  if (!hasHistory) return null;

  const awarenessCheckInDays = new Set<string>();
  const honestCheckInDays = new Set<string>();

  for (const entry of noticeEntries) {
    if (entry.entry_date >= sevenDaysAgo) {
      awarenessCheckInDays.add(entry.entry_date);
      if (
        HONEST_MOODS.has(entry.mood) ||
        (entry.stress_level ?? 0) >= 4 ||
        (entry.energy_level ?? 6) <= 2 ||
        Boolean(entry.note?.trim())
      ) {
        honestCheckInDays.add(entry.entry_date);
      }
    }
  }

  const completedDailyCheckInDays = new Set(
    dailyCheckins
      .filter((entry) => entry.completed && entry.check_in_date >= sevenDaysAgo)
      .map((entry) => entry.check_in_date),
  );

  const ringsLast7 = dailyRings.filter((entry) => entry.ring_date >= sevenDaysAgo);
  const completedMovesLast7 = ringsLast7.reduce((total, entry) => {
    return (
      total +
      [entry.notice_completed, entry.choose_completed, entry.prove_completed, entry.charge_completed, entry.align_completed]
        .filter(Boolean).length
    );
  }, 0);

  const todayRing = ringsLast7.find((entry) => entry.ring_date === localDate);
  const completedMovesToday = todayRing
    ? [todayRing.notice_completed, todayRing.choose_completed, todayRing.prove_completed, todayRing.charge_completed, todayRing.align_completed]
        .filter(Boolean).length
    : 0;

  const resolvedPromises14 = integrityLogs.filter(
    (entry) => entry.promised_at.slice(0, 10) >= fourteenDaysAgo && entry.kept !== null,
  );
  const keptPromises14 = resolvedPromises14.filter((entry) => entry.kept === true).length;
  const keptPromiseRate14 =
    resolvedPromises14.length > 0 ? Math.round((keptPromises14 / resolvedPromises14.length) * 100) : null;

  const environmentResets7 = new Set(
    environmentResets
      .filter((entry) => entry.reset_date >= sevenDaysAgo)
      .map((entry) => entry.reset_date),
  ).size;

  const latestDates = [
    noticeEntries[0]?.entry_date,
    dailyCheckins.find((entry) => entry.completed)?.check_in_date,
    completedActions[0]?.completed_at,
    dailyRings.find((entry) =>
      entry.notice_completed ||
      entry.choose_completed ||
      entry.prove_completed ||
      entry.charge_completed ||
      entry.align_completed,
    )?.ring_date,
    integrityLogs[0]?.kept_at ?? integrityLogs[0]?.promised_at,
    environmentResets[0]?.reset_date,
  ]
    .map((value) => parseDateOnly(value))
    .filter((value): value is Date => Boolean(value));

  const lastActionDate =
    latestDates.length > 0
      ? new Date(Math.max(...latestDates.map((value) => value.getTime())))
      : null;

  let meetingCount = 0;
  let meetingMinutes = 0;
  let protectedFocus = false;

  for (const item of plannerItems) {
    const duration = getDurationMinutes(item.start_time, item.end_time);
    if (item.item_type === "external_event") {
      meetingCount += 1;
      meetingMinutes += duration;
    } else if (duration >= 60 && item.status !== "skipped") {
      protectedFocus = true;
    }
  }

  const latestHealthRow = healthRows[0] ?? null;
  const repeatedLowSleepHighStrainCount = healthRows
    .slice(0, 3)
    .filter((row) => (row.sleep_minutes ?? Infinity) < 360 && (row.strain_score ?? -Infinity) >= 14)
    .length;

  const todayNoticeEntry = noticeEntries.find((entry) => entry.entry_date === localDate) ?? null;

  return interpretDriftAlignmentForEmail({
    daysSinceLastAction: lastActionDate ? daysBetween(lastActionDate, new Date(`${localDate}T12:00:00`)) : null,
    awarenessCheckInsLast7: awarenessCheckInDays.size,
    honestCheckInsLast7: honestCheckInDays.size,
    dailyCheckInsLast7: completedDailyCheckInDays.size,
    dailyCheckInToday: completedDailyCheckInDays.has(localDate),
    completedMovesLast7,
    completedMovesToday,
    awarenessToday: awarenessCheckInDays.has(localDate),
    keptPromiseRate14,
    resolvedPromises14: resolvedPromises14.length,
    activeQuest: Boolean(activeQuestRes.data?.id),
    environmentResets7,
    recovery: latestHealthRow?.recovery_score ?? null,
    sleepMinutes: latestHealthRow?.sleep_minutes ?? null,
    strain: latestHealthRow?.strain_score ?? null,
    repeatedLowSleepHighStrainCount,
    meetingCount,
    meetingMinutes,
    protectedFocus,
    overloadedCalendar: meetingCount >= 4 || meetingMinutes >= 240 || plannerItems.length >= 8,
    lowEnergyToday: (todayNoticeEntry?.energy_level ?? 6) <= 2,
    highStressToday: (todayNoticeEntry?.stress_level ?? 0) >= 4,
    recentLowEnergyHighStressCount: new Set(
      noticeEntries
        .filter((entry) => entry.entry_date >= shiftLocalDate(localDate, -3))
        .filter((entry) => (entry.energy_level ?? 6) <= 2 && (entry.stress_level ?? 0) >= 4)
        .map((entry) => entry.entry_date),
    ).size,
  });
}

// Generate AI content for Daily Alignment
async function generateAlignmentContent(
  displayName: string,
  lowestControllable: string,
  missionTitle: string | null,
  recentReflection: string | null,
  driftAlignment: DriftAlignmentEmailPayload | null,
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
    driftAlignment ? `Alignment score: ${driftAlignment.alignmentScore}/100` : null,
    driftAlignment ? `Drift score: ${driftAlignment.driftScore}/100` : null,
    driftAlignment ? `Drift level: ${driftAlignment.driftLevel}` : null,
    driftAlignment && driftAlignment.primaryDriftDrivers.length > 0
      ? `Primary drift drivers: ${driftAlignment.primaryDriftDrivers.join("; ")}`
      : null,
    driftAlignment?.returnBonusApplied ? "The user has already begun re-aligning after some drift." : null,
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
  levels: ControllableLevelInfo[],
  driftAlignment: DriftAlignmentEmailPayload | null = null,
): { subject: string; body: string } {
  const greeting = context.displayName ? `Hey ${context.displayName}` : "Hey";
  const dayNum = context.currentDay || 1;
  const driftLine = driftAlignment
    ? driftAlignment.returnBonusApplied
      ? "You are already re-aligning. One honest move today still counts."
      : driftAlignment.driftLevel === "high"
        ? "You may have drifted a bit. You are not behind. One grounded move is enough to begin again."
        : driftAlignment.driftLevel === "moderate"
          ? "A gentle re-alignment would help today. Keep it honest and small."
          : "Your alignment looks mostly steady. Keep staying close to what matters most this season."
    : null;

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

      ${driftLine ? `
        <p style="font-size: 14px; color: #666; margin: 0 0 20px 0; line-height: 1.6;">
          ${driftLine}
        </p>
      ` : ""}
      
      <p style="font-size: 14px; color: #666; margin: 0 0 24px 0;">
        If you want to check in, your next small action is waiting.
      </p>
      
      <a href="${DASHBOARD_URL}"
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
        <a href="${DASHBOARD_URL}" style="color: #888; text-decoration: none;">
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
        <a href="${DASHBOARD_URL}"
           style="display: inline-block; background: #6366f1; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 500; font-size: 15px;">
          Open My Dashboard
        </a>
      </div>
      
      <p style="font-size: 13px; color: #888; margin: 24px 0 0 0; font-style: italic; text-align: center;">
        ${permissionLine}
      </p>
      
      <p style="font-size: 11px; color: #aaa; margin-top: 32px; text-align: center;">
        <a href="${DASHBOARD_URL}" style="color: #888; text-decoration: none;">
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
      
      <a href="${DASHBOARD_URL}"
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
        <a href="${DASHBOARD_URL}" style="color: #888; text-decoration: none;">
          Turn off anytime in settings
        </a>
      </p>
    </div>
  `;

  return { subject, body };
}

async function getActiveDatedGoalEmail(
  supabase: SupabaseClient,
  userId: string,
  localDate: string,
  displayName: string | null,
): Promise<{ goal: DatedGoalRecord; payload: DatedGoalEmailPayload } | null> {
  const { data: goalData, error: goalError } = await supabase
    .from("dated_goals")
    .select("id, user_id, plan_id, title, event_name, event_date, start_date, timezone, target_result, status")
    .eq("user_id", userId)
    .eq("status", "active")
    .gte("event_date", localDate)
    .order("event_date", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (goalError) {
    console.warn(`[NUDGE] Dated goal lookup failed for ${userId}: ${goalError.message}`);
    return null;
  }
  if (!goalData) return null;

  const goal = goalData as DatedGoalRecord;
  const historyStart = shiftLocalDate(localDate, -13);
  const [logsResult, healthResult] = await Promise.all([
    supabase
      .from("dated_goal_daily_logs")
      .select("log_date, session_type, status, actual_miles, strength_completed, fueling_completed, pain_affecting_stride")
      .eq("goal_id", goal.id)
      .gte("log_date", historyStart)
      .lte("log_date", localDate)
      .order("log_date", { ascending: true }),
    supabase
      .from("health_sync_data")
      .select("sync_date, sleep_minutes, recovery_score")
      .eq("user_id", userId)
      .gte("sync_date", historyStart)
      .lte("sync_date", localDate)
      .order("sync_date", { ascending: false }),
  ]);

  if (logsResult.error) console.warn(`[NUDGE] Dated goal logs unavailable for ${userId}: ${logsResult.error.message}`);
  if (healthResult.error) console.warn(`[NUDGE] Dated goal health unavailable for ${userId}: ${healthResult.error.message}`);

  const logs: GoalDailyLog[] = (logsResult.data ?? []).map((row: Record<string, unknown>) => ({
    logDate: String(row.log_date),
    sessionType: String(row.session_type) as GoalDailyLog["sessionType"],
    status: String(row.status) as GoalDailyLog["status"],
    actualMiles: row.actual_miles === null || row.actual_miles === undefined ? null : Number(row.actual_miles),
    strengthCompleted: Boolean(row.strength_completed),
    fuelingCompleted: row.fueling_completed === null || row.fueling_completed === undefined ? null : Boolean(row.fueling_completed),
    painAffectingStride: Boolean(row.pain_affecting_stride),
  }));
  const healthRows = healthResult.data ?? [];
  const sleepPerformances = healthRows
    .filter((row: { sleep_minutes: number | null }) => row.sleep_minutes !== null)
    .map((row: { sleep_minutes: number | null }) => Math.min(100, Math.round((Number(row.sleep_minutes) / 480) * 100)));
  const recentRecoveries = healthRows
    .slice(0, 3)
    .map((row: { recovery_score: number | null }) => row.recovery_score);
  const latestHealth = healthRows[0] ?? null;
  const drift = getGoalDriftSignal({
    currentDate: localDate,
    logs,
    sleepPerformances,
    recentRecoveries,
  });
  const week = getChicagoGoalWeek(localDate);
  const weekDates = week ? getChicagoWeekDates(week) : [];
  const weekMilesCompleted = logs
    .filter((log) => weekDates.includes(log.logDate))
    .reduce((total, log) => total + (log.actualMiles ?? 0), 0);
  const payload = buildDatedGoalEmailPayload({
    displayName,
    currentDate: localDate,
    eventDate: goal.event_date,
    appUrl: DATED_GOAL_URL,
    health: {
      recovery: latestHealth?.recovery_score ?? null,
      sleepMinutes: latestHealth?.sleep_minutes ?? null,
      recentRecoveries,
      painAffectingStride: logs.some((log) => log.logDate === localDate && log.painAffectingStride),
    },
    drift,
    weekMilesCompleted: week ? weekMilesCompleted : undefined,
  });

  return { goal, payload };
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
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    let requestBody: NudgeRequest = {};
    let testMode = false;
    try {
      requestBody = await req.json();
      testMode = requestBody.testMode === true;
    } catch {
      // Default to production mode
    }

    const privilegedRequest =
      testMode ||
      requestBody.forceRelaunchEmail === true ||
      Boolean(requestBody.targetUserId) ||
      requestBody.forceSend === true;

    if (requestBody.forceSend && !requestBody.targetUserId) {
      return new Response(
        JSON.stringify({ error: "forceSend requires targetUserId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (privilegedRequest) {
      const authHeader = req.headers.get("Authorization");
      let authorized = authHeader === `Bearer ${supabaseServiceKey}`;

      if (!authorized && authHeader) {
        const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
          auth: { persistSession: false },
          global: { headers: { Authorization: authHeader } },
        });
        const { data: authData } = await anonClient.auth.getUser();
        if (authData.user) {
          const { data: adminRole } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", authData.user.id)
            .eq("role", "admin")
            .maybeSingle();
          authorized = Boolean(adminRole);
        }
      }

      if (!authorized) {
        return new Response(
          JSON.stringify({ error: "Admin authorization required" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    console.log(
      `[NUDGE] Starting nudge run (target hour: ${MORNING_HOUR}:00 local time, relaunch date: ${getDashboardRelaunchEmailDate()})`,
    );

    // Get all users with nudges enabled
    let profilesQuery = supabase
      .from("profiles")
      .select("id, timezone, nudge_frequency")
      .eq("email_nudge_enabled", true);

    if (requestBody.targetUserId) {
      profilesQuery = profilesQuery.eq("id", requestBody.targetUserId);
    }

    const { data: profiles, error: profilesError } = await profilesQuery;

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

    const usersToNudge: {
      userId: string;
      timezone: string;
      localDate: string;
      isWeekly: boolean;
      emailKind: "normal" | "relaunch";
    }[] = [];
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
        const relaunchEmailActive = shouldSendDashboardRelaunchEmail(localDate, requestBody);
        
        console.log(
          `[NUDGE] User ${profile.id} timezone=${userTimezone}, localHour=${userHour}, frequency=${userFrequency}, relaunch=${relaunchEmailActive}`,
        );

        if (testMode) {
          usersToNudge.push({
            userId: profile.id,
            timezone: userTimezone,
            localDate,
            isWeekly: userFrequency === "weekly" && !relaunchEmailActive,
            emailKind: relaunchEmailActive ? "relaunch" : "normal",
          });
          continue;
        }

        // All nudges go out at morning time (7am)
        if (userHour !== MORNING_HOUR) {
          continue;
        }

        // Relaunch day replaces the normal nudge for all email-enabled users.
        if (relaunchEmailActive) {
          usersToNudge.push({
            userId: profile.id,
            timezone: userTimezone,
            localDate,
            isWeekly: false,
            emailKind: "relaunch",
          });
          continue;
        }

        // Weekly nudges: only on Monday
        if (userFrequency === "weekly") {
          if (!isMondayLocal(userTimezone)) {
            console.log(`[NUDGE] User ${profile.id} has weekly frequency but today is not Monday, skipping`);
            continue;
          }
          usersToNudge.push({ userId: profile.id, timezone: userTimezone, localDate, isWeekly: true, emailKind: "normal" });
          continue;
        }

        // Daily nudges
        usersToNudge.push({ userId: profile.id, timezone: userTimezone, localDate, isWeekly: false, emailKind: "normal" });
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
    let missionCount = 0;
    let relaunchCount = 0;
    let datedGoalCount = 0;
    const errors: string[] = [];

    // Process in batches of 10
    for (let i = 0; i < usersToNudge.length; i += 10) {
      const batch = usersToNudge.slice(i, i + 10);

      await Promise.all(batch.map(async ({ userId, localDate, isWeekly, emailKind }) => {
        try {
          // ATOMIC DEDUPLICATION: Insert with unique constraint — only the first invocation wins
          const claim = {
              user_id: userId,
              nudge_date: localDate,
              status: "pending",
            };
          const claimResult = requestBody.forceSend
            ? await supabase
                .from("email_nudge_logs")
                .upsert(claim, { onConflict: "user_id,nudge_date" })
            : await supabase
                .from("email_nudge_logs")
                .insert(claim);
          const claimError = claimResult.error;

          if (claimError) {
            // Unique constraint violation means another invocation already claimed this slot
            console.log(`[NUDGE] Already claimed for ${userId} on ${localDate}, skipping (${claimError.code})`);
            skippedCount++;
            return;
          }

          // Fetch user context for personalization
          const context = await getUserContext(supabase, userId, localDate);
          console.log(`[NUDGE] Context for ${userId}:`, JSON.stringify(context));

          if (emailKind === "relaunch") {
            const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);

            if (userError || !userData?.user?.email) {
              console.warn(`[NUDGE] Could not get email for relaunch user ${userId}:`, userError);
              await supabase
                .from("email_nudge_logs")
                .update({ status: "skipped" })
                .eq("user_id", userId)
                .eq("nudge_date", localDate);
              skippedCount++;
              return;
            }

            const payload = buildDashboardRelaunchEmailPayload({
              displayName: context.displayName,
              appCtaUrl: DASHBOARD_QUICK_START_URL,
            });

            await resend.emails.send({
              from: "The Dashboard <noreply@thedashboard.agbcoaching.com>",
              to: [userData.user.email],
              subject: payload.subject,
              html: payload.html,
              text: payload.text,
            });

            await supabase
              .from("email_nudge_logs")
              .update({ status: "sent", sent_at: new Date().toISOString() })
              .eq("user_id", userId)
              .eq("nudge_date", localDate);

            console.log(`[NUDGE] Sent Dashboard relaunch email to ${userData.user.email}`);
            sentCount++;
            relaunchCount++;
            return;
          }

          // ACTIVE DATED GOAL: The finish line becomes the user's primary morning operating plan.
          const datedGoalEmail = await getActiveDatedGoalEmail(
            supabase,
            userId,
            localDate,
            context.displayName,
          );

          if (datedGoalEmail) {
            const { data: goalUser, error: goalUserError } = await supabase.auth.admin.getUserById(userId);
            if (goalUserError || !goalUser?.user?.email) {
              console.warn(`[NUDGE] Could not get email for dated goal user ${userId}:`, goalUserError);
              await supabase
                .from("email_nudge_logs")
                .update({ status: "skipped" })
                .eq("user_id", userId)
                .eq("nudge_date", localDate);
              skippedCount++;
              return;
            }

            await resend.emails.send({
              from: "The Dashboard <noreply@thedashboard.agbcoaching.com>",
              to: [goalUser.user.email],
              subject: datedGoalEmail.payload.subject,
              html: datedGoalEmail.payload.html,
              text: datedGoalEmail.payload.text,
            });

            await supabase
              .from("email_nudge_logs")
              .update({ status: "sent", sent_at: new Date().toISOString() })
              .eq("user_id", userId)
              .eq("nudge_date", localDate);

            console.log(
              `[NUDGE] Sent dated goal plan ${datedGoalEmail.goal.plan_id} to ${goalUser.user.email}`,
            );
            sentCount++;
            datedGoalCount++;
            return;
          }

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

          // RE-ENGAGEMENT: If no active session, still send a sticky training drop instead of skipping.
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
            const reEngageLevels = await getUserControllableLevels(supabase, userId);
            const reEngagePayload = buildDailyTrainingReengagementEmailPayload({
              displayName: context.displayName,
              levels: reEngageLevels,
              appCtaUrl: DASHBOARD_URL,
              quickStartUrl: DASHBOARD_QUICK_START_URL,
            });

            try {
              await resend.emails.send({
                from: "The Dashboard <noreply@thedashboard.agbcoaching.com>",
                to: [reEngageEmail],
                subject: reEngagePayload.subject,
                html: reEngagePayload.html,
                text: reEngagePayload.text,
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

          const userLevels = await getUserControllableLevels(supabase, userId);
          
          let subject: string;
          let body: string;
          let text: string | undefined;

          if (isWeekly) {
            const result = generateWeeklyEmailContent(context, userLevels);
            subject = result.subject;
            body = result.body;
          } else {
            const result = generateMissionOfTheDayEmailContent(context, localDate);
            subject = result.subject;
            body = result.body;
            text = result.text;
          }

          // Send email via Resend
          const emailResult = await resend.emails.send({
            from: "The Dashboard <noreply@thedashboard.agbcoaching.com>",
            to: [email],
            subject: subject,
            html: body,
            ...(text ? { text } : {}),
          });

          console.log(`[NUDGE] Sent ${isWeekly ? "weekly" : "daily mission"} to ${email} with subject "${subject}":`, emailResult);

          // Update the pending log to "sent" status
          await supabase
            .from("email_nudge_logs")
            .update({ status: "sent", sent_at: new Date().toISOString() })
            .eq("user_id", userId)
            .eq("nudge_date", localDate);

          sentCount++;
          if (!isWeekly) missionCount++;
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

    console.log(
      `[NUDGE] Complete. Sent: ${sentCount} (${datedGoalCount} dated goals, ${missionCount} daily missions, ${relaunchCount} relaunch), Skipped: ${skippedCount}, Errors: ${errors.length}`,
    );

    return new Response(
      JSON.stringify({
        message: "Nudge run complete",
        sent: sentCount,
        dailyMissions: missionCount,
        datedGoalEmails: datedGoalCount,
        relaunchEmails: relaunchCount,
        alignment: 0,
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
