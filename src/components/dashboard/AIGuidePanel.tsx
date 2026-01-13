import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { UserBuildCurrent, getArchetypeInfo } from "@/hooks/useBuildAssessment";

interface MainQuest {
  title: string;
  duration_days: number;
}

interface AIGuidePanelProps {
  activeQuest: MainQuest | null;
  totalXp: number;
  integrityScore: number | null;
  currentBuild?: UserBuildCurrent | null;
}

interface Message {
  role: "user" | "assistant";
  content: string;
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
      "My mind is racing right now.",
      "Help me see what's true.",
      "I'm reacting, not responding.",
    ],
  },
  {
    id: "perspective",
    name: "Perspective",
    emoji: "🐢",
    tagline: "Zoom out. This is one chapter.",
    color: "from-emerald-500/20 to-emerald-600/10",
    prompts: [
      "I feel like a failure today.",
      "Everything feels too big.",
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
      "I don't feel motivated.",
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
      "My energy is low.",
      "Am I taking care of myself?",
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
      "Who should I spend time with?",
      "What's holding me back?",
    ],
  },
];

export function AIGuidePanel({ activeQuest, totalXp, integrityScore, currentBuild }: AIGuidePanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedGuide, setSelectedGuide] = useState<Guide | null>(null);
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
          controllable: selectedGuide?.id,
          messages: [...messages, userMessage].map((m) => ({ role: m.role, content: m.content })),
          userContext,
          buildContext,
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

  const handleGuideSelect = (guide: Guide) => {
    setSelectedGuide(guide);
    setMessages([]);
  };

  const handleBack = () => {
    setSelectedGuide(null);
    setMessages([]);
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
              {selectedGuide ? `${selectedGuide.name} Guide` : "AI Guides"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {selectedGuide 
                ? selectedGuide.tagline 
                : messages.length > 0 
                  ? "Conversation active" 
                  : "Choose your guide"
              }
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
              {!selectedGuide ? (
                /* Guide Selection */
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground mb-3">
                    Each guide embodies a Controllable. Choose based on what you need right now.
                  </p>
                  {GUIDES.map((guide) => (
                    <motion.button
                      key={guide.id}
                      onClick={() => handleGuideSelect(guide)}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      className={`w-full p-3 rounded-xl bg-gradient-to-r ${guide.color} border transition-all hover:border-primary/30 text-left`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{guide.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-foreground">{guide.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{guide.tagline}</p>
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </div>
              ) : (
                /* Chat Interface */
                <>
                  {/* Back Button */}
                  <button
                    onClick={handleBack}
                    className="text-xs text-muted-foreground hover:text-foreground mb-3 flex items-center gap-1"
                  >
                    ← Choose different guide
                  </button>

                  {/* Guide Header */}
                  <div className={`p-3 rounded-xl bg-gradient-to-r ${selectedGuide.color} border mb-4`}>
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{selectedGuide.emoji}</span>
                      <div>
                        <p className="font-medium text-sm text-foreground">{selectedGuide.name}</p>
                        <p className="text-xs text-muted-foreground">{selectedGuide.tagline}</p>
                      </div>
                    </div>
                  </div>

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
                          {msg.role === "assistant" && (
                            <span className="mr-2">{selectedGuide.emoji}</span>
                          )}
                          {msg.content}
                        </div>
                      ))}
                      {isLoading && (
                        <div className="bg-muted text-foreground p-3 rounded-xl mr-8 flex items-center gap-2">
                          <span>{selectedGuide.emoji}</span>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span className="text-sm">Thinking...</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="mb-4">
                      <p className="text-sm text-muted-foreground mb-3">Start with a prompt:</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedGuide.prompts.map((prompt) => (
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
                      placeholder={`Ask ${selectedGuide.name}...`}
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
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
