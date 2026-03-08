import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { getArchetypeInfo, getArchetypeThemeColors } from "@/lib/build";
import type { BuildScore } from "@/lib/build";
import { ArrowRight, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface OnboardingArchetypeResultProps {
  buildResult: BuildScore;
  onContinue: () => void;
}

const CONTROLLABLE_LABELS: Record<string, { name: string; emoji: string }> = {
  awareness: { name: "Awareness", emoji: "🦉" },
  perspective: { name: "Perspective", emoji: "🐢" },
  habit: { name: "Habit", emoji: "🦈" },
  wellness: { name: "Wellness", emoji: "🛰️" },
  environment: { name: "Environment", emoji: "🚀" },
};

export function OnboardingArchetypeResult({
  buildResult,
  onContinue,
}: OnboardingArchetypeResultProps) {
  const archetypeInfo = getArchetypeInfo(buildResult.build_archetype_key);
  const themeColors = getArchetypeThemeColors(buildResult.build_archetype_key);
  const [aiInterpretation, setAiInterpretation] = useState<{ text: string; emoji: string; name: string } | null>(null);
  const [isLoadingAI, setIsLoadingAI] = useState(true);

  // Find weakest controllable to "speak" the interpretation
  const scoresArr = [
    { key: "awareness", value: Number(buildResult.awareness) },
    { key: "perspective", value: Number(buildResult.perspective) },
    { key: "habit", value: Number(buildResult.habit) },
    { key: "wellness", value: Number(buildResult.wellness) },
    { key: "environment", value: Number(buildResult.environment) },
  ];
  const weakest = scoresArr.reduce((a, b) => (a.value < b.value ? a : b));
  const weakestLabel = CONTROLLABLE_LABELS[weakest.key];

  useEffect(() => {
    const fetchInterpretation = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const scoresText = scoresArr.map(s => `${s.key}: ${s.value.toFixed(1)}/4`).join(', ');
        const res = await supabase.functions.invoke('ai-reflect', {
          body: {
            reflection: `Build Assessment complete. Archetype: ${buildResult.build_archetype_key}. Scores: ${scoresText}. Weakest area: ${weakest.key}.`,
            dayNumber: 1,
            controllable: weakest.key,
          },
        });

        if (res.data?.message) {
          setAiInterpretation({
            text: res.data.message,
            emoji: weakestLabel.emoji,
            name: weakestLabel.name,
          });
        }
      } catch (e) {
        console.warn('AI interpretation failed, using static fallback:', e);
      } finally {
        setIsLoadingAI(false);
      }
    };
    fetchInterpretation();
  }, []);

  // Build score bars
  const scores = [
    { key: "awareness", value: Number(buildResult.awareness) },
    { key: "perspective", value: Number(buildResult.perspective) },
    { key: "habit", value: Number(buildResult.habit) },
    { key: "wellness", value: Number(buildResult.wellness) },
    { key: "environment", value: Number(buildResult.environment) },
  ];

  // Find lowest score for emphasis
  const lowestScore = Math.min(...scores.map((s) => s.value));

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen flex flex-col px-6 py-12"
    >
      <div className="max-w-md mx-auto w-full flex-1 flex flex-col">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
            className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mx-auto mb-4"
          >
            <Sparkles className="w-8 h-8 text-primary" />
          </motion.div>
          <p className="text-sm text-muted-foreground mb-1">Your Build Archetype</p>
          <h1 className="font-display text-2xl font-bold text-foreground">
            {archetypeInfo.label}
          </h1>
        </motion.div>

        {/* Archetype description */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className={`p-5 rounded-xl mb-6 ${themeColors.bg} border ${themeColors.border}`}
        >
          <p className="text-foreground leading-relaxed">
            {archetypeInfo.description}
          </p>
        </motion.div>

        {/* Score breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-3 mb-8"
        >
          <h3 className="text-sm font-medium text-muted-foreground mb-3">
            Your Controllables
          </h3>
          {scores.map((score, index) => {
            const label = CONTROLLABLE_LABELS[score.key];
            const isLowest = score.value === lowestScore;
            const percentage = (score.value / 4) * 100;

            return (
              <motion.div
                key={score.key}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + index * 0.1 }}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span>{label.emoji}</span>
                    <span className={`text-sm ${isLowest ? "font-medium text-foreground" : "text-muted-foreground"}`}>
                      {label.name}
                    </span>
                    {isLowest && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                        Focus area
                      </span>
                    )}
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {score.value.toFixed(1)}/4
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ delay: 0.6 + index * 0.1, duration: 0.5 }}
                    className={`h-full rounded-full ${
                      isLowest ? "bg-primary" : "bg-primary/50"
                    }`}
                  />
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* AI interpretation or static fallback */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="p-5 rounded-xl bg-card border border-border mb-8"
        >
          <AnimatePresence mode="wait">
            {isLoadingAI ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-3"
              >
                <span className="text-3xl shrink-0">{weakestLabel.emoji}</span>
                <div>
                  <p className="text-sm text-muted-foreground">
                    {weakestLabel.name} is reading your results
                    {[0, 1, 2].map((i) => (
                      <motion.span
                        key={i}
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                        className="inline-block"
                      >
                        .
                      </motion.span>
                    ))}
                  </p>
                </div>
              </motion.div>
            ) : aiInterpretation ? (
              <motion.div
                key="interpretation"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-start gap-3"
              >
                <span className="text-3xl shrink-0">{aiInterpretation.emoji}</span>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1.5">
                    {aiInterpretation.name} says
                  </p>
                  <p className="text-foreground text-sm leading-relaxed italic">
                    "{aiInterpretation.text}"
                  </p>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="fallback"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <p className="text-sm text-muted-foreground mb-2">What this means</p>
                <p className="text-foreground text-sm leading-relaxed">
                  {archetypeInfo.recommendations[0]}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Continue button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
          className="mt-auto"
        >
          <Button onClick={onContinue} className="w-full h-14 text-lg">
            Pick Your Snapshot
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
          <p className="text-xs text-muted-foreground text-center mt-3">
            You can retake this assessment anytime
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
}
