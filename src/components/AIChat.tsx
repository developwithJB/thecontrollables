import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ChallengeContext {
  day: number;
  theme: string;
  action: string;
}

interface AIChatProps {
  controllable: string;
  emoji: string;
  title: string;
  isOpen: boolean;
  onClose: () => void;
  challengeContext?: ChallengeContext;
  onUpgrade?: (source: "ai_limit") => void;
}

type PlanTier = 'free' | 'plus' | 'pro';

const PLAN_DAILY_LIMITS: Record<PlanTier, number> = {
  free: 2,
  plus: 15,
  pro: 25,
};

const getTodayKey = () => new Date().toISOString().slice(0, 10);

const WELCOME_MESSAGES: Record<string, string> = {
  awareness: "Hello, I am the Owl 🦉. I help you see things clearly, as they truly are. What's weighing on your mind today?",
  perspective: "Greetings, I am the Turtle 🐢. I teach the power of patience and perspective. What situation would you like to pause and reflect on?",
  habit: "I'm the Shark 🦈. I keep moving, always forward. What action do you want to take today? Let's build momentum.",
  wellness: "I am the Satellite 🛰️, monitoring your systems. How are your batteries today—Sleep, Movement, Nutrition?",
  environment: "Welcome, I am the Rocket 🚀. Your environment is your fuel. Tell me about the people around you.",
  ego: "I am the Ego Scanner 👺. I catch the lies your ego tells you. What thought has been bothering you lately?",
};

export function AIChat({ controllable, emoji, title, isOpen, onClose, challengeContext, onUpgrade }: AIChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [planTier, setPlanTier] = useState<PlanTier>('free');
  const [remainingMessages, setRemainingMessages] = useState<number>(PLAN_DAILY_LIMITS.free);
  const [dailyLimit, setDailyLimit] = useState<number>(PLAN_DAILY_LIMITS.free);
  const [usedToday, setUsedToday] = useState<number>(0);
  const [activeDay, setActiveDay] = useState<string>(getTodayKey());
  const [aiLocked, setAiLocked] = useState(false);
  const [limitReached, setLimitReached] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const welcome = WELCOME_MESSAGES[controllable] || `Hello, I am your ${title} guide.`;
      setMessages([{ role: 'assistant', content: welcome }]);
    }
  }, [isOpen, controllable, title, messages.length]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleClose = () => {
    setMessages([]);
    setInput("");
    onClose();
  };

  useEffect(() => {
    if (!isOpen) return;

    const today = getTodayKey();
    if (today !== activeDay) {
      setActiveDay(today);
      setLimitReached(false);
      setAiLocked(false);
      setUsedToday(0);
      setRemainingMessages(PLAN_DAILY_LIMITS[planTier]);
    }
  }, [isOpen, activeDay, planTier]);

  const maybeWarnAtProCap = (nextPlanTier: PlanTier, remaining: number, dayKey: string) => {
    if (nextPlanTier !== 'pro' || remaining > 0) {
      return;
    }

    const warningStorageKey = `ai-pro-cap-warning-${dayKey}`;
    if (localStorage.getItem(warningStorageKey)) {
      return;
    }

    localStorage.setItem(warningStorageKey, 'shown');
    toast.warning('You have reached your Pro AI cap for today. Usage resets at midnight.');
  };

  const applyUsageState = (data: any) => {
    const nextPlanTier = (data?.planTier as PlanTier) || planTier;
    const nextLimit = data?.dailyLimit ?? PLAN_DAILY_LIMITS[nextPlanTier];
    const nextRemaining = data?.remaining ?? Math.max(nextLimit - (data?.used ?? usedToday), 0);
    const nextUsed = data?.used ?? Math.max(nextLimit - nextRemaining, 0);
    const dayKey = data?.day ?? getTodayKey();

    setPlanTier(nextPlanTier);
    setDailyLimit(nextLimit);
    setRemainingMessages(nextRemaining);
    setUsedToday(nextUsed);
    setActiveDay(dayKey);
    setAiLocked(Boolean(data?.aiLocked));

    maybeWarnAtProCap(nextPlanTier, nextRemaining, monthKey);
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading || limitReached || aiLocked) return;

    const userMessage = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: {
          controllable,
          messages: [...messages, { role: 'user', content: userMessage }],
          challengeContext,
        },
      });

      if (error || data?.limitReached || data?.aiLocked) {
        if (data) {
          applyUsageState(data);
        }

        if (data?.aiLocked) {
          setLimitReached(true);
          toast.error("AI guidance is locked on Plus. Upgrade to Pro for access.");
          return;
        }

        if (data?.limitReached || error?.message?.includes('limit')) {
          setLimitReached(true);
          setRemainingMessages(0);
          toast.error("You've used your free messages today. Upgrade to keep the conversation going.");
          if (onUpgrade && ((data?.planTier as PlanTier) ?? planTier) === 'free') {
            onUpgrade("ai_limit");
          }
          return;
        }

        if (error) {
          throw error;
        }
      }

      applyUsageState(data);

      setMessages(prev => [...prev, { role: 'assistant', content: data.message }]);
    } catch (error) {
      console.error('AI chat error:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: "I apologize, I'm having trouble connecting. Please try again in a moment." 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !limitReached && !aiLocked) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
        >
          <motion.div
            className="w-full max-w-lg bg-card border rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[80vh]"
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b bg-muted/30">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{emoji}</span>
                <div>
                  <h3 className="font-display font-semibold text-foreground">{title}</h3>
                  {challengeContext && (
                    <p className="text-xs text-muted-foreground">
                      Day {challengeContext.day}: {challengeContext.theme}
                    </p>
                  )}
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={handleClose}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[300px]">
              {messages.map((message, i) => (
                <motion.div
                  key={i}
                  className={cn(
                    "flex",
                    message.role === 'user' ? "justify-end" : "justify-start"
                  )}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div
                    className={cn(
                      "max-w-[85%] p-3 rounded-2xl text-sm",
                      message.role === 'user'
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-muted rounded-bl-md"
                    )}
                  >
                    {message.content}
                  </div>
                </motion.div>
              ))}
              {isLoading && (
                <motion.div
                  className="flex justify-start"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <div className="bg-muted p-3 rounded-2xl rounded-bl-md">
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t bg-muted/30">
              <div className="flex gap-2">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={aiLocked ? "AI locked on Plus" : limitReached ? "Daily limit reached" : "Type your message..."}
                  className="min-h-[44px] max-h-[120px] resize-none bg-background"
                  rows={1}
                  disabled={limitReached || aiLocked}
                />
                <Button
                  onClick={sendMessage}
                  disabled={!input.trim() || isLoading || limitReached || aiLocked}
                  size="icon"
                  className="shrink-0"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
              {(aiLocked || limitReached || remainingMessages <= 10) && (
                <div className="text-xs text-muted-foreground mt-2 text-center">
                  {aiLocked
                    ? "🔒 AI guidance is locked on Plus — upgrade to Pro"
                    : limitReached
                      ? "🔒 Monthly AI limit reached — resets on the 1st"
                      : planTier === 'free'
                        ? `${usedThisMonth} of ${monthlyLimit} this month`
                        : `${usedThisMonth} used this month (${remainingMessages} remaining)`
                  }
                </div>
              )}
              {limitReached && planTier === 'free' && onUpgrade && (
                <div className="mt-2 flex justify-center">
                  <Button size="sm" variant="outline" onClick={() => onUpgrade("ai_limit")}>
                    Upgrade to continue
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
