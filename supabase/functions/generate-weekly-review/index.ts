import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function getWeekBounds(): { start: string; end: string; weekKey: string } {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((day + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return {
    start: monday.toISOString().slice(0, 10),
    end: sunday.toISOString().slice(0, 10),
    weekKey: monday.toISOString().slice(0, 10),
  };
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

    const { start, end, weekKey } = getWeekBounds();

    // Check cache — use daily_briefings with controllable='weekly_review' and briefing_date=weekKey
    const { data: cached } = await serviceClient
      .from('daily_briefings')
      .select('content')
      .eq('user_id', userId)
      .eq('briefing_date', weekKey)
      .eq('controllable', 'weekly_review')
      .maybeSingle();

    if (cached) {
      return new Response(JSON.stringify({ review: cached.content, cached: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch cross-system data for the week in parallel
    const [ringsRes, plannerRes, wellnessRes, healthRes, mealsRes, billsRes] = await Promise.all([
      serviceClient.from('daily_rings')
        .select('ring_date, notice_completed, choose_completed, prove_completed, charge_completed, align_completed')
        .eq('user_id', userId).gte('ring_date', start).lte('ring_date', end),
      serviceClient.from('planner_items')
        .select('scheduled_date, status, start_time, end_time, item_type')
        .eq('user_id', userId).gte('scheduled_date', start).lte('scheduled_date', end),
      serviceClient.from('wellness_logs')
        .select('log_date, sleep_rating, movement_rating, nutrition_rating')
        .eq('user_id', userId).gte('log_date', start).lte('log_date', end),
      serviceClient.from('health_sync_data')
        .select('sync_date, recovery_score, strain_score, sleep_minutes, hrv_ms')
        .eq('user_id', userId).gte('sync_date', start).lte('sync_date', end),
      serviceClient.from('meal_plans')
        .select('plan_date, meals')
        .eq('user_id', userId).gte('plan_date', start).lte('plan_date', end),
      serviceClient.from('recurring_bills')
        .select('name, amount, due_date, frequency')
        .eq('user_id', userId).eq('is_active', true),
    ]);

    // Build summary stats
    const rings = ringsRes.data || [];
    const planner = plannerRes.data || [];
    const wellness = wellnessRes.data || [];
    const health = healthRes.data || [];
    const meals = mealsRes.data || [];
    const bills = billsRes.data || [];

    const contextParts: string[] = [];

    // Rings summary
    const ringsByDay = rings.map((r: any) => {
      const count = ['notice_completed', 'choose_completed', 'prove_completed', 'charge_completed', 'align_completed']
        .filter(k => r[k]).length;
      return { date: r.ring_date, count };
    });
    const totalRings = ringsByDay.reduce((s, d) => s + d.count, 0);
    const avgRings = ringsByDay.length ? (totalRings / ringsByDay.length).toFixed(1) : '0';
    const perfectDays = ringsByDay.filter(d => d.count === 5).length;
    contextParts.push(`Growth Rings: ${ringsByDay.length} days tracked, ${totalRings} total rings (${avgRings}/day avg), ${perfectDays} perfect days. Day breakdown: ${ringsByDay.map(d => `${d.date}: ${d.count}/5`).join(', ')}`);

    // Planner summary
    const plannerByDay: Record<string, { total: number; done: number; meetingMinutes: number }> = {};
    for (const item of planner as any[]) {
      if (!plannerByDay[item.scheduled_date]) plannerByDay[item.scheduled_date] = { total: 0, done: 0, meetingMinutes: 0 };
      plannerByDay[item.scheduled_date].total++;
      if (item.status === 'done') plannerByDay[item.scheduled_date].done++;
      if (item.start_time && item.end_time) {
        const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return (h || 0) * 60 + (m || 0); };
        const dur = toMin(item.end_time) - toMin(item.start_time);
        if (dur > 0) plannerByDay[item.scheduled_date].meetingMinutes += dur;
      }
    }
    const planDays = Object.entries(plannerByDay);
    if (planDays.length > 0) {
      const totalItems = planDays.reduce((s, [, d]) => s + d.total, 0);
      const totalDone = planDays.reduce((s, [, d]) => s + d.done, 0);
      const totalMeetingHrs = Math.round(planDays.reduce((s, [, d]) => s + d.meetingMinutes, 0) / 60 * 10) / 10;
      const completionRate = Math.round((totalDone / totalItems) * 100);
      contextParts.push(`Planner: ${totalItems} items across ${planDays.length} days, ${completionRate}% completion, ${totalMeetingHrs}h in meetings. Day breakdown: ${planDays.map(([d, v]) => `${d}: ${v.done}/${v.total} done, ${Math.round(v.meetingMinutes/60*10)/10}h meetings`).join('; ')}`);
    } else {
      contextParts.push('Planner: No items scheduled this week.');
    }

    // Wellness summary
    if (wellness.length > 0) {
      const avg = (arr: (number | null)[]) => {
        const valid = arr.filter((v): v is number => v !== null);
        return valid.length ? (valid.reduce((a, b) => a + b, 0) / valid.length).toFixed(1) : 'N/A';
      };
      contextParts.push(`Wellness Logs: ${wellness.length} days. Avg sleep: ${avg(wellness.map((w: any) => w.sleep_rating))}, movement: ${avg(wellness.map((w: any) => w.movement_rating))}, nutrition: ${avg(wellness.map((w: any) => w.nutrition_rating))}. Day breakdown: ${wellness.map((w: any) => `${w.log_date}: sleep=${w.sleep_rating}, move=${w.movement_rating}, nutrition=${w.nutrition_rating}`).join('; ')}`);
    }

    // Health/wearable summary
    if (health.length > 0) {
      const avgRec = health.filter((h: any) => h.recovery_score != null);
      const avgStrain = health.filter((h: any) => h.strain_score != null);
      const avgSleep = health.filter((h: any) => h.sleep_minutes != null);
      contextParts.push(`Body Data: ${health.length} days. Avg recovery: ${avgRec.length ? Math.round(avgRec.reduce((s: number, h: any) => s + h.recovery_score, 0) / avgRec.length) : 'N/A'}%, avg strain: ${avgStrain.length ? (avgStrain.reduce((s: number, h: any) => s + h.strain_score, 0) / avgStrain.length).toFixed(1) : 'N/A'}, avg sleep: ${avgSleep.length ? Math.round(avgSleep.reduce((s: number, h: any) => s + h.sleep_minutes, 0) / avgSleep.length / 60 * 10) / 10 : 'N/A'}h. Day breakdown: ${health.map((h: any) => `${h.sync_date}: rec=${h.recovery_score}%, strain=${h.strain_score}, sleep=${h.sleep_minutes ? Math.round(h.sleep_minutes/60*10)/10 : 'N/A'}h`).join('; ')}`);
    }

    // Meal plan summary
    const daysWithMeals = meals.length;
    contextParts.push(`Meal Planning: ${daysWithMeals}/7 days had meals planned.`);

    // Money summary
    if (bills.length > 0) {
      const totalMonthly = bills.reduce((s: number, b: any) => s + Number(b.amount), 0);
      contextParts.push(`Money: ${bills.length} active recurring bills totaling ~$${totalMonthly.toFixed(0)}/month.`);
    }

    // Generate AI review
    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'AI not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const systemPrompt = `You are a cross-system weekly review engine for The Controllables Life OS.

Analyze the user's week across ALL systems (Growth, Plan, Body, Fuel, Money) and generate a structured weekly review as a JSON object with exactly these fields:

{
  "headline": "<Your week in one sentence — clear, specific, grounded in data>",
  "supported_by": "<What worked best this week — specific behavior or system>",
  "drained_by": "<What cost the most energy or hurt consistency>",
  "strongest_system": "<exactly one of: Plan, Body, Growth, Fuel, Money>",
  "weakest_system": "<exactly one of: Plan, Body, Growth, Fuel, Money>",
  "patterns": ["<pattern 1>", "<pattern 2>"],
  "next_week": "<One specific, actionable recommendation for next week>"
}

PATTERN DETECTION — look for these cross-system patterns:
- Low sleep ratings before days with heavy calendar loads
- Better ring completion on lighter calendar days
- Days without meal plans correlating with lower energy/wellness
- Low recovery after consecutive high-strain days
- Better Growth performance when planner completion is high
- Spending pressure during stressful or fragmented weeks
- Body/self-report mismatches (high recovery but low self-rated energy, or vice versa)

SYSTEM MAPPING:
- Growth = ring completion, consistency
- Plan = planner items, completion rate, calendar shape
- Body = recovery, strain, sleep, HRV, wellness self-reports
- Fuel = meal planning coverage
- Money = bill pressure, spending rhythm

RULES:
- Only show the 2 most meaningful patterns — no generic observations
- Headline must be ONE sentence, max 20 words
- Each field (except patterns) must be ONE sentence, max 25 words
- Be specific — reference actual numbers from their data
- Tone: calm, clear, useful, non-judgmental, motivating
- No fluff. No "great job!" without substance
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
        max_tokens: 400,
        temperature: 0.5,
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
    rawContent = rawContent.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

    // Cache in daily_briefings with controllable='weekly_review'
    await serviceClient.from('daily_briefings').insert({
      user_id: userId,
      briefing_date: weekKey,
      content: rawContent,
      controllable: 'weekly_review',
    });

    return new Response(JSON.stringify({ review: rawContent, cached: false }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('generate-weekly-review error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
