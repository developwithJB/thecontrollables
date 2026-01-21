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
}

const DAILY_MESSAGE_LIMIT = 25;

const WELCOME_MESSAGES: Record<string, string> = {
  awareness: "Hello, I am the Owl 🦉. I help you see things clearly, as they truly are. What's weighing on your mind today?",
  perspective: "Greetings, I am the Turtle 🐢. I teach the power of patience and perspective. What situation would you like to pause and reflect on?",
  habit: "I'm the Shark 🦈. I keep moving, always forward. What action do you want to take today? Let's build momentum.",
  wellness: "I am the Satellite 🛰️, monitoring your systems. How are your batteries today—Sleep, Movement, Nutrition?",
  environment: "Welcome, I am the Rocket 🚀. Your environment is your fuel. Tell me about the people around you.",
  ego: "I am the Ego Scanner 👺. I catch the lies your ego tells you. What thought has been bothering you lately?",
};

export function AIChat({ controllable, emoji, title, isOpen, onClose, challengeContext }: AIChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [remainingMessages, setRemainingMessages] = useState<number>(DAILY_MESSAGE_LIMIT);
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

  const sendMessage = async () => {
    if (!input.trim() || isLoading || limitReached) return;

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

      if (error) {
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
    if (e.key === 'Enter' && !e.shiftKey && !limitReached) {
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
                  placeholder={limitReached ? "Daily limit reached" : "Type your message..."}
                  className="min-h-[44px] max-h-[120px] resize-none bg-background"
                  rows={1}
                  disabled={limitReached}
                />
                <Button
                  onClick={sendMessage}
                  disabled={!input.trim() || isLoading || limitReached}
                  size="icon"
                  className="shrink-0"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
              {(limitReached || remainingMessages <= 10) && (
                <div className="text-xs text-muted-foreground mt-2 text-center">
                  {limitReached 
                    ? "🔒 Daily limit reached — resets at midnight" 
                    : `${remainingMessages} message${remainingMessages !== 1 ? 's' : ''} remaining today`
                  }
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
