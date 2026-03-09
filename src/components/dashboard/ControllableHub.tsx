import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, ArrowLeft, Zap, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type ControllableKey = "awareness" | "perspective" | "habit" | "wellness" | "environment";

interface Controllable {
  key: ControllableKey;
  emoji: string;
  label: string;
  color: string;
  greeting: string;
}

const CONTROLLABLES: Controllable[] = [
  { key: "awareness", emoji: "🦉", label: "Awareness", color: "text-awareness", greeting: "What's on your mind? I can help you see things clearly." },
  { key: "perspective", emoji: "🐢", label: "Perspective", color: "text-perspective", greeting: "Let's slow down and look at the bigger picture." },
  { key: "habit", emoji: "🦈", label: "Habit", color: "text-habit", greeting: "Ready to move? Tell me what you want to build or track." },
  { key: "wellness", emoji: "🛰️", label: "Wellness", color: "text-wellness", greeting: "I can help you log food, check your fuel levels, or review your health data." },
  { key: "environment", emoji: "🚀", label: "Environment", color: "text-environment", greeting: "Let's optimize your surroundings. What needs to change?" },
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
  const [focused, setFocused] = useState<ControllableKey | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const focusedControllable = CONTROLLABLES.find((c) => c.key === focused);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when controllable is selected
  useEffect(() => {
    if (focused) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [focused]);

  const handleSelect = useCallback((key: ControllableKey) => {
    const c = CONTROLLABLES.find((x) => x.key === key)!;
    setFocused(key);
    setMessages([{ role: "assistant", content: c.greeting }]);
    setInput("");
  }, []);

  const handleBack = useCallback(() => {
    setFocused(null);
    setMessages([]);
    setInput("");
  }, []);

  const handleSend = useCallback(async () => {
    if (!input.trim() || !focused || isLoading) return;

    const userMsg: ChatMessage = { role: "user", content: input.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("ai-chat", {
        body: {
          controllable: focused,
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
        },
      });

      if (error) throw error;

      const reply = data?.reply || data?.message || "I'm here to help. Could you tell me more?";
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
  }, [input, focused, messages, isLoading]);

  // Parse action buttons from AI response (format: [action:label:destination])
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
            <span key={i}>{part}</span>
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

  // Hub view — 5 controllable avatars
  if (!focused) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center py-8"
      >
        {completedCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-1 text-xs text-muted-foreground mb-4"
          >
            <Zap className="w-3 h-3 text-accent" />
            {completedCount} action{completedCount !== 1 ? "s" : ""} completed today
          </motion.div>
        )}

        <h2 className="font-display text-lg font-semibold text-foreground mb-1">
          Ask The Controllables
        </h2>
        <p className="text-xs text-muted-foreground mb-6 max-w-xs text-center">
          Tap a guide to chat. They can help you log, plan, or navigate.
        </p>

        <div className="flex justify-center gap-3 flex-wrap">
          {CONTROLLABLES.map((c, i) => (
            <motion.button
              key={c.key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleSelect(c.key)}
              className="flex flex-col items-center gap-1 p-3 rounded-xl border border-border/50 bg-card hover:border-accent/50 transition-colors min-w-[64px]"
            >
              <motion.span
                className="text-2xl"
                animate={{ y: [0, -3, 0] }}
                transition={{ repeat: Infinity, duration: 2 + i * 0.3, ease: "easeInOut" }}
              >
                {c.emoji}
              </motion.span>
              <span className={cn("text-[9px] font-medium", c.color)}>{c.label}</span>
            </motion.button>
          ))}
        </div>
      </motion.div>
    );
  }

  // Chat view — focused controllable + inline chat
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center py-4"
    >
      {/* Header */}
      <div className="flex items-center gap-2 w-full max-w-sm mb-4">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleBack}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <motion.span
          initial={{ scale: 0.5 }}
          animate={{ scale: 1 }}
          className="text-2xl"
        >
          {focusedControllable?.emoji}
        </motion.span>
        <div>
          <span className={cn("text-sm font-semibold", focusedControllable?.color)}>
            {focusedControllable?.label}
          </span>
        </div>
      </div>

      {/* Chat messages */}
      <div className="w-full max-w-sm space-y-2 max-h-[240px] overflow-y-auto px-1 mb-3 scrollbar-thin">
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

      {/* Input */}
      <div className="w-full max-w-sm flex gap-2">
        <Input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder={`Ask ${focusedControllable?.label}...`}
          className="flex-1 h-9 text-sm"
          disabled={isLoading}
        />
        <Button
          size="icon"
          className="h-9 w-9 shrink-0"
          onClick={handleSend}
          disabled={!input.trim() || isLoading}
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </motion.div>
  );
};
