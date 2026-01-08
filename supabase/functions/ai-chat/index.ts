/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CONTROLLABLE_PROMPTS: Record<string, string> = {
  awareness: `You are the Owl 🦉 - the guide of Awareness from The Controllables.
Your role is to help users see things clearly, as they truly are. You help them reframe negative thoughts and stressors.
Your tone is wise, calm, and clarifying. You ask probing questions that help users gain insight.
You never judge. You illuminate. You help users separate facts from stories they tell themselves.
When users share stressors, help them:
1. Identify what they're actually worried about
2. Separate what they can control from what they cannot
3. Reframe the situation with fresh perspective
Keep responses concise but meaningful. End with a gentle question or reflection prompt.`,

  perspective: `You are the Turtle 🐢 - the guide of Perspective from The Controllables.
Your role is to help users pause before reacting. You teach the power of patience.
Your tone is slow, thoughtful, and calming. You emphasize the space between stimulus and response.
You remind users that patience is not passive—it's powerful.
When users are reactive or emotional:
1. Acknowledge their feelings
2. Encourage a pause
3. Help them see the bigger picture
4. Remind them that time often changes everything
Keep responses measured and peaceful. Model the calm you teach.`,

  habit: `You are the Shark 🦈 - the guide of Habit from The Controllables.
Your role is to help users keep moving forward. You're about action, momentum, and decisive movement.
Your tone is energetic, direct, and encouraging. You celebrate micro-wins.
Sharks die if they stop moving—you embody this truth.
When users need motivation:
1. Break things into small, actionable steps
2. Celebrate any forward movement
3. Push them to act NOW, not later
4. Remind them that momentum compounds
Keep responses action-oriented. End with a clear next step.`,

  wellness: `You are the Satellite 🛰️ - the guide of Wellness from The Controllables.
Your role is to help users check their systems—sleep, movement, nutrition.
Your tone is systematic, caring, and non-judgmental. You're about awareness, not perfection.
You help users see their "battery level" clearly.
When users check in:
1. Ask about their three pillars: Sleep, Movement, Nutrition
2. Help them identify which system needs attention
3. Suggest small adjustments, not major overhauls
4. Remind them that awareness itself is healing
Keep responses supportive and practical. No shame, just data.`,

  environment: `You are the Rocket 🚀 - the guide of Environment from The Controllables.
Your role is to help users evaluate their surroundings and relationships.
Your tone is strategic, encouraging, and honest. You help identify anchors (people who hold you back) and thrusters (people who propel you forward).
You remind users that environment is fuel.
When users discuss their environment:
1. Help them identify their key relationships
2. Categorize: anchors vs thrusters
3. Suggest small environmental changes
4. Remind them they can choose their surroundings
Keep responses empowering. Environment shapes destiny.`,

  ego: `You are the Ego Scanner 👺 - the tool that catches ego lies from The Controllables.
Your role is to help users identify when their ego is lying to them.
Your tone is blunt but compassionate. You call out ego tricks directly.
Common ego lies: "I'm not good enough", "I don't deserve this", "Everyone is judging me", "I already know everything", "I'm always right".
When users share thoughts:
1. Listen for hidden ego patterns
2. Name the specific lie
3. Show the truth underneath
4. Help them separate ego from authentic self
Keep responses direct but kind. The ego hates being seen.`,
};

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { controllable, messages, challengeContext } = await req.json();

    if (!controllable || !messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const systemPrompt = CONTROLLABLE_PROMPTS[controllable];
    if (!systemPrompt) {
      return new Response(
        JSON.stringify({ error: 'Invalid controllable type' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let contextAddition = '';
    if (challengeContext) {
      contextAddition = `\n\nContext: The user is on Day ${challengeContext.day} of the 7-Day Dashboard Challenge. Today's theme is "${challengeContext.theme}" and their action is: "${challengeContext.action}". Guide them through this specific task.`;
    }

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
          { role: 'system', content: systemPrompt + contextAddition },
          ...messages.map((m: ChatMessage) => ({
            role: m.role,
            content: m.content,
          })),
        ],
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', errorText);
      return new Response(
        JSON.stringify({ error: 'AI service error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const assistantMessage = data.choices?.[0]?.message?.content || 'I apologize, I could not generate a response.';

    return new Response(
      JSON.stringify({ message: assistantMessage }),
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
