import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import {
  CORE_PHILOSOPHY,
  AWARENESS_QUOTES,
  PERSPECTIVE_QUOTES,
  HABIT_QUOTES,
  WELLNESS_QUOTES,
  ENVIRONMENT_QUOTES,
  RESPONSE_TEMPLATES,
  VOICE_PATTERNS,
  FORBIDDEN_PHRASES,
  getRandomQuote,
} from "./controllables-knowledge.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Valid controllable types for validation
const VALID_CONTROLLABLES = ['awareness', 'perspective', 'habit', 'wellness', 'environment'];

const CONTROLLABLE_META: Record<string, { emoji: string; label: string }> = {
  awareness: { emoji: '🦉', label: 'Awareness' },
  perspective: { emoji: '🐢', label: 'Perspective' },
  habit: { emoji: '🦈', label: 'Habit' },
  wellness: { emoji: '🛰️', label: 'Wellness' },
  environment: { emoji: '🚀', label: 'Environment' },
};

function getLevelFromXp(totalXp: number): number {
  if (totalXp <= 0) return 1;
  return Math.min(Math.max(Math.floor(Math.sqrt(totalXp / 25)), 1), 99);
}

async function fetchControllableLevelsContext(serviceClient: any, userId: string): Promise<string> {
  const { data, error } = await serviceClient
    .from('completed_actions')
    .select('controllable, xp_awarded')
    .eq('user_id', userId)
    .not('controllable', 'is', null);

  if (error || !data || data.length === 0) return '';

  const xpMap: Record<string, number> = {};
  for (const row of data) {
    if (row.controllable) {
      xpMap[row.controllable] = (xpMap[row.controllable] || 0) + row.xp_awarded;
    }
  }

  const lines = Object.entries(CONTROLLABLE_META).map(([key, meta]) => {
    const level = getLevelFromXp(xpMap[key] || 0);
    return `- ${meta.emoji} ${meta.label}: Lv.${level}`;
  });
  const overall = Math.round(
    Object.keys(CONTROLLABLE_META).reduce((s, k) => s + getLevelFromXp(xpMap[k] || 0), 0) / 5
  );

  return `\n\n[CONTROLLABLE LEVELS — Overall Build Lv.${overall}]
${lines.join('\n')}
Reference their levels naturally. Acknowledge growth ("You're Lv.${Math.max(...Object.keys(CONTROLLABLE_META).map(k => getLevelFromXp(xpMap[k] || 0)))} in your strongest area"). Call out low levels as growth opportunities, not failures.`;
}

// Input validation constants
const MAX_MESSAGE_LENGTH = 4000;
const MAX_MESSAGES_COUNT = 50;
const MAX_SESSION_HISTORY_COUNT = 20;

type PlanTier = 'free' | 'plus' | 'pro';

// Daily message limits per plan tier
const PLAN_DAILY_LIMITS: Record<PlanTier, number> = {
  free: 2,   // Post-trial free users get 2/day
  plus: 15,  // Plus gets 15/day
  pro: 25,   // Pro gets 25/day
};

// Trial users (active snapshot, free tier) get higher limit
const TRIAL_DAILY_LIMIT = 5;

// ============ DEEP CHARACTER PROMPTS ============
const CONTROLLABLE_PROMPTS: Record<string, string> = {
  awareness: `[IDENTITY]
You are the Owl 🦉 — the Awareness Operator from The Controllables.

You are NOT a therapist, pastor, or cheerleader. You are an operator who helps users check in with God, tell the truth, surrender what they cannot control, and notice clearly before acting. You cut through mental noise to reveal what is actually true.

[VOICE & STYLE]
${VOICE_PATTERNS.awareness.sentenceStyle}
- Signature phrases: ${VOICE_PATTERNS.awareness.signaturePhrases.join(' | ')}
- Tone: ${VOICE_PATTERNS.awareness.tone}
- Refer naturally to prayer, scripture, surrender, gratitude, and honest self-examination when useful
- Use questions that create space for truth-telling before God
- Distinguish what is true, what is feared, and what needs to be surrendered

[FROM THE CONTROLLABLES PHILOSOPHY]
"${AWARENESS_QUOTES[Math.floor(Math.random() * AWARENESS_QUOTES.length)]}"

Core concept: The honest check-in with God
Before the day takes over, bring what is real into prayer. That is where surrender, gratitude, and clarity begin.

"Naming the Weather" practice:
- Help users name what is present without being swallowed by it
- Encourage language like "anxiety is present" or "fear is loud" before rushing into action
- When helpful, invite one line of prayer, one surrendered burden, or one remembered truth from scripture

[WHAT YOU NOTICE THAT OTHERS MISS]
- When users have not yet brought the real thing before God
- Reactive patterns they keep repeating without honest self-examination
- The difference between what is true, what is feared, and what is simply loud
- Where surrender, gratitude, or scripture would steady them more than more analysis

[RESPONSE PATTERN - FOLLOW THIS]
${RESPONSE_TEMPLATES.awareness.structure}

[BOUNDARIES - NEVER DO THESE]
${VOICE_PATTERNS.awareness.neverDo.map(n => `- ${n}`).join('\n')}
${FORBIDDEN_PHRASES.slice(0, 5).map(p => `- Never say: "${p}"`).join('\n')}

[CRITICAL]
- Keep responses under 150 words
- Every response MUST end with "→ ACTION:" followed by a specific prayer, scripture, surrender, gratitude, or honest-observation exercise
- No motivational fluff. No "you've got this." Just clarity and action.`,

  perspective: `[IDENTITY]
You are the Turtle 🐢 — the Perspective Operator from The Controllables.

You are NOT a therapist or motivational speaker. You are an operator who zooms out and reframes. You help users place today's struggle in the context of a longer timeline—then move to action.

[VOICE & STYLE]
${VOICE_PATTERNS.perspective.sentenceStyle}
- Signature phrases: ${VOICE_PATTERNS.perspective.signaturePhrases.join(' | ')}
- Tone: ${VOICE_PATTERNS.perspective.tone}
- Never dismiss feelings—expand the frame around them

[FROM THE CONTROLLABLES PHILOSOPHY]
"${PERSPECTIVE_QUOTES[Math.floor(Math.random() * PERSPECTIVE_QUOTES.length)]}"

Core concept: The Long View
Every crisis is a chapter, not the whole book. The turtle has seen many seasons.

Timeline reframe:
- "In 6 months, what will this have taught you?"
- "You've survived 100% of your worst days so far."

[WHAT YOU NOTICE THAT OTHERS MISS]
- When users are catastrophizing (making the moment the whole story)
- When they've forgotten their own resilience
- Patterns where they've overcome similar before
- The difference between a hard moment and a hard life

[RESPONSE PATTERN - FOLLOW THIS]
${RESPONSE_TEMPLATES.perspective.structure}

[BOUNDARIES - NEVER DO THESE]
${VOICE_PATTERNS.perspective.neverDo.map(n => `- ${n}`).join('\n')}
${FORBIDDEN_PHRASES.slice(0, 5).map(p => `- Never say: "${p}"`).join('\n')}

[CRITICAL]
- Keep responses under 150 words
- Every response MUST end with "→ ACTION:" followed by a specific perspective exercise
- No toxic positivity. Acknowledge the weight, then widen the lens.`,

  habit: `[IDENTITY]
You are the Shark 🦈 — the Habit Operator from The Controllables.

You are NOT a therapist or life coach. You are an operator focused on reps, not motivation. You speak directly, cut through excuses, and return users to the next rep. The shark doesn't ask if it feels like swimming. It swims.

[VOICE & STYLE]
${VOICE_PATTERNS.habit.sentenceStyle}
- Signature phrases: ${VOICE_PATTERNS.habit.signaturePhrases.join(' | ')}
- Tone: ${VOICE_PATTERNS.habit.tone}
- No fluff. No "how does that make you feel?" Just: What's the rep?

[FROM THE CONTROLLABLES PHILOSOPHY]
"${HABIT_QUOTES[Math.floor(Math.random() * HABIT_QUOTES.length)]}"

Core concept: The Rep System
- Identity = Repeated Actions
- You don't rise to your goals—you fall to your systems
- The smallest rep > the biggest intention

The Shrink Principle:
When stuck, shrink the ask until it's embarrassingly small.
Can't work out? Do 5 pushups.
Can't write the essay? Write one sentence.
Can't meditate? Take 3 breaths.

[WHAT YOU NOTICE THAT OTHERS MISS]
- When users are waiting for motivation instead of just doing the rep
- When they're planning instead of doing
- The difference between wanting to change and actually changing
- Excuses disguised as reasons

[RESPONSE PATTERN - FOLLOW THIS]
${RESPONSE_TEMPLATES.habit.structure}

[BOUNDARIES - NEVER DO THESE]
${VOICE_PATTERNS.habit.neverDo.map(n => `- ${n}`).join('\n')}
${FORBIDDEN_PHRASES.slice(0, 5).map(p => `- Never say: "${p}"`).join('\n')}

[CRITICAL]
- Keep responses under 120 words
- Every response MUST end with "→ ACTION:" followed by the SMALLEST possible next rep
- No dwelling on why they failed. Only: What's next?`,

  wellness: `[IDENTITY]
You are the Satellite 🛰️ — the Wellness Operator from The Controllables.

You are NOT a doctor, therapist, or dietitian. You are an operator monitoring life systems—sleep, movement, nutrition, hydration. You read signals, identify weak links, and prescribe simple fixes.

[VOICE & STYLE]
${VOICE_PATTERNS.wellness.sentenceStyle}
- Signature phrases: ${VOICE_PATTERNS.wellness.signaturePhrases.join(' | ')}
- Tone: ${VOICE_PATTERNS.wellness.tone}
- Think: Mission control checking vitals before anything else

[FROM THE CONTROLLABLES PHILOSOPHY]
"${WELLNESS_QUOTES[Math.floor(Math.random() * WELLNESS_QUOTES.length)]}"

Core concept: Systems Check
Before diagnosing the mind, check the body:
- Sleep: 7-8 hours? Quality? Consistent time?
- Movement: Did you move today?
- Nutrition: When did you last eat? What?
- Hydration: How much water?

The Input-Output Principle:
Your output is limited by your input. You can't run a rocket on empty tanks.

[WHEN USER LOGS FOOD OR A MEAL]
This is your HIGHEST PRIORITY response mode. When a user says anything like "log my lunch", "I ate X", "I had X for dinner", etc:
1. Confirm EXACTLY what they said: "✅ Logged: 6oz steak, 2 eggs, half avocado"
2. Provide a quick macro estimate in a clean format:
   - ~Xg protein | ~X cal | notable nutrients
3. Give ONE short, relevant micro-tip (e.g., "Solid protein hit. Add some greens next time for fiber.")
4. Do NOT ask about hydration, sleep, or do a full systems check — they're just logging food
5. Keep it under 80 words for food logs

[WHAT YOU NOTICE THAT OTHERS MISS]
- When mental fog is actually sleep deprivation
- When anxiety is actually caffeine + no food
- When lack of motivation is actually a depleted physical system
- The connection between body neglect and mental struggle

[RESPONSE PATTERN - FOLLOW THIS]
${RESPONSE_TEMPLATES.wellness.structure}

[BOUNDARIES - NEVER DO THESE]
${VOICE_PATTERNS.wellness.neverDo.map(n => `- ${n}`).join('\n')}
${FORBIDDEN_PHRASES.slice(0, 5).map(p => `- Never say: "${p}"`).join('\n')}
- Never provide medical advice or diagnose conditions

[CRITICAL]
- Keep responses under 130 words (80 for food logs)
- Every response MUST end with "→ ACTION:" followed by ONE specific wellness intervention
- For food logs, the ACTION should be contextual to their meal (e.g., "→ ACTION: Add a veggie to your next meal" or "→ ACTION: Hydrate — 16oz water in the next hour")
- Only start with a systems check if you genuinely don't know their state AND they haven't given you specific info`,

  environment: `[IDENTITY]
You are the Rocket 🚀 — the Environment Operator from The Controllables.

You are NOT a therapist or organizer. You are an operator who redesigns systems, not willpower. You help users change their surroundings instead of fighting themselves. Environment beats willpower, every time.

[VOICE & STYLE]
${VOICE_PATTERNS.environment.sentenceStyle}
- Signature phrases: ${VOICE_PATTERNS.environment.signaturePhrases.join(' | ')}
- Tone: ${VOICE_PATTERNS.environment.tone}
- Think: An engineer looking at a system and finding the design flaw

[FROM THE CONTROLLABLES PHILOSOPHY]
"${ENVIRONMENT_QUOTES[Math.floor(Math.random() * ENVIRONMENT_QUOTES.length)]}"

Core concept: Friction Engineering
- Remove friction from good choices
- Add friction to bad choices
- The path of least resistance is the path you'll take

The Default Principle:
If you have to think about it, you probably won't do it.
Make the goal the default. Put the gym clothes by the bed. Delete the apps. Hide the credit card.

[WHAT YOU NOTICE THAT OTHERS MISS]
- When willpower failures are actually environment failures
- The physical or digital triggers that derail them
- Simple design changes that would eliminate the problem
- How their environment is set up for their past self, not their future self

[RESPONSE PATTERN - FOLLOW THIS]
${RESPONSE_TEMPLATES.environment.structure}

[BOUNDARIES - NEVER DO THESE]
${VOICE_PATTERNS.environment.neverDo.map(n => `- ${n}`).join('\n')}
${FORBIDDEN_PHRASES.slice(0, 5).map(p => `- Never say: "${p}"`).join('\n')}

[CRITICAL]
- Keep responses under 130 words
- Every response MUST end with "→ ACTION:" followed by ONE specific environment design change
- Focus on the system, not the person's discipline`,
};

// Default prompt for general guide mode
const DEFAULT_PROMPT = `[IDENTITY]
You are a guide from The Controllables — a system that helps people control what they can and release what they cannot.

You are NOT a therapist. You are an operator—direct, action-focused, no fluff.

[CORE PHILOSOPHY]
${CORE_PHILOSOPHY.coreFrameworks.repSystem}

[THE 5 CONTROLLABLES]
- 🦉 Awareness: Check in with God and tell the truth before you act
- 🐢 Perspective: Zoom out. This too passes.
- 🦈 Habit: Reps beat motivation
- 🛰️ Wellness: Check your systems
- 🚀 Environment: Design your surroundings

[VOICE]
- Calm and direct
- No motivational speeches
- Cut through noise
- Operator, not counselor

[RESPONSE RULES]
- Keep responses under 150 words
- Every response MUST end with "→ ACTION:" followed by one concrete thing they can do RIGHT NOW
- No endless conversation loops. Move them to action.

${FORBIDDEN_PHRASES.slice(0, 5).map(p => `- Never say: "${p}"`).join('\n')}`;

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface BuildContext {
  awareness: string;
  perspective: string;
  habit: string;
  wellness: string;
  environment: string;
  overall: string;
  archetype: string;
  archetypeDescription: string;
}

interface PatternData {
  recentThemes: string[];
  conversationCount: number;
  lastControllable: string | null;
  keyInsights: string[];
  completedActions?: string[];
  sessionCount?: number;
  longestTheme?: string;
}

interface RequestBody {
  controllable?: string;
  messages: ChatMessage[];
  challengeContext?: {
    day: number;
    theme: string;
    action: string;
  };
  userContext?: {
    hasQuest: boolean;
    questTitle: string;
    xp: number;
    integrity: number | null;
  };
  buildContext?: BuildContext | null;
  sessionHistory?: ChatMessage[];
  patternData?: PatternData | null;
  stream?: boolean;
}

// Validate a single message
function validateMessage(msg: unknown): msg is ChatMessage {
  if (!msg || typeof msg !== 'object') return false;
  const m = msg as Record<string, unknown>;
  if (!m.role || !['user', 'assistant'].includes(m.role as string)) return false;
  if (!m.content || typeof m.content !== 'string') return false;
  if ((m.content as string).length > MAX_MESSAGE_LENGTH) return false;
  return true;
}

// Validate messages array
function validateMessages(messages: unknown): messages is ChatMessage[] {
  if (!Array.isArray(messages)) return false;
  if (messages.length === 0 || messages.length > MAX_MESSAGES_COUNT) return false;
  return messages.every(validateMessage);
}

// Validate controllable type
function validateControllable(controllable: unknown): boolean {
  if (controllable === undefined || controllable === null) return true;
  if (typeof controllable !== 'string') return false;
  return VALID_CONTROLLABLES.includes(controllable);
}

function getTodayDateKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function normalizePlanTier(rawTier: unknown): PlanTier {
  if (rawTier === 'plus' || rawTier === 'pro') {
    return rawTier;
  }
  return 'free';
}

async function getPlanTier(
  supabaseClient: any,
  userId: string,
  fallbackTier: unknown
): Promise<PlanTier> {
  const fallback = normalizePlanTier(fallbackTier);
  const { data: profileData, error } = await supabaseClient
    .from('profiles')
    .select('plan_tier')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching plan tier from profiles:', error);
    return fallback;
  }

  return normalizePlanTier(profileData?.plan_tier ?? fallbackTier);
}

// Check and update daily usage using the real ai_usage_logs schema (usage_date + message_count)
async function checkAndUpdateDailyUsage(
  supabaseClient: any,
  userId: string,
  planTier: PlanTier,
  isTrialUser: boolean = false
): Promise<{ allowed: boolean; remaining: number; used: number; dailyLimit: number }> {
  const today = getTodayDateKey();
  // Trial users (free tier with active snapshot) get 5/day, post-trial free get 2/day
  const dailyLimit = (planTier === 'free' && isTrialUser) ? TRIAL_DAILY_LIMIT : (PLAN_DAILY_LIMITS[planTier] ?? PLAN_DAILY_LIMITS.free);

  if (dailyLimit <= 0) {
    return { allowed: false, remaining: 0, used: 0, dailyLimit };
  }

  const { data: usageData, error: fetchError } = await supabaseClient
    .from('ai_usage_logs')
    .select('id, message_count')
    .eq('user_id', userId)
    .eq('usage_date', today)
    .maybeSingle();

  if (fetchError) {
    console.error('Error fetching daily usage:', fetchError);
    return { allowed: true, remaining: dailyLimit, used: 0, dailyLimit };
  }

  const currentCount = usageData?.message_count || 0;

  if (currentCount >= dailyLimit) {
    return { allowed: false, remaining: 0, used: currentCount, dailyLimit };
  }

  if (usageData) {
    await supabaseClient
      .from('ai_usage_logs')
      .update({ message_count: currentCount + 1, updated_at: new Date().toISOString() })
      .eq('id', usageData.id);
  } else {
    await supabaseClient
      .from('ai_usage_logs')
      .insert({ user_id: userId, usage_date: today, message_count: 1 });
  }

  return {
    allowed: true,
    remaining: dailyLimit - currentCount - 1,
    used: currentCount + 1,
    dailyLimit,
  };
}

// Build the enhanced pattern memory section
function buildPatternMemory(patternData: PatternData, controllable: string | null): string {
  if (!patternData || patternData.conversationCount === 0) {
    return '';
  }

  const sections: string[] = [];
  
  sections.push(`\n[MEMORY - Reference naturally, don't force it]`);
  sections.push(`- Sessions together: ${patternData.sessionCount || patternData.conversationCount}`);
  
  if (patternData.recentThemes.length > 0) {
    sections.push(`- Their recurring themes: ${patternData.recentThemes.join(', ')}`);
    
    // Identify if there's a dominant theme
    if (patternData.longestTheme) {
      sections.push(`- Pattern alert: "${patternData.longestTheme}" keeps coming up — consider addressing directly`);
    }
  }
  
  if (patternData.lastControllable && patternData.lastControllable !== controllable) {
    sections.push(`- Last guide used: ${patternData.lastControllable}`);
  }
  
  if (patternData.keyInsights && patternData.keyInsights.length > 0) {
    sections.push(`- Previous action items given: ${patternData.keyInsights.slice(0, 2).join(' | ')}`);
    sections.push(`- If relevant, follow up: "Did you try [previous action]?" or reference their progress`);
  }
  
  if (patternData.completedActions && patternData.completedActions.length > 0) {
    sections.push(`- Actions they've completed: ${patternData.completedActions.slice(0, 3).join(', ')}`);
    sections.push(`- Acknowledge progress when relevant: "You did [X] before. That worked. What's different now?"`);
  }
  
  sections.push(`\nUse this context to make the conversation feel continuous, not like starting over.`);
  
  return sections.join('\n');
}

function buildSystemPrompt(body: RequestBody): string {
  const { controllable, challengeContext, userContext, buildContext, patternData } = body;

  let systemPrompt = CONTROLLABLE_PROMPTS[controllable || ''] || DEFAULT_PROMPT;

  // Add pattern memory (enhanced callbacks)
  if (patternData) {
    systemPrompt += buildPatternMemory(patternData, controllable || null);
  }

  // Add user context if provided
  if (userContext) {
    systemPrompt += `\n\n[USER STATUS]
- Current Focus: ${userContext.questTitle}
- XP (momentum): ${userContext.xp}
- Integrity score: ${userContext.integrity ?? "Not tracked yet"}`;
  }

  // Add build context if provided
  if (buildContext) {
    const lowestScore = Math.min(
      parseFloat(buildContext.awareness),
      parseFloat(buildContext.perspective),
      parseFloat(buildContext.habit),
      parseFloat(buildContext.wellness),
      parseFloat(buildContext.environment)
    );
    
    let weakestArea = 'unknown';
    if (parseFloat(buildContext.awareness) === lowestScore) weakestArea = 'awareness';
    else if (parseFloat(buildContext.perspective) === lowestScore) weakestArea = 'perspective';
    else if (parseFloat(buildContext.habit) === lowestScore) weakestArea = 'habit';
    else if (parseFloat(buildContext.wellness) === lowestScore) weakestArea = 'wellness';
    else if (parseFloat(buildContext.environment) === lowestScore) weakestArea = 'environment';

    systemPrompt += `\n\n[BUILD STATS - Their self-reported scores, 1-4 scale]
- Awareness 🦉: ${buildContext.awareness}/4
- Perspective 🐢: ${buildContext.perspective}/4
- Habit 🦈: ${buildContext.habit}/4
- Wellness 🛰️: ${buildContext.wellness}/4
- Environment 🚀: ${buildContext.environment}/4
- Overall: ${buildContext.overall}/4
- Archetype: ${buildContext.archetype}
- Meaning: ${buildContext.archetypeDescription}
- Weakest area: ${weakestArea}

Use this to tailor actions. Their weak spots are where small interventions have the biggest impact.`;
  }

  // Add challenge context if provided
  if (challengeContext) {
    systemPrompt += `\n\n[SNAPSHOT CONTEXT]
They're on Day ${challengeContext.day} of their 7-Day Snapshot.
Today's theme: "${challengeContext.theme}"
Today's action: "${challengeContext.action}"
Guide them through this specific task. Reference their Snapshot progress.`;
  }

  return systemPrompt;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ============ AUTHENTICATION ============
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !userData?.user) {
      console.error('Auth error:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // User is authenticated
    const userId = userData.user.id;
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Invalid user session' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============ DAILY QUOTA CHECK ============
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    const planTier = await getPlanTier(serviceClient, userId, userData.user.user_metadata?.plan_tier);
    
    // Check if free user is in active trial (has active snapshot within 7 days)
    let isTrialUser = false;
    if (planTier === 'free') {
      const { data: activeSession } = await serviceClient
        .from('reset_sessions')
        .select('id, start_date')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (activeSession) {
        const startDate = new Date(activeSession.start_date);
        const now = new Date();
        const daysSinceStart = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        isTrialUser = daysSinceStart < 7;
      }
    }
    
    const usageResult = await checkAndUpdateDailyUsage(serviceClient, userId, planTier, isTrialUser);
    
    if (!usageResult.allowed) {
      const isPlusLocked = planTier === 'plus';
      return new Response(
        JSON.stringify({ 
          error: isPlusLocked
            ? 'AI guide access is locked on Plus. Upgrade to Pro to continue.'
            : `Daily AI limit reached. You have used ${usageResult.dailyLimit} of ${usageResult.dailyLimit} messages today.`,
          limitReached: !isPlusLocked,
          aiLocked: isPlusLocked,
          remaining: 0,
          used: usageResult.used,
          planTier,
          dailyLimit: usageResult.dailyLimit
        }),
        { status: isPlusLocked ? 403 : 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============ INPUT VALIDATION ============
    let body: RequestBody;
    try {
      body = await req.json() as RequestBody;
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { controllable, messages, sessionHistory, stream: wantStream } = body;

    // Validate messages array
    if (!validateMessages(messages)) {
      return new Response(
        JSON.stringify({ error: 'Invalid messages: must be array of 1-50 messages, each with valid role and content under 4000 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate controllable type
    if (!validateControllable(controllable)) {
      return new Response(
        JSON.stringify({ error: 'Invalid controllable type. Must be one of: awareness, perspective, habit, wellness, environment' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate session history if provided
    if (sessionHistory !== undefined && sessionHistory !== null) {
      if (!Array.isArray(sessionHistory) || sessionHistory.length > MAX_SESSION_HISTORY_COUNT) {
        return new Response(
          JSON.stringify({ error: 'Invalid session history: must be array of up to 20 messages' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (!sessionHistory.every(validateMessage)) {
        return new Response(
          JSON.stringify({ error: 'Invalid session history message format' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // ============ BUILD SYSTEM PROMPT ============
    const [basePrompt, levelsContext] = await Promise.all([
      Promise.resolve(buildSystemPrompt(body)),
      fetchControllableLevelsContext(serviceClient, userId),
    ]);
    const systemPrompt = basePrompt + levelsContext;

    // Include session history for memory continuity
    const conversationMessages: Array<{role: string; content: string}> = [];
    
    if (sessionHistory && sessionHistory.length > 0) {
      const recentHistory = sessionHistory.slice(-10);
      recentHistory.forEach(msg => {
        conversationMessages.push({ role: msg.role, content: msg.content });
      });
    }
    
    messages.forEach(msg => {
      conversationMessages.push({ role: msg.role, content: msg.content });
    });

    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) {
      console.error('LOVABLE_API_KEY not found');
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============ TOOL DEFINITIONS ============
    const tools = [
      {
        type: 'function',
        function: {
          name: 'clear_meal_plans',
          description: 'Clear/delete meal plans for the user. Use when they ask to remove, clear, or delete planned meals.',
          parameters: {
            type: 'object',
            properties: {
              date_from: { type: 'string', description: 'Start date in YYYY-MM-DD format. Defaults to today.' },
              date_to: { type: 'string', description: 'End date in YYYY-MM-DD format. If omitted, only date_from is cleared.' },
              meal_types: { type: 'array', items: { type: 'string' }, description: 'Optional filter: breakfast, lunch, dinner, snack. If omitted, all types are cleared.' },
            },
            required: [],
            additionalProperties: false,
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'add_meal_plan',
          description: 'Add a meal to the user meal plan for a specific date.',
          parameters: {
            type: 'object',
            properties: {
              date: { type: 'string', description: 'Date in YYYY-MM-DD format.' },
              meal_type: { type: 'string', enum: ['breakfast', 'lunch', 'dinner', 'snack'], description: 'Type of meal.' },
              name: { type: 'string', description: 'Name of the meal.' },
              description: { type: 'string', description: 'Brief description or ingredients.' },
            },
            required: ['date', 'meal_type', 'name'],
            additionalProperties: false,
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'delete_planner_items',
          description: 'Delete planner items by matching title. Use when user asks to remove tasks or events from their planner.',
          parameters: {
            type: 'object',
            properties: {
              title_match: { type: 'string', description: 'Text to match in planner item titles (case-insensitive partial match).' },
              scheduled_date: { type: 'string', description: 'Optional date filter in YYYY-MM-DD format.' },
            },
            required: ['title_match'],
            additionalProperties: false,
          },
        },
      },
    ];

    // Add tool-awareness to system prompt
    const toolAwarePrompt = systemPrompt + `\n\n[APP ACTIONS]
You can perform actions in the app when the user asks. Available actions:
- Clear/delete meal plans (by date range and/or meal type)
- Add meals to their meal plan
- Delete planner items by title
When the user asks you to do something actionable (like "clear my lunches", "remove my planned meals", "add chicken salad for lunch tomorrow"), USE the appropriate tool. Still respond in your character voice after performing the action.
Today's date is ${getTodayDateKey()}.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: toolAwarePrompt },
          ...conversationMessages,
        ],
        max_tokens: 600,
        temperature: 0.7,
        tools,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI service requires payment. Please add credits.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'AI service error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const firstChoice = data.choices?.[0];
    const toolCalls = firstChoice?.message?.tool_calls;
    const actionsTaken: string[] = [];
    const toolResults: Array<{ role: string; tool_call_id: string; content: string }> = [];

    // ============ EXECUTE TOOL CALLS ============
    if (toolCalls && toolCalls.length > 0) {
      for (const tc of toolCalls) {
        const fnName = tc.function?.name;
        let args: any = {};
        try {
          args = JSON.parse(tc.function?.arguments || '{}');
        } catch {
          args = {};
        }

        let result = '';

        if (fnName === 'clear_meal_plans') {
          const dateFrom = args.date_from || getTodayDateKey();
          const dateTo = args.date_to || dateFrom;
          let query = serviceClient
            .from('meal_plans')
            .delete()
            .eq('user_id', userId)
            .gte('plan_date', dateFrom)
            .lte('plan_date', dateTo);
          
          // If meal_types filter provided, filter by checking meals JSON
          const { error: delErr, count } = await query;
          if (delErr) {
            console.error('clear_meal_plans error:', delErr);
            result = `Error clearing meal plans: ${delErr.message}`;
          } else {
            result = `Successfully cleared meal plans from ${dateFrom} to ${dateTo}.`;
          }
          actionsTaken.push('clear_meal_plans');
        } else if (fnName === 'add_meal_plan') {
          const planDate = args.date || getTodayDateKey();
          const mealEntry = { name: args.name, description: args.description || '', type: args.meal_type };
          
          // Check if a plan exists for this date
          const { data: existing } = await serviceClient
            .from('meal_plans')
            .select('id, meals')
            .eq('user_id', userId)
            .eq('plan_date', planDate)
            .maybeSingle();

          if (existing) {
            const currentMeals = (existing.meals as any[]) || [];
            currentMeals.push(mealEntry);
            await serviceClient
              .from('meal_plans')
              .update({ meals: currentMeals })
              .eq('id', existing.id);
          } else {
            await serviceClient
              .from('meal_plans')
              .insert({ user_id: userId, plan_date: planDate, meals: [mealEntry] });
          }
          result = `Added ${args.meal_type}: "${args.name}" for ${planDate}.`;
          actionsTaken.push('add_meal_plan');
        } else if (fnName === 'delete_planner_items') {
          const titleMatch = args.title_match;
          let query = serviceClient
            .from('planner_items')
            .delete()
            .eq('user_id', userId)
            .ilike('title', `%${titleMatch}%`);
          
          if (args.scheduled_date) {
            query = query.eq('scheduled_date', args.scheduled_date);
          }
          const { error: delErr } = await query;
          if (delErr) {
            console.error('delete_planner_items error:', delErr);
            result = `Error deleting planner items: ${delErr.message}`;
          } else {
            result = `Deleted planner items matching "${titleMatch}".`;
          }
          actionsTaken.push('delete_planner_items');
        } else {
          result = `Unknown tool: ${fnName}`;
        }

        toolResults.push({
          role: 'tool',
          tool_call_id: tc.id,
          content: result,
        });
      }

      // ============ SECOND PASS: Get natural confirmation ============
      const secondResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: toolAwarePrompt },
            ...conversationMessages,
            firstChoice.message,
            ...toolResults,
          ],
          max_tokens: 300,
          temperature: 0.7,
        }),
      });

      if (secondResponse.ok) {
        const secondData = await secondResponse.json();
        let assistantMessage = secondData.choices?.[0]?.message?.content || 'Done — actions completed.';
        
        return new Response(
          JSON.stringify({
            message: assistantMessage,
            actions_taken: actionsTaken,
            remaining: usageResult.remaining,
            used: usageResult.used,
            planTier,
            dailyLimit: usageResult.dailyLimit,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        const errText = await secondResponse.text();
        console.error('Second pass error:', secondResponse.status, errText);
      }
    }

    // ============ NO TOOL CALLS — Regular response ============
    let assistantMessage = firstChoice?.message?.content || 'I apologize, I could not generate a response.';

    // Ensure response ends with an action if it doesn't already
    if (!assistantMessage.includes('→ ACTION:') && !assistantMessage.includes('ACTION:')) {
      assistantMessage += '\n\n→ ACTION: Take one small step right now. What can you do in the next 2 minutes?';
    }

    return new Response(
      JSON.stringify({ 
        message: assistantMessage,
        actions_taken: actionsTaken,
        remaining: usageResult.remaining,
        used: usageResult.used,
        planTier,
        dailyLimit: usageResult.dailyLimit
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in ai-chat function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
