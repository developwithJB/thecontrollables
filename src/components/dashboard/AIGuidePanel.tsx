import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, ChevronDown, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

interface MainQuest {
  title: string;
  duration_days: number;
}

interface AIGuidePanelProps {
  activeQuest: MainQuest | null;
  totalXp: number;
  integrityScore: number | null;
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

const INITIAL_PROMPTS = [
  "I've been off track. Help me re-enter.",
  "What should I focus on today?",
  "I'm feeling stuck.",
];

export function AIGuidePanel({ activeQuest, totalXp, integrityScore }: AIGuidePanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = async (messageText: string) => {
    if (!messageText.trim() || isLoading) return;

    const userMessage: Message = { role: "user", content: messageText };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // Build context for the AI
      const context = {
        hasQuest: !!activeQuest,
        questTitle: activeQuest?.title || "No active quest",
        xp: totalXp,
        integrity: integrityScore,
      };

      const systemPrompt = `You are a calm, direct AI guide for The Controllables app. Your tone is:
- Calm and steady, never hype or motivation speak
- Direct without being harsh
- Non-judgmental about setbacks
- Focused on next actions, not lectures

The user's context:
- Quest: ${context.questTitle}
- XP (momentum): ${context.xp}
- Integrity score: ${context.integrity ?? "Not yet tracked"}

Core principles you embody:
- "You didn't lose progress. You paused the quest."
- Recovery matters more than perfection
- Reps over motivation
- Time is the most valuable currency
- Any build is viable

Keep responses under 3 sentences unless specifically asked for more. End with a clear next action when appropriate.`;

      const { data, error } = await supabase.functions.invoke("ai-chat", {
        body: {
          messages: [
            { role: "system", content: systemPrompt },
            ...messages.map((m) => ({ role: m.role, content: m.content })),
            { role: "user", content: messageText },
          ],
        },
      });

      if (error) throw error;

      const assistantMessage: Message = {
        role: "assistant",
        content: data.message || "I'm here to help. What's on your mind?",
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("AI chat error:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "I'm having trouble connecting right now. Take a breath, and try again in a moment.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
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
          <div className="p-2 rounded-xl bg-primary/10">
            <Bot className="w-5 h-5 text-primary" />
          </div>
          <div className="text-left">
            <h3 className="font-display font-semibold text-foreground">AI Guide</h3>
            <p className="text-sm text-muted-foreground">
              {messages.length > 0 ? "Conversation active" : "Ask anything"}
            </p>
          </div>
        </div>
        <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="w-5 h-5 text-muted-foreground" />
        </motion.div>
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
              {/* Messages */}
              {messages.length > 0 ? (
                <div className="space-y-3 max-h-64 overflow-y-auto mb-4 pr-2">
                  {messages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-xl text-sm ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground ml-8"
                          : "bg-muted text-foreground mr-8"
                      }`}
                    >
                      {msg.content}
                    </div>
                  ))}
                  {isLoading && (
                    <div className="bg-muted text-foreground p-3 rounded-xl mr-8 flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm">Thinking...</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="mb-4">
                  <p className="text-sm text-muted-foreground mb-3">Quick prompts:</p>
                  <div className="flex flex-wrap gap-2">
                    {INITIAL_PROMPTS.map((prompt) => (
                      <button
                        key={prompt}
                        onClick={() => sendMessage(prompt)}
                        className="text-xs px-3 py-1.5 rounded-full bg-muted hover:bg-muted/80 text-foreground transition-colors"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Input */}
              <div className="flex gap-2">
                <Input
                  placeholder="What's on your mind?"
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
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
