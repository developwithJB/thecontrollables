import { useState, useEffect, useCallback, forwardRef, useImperativeHandle, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Send, Loader2, RotateCcw, Zap, Check, Trophy, Lock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { getArchetypeInfo, type UserBuildCurrent } from "@/lib/build";
import { useGuideSession } from "@/hooks/useGuideSession";
import { useActionTracking } from "@/hooks/useActionTracking";
import { toast } from "sonner";
import { getPricing } from "@/lib/pricing";
import { AIOperatorIntro, useAIOperatorIntro } from "./AIOperatorIntro";

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
  isPaid?: boolean;
  onUpgrade?: () => void;
  isCheckingOut?: boolean;
  hasActiveSnapshot?: boolean; // Whether user has an active 7-day snapshot
  onMessageSent?: () => void; // Callback when user sends a message (for Today Actions tracking)
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

const DAILY_MESSAGE_LIMIT = 25;
const FREE_PREVIEW_LIMIT = 1; // Free users get 1 message to try

// Export handle type for parent components to use
export interface AIGuidePanelHandle {
  open: () => void;
}

export const AIGuidePanel = forwardRef<AIGuidePanelHandle, AIGuidePanelProps>(function AIGuidePanel({ activeQuest, totalXp, integrityScore, currentBuild, onXpEarned, isPaid = true, onUpgrade, isCheckingOut = false, hasActiveSnapshot = false, onMessageSent }, ref) {
  const [isExpanded, setIsExpanded] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  
  // Expose open method to parent
  useImperativeHandle(ref, () => ({
    open: () => {
      setIsExpanded(true);
      // Scroll into view and focus input after a short delay for animation
      setTimeout(() => {
        panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        inputRef.current?.focus();
      }, 100);
    }
  }));
  const [selectedGuide, setSelectedGuide] = useState<Guide | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [completedActionsCount, setCompletedActionsCount] = useState(0);
  const [completedActionTexts, setCompletedActionTexts] = useState<Set<string>>(new Set());
  const [remainingMessages, setRemainingMessages] = useState<number>(DAILY_MESSAGE_LIMIT);
  const [limitReached, setLimitReached] = useState(false);
  const [freePreviewUsed, setFreePreviewUsed] = useState(false);
  
  // One-time intro for AI operators
  const { hasSeenIntro, markAsSeen } = useAIOperatorIntro();
  
  const { 
    patternData, 
    sessionMessages, 
    saveSession, 
    clearSession, 
    isLoading: isSessionLoading 
  } = useGuideSession();

  const { trackButtonClick, trackModalAction, trackGuideInteraction, trackFeatureUse } = useActionTracking();

  // Auto-scroll to bottom when messages change or panel expands
  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, scrollToBottom]);
  
  // Scroll to bottom when panel expands
  useEffect(() => {
    if (isExpanded && messages.length > 0) {
      // Small delay to ensure the panel has expanded
      setTimeout(scrollToBottom, 100);
    }
  }, [isExpanded, messages.length, scrollToBottom]);

  // Load session messages when session is ready
  useEffect(() => {
    if (!isSessionLoading && sessionMessages.length > 0 && messages.length === 0) {
      setMessages(sessionMessages);
      // If free user and they have existing messages, they've used their preview
      if (!isPaid && sessionMessages.length > 0) {
        setFreePreviewUsed(true);
      }
    }
  }, [isSessionLoading, sessionMessages, messages.length, isPaid]);
  
  // Check localStorage for free user's daily preview usage
  // Free users with active snapshot get 1 free message per day
  useEffect(() => {
    if (!isPaid) {
      const today = new Date().toISOString().split('T')[0];
      const previewKey = `ai_guide_daily_${today}`;
      const usedDailyMessage = localStorage.getItem(previewKey);
      if (usedDailyMessage) {
        setFreePreviewUsed(true);
      } else {
        // Reset for new day - allow new message
        setFreePreviewUsed(false);
      }
    }
  }, [isPaid]);

  // Load completed actions (both count and action texts for deduplication)
  useEffect(() => {
    const loadCompletedActions = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const today = new Date().toISOString().split('T')[0];
      const { data, count } = await supabase
        .from('completed_actions')
        .select('action_text', { count: 'exact' })
        .eq('user_id', user.id)
        .gte('completed_at', `${today}T00:00:00`);

      setCompletedActionsCount(count || 0);
      
      // Store all completed action texts in a Set for quick lookup
      if (data) {
        const texts = new Set(data.map(a => a.action_text));
        setCompletedActionTexts(texts);
      }
    };

    loadCompletedActions();
  }, []);

  const completeAction = useCallback(async (actionText: string, messageIndex: number, controllable: GuideType | null) => {
    // Check if already completed (prevents double-clicks and re-completions)
    if (completedActionTexts.has(actionText)) {
      toast.info("You've already completed this action!");
      return;
    }

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

      // Add to completed actions set
      setCompletedActionTexts(prev => new Set([...prev, actionText]));
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
  }, [onXpEarned, completedActionTexts]);

  const sendMessage = async (messageText: string) => {
    if (!messageText.trim() || isLoading) return;

    // For free users: allow 1 message per day if they have an active snapshot
    if (!isPaid) {
      if (!hasActiveSnapshot) {
        toast.error("Start your 7-Day Snapshot to unlock daily messages from The Controllables!");
        return;
      }
      if (freePreviewUsed) {
        toast.error("Daily message used. Come back tomorrow or upgrade for unlimited!");
        return;
      }
    }

    // Determine which guide should respond
    let respondingGuide: Guide;
    if (selectedGuide) {
      respondingGuide = selectedGuide;
    } else {
      // Auto-detect based on message content
      const detectedGuideId = detectGuideFromMessage(messageText);
      respondingGuide = GUIDES.find(g => g.id === detectedGuideId) || GUIDES[0];
    }

    // Track message send
    trackGuideInteraction("message", respondingGuide.name);

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

      if (error) {
        // Check if it's a limit reached error
        if (error.message?.includes('limit') || data?.limitReached) {
          setLimitReached(true);
          setRemainingMessages(0);
          toast.error("Daily message limit reached. Resets at midnight.");
          return;
        }
        throw error;
      }

      // Update remaining messages from response
      if (data.remaining !== undefined) {
        setRemainingMessages(data.remaining);
      }

      const assistantMessage: Message = {
        role: "assistant",
        content: data.message || "I'm here to help. What's on your mind?",
        actionCompleted: false,
        controllable: respondingGuide.id, // Persist which guide responded
      };
      const updatedMessages = [...newMessages, assistantMessage];
      setMessages(updatedMessages);
      
      saveSession(updatedMessages, respondingGuide.id);
      
      // For free users, mark daily message as used after successful message
      if (!isPaid && hasActiveSnapshot) {
        const today = new Date().toISOString().split('T')[0];
        const previewKey = `ai_guide_daily_${today}`;
        localStorage.setItem(previewKey, 'true');
        setFreePreviewUsed(true);
      }
      
      // Notify parent that a message was sent (for Today Actions completion)
      onMessageSent?.();
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
    trackGuideInteraction("operator_select", guide.name);
    setSelectedGuide(guide);
  };

  const handleBack = () => {
    trackButtonClick("guide_back");
    setSelectedGuide(null);
  };

  const handleNewConversation = () => {
    trackButtonClick("guide_new_conversation");
    setMessages([]);
    setSelectedGuide(null);
    clearSession();
  };

  const handleExpand = () => {
    const newState = !isExpanded;
    setIsExpanded(newState);
    if (newState) {
      trackModalAction("ai_guide_panel", "open");
    }
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
      ref={panelRef}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="rounded-2xl bg-gradient-to-br from-card to-muted/30 border shadow-soft overflow-hidden"
    >
      {/* Header */}
      <button
        onClick={handleExpand}
        className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-accent/10 text-xl">
            {selectedGuide ? selectedGuide.emoji : "🧠"}
          </div>
          <div className="text-left">
            <h3 className="font-display font-semibold text-foreground">
              {selectedGuide ? selectedGuide.name : "The Controllables"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {selectedGuide 
                ? selectedGuide.tagline 
                : patternData && patternData.conversationCount > 0
                  ? `${patternData.conversationCount} sessions • Patterns tracked`
                  : "Choose a guide or just ask"
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
            <span className="text-xs bg-accent/10 text-accent px-2 py-0.5 rounded-full">
              {messages.length} msgs
            </span>
          )}
          <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown className="w-5 h-5 text-muted-foreground" />
          </motion.div>
        </div>
      </button>

      {/* Persistent Operator Selector - iOS Glass Style */}
      <div className="px-4 pb-3 border-t border-border/50">
        <div className="flex items-center justify-between gap-1.5 py-2">
          {GUIDES.map((guide) => (
            <motion.button
              key={guide.id}
              onClick={() => handleGuideSelect(selectedGuide?.id === guide.id ? null as any : guide)}
              whileTap={{ scale: 0.92 }}
              whileHover={{ scale: 1.02 }}
              animate={selectedGuide?.id === guide.id ? { y: [0, -2, 0] } : {}}
              transition={{ 
                type: "spring", 
                stiffness: 400, 
                damping: 17,
                y: { duration: 0.3, ease: "easeOut" }
              }}
              className={`flex-1 flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl transition-all duration-200 backdrop-blur-sm ${
                selectedGuide?.id === guide.id
                  ? "bg-white/90 dark:bg-white/15 shadow-md ring-2 ring-accent"
                  : "bg-white/50 dark:bg-white/5 hover:bg-white/70 dark:hover:bg-white/10"
              }`}
              style={{
                boxShadow: selectedGuide?.id === guide.id 
                  ? '0 4px 12px -2px rgba(102, 189, 239, 0.35), 0 0 0 1px rgba(102, 189, 239, 0.1)' 
                  : undefined
              }}
            >
              <motion.span 
                className="text-lg"
                animate={selectedGuide?.id === guide.id ? { scale: [1, 1.15, 1] } : {}}
                transition={{ duration: 0.3 }}
              >
                {guide.emoji}
              </motion.span>
              <span className={`text-[10px] font-medium truncate max-w-full transition-colors duration-200 ${
                selectedGuide?.id === guide.id 
                  ? "text-accent font-semibold" 
                  : "text-muted-foreground"
              }`}>
                {guide.name}
              </span>
            </motion.button>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="px-5 pb-5 relative">
              {/* Preview mode for free users - show after they've used their free message */}
              {!isPaid && freePreviewUsed && (
                <div className="flex flex-col" data-testid="ai-operators-locked">
                  {/* Show their full conversation including actions */}
                  {messages.length > 0 && (
                    <div ref={messagesContainerRef} className="w-full space-y-3 max-h-72 overflow-y-auto mb-4 pr-2">
                      {messages.map((msg, idx) => {
                        const messageGuide = msg.role === "assistant" ? getGuideById(msg.controllable) : null;
                        const action = msg.role === 'assistant' ? getActionFromMessage(msg.content) : null;
                        const contentWithoutAction = msg.role === 'assistant' && action
                          ? msg.content.split('→ ACTION:')[0].trim()
                          : msg.content;
                        
                        // Check if action is completed
                        const isActionCompleted = action 
                          ? (msg.actionCompleted || completedActionTexts.has(action))
                          : false;
                        
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
                            
                            {/* Show action card for free users too */}
                            {action && (
                              <motion.div
                                initial={{ opacity: 0, y: -5 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`mt-2 mr-8 p-3 rounded-xl border ${
                                  isActionCompleted 
                                    ? 'bg-accent/20 border-accent/50' 
                                    : 'bg-accent/10 border-accent/30'
                                }`}
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <p className="text-xs font-semibold text-accent flex items-center gap-1">
                                    <Zap className="w-3 h-3" /> YOUR ACTION
                                  </p>
                                  {!isActionCompleted && (
                                    <span className="text-xs text-accent/70">+{ACTION_XP} XP</span>
                                  )}
                                </div>
                                <p className="text-sm text-foreground mb-2">{action}</p>
                                
                                {isActionCompleted ? (
                                  <div className="flex items-center gap-2 text-accent">
                                    <Check className="w-4 h-4" />
                                    <span className="text-xs font-medium">Completed</span>
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
                      {/* Scroll anchor for free users */}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                  
                  {/* Upgrade prompt - positioned after the conversation */}
                  <div className="text-center py-4 border-t border-border/50 mt-2">
                    <p className="text-sm text-muted-foreground mb-3">
                      Come back tomorrow for another free message, or unlock unlimited access.
                    </p>
                    
                    <Button 
                      onClick={onUpgrade}
                      disabled={isCheckingOut}
                      className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
                      data-testid="ai-operators-upgrade-cta"
                    >
                      {isCheckingOut ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Sparkles className="w-4 h-4" />
                      )}
                      {isCheckingOut ? "Opening checkout..." : "Unlock Full Access"}
                    </Button>
                    
                    <p className="text-xs text-muted-foreground mt-3">
                      Starting at ${getPricing().monthly}/mo
                    </p>
                  </div>
                </div>
              )}

              {/* Preview mode for free users who haven't used their message yet */}
              {!isPaid && !freePreviewUsed && (
                <>
                  <div className="bg-accent/10 border border-accent/20 rounded-lg p-3 mb-4">
                    <p className="text-xs text-accent font-medium flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> Free Preview
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Try one message free today. Upgrade for unlimited access.
                    </p>
                  </div>
                  
                  {/* Input row for free preview */}
                  <div className="flex gap-2">
                    <Input
                      placeholder={selectedGuide ? `Ask ${selectedGuide.name}...` : "Try asking something..."}
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
                      className="bg-accent hover:bg-accent/90 text-accent-foreground"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  {/* Quick prompts */}
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {(selectedGuide ? selectedGuide.prompts.slice(0, 2) : GUIDES.slice(0, 3).map(g => g.prompts[0])).map((prompt) => (
                      <button
                        key={prompt}
                        onClick={() => sendMessage(prompt)}
                        className="text-xs px-2.5 py-1 rounded-full bg-muted hover:bg-muted/80 text-foreground transition-colors"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {/* Full functionality for paid users */}
              {isPaid && (
                <>
                  {/* One-time intro for new users */}
                  {!hasSeenIntro && messages.length === 0 && (
                    <AIOperatorIntro onDismiss={markAsSeen} />
                  )}
                  
                  {(hasSeenIntro || messages.length > 0) && (
                    <>
                      {/* Messages Area - Always show if there are messages */}
                      {messages.length > 0 && (
                        <div ref={messagesContainerRef} className="space-y-3 max-h-80 overflow-y-auto mb-4 pr-2">
                      {messages.map((msg, idx) => {
                        // Get the guide that sent this message (for assistant messages)
                        const messageGuide = msg.role === "assistant" 
                          ? getGuideById(msg.controllable) 
                          : null;
                        const action = msg.role === 'assistant' ? getActionFromMessage(msg.content) : null;
                        const contentWithoutAction = msg.role === 'assistant' && action
                          ? msg.content.split('→ ACTION:')[0].trim()
                          : msg.content;
                        
                        // Check if action is completed - either from local state OR from database
                        const isActionCompleted = action 
                          ? (msg.actionCompleted || completedActionTexts.has(action))
                          : false;
                        
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
                                  isActionCompleted 
                                    ? 'bg-accent/20 border-accent/50' 
                                    : 'bg-accent/10 border-accent/30'
                                }`}
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <p className="text-xs font-semibold text-accent flex items-center gap-1">
                                    <Zap className="w-3 h-3" /> YOUR ACTION
                                  </p>
                                  {!isActionCompleted && (
                                    <span className="text-xs text-accent/70">+{ACTION_XP} XP</span>
                                  )}
                                </div>
                                <p className="text-sm text-foreground mb-2">{action}</p>
                                
                                {isActionCompleted ? (
                                  <div className="flex items-center gap-2 text-accent">
                                    <Check className="w-4 h-4" />
                                    <span className="text-xs font-medium">Completed</span>
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
                      {/* Scroll anchor */}
                      <div ref={messagesEndRef} />
                    </div>
                  )}

                  {/* Input row */}
                  <div className="flex gap-2">
                    <Input
                      ref={inputRef}
                      placeholder={limitReached ? "Daily limit reached" : (selectedGuide ? `Ask ${selectedGuide.name}...` : "Ask a Controllable...")}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && !limitReached && sendMessage(input)}
                      className="flex-1"
                      disabled={isLoading || limitReached}
                    />
                    <Button
                      size="icon"
                      onClick={() => sendMessage(input)}
                      disabled={!input.trim() || isLoading || limitReached}
                      className="bg-accent hover:bg-accent/90 text-accent-foreground"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                    {messages.length > 0 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleNewConversation}
                        className="shrink-0"
                        title="New conversation"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </Button>
                    )}

                  </div>
                  
                  {/* Daily message limit indicator - only show when 10 or fewer remaining */}
                  {(limitReached || remainingMessages <= 10) && (
                    <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
                      <span>
                        {limitReached 
                          ? "🔒 Daily limit reached — resets at midnight" 
                          : `${remainingMessages} message${remainingMessages !== 1 ? 's' : ''} remaining today`
                        }
                      </span>
                    </div>
                  )}

                  {/* Pattern data hint */}
                  {patternData && patternData.recentThemes.length > 0 && messages.length === 0 && (
                    <div className="p-3 rounded-lg bg-accent/5 border border-accent/10 mt-3">
                      <p className="text-xs font-medium text-accent mb-1 flex items-center gap-1">
                        <Zap className="w-3 h-3" /> Pattern detected
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Recent themes: {patternData.recentThemes.join(', ')}
                      </p>
                    </div>
                  )}

                  {/* Quick prompts when no messages */}
                  {messages.length === 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
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

                  {!selectedGuide && !messages.length && hasSeenIntro && (
                    <p className="text-xs text-muted-foreground text-center mt-2">
                      Select a Controllable or just type — we'll route to the right one
                    </p>
                  )}
                  </>
                  )}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});
