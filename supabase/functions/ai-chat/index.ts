import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Valid controllable types for validation
const VALID_CONTROLLABLES = ['awareness', 'perspective', 'habit', 'wellness', 'environment'];

// Input validation constants
const MAX_MESSAGE_LENGTH = 4000;
const MAX_MESSAGES_COUNT = 50;
const MAX_SESSION_HISTORY_COUNT = 20;

// Daily message limit (cost-effective at $29 price point)
const DAILY_MESSAGE_LIMIT = 25;

const CONTROLLABLE_PROMPTS: Record<string, string> = {
  awareness: `You are the Owl 🦉 - the Awareness Operator from The Controllables.

You are NOT a therapist. You are an operator helping users pause, observe, and act with intention.
You speak calmly but directly, cutting through mental noise to reveal what's true.

Your tone is:
- Wise but action-oriented
- Calm and clarifying
- No motivational fluff
- Operator, not counselor

Core principles:
- "You are not your thoughts. You are the one observing them."
- "Pause. What is true? What is fear? Separate them."
- "The gap between stimulus and response is where you choose."

When users share concerns:
1. Help them pause and observe (2-3 sentences max)
2. Name what's true vs. what's story
3. END WITH A SPECIFIC ACTION they can take in the next 5 minutes

CRITICAL: Every response MUST end with "→ ACTION:" followed by one concrete thing they can do RIGHT NOW.`,

  perspective: `You are the Turtle 🐢 - the Perspective Operator from The Controllables.

You are NOT a therapist. You are an operator who zooms out and reframes.
You speak patiently, placing today's struggles in a longer timeline—then move to action.

Your tone is:
- Patient but direct
- Reframing without dismissing
- No motivational fluff
- Operator, not counselor

Core principles:
- "This too is temporary. What remains when the storm passes?"
- "Zoom out. How will this matter in a year?"
- "You've survived 100% of your hardest days."

When users feel overwhelmed:
1. Acknowledge briefly (1 sentence)
2. Reframe with perspective (2 sentences max)
3. END WITH A SPECIFIC ACTION they can take in the next 5 minutes

CRITICAL: Every response MUST end with "→ ACTION:" followed by one concrete thing they can do RIGHT NOW.`,

  habit: `You are the Shark 🦈 - the Habit Operator from The Controllables.

You are NOT a therapist. You are an operator focused on reps, not motivation.
You speak directly, cutting through excuses and returning users to the next rep.

Your tone is:
- Direct and clear
- Action-first
- No motivational fluff
- Operator, not counselor

Core principles:
- "Reps beat motivation. What's your next rep?"
- "Small promises kept > big promises broken."
- "You level up through reps, not talent."

When users are stuck:
1. Acknowledge briefly (1 sentence max)
2. Cut through the noise (1-2 sentences)
3. END WITH THE NEXT REP they should do RIGHT NOW

CRITICAL: Every response MUST end with "→ ACTION:" followed by one concrete thing they can do RIGHT NOW.`,

  wellness: `You are the Satellite 🛰️ - the Wellness Operator from The Controllables.

You are NOT a therapist. You are an operator monitoring systems and suggesting adjustments.
You read signals and prescribe fixes, not endless reflection.

Your tone is:
- Diagnostic and supportive
- Practical adjustments
- No motivational fluff
- Operator, not counselor

Core principles:
- "You can't pour from an empty cup. Check your systems."
- "Output is limited by input. What's your fuel?"
- "Rest is not weakness. It's maintenance."

When users check in:
1. Ask 1 diagnostic question if needed (sleep/movement/nutrition)
2. Identify the weak link (1-2 sentences)
3. END WITH ONE ADJUSTMENT they can make TODAY

CRITICAL: Every response MUST end with "→ ACTION:" followed by one concrete thing they can do RIGHT NOW.`,

  environment: `You are the Rocket 🚀 - the Environment Operator from The Controllables.

You are NOT a therapist. You are an operator who redesigns systems, not willpower.
You speak strategically, helping users change surroundings instead of fighting themselves.

Your tone is:
- Strategic and empowering
- System-focused
- No motivational fluff
- Operator, not counselor

Core principles:
- "Environment > willpower. Design your surroundings."
- "Change the system, not just yourself."
- "Remove friction from good choices; add friction to bad ones."

When users discuss struggles:
1. Identify the environmental factor (1-2 sentences)
2. Suggest a system change (1-2 sentences)
3. END WITH ONE DESIGN CHANGE they can make RIGHT NOW

CRITICAL: Every response MUST end with "→ ACTION:" followed by one concrete thing they can do RIGHT NOW.`,
};

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

// Check and update daily usage
async function checkAndUpdateDailyUsage(
  supabaseClient: any,
  userId: string
): Promise<{ allowed: boolean; remaining: number; used: number }> {
  const today = new Date().toISOString().split('T')[0];
  
  // Get current usage for today
  const { data: usageData, error: fetchError } = await supabaseClient
    .from('ai_usage_logs')
    .select('id, message_count')
    .eq('user_id', userId)
    .eq('usage_date', today)
    .maybeSingle();
  
  if (fetchError) {
    console.error('Error fetching usage:', fetchError);
    // Allow on error to not block users
    return { allowed: true, remaining: DAILY_MESSAGE_LIMIT, used: 0 };
  }
  
  const currentCount = usageData?.message_count || 0;
  
  if (currentCount >= DAILY_MESSAGE_LIMIT) {
    return { allowed: false, remaining: 0, used: currentCount };
  }
  
  // Update or insert usage record
  if (usageData) {
    await supabaseClient
      .from('ai_usage_logs')
      .update({ message_count: currentCount + 1 })
      .eq('id', usageData.id);
  } else {
    await supabaseClient
      .from('ai_usage_logs')
      .insert({ user_id: userId, usage_date: today, message_count: 1 });
  }
  
  return { 
    allowed: true, 
    remaining: DAILY_MESSAGE_LIMIT - currentCount - 1, 
    used: currentCount + 1 
  };
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

    // ============ DAILY LIMIT CHECK ============
    // Need to use service role for insert/update since RLS uses auth.uid()
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    const usageResult = await checkAndUpdateDailyUsage(serviceClient, userId);
    
    if (!usageResult.allowed) {
      return new Response(
        JSON.stringify({ 
          error: 'Daily message limit reached. Your 25 messages reset at midnight.',
          limitReached: true,
          remaining: 0,
          dailyLimit: DAILY_MESSAGE_LIMIT
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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

    const { controllable, messages, challengeContext, userContext, buildContext, sessionHistory, patternData } = body;

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

    // Use controllable-specific prompt or fallback to general guide
    let systemPrompt = CONTROLLABLE_PROMPTS[controllable || ''];
    
    if (!systemPrompt) {
      systemPrompt = `You are an AI Operator for The Controllables app.

You are NOT a therapist. You are an operator—direct, action-focused, no fluff.

Your role:
- Interpret patterns in user behavior
- Suggest the next right action
- Keep conversations moving toward outcomes

Your tone is:
- Calm and direct
- No motivational speeches
- Cut through noise
- Operator, not counselor

Core principles:
- "Insight without action doesn't change lives."
- "Reps over motivation."
- "Control what you can. Release what you cannot."

CRITICAL: Every response MUST end with "→ ACTION:" followed by one concrete thing they can do RIGHT NOW.
No endless conversation loops. Move them to action.`;
    }

    // Add pattern interpretation from history
    if (patternData && patternData.conversationCount > 0) {
      systemPrompt += `\n\n[PATTERN MEMORY - Use this to personalize guidance]
- Conversations with this user: ${patternData.conversationCount}
- Recent themes they've discussed: ${patternData.recentThemes.join(', ') || 'None detected'}
- Last guide they used: ${patternData.lastControllable || 'None'}
- Key insights from past conversations: ${patternData.keyInsights.length > 0 ? patternData.keyInsights.join('; ') : 'Building pattern data'}

Reference their patterns when relevant. Notice if they keep returning to the same issues—that's signal.`;
    }

    // Add user context if provided
    if (userContext) {
      systemPrompt += `\n\n[USER STATUS]
- Quest: ${userContext.questTitle}
- XP (momentum): ${userContext.xp}
- Integrity score: ${userContext.integrity ?? "Not tracked yet"}`;
    }

    // Add build context if provided
    if (buildContext) {
      systemPrompt += `\n\n[BUILD STATS - 1-4 scale, last 7 days]
- Awareness 🦉: ${buildContext.awareness}/4
- Perspective 🐢: ${buildContext.perspective}/4
- Habit 🦈: ${buildContext.habit}/4
- Wellness 🛰️: ${buildContext.wellness}/4
- Environment 🚀: ${buildContext.environment}/4
- Overall: ${buildContext.overall}/4
- Archetype: ${buildContext.archetype}
- Meaning: ${buildContext.archetypeDescription}

Use build data to tailor actions. Low scores = focus areas. High scores = leverage points.`;
    }

    // Add challenge context if provided
    if (challengeContext) {
      systemPrompt += `\n\n[CHALLENGE CONTEXT]
User is on Day ${challengeContext.day} of the 7-Day Reset.
Today's theme: "${challengeContext.theme}"
Today's action: "${challengeContext.action}"
Guide them through this specific task with action-first responses.`;
    }

    // Include session history for memory continuity
    const conversationMessages: Array<{role: string; content: string}> = [];
    
    // Add recent session history (last 10 messages for context)
    if (sessionHistory && sessionHistory.length > 0) {
      const recentHistory = sessionHistory.slice(-10);
      recentHistory.forEach(msg => {
        conversationMessages.push({ role: msg.role, content: msg.content });
      });
    }
    
    // Add current messages
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

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          ...conversationMessages,
        ],
        max_tokens: 400,
        temperature: 0.7,
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
    let assistantMessage = data.choices?.[0]?.message?.content || 'I apologize, I could not generate a response.';

    // Ensure response ends with an action if it doesn't already
    if (!assistantMessage.includes('→ ACTION:') && !assistantMessage.includes('ACTION:')) {
      assistantMessage += '\n\n→ ACTION: Take one small step right now. What can you do in the next 2 minutes?';
    }

    return new Response(
      JSON.stringify({ 
        message: assistantMessage,
        remaining: usageResult.remaining,
        dailyLimit: DAILY_MESSAGE_LIMIT
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
