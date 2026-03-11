import { useState } from "react";
import { motion } from "framer-motion";
import { MessageSquare } from "lucide-react";
import { AIChat } from "@/components/AIChat";

const CHIPS = [
  { label: "What should I protect today?", prompt: "Based on my body data, calendar load, and recent patterns — what should I protect today? What's most at risk?" },
  { label: "Explain today", prompt: "Explain my day today — what patterns do you see in my ring completions, and what should I take away from today?" },
  { label: "Forecast tomorrow", prompt: "Based on my recent patterns, what should I expect tomorrow? What's my biggest risk and best opportunity?" },
  { label: "Coach me now", prompt: "Give me a focused coaching session right now. Based on what you know about my patterns, what's the most impactful thing I can do in the next hour?" },
];

export const AskDashboardBar = () => {
  const [chatOpen, setChatOpen] = useState(false);
  const [preSeededPrompt, setPreSeededPrompt] = useState("");

  const handleChip = (prompt: string) => {
    setPreSeededPrompt(prompt);
    setChatOpen(true);
  };

  const handleInputClick = () => {
    setPreSeededPrompt("");
    setChatOpen(true);
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-border/50 bg-card/50 p-3"
      >
        <button
          onClick={handleInputClick}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-left"
        >
          <MessageSquare className="w-3.5 h-3.5 text-accent/60 shrink-0" />
          <span className="text-xs text-muted-foreground">Ask your Dashboard...</span>
        </button>

        <div className="flex gap-1.5 mt-2 overflow-x-auto scrollbar-none">
          {CHIPS.map((chip) => (
            <button
              key={chip.label}
              onClick={() => handleChip(chip.prompt)}
              className="shrink-0 px-2.5 py-1 rounded-full text-[10px] font-medium bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
            >
              {chip.label}
            </button>
          ))}
        </div>
      </motion.div>

      <AIChat
        controllable="awareness"
        emoji="🧠"
        title="Dashboard Intelligence"
        isOpen={chatOpen}
        onClose={() => {
          setChatOpen(false);
          setPreSeededPrompt("");
        }}
        challengeContext={preSeededPrompt ? { day: 0, theme: "", action: preSeededPrompt } : undefined}
      />
    </>
  );
};
