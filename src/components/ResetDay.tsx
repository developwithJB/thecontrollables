import { useState } from "react";
import { motion } from "framer-motion";
import { getDayContent } from "@/lib/resetContent";
import { ProgressDots } from "./ProgressDots";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

interface ResetDayProps {
  dayNumber: number;
  completedDays: number;
  onComplete: (data: { reflection?: string; commitment?: string; release?: string }) => void;
  isCompleting: boolean;
}

export const ResetDay = ({ dayNumber, completedDays, onComplete, isCompleting }: ResetDayProps) => {
  const content = getDayContent(dayNumber);
  const [reflection, setReflection] = useState("");
  const [commitment, setCommitment] = useState(content.suggestedCommitment);

  const handleSubmit = () => {
    onComplete({
      reflection: reflection.trim() || undefined,
      commitment: commitment.trim() || content.suggestedCommitment,
      release: content.releasePrompt,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="min-h-screen flex flex-col px-6 py-8 max-w-md mx-auto"
    >
      {/* Header */}
      <div className="text-center mb-8">
        <p className="text-muted-foreground text-sm mb-2">Day {dayNumber} of 7</p>
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring" }}
          className="text-5xl mb-3"
        >
          {content.emoji}
        </motion.div>
        <h1 className="text-2xl font-semibold text-foreground">"{content.theme}"</h1>
        <p className="text-muted-foreground text-sm mt-1">{content.controllable}</p>
      </div>

      {/* Content */}
      <div className="flex-1 space-y-6">
        {/* REFLECT */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-2"
        >
          <label className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
            Reflect
          </label>
          <p className="text-foreground text-lg leading-relaxed">
            "{content.reflectionQuestion}"
          </p>
          <Textarea
            value={reflection}
            onChange={(e) => setReflection(e.target.value)}
            placeholder="Take a moment to reflect..."
            className="min-h-[80px] resize-none bg-muted/50 border-muted"
          />
        </motion.div>

        {/* COMMIT */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-2"
        >
          <label className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
            Commit
          </label>
          <Textarea
            value={commitment}
            onChange={(e) => setCommitment(e.target.value)}
            placeholder={content.suggestedCommitment}
            className="min-h-[60px] resize-none bg-muted/50 border-muted"
          />
        </motion.div>

        {/* RELEASE */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="space-y-2"
        >
          <label className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
            Release
          </label>
          <p className="text-foreground/80 italic text-lg">
            "{content.releasePrompt}"
          </p>
        </motion.div>
      </div>

      {/* Footer */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="mt-8 space-y-6"
      >
        <Button
          onClick={handleSubmit}
          disabled={isCompleting}
          className="w-full h-14 text-lg font-medium"
          size="lg"
        >
          {isCompleting ? "Saving..." : "I'm Ready"}
        </Button>

        <ProgressDots totalDays={7} currentDay={dayNumber} completedDays={completedDays} />
      </motion.div>
    </motion.div>
  );
};
