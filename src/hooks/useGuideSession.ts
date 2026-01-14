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
}

interface GuideSession {
  id: string;
  messages: Message[];
  context: string | null;
  updated_at: string;
}

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

        // Calculate pattern data from all sessions
        const { data: allSessions } = await supabase
          .from('guide_sessions')
          .select('messages, context, updated_at')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false })
          .limit(10);

        if (allSessions && allSessions.length > 0) {
          const patterns = analyzePatterns(allSessions);
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

  // Analyze patterns from session history
  const analyzePatterns = (sessions: Array<{ messages: unknown; context: string | null; updated_at: string }>): PatternData => {
    const allMessages: string[] = [];
    let lastControllable: string | null = null;

    sessions.forEach((s, index) => {
      const msgs = s.messages as Message[] || [];
      msgs.forEach(m => {
        if (m.role === 'user') {
          allMessages.push(m.content.toLowerCase());
        }
      });
      if (index === 0 && s.context) {
        lastControllable = s.context;
      }
    });

    // Extract common themes
    const themeKeywords: Record<string, string[]> = {
      'motivation': ['motivated', 'motivation', 'lazy', 'unmotivated', 'stuck'],
      'anxiety': ['anxious', 'worried', 'stress', 'overwhelmed', 'nervous'],
      'habits': ['habit', 'routine', 'consistency', 'discipline', 'rep'],
      'energy': ['tired', 'exhausted', 'energy', 'burnout', 'drained'],
      'focus': ['distracted', 'focus', 'attention', 'scattered', 'productive'],
      'relationships': ['relationship', 'friend', 'family', 'social', 'lonely'],
    };

    const detectedThemes: string[] = [];
    Object.entries(themeKeywords).forEach(([theme, keywords]) => {
      const found = allMessages.some(msg => 
        keywords.some(keyword => msg.includes(keyword))
      );
      if (found) detectedThemes.push(theme);
    });

    // Extract key insights (last action items mentioned)
    const insights: string[] = [];
    sessions.slice(0, 3).forEach(s => {
      const msgs = s.messages as Message[] || [];
      msgs.forEach(m => {
        if (m.role === 'assistant' && m.content.includes('→ ACTION:')) {
          const actionPart = m.content.split('→ ACTION:')[1]?.trim();
          if (actionPart && actionPart.length < 100) {
            insights.push(actionPart.split('\n')[0]);
          }
        }
      });
    });

    return {
      recentThemes: detectedThemes.slice(0, 3),
      conversationCount: sessions.length,
      lastControllable,
      keyInsights: insights.slice(0, 3),
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
