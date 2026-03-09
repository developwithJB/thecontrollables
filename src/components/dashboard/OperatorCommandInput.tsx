import { useState } from "react";
import { motion } from "framer-motion";
import { Send, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";

const PRESET_COMMANDS = [
  { label: "Replan", command: "replan my day" },
  { label: "Simplify", command: "simplify today" },
  { label: "What's missing?", command: "what am I missing" },
  { label: "Prep tomorrow", command: "prep tomorrow" },
  { label: "I feel off", command: "I feel off" },
];

interface OperatorCommandInputProps {
  onSendCommand: (command: string) => void;
  isLoading: boolean;
}

export function OperatorCommandInput({
  onSendCommand,
  isLoading,
}: OperatorCommandInputProps) {
  const [input, setInput] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSendCommand(input.trim());
      setInput("");
    }
  };

  return (
    <div className="space-y-2">
      {/* Preset command chips */}
      <div className="flex flex-wrap gap-1.5">
        {PRESET_COMMANDS.map((preset) => (
          <motion.button
            key={preset.command}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              if (!isLoading) onSendCommand(preset.command);
            }}
            disabled={isLoading}
            className="px-2.5 py-1 text-[11px] font-medium rounded-full border bg-muted/50 text-muted-foreground hover:bg-accent/10 hover:text-accent-foreground hover:border-accent/30 transition-all disabled:opacity-50"
          >
            {preset.label}
          </motion.button>
        ))}
      </div>

      {/* Free-text input */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask the operator anything..."
          className="text-sm h-8"
          disabled={isLoading}
        />
        <motion.button
          whileTap={{ scale: 0.9 }}
          type="submit"
          disabled={!input.trim() || isLoading}
          className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40 transition-opacity"
        >
          {isLoading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Send className="w-3.5 h-3.5" />
          )}
        </motion.button>
      </form>
    </div>
  );
}
