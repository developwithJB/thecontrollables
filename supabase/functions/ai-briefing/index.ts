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
  const raw = Math.floor(Math.sqrt(totalXp / 25));
  return Math.min(Math.max(raw, 1), 99);
}

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
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Check for cached briefing today
    const today = new Date().toISOString().slice(0, 10);
    const { data: cached } = await serviceClient
      .from('daily_briefings')
      .select('*')
      .eq('user_id', userId)
      .eq('briefing_date', today)
      .maybeSingle();

    if (cached) {
      return new Response(JSON.stringify({
        content: cached.content,
        controllable: cached.controllable,
        cached: true,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Gather context: active session, recent reflections, build scores, controllable levels, planner stats
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const [sessionRes, reflectionsRes, buildRes, actionsRes, yesterdayHealthRes, yesterdayPlannerRes, todayPlannerRes] = await Promise.all([
      serviceClient.from('reset_sessions').select('current_day, journey_id, start_date')
        .eq('user_id', userId).eq('status', 'active').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      serviceClient.from('daily_resets').select('day_number, reflection, completed_at')
        .eq('user_id', userId).order('completed_at', { ascending: false }).limit(3),
      serviceClient.from('user_build_current').select('*')
        .eq('user_id', userId).maybeSingle(),
      serviceClient.from('completed_actions').select('controllable, xp_awarded')
        .eq('user_id', userId).not('controllable', 'is', null),
      serviceClient.from('health_sync_data').select('recovery_score, sleep_minutes, hrv_ms')
        .eq('user_id', userId).eq('sync_date', yesterday).maybeSingle(),
      serviceClient.from('planner_items').select('id, status')
        .eq('user_id', userId).eq('scheduled_date', yesterday),
      serviceClient.from('planner_items').select('id')
        .eq('user_id', userId).eq('scheduled_date', today),
    ]);

    const currentDay = sessionRes.data?.current_day || 1;
    const controllableInfo = DAY_CONTROLLABLES[currentDay] || DAY_CONTROLLABLES[1];
    const recentReflections = reflectionsRes.data || [];
    const buildData = buildRes.data;

    // Build context string
    let contextParts: string[] = [];
    contextParts.push(`Today is Day ${currentDay} of their 7-Day Snapshot. Today's controllable: ${controllableInfo.name} ${controllableInfo.emoji}.`);

    if (recentReflections.length > 0) {
      const reflectionTexts = recentReflections
        .filter(r => r.reflection)
        .map(r => `Day ${r.day_number}: "${r.reflection}"`)
        .join('\n');
      if (reflectionTexts) {
        contextParts.push(`Recent reflections:\n${reflectionTexts}`);
      }
    }

    if (buildData && buildData.overall > 0) {
      const weakest = ['awareness', 'perspective', 'habit', 'wellness', 'environment']
        .reduce((min, key) => (buildData[key] < buildData[min] ? key : min), 'awareness');
      contextParts.push(`Build: Overall ${Number(buildData.overall).toFixed(1)}/4, weakest area: ${weakest} (${Number(buildData[weakest]).toFixed(1)}/4)`);
    }

    // Compute controllable levels from XP
    const xpMap: Record<string, number> = {};
    for (const row of actionsRes.data ?? []) {
      if (row.controllable) {
        xpMap[row.controllable] = (xpMap[row.controllable] || 0) + row.xp_awarded;
      }
    }
    const levelLines = Object.entries(CONTROLLABLE_META).map(([key, meta]) => {
      const level = getLevelFromXp(xpMap[key] || 0);
      return `${meta.emoji} ${meta.label}: Lv.${level}`;
    });
    const overallLevel = Math.round(
      Object.keys(CONTROLLABLE_META).reduce((s, k) => s + getLevelFromXp(xpMap[k] || 0), 0) / 5
    );
    contextParts.push(`Controllable Levels (Overall Build Lv.${overallLevel}):\n${levelLines.join('\n')}`);

    // Plan vs Actual context
    if (yesterdayHealthRes.data) {
      const yh = yesterdayHealthRes.data;
      contextParts.push(`Yesterday's recovery: ${yh.recovery_score ?? 'unknown'}%${yh.sleep_minutes ? `, sleep: ${Math.round(yh.sleep_minutes / 60)}h` : ''}`);
    }
    if (yesterdayPlannerRes.data && yesterdayPlannerRes.data.length > 0) {
      const total = yesterdayPlannerRes.data.length;
      const completed = yesterdayPlannerRes.data.filter((i: any) => i.status === 'done').length;
      contextParts.push(`Yesterday's planner: ${completed}/${total} items completed (${Math.round((completed/total)*100)}% completion rate)`);
    }
    if (todayPlannerRes.data) {
      contextParts.push(`Today's scheduled load: ${todayPlannerRes.data.length} items in planner`);
    }

    // Fetch WHOOP biometric data
    const [whoopRecoveryRes, whoopSleepRes, whoopCycleRes] = await Promise.all([
      serviceClient.from('whoop_recoveries').select('recovery_score, hrv_rmssd_milli, resting_heart_rate, recorded_at')
        .eq('user_id', userId).order('recorded_at', { ascending: false }).limit(1).maybeSingle(),
      serviceClient.from('whoop_sleeps').select('sleep_performance_pct, sleep_efficiency_pct, end_time')
        .eq('user_id', userId).order('end_time', { ascending: false }).limit(1).maybeSingle(),
      serviceClient.from('whoop_cycles').select('strain, start_time')
        .eq('user_id', userId).order('start_time', { ascending: false }).limit(1).maybeSingle(),
    ]);

    const whoopParts: string[] = [];
    if (whoopRecoveryRes.data) {
      whoopParts.push(`WHOOP Recovery: ${whoopRecoveryRes.data.recovery_score}%${whoopRecoveryRes.data.hrv_rmssd_milli ? `, HRV: ${whoopRecoveryRes.data.hrv_rmssd_milli}ms` : ''}`);
    }
    if (whoopSleepRes.data) {
      whoopParts.push(`Sleep Performance: ${whoopSleepRes.data.sleep_performance_pct}%`);
    }
    if (whoopCycleRes.data) {
      whoopParts.push(`Today's Strain: ${whoopCycleRes.data.strain}`);
    }
    if (whoopParts.length > 0) {
      contextParts.push(`WHOOP Biometrics: ${whoopParts.join(', ')}`);
    }

    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'AI not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const systemPrompt = `You are ${controllableInfo.emoji} ${controllableInfo.name} from The Controllables — a daily briefing operator.

Generate a personalized morning micro-briefing in EXACTLY 3 lines:
1. **Pattern observation** — Something you noticed from their recent reflections or build data (be specific, not generic)
2. **Today's controllable focus** — One sentence connecting today's controllable (${controllableInfo.name}) to their current situation
3. **One actionable suggestion** — A concrete, small thing they can do today

RULES:
- Total max 60 words across all 3 lines
- Be specific to THEIR data, not generic advice
- Match the voice of ${controllableInfo.name}: ${controllableInfo.key === 'habit' ? 'direct, action-focused' : controllableInfo.key === 'awareness' ? 'observational, calm' : controllableInfo.key === 'perspective' ? 'wise, reframing' : controllableInfo.key === 'wellness' ? 'systems-focused' : 'design-focused'}
- If WHOOP data is present, weave biometric signals into your observation and suggestion. Reference recovery, sleep quality, or strain when relevant.
- No motivational fluff. Be real.
- Format as 3 separate lines`;

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
          { role: 'user', content: contextParts.join('\n\n') },
        ],
        max_tokens: 150,
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
      return new Response(JSON.stringify({ error: 'AI error' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    // Cache the briefing
    await serviceClient.from('daily_briefings').insert({
      user_id: userId,
      briefing_date: today,
      content,
      controllable: controllableInfo.key,
    });

    return new Response(JSON.stringify({
      content,
      controllable: controllableInfo.key,
      cached: false,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('ai-briefing error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
