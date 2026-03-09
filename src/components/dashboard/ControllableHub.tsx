import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Zap, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type ControllableKey = "awareness" | "perspective" | "habit" | "wellness" | "environment";

interface Controllable {
  key: ControllableKey;
  emoji: string;
  label: string;
  color: string;
}

const CONTROLLABLES: Controllable[] = [
  { key: "awareness", emoji: "🦉", label: "Awareness", color: "text-awareness" },
  { key: "perspective", emoji: "🐢", label: "Perspective", color: "text-perspective" },
  { key: "habit", emoji: "🦈", label: "Habit", color: "text-habit" },
  { key: "wellness", emoji: "🛰️", label: "Wellness", color: "text-wellness" },
  { key: "environment", emoji: "🚀", label: "Environment", color: "text-environment" },
];

interface SuggestedPrompt {
  emoji: string;
  label: string;
  prompt: string;
  controllable: ControllableKey;
}

const SUGGESTED_PROMPTS: SuggestedPrompt[] = [
  { emoji: "🛰️", label: "Log my lunch", prompt: "I want to log my lunch", controllable: "wellness" },
  { emoji: "🦈", label: "What's my next rep?", prompt: "What's my next rep?", controllable: "habit" },
  { emoji: "🦉", label: "Help me see what's really going on", prompt: "Help me see what's really going on", controllable: "awareness" },
];

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ControllableHubProps {
  userId?: string;
  completedCount: number;
  onNavigate?: (destination: string) => void;
}

export const ControllableHub = ({ userId, completedCount, onNavigate }: ControllableHubProps) => {
  const [activeControllable, setActiveControllable] = useState<ControllableKey | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const activeC = CONTROLLABLES.find((c) => c.key === activeControllable);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + "px";
    }
  }, [input]);

  // Detect which controllable should handle a freeform message
  const detectControllable = useCallback((text: string): ControllableKey => {
    const lower = text.toLowerCase();
    if (/\b(food|eat|lunch|dinner|breakfast|meal|log|steak|chicken|protein|calories|snack|drink|water)\b/.test(lower)) return "wellness";
    if (/\b(sleep|tired|energy|rest|hydrat|move|workout|exercise|run|gym|health)\b/.test(lower)) return "wellness";
    if (/\b(habit|rep|streak|routine|discipline|consistent|daily|skip)\b/.test(lower)) return "habit";
    if (/\b(feel|anxious|stress|overwhelm|confus|think|mind|thought|notice|aware)\b/.test(lower)) return "awareness";
    if (/\b(perspective|zoom out|big picture|long term|future|past|time|season|patient)\b/.test(lower)) return "perspective";
    if (/\b(environment|space|room|desk|phone|app|screen|trigger|design|setup|friction)\b/.test(lower)) return "environment";
    return "awareness"; // default
  }, []);

  const sendMessage = useCallback(async (text: string, controllable: ControllableKey) => {
    if (!text.trim() || isLoading) return;

    setActiveControllable(controllable);
    const userMsg: ChatMessage = { role: "user", content: text.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("ai-chat", {
        body: {
          controllable,
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
        },
      });

      if (error) throw error;
      const reply = data?.reply || data?.message || "I'm here. Could you tell me more?";
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (err) {
      console.error("Chat error:", err);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I couldn't process that. Try again?" },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [messages, isLoading]);

  const handleSend = useCallback(() => {
    if (!input.trim()) return;
    const controllable = activeControllable || detectControllable(input);
    sendMessage(input, controllable);
  }, [input, activeControllable, detectControllable, sendMessage]);

  const handleSuggestion = useCallback((suggestion: SuggestedPrompt) => {
    sendMessage(suggestion.prompt, suggestion.controllable);
  }, [sendMessage]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  // Parse action buttons from AI response
  const renderMessage = (content: string) => {
    const actionRegex = /\[action:([^\]:]+):([^\]]+)\]/g;
    const parts: (string | { label: string; destination: string })[] = [];
    let lastIdx = 0;
    let match;

    while ((match = actionRegex.exec(content)) !== null) {
      if (match.index > lastIdx) parts.push(content.slice(lastIdx, match.index));
      parts.push({ label: match[1], destination: match[2] });
      lastIdx = match.index + match[0].length;
    }
    if (lastIdx < content.length) parts.push(content.slice(lastIdx));

    return (
      <>
        {parts.map((part, i) =>
          typeof part === "string" ? (
            <span key={i} className="whitespace-pre-wrap">{part}</span>
          ) : (
            <Button
              key={i}
              size="sm"
              variant="outline"
              className="mx-1 h-6 text-[10px] px-2"
              onClick={() => onNavigate?.(part.destination)}
            >
              {part.label}
            </Button>
          )
        )}
      </>
    );
  };

  const hasConversation = messages.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center py-4"
    >
      {/* Completed actions badge */}
      {completedCount > 0 && !hasConversation && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-1 text-xs text-muted-foreground mb-3"
        >
          <Zap className="w-3 h-3 text-accent" />
          {completedCount} action{completedCount !== 1 ? "s" : ""} completed today
        </motion.div>
      )}

      {/* Small decorative avatar row */}
      {!hasConversation && (
        <div className="flex justify-center gap-2 mb-4">
          {CONTROLLABLES.map((c, i) => (
            <motion.div
              key={c.key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="flex flex-col items-center gap-0.5"
            >
              <motion.span
                className="text-lg"
                animate={{ y: [0, -2, 0] }}
                transition={{ repeat: Infinity, duration: 2 + i * 0.3, ease: "easeInOut" }}
              >
                {c.emoji}
              </motion.span>
              <span className={cn("text-[8px] font-medium", c.color)}>{c.label}</span>
            </motion.div>
          ))}
        </div>
      )}

      {/* Active controllable header during chat */}
      {hasConversation && activeC && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center gap-2 mb-3"
        >
          <motion.span className="text-2xl" layoutId={`avatar-${activeC.key}`}>
            {activeC.emoji}
          </motion.span>
          <span className={cn("text-sm font-semibold", activeC.color)}>{activeC.label}</span>
        </motion.div>
      )}

      {/* Chat messages */}
      {hasConversation && (
        <div className="w-full max-w-sm space-y-2 max-h-[280px] overflow-y-auto px-1 mb-3 scrollbar-thin">
          <AnimatePresence initial={false}>
            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "text-sm px-3 py-2 rounded-xl max-w-[85%]",
                  msg.role === "user"
                    ? "ml-auto bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                )}
              >
                {msg.role === "assistant" ? renderMessage(msg.content) : msg.content}
              </motion.div>
            ))}
          </AnimatePresence>
          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2 text-xs text-muted-foreground px-3 py-2"
            >
              <Loader2 className="w-3 h-3 animate-spin" />
              Thinking...
            </motion.div>
          )}
          <div ref={chatEndRef} />
        </div>
      )}

      {/* Suggested prompts — only before conversation starts */}
      {!hasConversation && (
        <div className="w-full max-w-sm space-y-2 mb-4 px-1">
          <p className="text-xs text-muted-foreground text-center mb-2">Try asking:</p>
          <div className="flex flex-col gap-1.5">
            {SUGGESTED_PROMPTS.map((s) => (
              <motion.button
                key={s.controllable}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => handleSuggestion(s)}
                className="flex items-center gap-2 text-left px-3 py-2.5 rounded-xl border border-border/50 bg-card hover:border-accent/50 hover:bg-accent/5 transition-colors text-sm"
              >
                <span className="text-base shrink-0">{s.emoji}</span>
                <span className="text-foreground/80">{s.label}</span>
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {/* Always-visible chat input */}
      <div className="w-full max-w-sm flex gap-2 px-1">
        <Textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask the Controllables..."
          className="flex-1 min-h-[44px] max-h-[120px] text-sm resize-none py-3"
          rows={1}
          disabled={isLoading}
        />
        <Button
          size="icon"
          className="h-[44px] w-[44px] shrink-0 self-end"
          onClick={handleSend}
          disabled={!input.trim() || isLoading}
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
      {!hasConversation && (
        <p className="text-[10px] text-muted-foreground/60 mt-1.5">or type your own question</p>
      )}
    </motion.div>
  );
};
