import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Zap, Loader2, UtensilsCrossed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { ALL_CONTROLLABLES, getControllableTheme } from "@/lib/controllableTheme";
import { getControllableRosterProfile } from "@/lib/controllableRoster";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import type { ControllableType } from "@/components/ControllableCard";

interface SuggestedPrompt {
  label: string;
  prompt: string;
  controllable: ControllableType;
}

const SUGGESTED_PROMPTS: SuggestedPrompt[] = [
  {
    label: "Scout: help me see what I'm missing",
    prompt: "Help me see what I'm missing today.",
    controllable: "awareness",
  },
  {
    label: "Builder: give me the next move",
    prompt: "Give me the next move that matters most.",
    controllable: "habit",
  },
  {
    label: "Charger: help me recover",
    prompt: "I feel off. Help me recover my energy.",
    controllable: "wellness",
  },
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
  const [activeControllable, setActiveControllable] = useState<ControllableType | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  const activeTheme = activeControllable ? getControllableTheme(activeControllable) : null;
  const activeProfile = activeControllable ? getControllableRosterProfile(activeControllable) : null;

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  const detectControllable = useCallback((text: string): ControllableType => {
    const lower = text.toLowerCase();

    if (/\b(food|eat|lunch|dinner|breakfast|meal|log|steak|chicken|protein|calories|snack|drink|water)\b/.test(lower)) return "wellness";
    if (/\b(sleep|tired|energy|rest|hydrat|move|workout|exercise|run|gym|health)\b/.test(lower)) return "wellness";
    if (/\b(habit|rep|streak|routine|discipline|consistent|daily|skip|move)\b/.test(lower)) return "habit";
    if (/\b(feel|anxious|stress|overwhelm|confus|think|mind|thought|notice|aware)\b/.test(lower)) return "awareness";
    if (/\b(perspective|zoom out|big picture|long term|future|past|time|season|patient)\b/.test(lower)) return "perspective";
    if (/\b(environment|space|room|desk|phone|app|screen|trigger|design|setup|friction)\b/.test(lower)) return "environment";

    return "awareness";
  }, []);

  const sendMessage = useCallback(async (text: string, controllable: ControllableType) => {
    if (!text.trim() || isLoading) return;

    setActiveControllable(controllable);
    const userMessage: ChatMessage = { role: "user", content: text.trim() };
    const newMessages = [...messages, userMessage];

    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    const isFoodLog =
      controllable === "wellness" &&
      /\b(log|ate|had|eat|lunch|dinner|breakfast|snack|steak|chicken|eggs|rice|salad|meal)\b/i.test(text);

    try {
      const { data, error } = await supabase.functions.invoke("ai-chat", {
        body: {
          controllable,
          messages: newMessages.map((message) => ({
            role: message.role,
            content: message.content,
          })),
        },
      });

      if (error) throw error;

      const reply = data?.reply || data?.message || "I'm here. Could you tell me a little more?";
      setMessages((previous) => [...previous, { role: "assistant", content: reply }]);

      if (isFoodLog) {
        toast({
          title: "Meal logged",
          description: "Your charger has the latest fuel check.",
          action: onNavigate ? (
            <Button
              variant="outline"
              size="sm"
              className="gap-1 h-7 text-xs"
              onClick={() => onNavigate("meal-tracker")}
            >
              <UtensilsCrossed className="w-3 h-3" />
              View Meals
            </Button>
          ) : undefined,
        });
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((previous) => [
        ...previous,
        { role: "assistant", content: "Sorry, I couldn't process that. Try again?" },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, messages, onNavigate, toast]);

  const handleSend = useCallback(() => {
    if (!input.trim()) return;

    const controllable = activeControllable || detectControllable(input);
    sendMessage(input, controllable);
  }, [activeControllable, detectControllable, input, sendMessage]);

  const handleSuggestion = useCallback((suggestion: SuggestedPrompt) => {
    setActiveControllable(suggestion.controllable);
    void sendMessage(suggestion.prompt, suggestion.controllable);
  }, [sendMessage]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const renderMessage = (content: string) => {
    const actionRegex = /\[action:([^\]:]+):([^\]]+)\]/g;
    const parts: (string | { label: string; destination: string })[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = actionRegex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push(content.slice(lastIndex, match.index));
      }

      parts.push({ label: match[1], destination: match[2] });
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < content.length) {
      parts.push(content.slice(lastIndex));
    }

    return (
      <>
        {parts.map((part, index) =>
          typeof part === "string" ? (
            <span key={index} className="whitespace-pre-wrap">
              {part}
            </span>
          ) : (
            <Button
              key={index}
              size="sm"
              variant="outline"
              className="mx-1 h-6 text-[10px] px-2"
              onClick={() => onNavigate?.(part.destination)}
            >
              {part.label}
            </Button>
          ),
        )}
      </>
    );
  };

  const hasConversation = messages.length > 0;
  const selectedPrompt = activeProfile
    ? `Ask your ${activeProfile.role} what it sees, what it needs, or what move comes next...`
    : "Ask your team what's needed right now...";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center py-4"
    >
      {completedCount > 0 && !hasConversation && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-1 text-xs text-muted-foreground mb-3"
        >
          <Zap className="w-3 h-3 text-accent" />
          {completedCount} move{completedCount !== 1 ? "s" : ""} completed today
        </motion.div>
      )}

      {!hasConversation && (
        <div className="w-full max-w-sm space-y-3 mb-4 px-1">
          <div className="text-center space-y-1">
            <p className="text-sm font-semibold text-foreground">Your starter team</p>
            <p className="text-xs text-muted-foreground">
              Each Controllable covers a different part of the day. Tap one to lead, or let your question route itself.
            </p>
          </div>

          <div className="space-y-2">
            {ALL_CONTROLLABLES.map((controllable, index) => {
              const theme = getControllableTheme(controllable);
              const profile = getControllableRosterProfile(controllable);
              const isSelected = activeControllable === controllable;

              return (
                <motion.button
                  key={controllable}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.04 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setActiveControllable(controllable)}
                  className={cn(
                    "w-full rounded-xl border px-3 py-3 text-left transition-all",
                    isSelected
                      ? `border-current ${theme.bgClass} ${theme.textClass}`
                      : "border-border/50 bg-card hover:border-accent/40 hover:bg-muted/40",
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", theme.bgClass)}>
                      <span className="text-lg" aria-hidden="true">
                        {theme.emoji}
                      </span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={cn("text-sm font-semibold", theme.textClass)}>{theme.label}</span>
                        <span className="rounded-full bg-background/80 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                          {profile.roleLabel}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                        {profile.shortDescription}
                      </p>
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>
      )}

      {hasConversation && activeTheme && activeProfile && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-3 flex items-center gap-2 rounded-full border border-border/60 bg-background/70 px-3 py-1.5"
        >
          <motion.span className="text-xl" layoutId={`avatar-${activeControllable}`}>
            {activeTheme.emoji}
          </motion.span>
          <div className="flex items-center gap-2">
            <span className={cn("text-sm font-semibold", activeTheme.textClass)}>{activeTheme.label}</span>
            <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              {activeProfile.roleLabel}
            </span>
          </div>
        </motion.div>
      )}

      {hasConversation && (
        <div className="w-full max-w-sm space-y-2 max-h-[280px] overflow-y-auto px-1 mb-3 scrollbar-thin">
          <AnimatePresence initial={false}>
            {messages.map((message, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "text-sm px-3 py-2 rounded-xl max-w-[85%]",
                  message.role === "user"
                    ? "ml-auto bg-primary text-primary-foreground"
                    : "bg-muted text-foreground",
                )}
              >
                {message.role === "assistant" ? renderMessage(message.content) : message.content}
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

      {!hasConversation && (
        <div className="w-full max-w-sm space-y-2 mb-4 px-1">
          <p className="text-xs text-muted-foreground text-center mb-2">Try a clean starting prompt:</p>
          <div className="flex flex-col gap-1.5">
            {SUGGESTED_PROMPTS.map((suggestion, index) => (
              <motion.button
                key={`${suggestion.controllable}-${index}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => handleSuggestion(suggestion)}
                className="flex items-center gap-2 text-left px-3 py-2.5 rounded-xl border border-border/50 bg-card hover:border-accent/50 hover:bg-accent/5 transition-colors text-sm"
              >
                <span className="text-foreground/80">{suggestion.label}</span>
              </motion.button>
            ))}
          </div>
        </div>
      )}

      <div className="w-full max-w-sm flex gap-2 px-1">
        <Textarea
          ref={textareaRef}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={selectedPrompt}
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
        <p className="text-[10px] text-muted-foreground/60 mt-1.5">
          {userId ? "Your team will keep learning from your moves." : "Your team gets sharper as you use the app."}
        </p>
      )}
    </motion.div>
  );
};
