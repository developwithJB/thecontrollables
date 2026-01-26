import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface PatternData {
  recentThemes: string[];
  conversationCount: number;
  lastControllable: string | null;
  keyInsights: string[];
  completedActions: string[];
  sessionCount: number;
  longestTheme: string | null;
  themeFrequency: Record<string, number>;
}

interface GuideSession {
  id: string;
  messages: Message[];
  context: string | null;
  updated_at: string;
}

// Theme detection keywords - what users talk about
const THEME_KEYWORDS: Record<string, string[]> = {
  'motivation': ['motivated', 'motivation', 'lazy', 'unmotivated', 'stuck', 'procrastinating', 'procrastination', 'can\'t start'],
  'anxiety': ['anxious', 'worried', 'stress', 'overwhelmed', 'nervous', 'panic', 'anxiety', 'scared', 'fear'],
  'habits': ['habit', 'routine', 'consistency', 'discipline', 'rep', 'reps', 'daily', 'every day', 'streak'],
  'energy': ['tired', 'exhausted', 'energy', 'burnout', 'drained', 'fatigue', 'sleep', 'rest'],
  'focus': ['distracted', 'focus', 'attention', 'scattered', 'productive', 'productivity', 'concentrate'],
  'relationships': ['relationship', 'friend', 'family', 'social', 'lonely', 'people', 'partner', 'parents'],
  'work': ['work', 'job', 'career', 'boss', 'deadline', 'project', 'office', 'meeting'],
  'self-doubt': ['doubt', 'imposter', 'not good enough', 'failure', 'failing', 'worthless', 'useless', 'stupid'],
  'overthinking': ['overthink', 'ruminating', 'can\'t stop thinking', 'thoughts', 'mind racing', 'spiral'],
  'time': ['time', 'too late', 'behind', 'rushing', 'hurry', 'deadline', 'not enough time'],
};

export function useGuideSession() {
  const [session, setSession] = useState<GuideSession | null>(null);
  const [patternData, setPatternData] = useState<PatternData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load existing session and pattern data
  useEffect(() => {
    const loadSession = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        // Get the most recent session
        const { data: sessions, error } = await supabase
          .from('guide_sessions')
          .select('*')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false })
          .limit(1);

        if (error) throw error;

        if (sessions && sessions.length > 0) {
          const rawSession = sessions[0];
          setSession({
            id: rawSession.id,
            messages: (rawSession.messages as unknown as Message[]) || [],
            context: rawSession.context,
            updated_at: rawSession.updated_at,
          });
        }

        // Calculate pattern data from all sessions (get more for better patterns)
        const { data: allSessions } = await supabase
          .from('guide_sessions')
          .select('messages, context, updated_at')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false })
          .limit(20);

        // Get completed actions for callback references
        const { data: completedActionsData } = await supabase
          .from('completed_actions')
          .select('action_text, completed_at')
          .eq('user_id', user.id)
          .order('completed_at', { ascending: false })
          .limit(10);

        if (allSessions && allSessions.length > 0) {
          const completedActions = completedActionsData?.map(a => a.action_text) || [];
          const patterns = analyzePatterns(allSessions, completedActions);
          setPatternData(patterns);
        }
      } catch (error) {
        console.error('Error loading guide session:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSession();
  }, []);

  // Enhanced pattern analysis
  const analyzePatterns = (
    sessions: Array<{ messages: unknown; context: string | null; updated_at: string }>,
    completedActions: string[]
  ): PatternData => {
    const allUserMessages: string[] = [];
    let lastControllable: string | null = null;
    const themeFrequency: Record<string, number> = {};

    // Extract all user messages
    sessions.forEach((s, index) => {
      const msgs = s.messages as Message[] || [];
      msgs.forEach(m => {
        if (m.role === 'user') {
          allUserMessages.push(m.content.toLowerCase());
        }
      });
      if (index === 0 && s.context) {
        lastControllable = s.context;
      }
    });

    // Detect themes with frequency counting
    Object.entries(THEME_KEYWORDS).forEach(([theme, keywords]) => {
      let count = 0;
      allUserMessages.forEach(msg => {
        keywords.forEach(keyword => {
          if (msg.includes(keyword)) count++;
        });
      });
      if (count > 0) {
        themeFrequency[theme] = count;
      }
    });

    // Sort themes by frequency
    const sortedThemes = Object.entries(themeFrequency)
      .sort((a, b) => b[1] - a[1])
      .map(([theme]) => theme);

    // Find the longest-running theme (appears most across sessions)
    const longestTheme = sortedThemes.length > 0 ? sortedThemes[0] : null;

    // Extract key insights (action items from assistant messages)
    const insights: string[] = [];
    sessions.slice(0, 5).forEach(s => {
      const msgs = s.messages as Message[] || [];
      msgs.forEach(m => {
        if (m.role === 'assistant' && m.content.includes('→ ACTION:')) {
          const actionPart = m.content.split('→ ACTION:')[1]?.trim();
          if (actionPart && actionPart.length < 150) {
            // Clean up the action - take first sentence
            const cleanAction = actionPart.split('\n')[0].split('.')[0];
            if (cleanAction.length > 10 && !insights.includes(cleanAction)) {
              insights.push(cleanAction);
            }
          }
        }
      });
    });

    return {
      recentThemes: sortedThemes.slice(0, 4),
      conversationCount: sessions.length,
      lastControllable,
      keyInsights: insights.slice(0, 4),
      completedActions: completedActions.slice(0, 5),
      sessionCount: sessions.length,
      longestTheme,
      themeFrequency,
    };
  };

  // Save session to database
  const saveSession = useCallback(async (messages: Message[], controllable: string | null) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      if (session?.id) {
        // Update existing session
        await supabase
          .from('guide_sessions')
          .update({
            messages: JSON.parse(JSON.stringify(messages)),
            context: controllable,
            updated_at: new Date().toISOString(),
          })
          .eq('id', session.id);
      } else {
        // Create new session
        const { data } = await supabase
          .from('guide_sessions')
          .insert([{
            user_id: user.id,
            messages: JSON.parse(JSON.stringify(messages)),
            context: controllable,
          }])
          .select()
          .single();

        if (data) {
          setSession({
            id: data.id,
            messages: (data.messages as unknown as Message[]) || [],
            context: data.context,
            updated_at: data.updated_at,
          });
        }
      }
    } catch (error) {
      console.error('Error saving guide session:', error);
    }
  }, [session?.id]);

  // Clear session (start fresh)
  const clearSession = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      // Create a new session instead of deleting
      const { data } = await supabase
        .from('guide_sessions')
        .insert([{
          user_id: user.id,
          messages: [] as Json,
          context: null,
        }])
        .select()
        .single();

      if (data) {
        setSession({
          id: data.id,
          messages: [],
          context: data.context,
          updated_at: data.updated_at,
        });
      }
    } catch (error) {
      console.error('Error clearing guide session:', error);
    }
  }, []);

  return {
    session,
    patternData,
    isLoading,
    saveSession,
    clearSession,
    sessionMessages: session?.messages || [],
  };
}
