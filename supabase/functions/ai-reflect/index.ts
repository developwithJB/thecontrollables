import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const DAY_CONTROLLABLES: Record<number, { name: string; emoji: string; key: string }> = {
  1: { name: 'Awareness', emoji: '🦉', key: 'awareness' },
  2: { name: 'Perspective', emoji: '🐢', key: 'perspective' },
  3: { name: 'Habit', emoji: '🦈', key: 'habit' },
  4: { name: 'Wellness', emoji: '🛰️', key: 'wellness' },
  5: { name: 'Environment', emoji: '🚀', key: 'environment' },
  6: { name: 'Habit', emoji: '🦈', key: 'habit' },
  7: { name: 'Awareness', emoji: '🦉', key: 'awareness' },
};

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

async function fetchLevelsContext(client: any, userId: string): Promise<string> {
  const { data } = await client
    .from('completed_actions')
    .select('controllable, xp_awarded')
    .eq('user_id', userId)
    .not('controllable', 'is', null);

  if (!data || data.length === 0) return '';

  const xpMap: Record<string, number> = {};
  for (const row of data) {
    if (row.controllable) xpMap[row.controllable] = (xpMap[row.controllable] || 0) + row.xp_awarded;
  }

  const lines = Object.entries(CONTROLLABLE_META).map(([k, m]) =>
    `${m.emoji} ${m.label}: Lv.${getLevelFromXp(xpMap[k] || 0)}`
  );
  const overall = Math.round(
    Object.keys(CONTROLLABLE_META).reduce((s, k) => s + getLevelFromXp(xpMap[k] || 0), 0) / 5
  );
  return `\nTheir Build: Overall Lv.${overall} — ${lines.join(', ')}`;
}

const CONTROLLABLE_VOICES: Record<string, string> = {
  awareness: 'You are the Owl 🦉 — brief, observational, calm. You notice patterns the user missed. Speak in short, clear sentences. No fluff.',
  perspective: 'You are the Turtle 🐢 — wise, unhurried, grounding. You zoom out and reframe. Keep it real, not motivational.',
  habit: 'You are the Shark 🦈 — direct, action-focused. You cut through excuses and point to the next rep. No fluff.',
  wellness: 'You are the Satellite 🛰️ — analytical, systems-focused. You check the body before diagnosing the mind.',
  environment: 'You are the Rocket 🚀 — design-focused. You see friction and redesign defaults. Think engineer, not cheerleader.',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = userData.user.id;
    const { reflection, dayNumber, controllable: overrideControllable } = await req.json();

    if (!reflection || typeof reflection !== 'string' || reflection.length > 2000) {
      return new Response(JSON.stringify({ error: 'Invalid reflection' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const day = dayNumber || 1;
    const controllableInfo = DAY_CONTROLLABLES[day] || DAY_CONTROLLABLES[1];
    const controllableKey = overrideControllable || controllableInfo.key;
    const voice = CONTROLLABLE_VOICES[controllableKey] || CONTROLLABLE_VOICES.awareness;

    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const [levelsContext, apiKey] = await Promise.all([
      fetchLevelsContext(serviceClient, userId),
      Promise.resolve(Deno.env.get('LOVABLE_API_KEY')),
    ]);

    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'AI service not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const systemPrompt = `${voice}

You are responding to a user who just completed their daily check-in reflection on Day ${day} of their 7-Day Snapshot.

RULES:
- Respond in EXACTLY 1-2 sentences (max 50 words)
- Reference something specific from their reflection
- End with a micro-insight or affirmation rooted in The Controllables philosophy
- No generic praise. No "great job." Be specific and real.
- Do NOT include action items — this is a brief acknowledgment, not a coaching session`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-lite',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `My reflection for today: "${reflection}"` },
        ],
        max_tokens: 100,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Payment required' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ error: 'AI service error' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    const message = data.choices?.[0]?.message?.content || '';

    return new Response(JSON.stringify({
      message,
      controllable: controllableKey,
      emoji: controllableInfo.emoji,
      name: controllableInfo.name,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('ai-reflect error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
