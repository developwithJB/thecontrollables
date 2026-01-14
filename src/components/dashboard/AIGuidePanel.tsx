import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Send, Loader2, RotateCcw, Zap, Check, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { getArchetypeInfo, type UserBuildCurrent } from "@/lib/build";
import { useGuideSession } from "@/hooks/useGuideSession";
import { toast } from "sonner";

interface MainQuest {
  title: string;
  duration_days: number;
}

interface AIGuidePanelProps {
  activeQuest: MainQuest | null;
  totalXp: number;
  integrityScore: number | null;
  currentBuild?: UserBuildCurrent | null;
  onXpEarned?: () => void;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  actionCompleted?: boolean;
  controllable?: GuideType | null; // Persist which guide sent this message
}

type GuideType = "awareness" | "perspective" | "habit" | "wellness" | "environment";

interface Guide {
  id: GuideType;
  name: string;
  emoji: string;
  tagline: string;
  color: string;
  prompts: string[];
}

const GUIDES: Guide[] = [
  {
    id: "awareness",
    name: "Awareness",
    emoji: "🦉",
    tagline: "Pause. Observe. Choose.",
    color: "from-amber-500/20 to-amber-600/10",
    prompts: [
      "My mind won't stop racing.",
      "I'm reacting, not responding.",
      "What's actually true here?",
    ],
  },
  {
    id: "perspective",
    name: "Perspective",
    emoji: "🐢",
    tagline: "Zoom out. This is one chapter.",
    color: "from-emerald-500/20 to-emerald-600/10",
    prompts: [
      "Everything feels too big.",
      "I feel like a failure today.",
      "Will this matter in a year?",
    ],
  },
  {
    id: "habit",
    name: "Habit",
    emoji: "🦈",
    tagline: "Keep moving. One rep.",
    color: "from-blue-500/20 to-blue-600/10",
    prompts: [
      "I've been off track.",
      "What's my next rep?",
      "I don't feel like doing anything.",
    ],
  },
  {
    id: "wellness",
    name: "Wellness",
    emoji: "🛰️",
    tagline: "Check your systems.",
    color: "from-violet-500/20 to-violet-600/10",
    prompts: [
      "I'm exhausted.",
      "My energy is crashing.",
      "Something feels off.",
    ],
  },
  {
    id: "environment",
    name: "Environment",
    emoji: "🚀",
    tagline: "Design your surroundings.",
    color: "from-rose-500/20 to-rose-600/10",
    prompts: [
      "My environment isn't helping.",
      "I keep getting distracted.",
      "What's holding me back?",
    ],
  },
];

// Keywords to auto-detect which controllable should respond
const GUIDE_KEYWORDS: Record<GuideType, string[]> = {
  awareness: ["mind", "racing", "anxious", "thinking", "thoughts", "observe", "react", "focus", "attention", "present", "aware", "mindful", "meditation", "breathe"],
  perspective: ["big", "failure", "stuck", "hopeless", "perspective", "zoom", "year", "matter", "overwhelm", "chapter", "story", "future", "past", "worry"],
  habit: ["habit", "routine", "track", "rep", "consistency", "discipline", "motivation", "lazy", "productive", "schedule", "goal", "action", "doing", "procrastinate"],
  wellness: ["tired", "exhausted", "energy", "sleep", "nutrition", "health", "body", "rest", "crash", "systems", "burnout", "stress", "physical"],
  environment: ["environment", "distract", "space", "room", "phone", "people", "surround", "toxic", "trigger", "place", "setup", "desk", "home"],
};

const ACTION_XP = 15;

// Helper to find guide by id
const getGuideById = (id: GuideType | null | undefined): Guide | null => {
  if (!id) return null;
  return GUIDES.find(g => g.id === id) || null;
};

// Auto-detect which guide should respond based on message content
const detectGuideFromMessage = (message: string): GuideType => {
  const lowerMessage = message.toLowerCase();
  const scores: Record<GuideType, number> = {
    awareness: 0,
    perspective: 0,
    habit: 0,
    wellness: 0,
    environment: 0,
  };

  for (const [guide, keywords] of Object.entries(GUIDE_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerMessage.includes(keyword)) {
        scores[guide as GuideType]++;
      }
    }
  }

  // Find the guide with highest score, default to awareness
  let maxGuide: GuideType = "awareness";
  let maxScore = 0;
  for (const [guide, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      maxGuide = guide as GuideType;
    }
  }

  return maxGuide;
};

export function AIGuidePanel({ activeQuest, totalXp, integrityScore, currentBuild, onXpEarned }: AIGuidePanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedGuide, setSelectedGuide] = useState<Guide | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [completedActionsCount, setCompletedActionsCount] = useState(0);
  
  const { 
    patternData, 
    sessionMessages, 
    saveSession, 
    clearSession, 
    isLoading: isSessionLoading 
  } = useGuideSession();

  // Load session messages when session is ready
  useEffect(() => {
    if (!isSessionLoading && sessionMessages.length > 0 && messages.length === 0) {
      setMessages(sessionMessages);
    }
  }, [isSessionLoading, sessionMessages, messages.length]);

  // Load completed actions count
  useEffect(() => {
    const loadCompletedCount = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const today = new Date().toISOString().split('T')[0];
      const { count } = await supabase
        .from('completed_actions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('completed_at', `${today}T00:00:00`);

      setCompletedActionsCount(count || 0);
    };

    loadCompletedCount();
  }, []);

  const completeAction = useCallback(async (actionText: string, messageIndex: number, controllable: GuideType | null) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Please log in to complete actions");
      return;
    }

    try {
      // Insert completed action
      const { error: actionError } = await supabase
        .from('completed_actions')
        .insert([{
          user_id: user.id,
          action_text: actionText,
          controllable: controllable || null,
          xp_awarded: ACTION_XP,
        }]);

      if (actionError) throw actionError;

      // Award XP
      const { error: xpError } = await supabase
        .from('xp_logs')
        .insert([{
          user_id: user.id,
          amount: ACTION_XP,
          source: 'action_completed',
          description: `Completed action: ${actionText.substring(0, 50)}...`,
        }]);

      if (xpError) throw xpError;

      // Update message to show completed
      setMessages(prev => prev.map((msg, idx) => 
        idx === messageIndex ? { ...msg, actionCompleted: true } : msg
      ));

      setCompletedActionsCount(prev => prev + 1);
      
      toast.success(
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-accent" />
          <span>+{ACTION_XP} XP earned!</span>
        </div>
      );

      // Notify parent to refresh XP
      onXpEarned?.();
    } catch (error) {
      console.error("Error completing action:", error);
      toast.error("Failed to complete action");
    }
  }, [onXpEarned]);

  const sendMessage = async (messageText: string) => {
    if (!messageText.trim() || isLoading) return;

    // Determine which guide should respond
    let respondingGuide: Guide;
    if (selectedGuide) {
      respondingGuide = selectedGuide;
    } else {
      // Auto-detect based on message content
      const detectedGuideId = detectGuideFromMessage(messageText);
      respondingGuide = GUIDES.find(g => g.id === detectedGuideId) || GUIDES[0];
    }

    const userMessage: Message = { role: "user", content: messageText };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    try {
      const archetypeInfo = getArchetypeInfo(currentBuild?.build_archetype_key || null);
      
      const userContext = {
        hasQuest: !!activeQuest,
        questTitle: activeQuest?.title || "No active quest",
        xp: totalXp,
        integrity: integrityScore,
      };

      const buildContext = currentBuild && currentBuild.overall > 0 ? {
        awareness: Number(currentBuild.awareness).toFixed(1),
        perspective: Number(currentBuild.perspective).toFixed(1),
        habit: Number(currentBuild.habit).toFixed(1),
        wellness: Number(currentBuild.wellness).toFixed(1),
        environment: Number(currentBuild.environment).toFixed(1),
        overall: Number(currentBuild.overall).toFixed(1),
        archetype: archetypeInfo.label,
        archetypeDescription: archetypeInfo.description,
      } : null;

      const { data, error } = await supabase.functions.invoke("ai-chat", {
        body: {
          controllable: respondingGuide.id,
          messages: [userMessage].map((m) => ({ role: m.role, content: m.content })),
          sessionHistory: messages.slice(-10),
          patternData,
          userContext,
          buildContext,
        },
      });

      if (error) throw error;

      const assistantMessage: Message = {
        role: "assistant",
        content: data.message || "I'm here to help. What's on your mind?",
        actionCompleted: false,
        controllable: respondingGuide.id, // Persist which guide responded
      };
      const updatedMessages = [...newMessages, assistantMessage];
      setMessages(updatedMessages);
      
      saveSession(updatedMessages, respondingGuide.id);
    } catch (error) {
      console.error("AI chat error:", error);
      const fallbackGuide = respondingGuide || GUIDES[0];
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "I'm having trouble connecting right now. Take a breath, and try again in a moment.\n\n→ ACTION: Close your eyes and take 3 deep breaths while waiting.",
          actionCompleted: false,
          controllable: fallbackGuide.id,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuideSelect = (guide: Guide) => {
    setSelectedGuide(guide);
  };

  const handleBack = () => {
    setSelectedGuide(null);
  };

  const handleNewConversation = () => {
    setMessages([]);
    setSelectedGuide(null);
    clearSession();
  };

  const getActionFromMessage = (content: string): string | null => {
    if (content.includes('→ ACTION:')) {
      return content.split('→ ACTION:')[1]?.trim().split('\n')[0] || null;
    }
    return null;
  };

  // Get the guide for the current loading state (for the thinking indicator)
  const getLoadingGuide = (): Guide => {
    if (selectedGuide) return selectedGuide;
    if (input.trim()) {
      const detectedId = detectGuideFromMessage(input);
      return GUIDES.find(g => g.id === detectedId) || GUIDES[0];
    }
    return GUIDES[0];
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="rounded-2xl bg-gradient-to-br from-card to-muted/30 border shadow-soft overflow-hidden"
    >
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-5 flex items-center justify-between hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10 text-xl">
            {selectedGuide ? selectedGuide.emoji : "🧭"}
          </div>
          <div className="text-left">
            <h3 className="font-display font-semibold text-foreground">
              {selectedGuide ? `${selectedGuide.name} Operator` : "AI Operators"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {selectedGuide 
                ? selectedGuide.tagline 
                : patternData && patternData.conversationCount > 0
                  ? `${patternData.conversationCount} sessions • Patterns tracked`
                  : "Choose your operator or just ask"
              }
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {completedActionsCount > 0 && (
            <span className="text-xs bg-accent/10 text-accent px-2 py-0.5 rounded-full flex items-center gap-1">
              <Check className="w-3 h-3" />
              {completedActionsCount} today
            </span>
          )}
          {messages.length > 0 && (
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
              {messages.length} msgs
            </span>
          )}
          <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown className="w-5 h-5 text-muted-foreground" />
          </motion.div>
        </div>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="px-5 pb-5">
              {/* Messages Area - Always show if there are messages */}
              {messages.length > 0 && (
                <div className="space-y-3 max-h-80 overflow-y-auto mb-4 pr-2">
                  {messages.map((msg, idx) => {
                    // Get the guide that sent this message (for assistant messages)
                    const messageGuide = msg.role === "assistant" 
                      ? getGuideById(msg.controllable) 
                      : null;
                    const action = msg.role === 'assistant' ? getActionFromMessage(msg.content) : null;
                    const contentWithoutAction = msg.role === 'assistant' && action
                      ? msg.content.split('→ ACTION:')[0].trim()
                      : msg.content;
                    
                    return (
                      <div key={idx}>
                        <div
                          className={`p-3 rounded-xl text-sm ${
                            msg.role === "user"
                              ? "bg-primary text-primary-foreground ml-8"
                              : "bg-muted text-foreground mr-8"
                          }`}
                        >
                          {msg.role === "assistant" && messageGuide && (
                            <span className="mr-2">{messageGuide.emoji}</span>
                          )}
                          {contentWithoutAction}
                        </div>
                        
                        {action && (
                          <motion.div
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`mt-2 mr-8 p-3 rounded-xl border ${
                              msg.actionCompleted 
                                ? 'bg-accent/20 border-accent/50' 
                                : 'bg-accent/10 border-accent/30'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <p className="text-xs font-semibold text-accent flex items-center gap-1">
                                <Zap className="w-3 h-3" /> YOUR ACTION
                              </p>
                              {!msg.actionCompleted && (
                                <span className="text-xs text-accent/70">+{ACTION_XP} XP</span>
                              )}
                            </div>
                            <p className="text-sm text-foreground mb-2">{action}</p>
                            
                            {msg.actionCompleted ? (
                              <div className="flex items-center gap-2 text-accent">
                                <Check className="w-4 h-4" />
                                <span className="text-xs font-medium">Completed! +{ACTION_XP} XP</span>
                              </div>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => completeAction(action, idx, msg.controllable || null)}
                                className="h-7 text-xs border-accent/30 text-accent hover:bg-accent/10"
                              >
                                <Check className="w-3 h-3 mr-1" />
                                Mark Complete
                              </Button>
                            )}
                          </motion.div>
                        )}
                      </div>
                    );
                  })}
                  {isLoading && (
                    <div className="bg-muted text-foreground p-3 rounded-xl mr-8 flex items-center gap-2">
                      <span>{getLoadingGuide().emoji}</span>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm">Thinking...</span>
                    </div>
                  )}
                </div>
              )}

              {/* Operator Selection + Input Row */}
              <div className="space-y-3">
                {/* Operator selector row */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-muted-foreground shrink-0">Operator:</span>
                  <div className="flex gap-1.5 flex-wrap flex-1">
                    {GUIDES.map((guide) => (
                      <button
                        key={guide.id}
                        onClick={() => handleGuideSelect(selectedGuide?.id === guide.id ? null as any : guide)}
                        className={`px-2 py-1 rounded-lg text-sm flex items-center gap-1 transition-all ${
                          selectedGuide?.id === guide.id
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted/60 hover:bg-muted text-foreground"
                        }`}
                      >
                        <span>{guide.emoji}</span>
                        <span className="hidden sm:inline text-xs">{guide.name}</span>
                      </button>
                    ))}
                  </div>
                  {messages.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleNewConversation}
                      className="text-xs h-7 shrink-0"
                    >
                      <RotateCcw className="w-3 h-3 mr-1" />
                      New
                    </Button>
                  )}
                </div>

                {/* Pattern data hint */}
                {patternData && patternData.recentThemes.length > 0 && messages.length === 0 && (
                  <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
                    <p className="text-xs font-medium text-primary mb-1 flex items-center gap-1">
                      <Zap className="w-3 h-3" /> Pattern detected
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Recent themes: {patternData.recentThemes.join(', ')}
                    </p>
                  </div>
                )}

                {/* Quick prompts when no messages */}
                {messages.length === 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {(selectedGuide ? selectedGuide.prompts : GUIDES.flatMap(g => g.prompts.slice(0, 1))).map((prompt) => (
                      <button
                        key={prompt}
                        onClick={() => sendMessage(prompt)}
                        className="text-xs px-2.5 py-1 rounded-full bg-muted hover:bg-muted/80 text-foreground transition-colors"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                )}

                {/* Input row */}
                <div className="flex gap-2">
                  <Input
                    placeholder={selectedGuide ? `Ask ${selectedGuide.name}...` : "Ask any operator..."}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
                    className="flex-1"
                    disabled={isLoading}
                  />
                  <Button
                    size="icon"
                    onClick={() => sendMessage(input)}
                    disabled={!input.trim() || isLoading}
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>

                {!selectedGuide && !messages.length && (
                  <p className="text-xs text-muted-foreground text-center">
                    Select an operator or just type — we'll route to the right one
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
