import { useAllowanceRefresh } from "@/hooks/useAllowanceRefresh";
import { useCoachConversation } from "@/hooks/useCoachConversation";
import { useHostedAiAllowance } from "@/hooks/useHostedAiAllowance";
import { AiAllowancePanel } from "@/components/billing/AiAllowancePanel";
import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Send, Zap, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { ALL_CONTROLLABLES, getControllableTheme } from "@/lib/controllableTheme";
import { getControllableRosterProfile } from "@/lib/controllableRoster";
import {
  AWARENESS_GUIDE_PROMPTS,
  AWARENESS_KEYWORDS,
} from "@/lib/awarenessLanguage";
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
    label: "Awareness: check in with God",
    prompt: AWARENESS_GUIDE_PROMPTS[0],
    controllable: "awareness",
  },
  {
    label: "Habit: give me the next move",
    prompt: "Give me the next move that matters most.",
    controllable: "habit",
  },
  {
    label: "Wellness: help me recover",
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

export const ControllableHub = (props: ControllableHubProps) => (
  <ControllableHubSession key={props.userId ?? "guest"} {...props} />
);

const ControllableHubSession = ({ userId, completedCount, onNavigate }: ControllableHubProps) => {
  const allowance = useHostedAiAllowance(userId);
  const allowanceRefresh = useAllowanceRefresh(allowance.refetch);
  const reducedMotion=useReducedMotion();
  const chatScrollRef=useRef<HTMLDivElement>(null);
  const conversation = useCoachConversation(userId);
  const { messages, setMessages, guide: chosenControllable, setGuide: setChosenControllable } = conversation;
  const [activeControllable, setActiveControllable] = useState<ControllableType | null>(chosenControllable ?? "awareness");
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  const activeTheme = activeControllable ? getControllableTheme(activeControllable) : null;
  const activeProfile = activeControllable ? getControllableRosterProfile(activeControllable) : null;

  useEffect(() => {
    chatScrollRef.current?.scrollTo({top:chatScrollRef.current.scrollHeight,behavior:"auto"});
  }, [messages]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  const detectControllable = useCallback((text: string): ControllableType => {
    const lower = text.toLowerCase();

    if (/\b(scattered|anxious|overwhelmed|spiritual|spirit|grief|worried|lonely|afraid)\b/.test(lower)) return "awareness";
    if (/\b(food|eat|lunch|dinner|breakfast|meal|log|steak|chicken|protein|calories|snack|drink|water)\b/.test(lower)) return "wellness";
    if (/\b(sleep|tired|energy|rest|hydrat|move|workout|exercise|run|gym|health)\b/.test(lower)) return "wellness";
    if (/\b(habit|rep|streak|routine|discipline|consistent|daily|skip|move)\b/.test(lower)) return "habit";
    if (new RegExp(`\\b(${AWARENESS_KEYWORDS.join("|")})\\b`).test(lower)) return "awareness";
    if (/\b(perspective|zoom out|big picture|long term|future|past|time|season|patient)\b/.test(lower)) return "perspective";
    if (/\b(environment|space|room|desk|phone|app|screen|trigger|design|setup|friction)\b/.test(lower)) return "environment";

    return "awareness";
  }, []);

  const sendMessage = useCallback(async (text: string, controllable: ControllableType) => {
    if (!text.trim() || isLoading || allowanceRefresh.failed) return;
    const a=allowance.data;
    if (!a || (a.byoActive ? a.byoRemaining<=0 : !a.enabled || a.repliesRemaining<=0 || a.dailyRemaining<=0 || a.budgetPercentRemaining<=0)) {
      toast({title:"Check your AI allowance",description:"Visit Billing for your limits and provider settings. Daily practice stays available."});return;
    }

    setActiveControllable(controllable);
    setChosenControllable(controllable);
    const userMessage: ChatMessage = { role: "user", content: text.trim() };
    const newMessages = [...messages, userMessage];

    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

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

      if (error) {
        const context=(error as {context?:Response}).context;
        if(context?.status===429) throw new Error("AI allowance reached or temporarily unavailable. See Billing for usage and reset details.");
        throw new Error("The coach could not connect. Your practices remain available.");
      }

      const reply = data?.reply || data?.message || "I'm here. Could you tell me a little more?";
      setMessages((previous) => [...previous, { role: "assistant", content: reply }]);


    } catch (error) {
      console.error("Chat error:", error);
      setMessages((previous) => [
        ...previous,
        { role: "assistant", content: error instanceof Error ? error.message : "The coach could not connect. Please check Billing." },
      ]);
    } finally {
      await allowanceRefresh.refresh();
      setIsLoading(false);
    }
  }, [isLoading, messages, toast, allowance, allowanceRefresh, setChosenControllable, setMessages]);

  const handleSend = useCallback(() => {
    if (!input.trim()) return;

    const controllable = chosenControllable || detectControllable(input);
    sendMessage(input, controllable);
  }, [chosenControllable, detectControllable, input, sendMessage]);

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
    ? activeControllable === "awareness"
      ? "Ask Awareness what feels true before God, what needs surrender, or what move comes next..."
      : `Ask ${activeProfile.name} what it sees, what it needs, or what move comes next...`
    : "Ask what needs charge right now...";

  return (
    <motion.div
      data-sentry-mask
      initial={reducedMotion ? false : { opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="ph-no-capture flex flex-col items-center py-4"
    >
      {userId ? <div className="mb-4 w-full max-w-sm space-y-1 px-1 text-xs text-muted-foreground">
        <label className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={conversation.remember} onChange={event => conversation.setRemember(event.target.checked)} />Keep this conversation in this tab</label>
        <p>{conversation.remember ? "Reload restores up to 50 messages in this tab for 24 hours. New conversation replaces them; signing out clears them. This is separate from AI memory." : "Off by default. Leaving or reloading this page clears this conversation unless you choose to keep it in this tab."}</p>
        {conversation.storageFailed ? <p role="alert">This browser could not save the conversation. Keep this page open to continue.</p> : null}
      </div> : null}
      {allowanceRefresh.failed ? (
        <div role="alert" className="mb-3 text-sm">
          <p>AI usage could not refresh. Retry before sending another message.</p>
          <Button variant="outline" disabled={allowanceRefresh.pending} onClick={() => void allowanceRefresh.refresh()}>Retry usage refresh</Button>
        </div>
      ) : <AiAllowancePanel compact userId={userId} allowance={allowance.data} unavailable={allowance.isError}/>}
      {completedCount > 0 && !hasConversation && (
        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: -10 }}
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
            <p className="text-sm font-semibold text-foreground">Charge your Controllables</p>
            <p className="text-xs text-muted-foreground">
              Awareness hosts your first conversation. Choose another guide, or let your first question route itself.
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
                  initial={reducedMotion ? false : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: reducedMotion ? 0 : index * 0.04, duration:reducedMotion?0:0.2 }}
                  whileTap={reducedMotion ? undefined : { scale: 0.98 }}
                  aria-pressed={isSelected}
                  onClick={() => { setActiveControllable(controllable); setChosenControllable(controllable); }}
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
          initial={reducedMotion ? false : { opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-3 flex items-center gap-2 rounded-full border border-border/60 bg-background/70 px-3 py-1.5"
        >
          <motion.span className="text-xl" layoutId={`avatar-${activeControllable}`}>
            {activeTheme.emoji}
          </motion.span>
          <span className={cn("text-sm font-semibold", activeTheme.textClass)}>{activeProfile.name}</span>
        </motion.div>
      )}

      {hasConversation && (
        <div ref={chatScrollRef} className="w-full max-w-sm space-y-2 max-h-[280px] overflow-y-auto px-1 mb-3 scrollbar-thin">
          <AnimatePresence initial={false}>
            {messages.map((message, index) => (
              <motion.div
                key={index}
                initial={reducedMotion ? false : { opacity: 0, y: 10 }}
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
              initial={reducedMotion ? false : { opacity: 0 }}
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
                initial={reducedMotion ? false : { opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                whileTap={reducedMotion ? undefined : { scale: 0.97 }}
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
          aria-label="Message to your coach"
          maxLength={4000}
          ref={textareaRef}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={selectedPrompt}
          className="flex-1 min-h-[44px] max-h-[120px] text-sm resize-none py-3"
          rows={1}
          disabled={isLoading || allowanceRefresh.failed}
        />
        <Button
          aria-label="Send message"
          size="icon"
          className="h-[44px] w-[44px] shrink-0 self-end"
          onClick={handleSend}
          disabled={!input.trim() || isLoading || allowanceRefresh.failed}
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>

      {hasConversation&&<Button variant="outline" className="mt-3 min-h-11" disabled={isLoading || allowanceRefresh.failed} onClick={()=>{setMessages([]);setInput("");setActiveControllable("awareness");setChosenControllable(null);}}>New conversation</Button>}

      {!hasConversation && (
        <p className="text-[10px] text-muted-foreground/60 mt-1.5">
          Coaching is optional. You choose what to share.
        </p>
      )}
    </motion.div>
  );
};
