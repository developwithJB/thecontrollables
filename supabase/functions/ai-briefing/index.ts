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
    const [sessionRes, reflectionsRes, buildRes, actionsRes, yesterdayHealthRes, yesterdayPlannerRes, todayPlannerRes, todayMealPlanRes, todayRingsRes, billsRes] = await Promise.all([
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
      serviceClient.from('planner_items').select('id, status, start_time, end_time, item_type')
        .eq('user_id', userId).eq('scheduled_date', today),
      serviceClient.from('meal_plans').select('meals')
        .eq('user_id', userId).eq('plan_date', today).maybeSingle(),
      // Rings for today
      serviceClient.from('daily_rings').select('notice_completed, choose_completed, prove_completed, charge_completed, align_completed')
        .eq('user_id', userId).eq('ring_date', today).maybeSingle(),
      // Bills due within 3 days (recurring bills — due_date is day-of-month for monthly)
      serviceClient.from('recurring_bills').select('name, amount, due_date, frequency')
        .eq('user_id', userId).eq('is_active', true),
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

    // Calendar shape analysis
    let calDayType = 'moderate';
    if (todayPlannerRes.data) {
      const todayItems = todayPlannerRes.data as any[];
      contextParts.push(`Today's scheduled load: ${todayItems.length} items in planner`);

      const timedItems = todayItems.filter((i: any) => i.start_time && i.end_time);
      if (timedItems.length > 0) {
        const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return (h || 0) * 60 + (m || 0); };
        const meetings = timedItems.map((i: any) => ({ start: toMin(i.start_time), end: toMin(i.end_time) })).filter((e: any) => e.end > e.start).sort((a: any, b: any) => a.start - b.start);
        const meetingMinutes = meetings.reduce((s: number, e: any) => s + (e.end - e.start), 0);
        const meetingHours = Math.round(meetingMinutes / 60 * 10) / 10;

        let longestFocus = 0;
        for (let i = 0; i < meetings.length - 1; i++) {
          const gap = meetings[i + 1].start - meetings[i].end;
          if (gap > longestFocus) longestFocus = gap;
        }
        if (meetings.length > 0) {
          const beforeFirst = meetings[0].start - 480;
          const afterLast = 1080 - meetings[meetings.length - 1].end;
          if (beforeFirst > longestFocus) longestFocus = beforeFirst;
          if (afterLast > longestFocus) longestFocus = afterLast;
        }

        let contextSwitches = 0;
        for (let i = 0; i < meetings.length - 1; i++) {
          if (meetings[i + 1].start - meetings[i].end < 15) contextSwitches++;
        }

        if (contextSwitches >= 4) calDayType = 'fragmented';
        else if (meetingMinutes >= 240) calDayType = 'heavy';
        else if (meetings.length <= 1 && longestFocus >= 120) calDayType = 'focus';
        else if (meetings.length === 0) calDayType = 'light';

        const focusLabel = longestFocus >= 60 ? `${Math.floor(longestFocus / 60)}h ${longestFocus % 60}m` : `${longestFocus}m`;
        contextParts.push(`Calendar shape: ${meetings.length} timed meetings (${meetingHours}h total), longest focus block: ${focusLabel}, ${contextSwitches} context switches, day type: ${calDayType}`);
      }
    }

    // Meal plan context
    const todayMeals = (todayMealPlanRes.data?.meals as any[]) || [];
    if (todayMeals.length > 0) {
      const mealNames = todayMeals.map((m: any) => `${m.meal_type}: ${m.name}`).join(', ');
      const dinnerMeal = todayMeals.find((m: any) => m.meal_type === 'dinner');
      contextParts.push(`Today's meal plan: ${mealNames}.${dinnerMeal ? ` Dinner: ${dinnerMeal.name}.` : ''}`);
    } else {
      contextParts.push('No meals planned today — food decisions remain open.');
    }

    // Rings context
    const ringsData = todayRingsRes.data;
    let ringsCompleted = 0;
    if (ringsData) {
      const ringKeys = ['notice_completed', 'choose_completed', 'prove_completed', 'charge_completed', 'align_completed'] as const;
      ringsCompleted = ringKeys.filter(k => ringsData[k]).length;
      contextParts.push(`Today's rings completed: ${ringsCompleted}/5`);
    } else {
      contextParts.push(`Today's rings completed: 0/5 (not started)`);
    }

    // Money pressure context
    const bills = billsRes.data || [];
    if (bills.length > 0) {
      const todayDate = new Date();
      const currentDayOfMonth = todayDate.getDate();
      const daysInMonth = new Date(todayDate.getFullYear(), todayDate.getMonth() + 1, 0).getDate();

      const billsDueSoon = bills.filter((b: any) => {
        const freq = b.frequency || 'monthly';
        if (freq === 'weekly' || freq === 'biweekly') return true; // always upcoming
        const diff = b.due_date >= currentDayOfMonth
          ? b.due_date - currentDayOfMonth
          : daysInMonth - currentDayOfMonth + b.due_date;
        return diff <= 3;
      });

      if (billsDueSoon.length > 0) {
        const totalDue = billsDueSoon.reduce((s: number, b: any) => s + Number(b.amount), 0);
        const names = billsDueSoon.slice(0, 3).map((b: any) => b.name).join(', ');
        contextParts.push(`Money pressure: ${billsDueSoon.length} bill(s) due within 3 days ($${totalDue.toFixed(0)} total): ${names}`);
      }
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

    // Current hour for afternoon nudge logic
    const currentHour = new Date().getHours();
    contextParts.push(`Current time: ${currentHour}:00`);

    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'AI not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const systemPrompt = `You are a cross-system daily briefing engine for The Controllables Life OS.

Generate a structured daily briefing as a JSON object with exactly these fields:
{
  "day_type": "<one of: Recovery Day, Focus Day, Heavy Day, Reset Day, Fragmented Day, Momentum Day, Protected Day, Catch-Up Day>",
  "interpretation": "<one sentence: what kind of day this is and why — synthesize body, calendar, and context>",
  "focus": "<one sentence: the smartest recommended action or priority>",
  "watchout": "<one sentence: key risk, support note, or thing to protect>"
}

DAY TYPE SELECTION RULES:
- Recovery Day: low recovery or poor sleep — protect energy
- Focus Day: light calendar + strong readiness — ideal for deep work
- Heavy Day: packed schedule, many meetings — manage energy carefully
- Reset Day: it's Day 1 of their snapshot or they're restarting
- Fragmented Day: many context switches, scattered schedule
- Momentum Day: rings > 3 completed, strong engagement
- Protected Day: moderate load but recovery is low — be selective
- Catch-Up Day: behind on rings/tasks, need to rebuild rhythm

CROSS-SYSTEM SYNTHESIS RULES:
- If rings completed > 3: acknowledge momentum in interpretation
- If 0 rings completed and current time >= 14: nudge one small action in focus
- If bills due soon + heavy calendar: note spending pressure in watchout
- If meal plan exists + strong recovery: acknowledge alignment in interpretation
- If no meals planned + low recovery: suggest easy food in watchout
- If strain is high: suggest protein-focused meals in watchout
- If recovery is low and meals are planned: acknowledge good preparation

RULES:
- Each field must be ONE sentence, max 25 words
- Be specific to THEIR data — reference actual numbers
- No motivational fluff. Be real, practical, useful.
- The interpretation should feel like an operating system reading the day
- The focus should be the single smartest next move
- The watchout should prevent the most likely failure mode today
- Return ONLY the JSON object, no markdown, no wrapping`;

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
          { role: 'user', content: contextParts.join('\n\n') },
        ],
        max_tokens: 300,
        temperature: 0.6,
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
    let rawContent = data.choices?.[0]?.message?.content || '';

    // Strip markdown code fences if present
    rawContent = rawContent.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

    // Cache the briefing (store as JSON string)
    await serviceClient.from('daily_briefings').insert({
      user_id: userId,
      briefing_date: today,
      content: rawContent,
      controllable: controllableInfo.key,
    });

    return new Response(JSON.stringify({
      content: rawContent,
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
