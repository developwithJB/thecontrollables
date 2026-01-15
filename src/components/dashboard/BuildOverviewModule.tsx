import { useState } from "react";
import { motion } from "framer-motion";
import { Dna, RefreshCw, Info, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useBuildAssessment } from "@/hooks/useBuildAssessment";
import { getArchetypeInfo } from "@/lib/build";
import { BuildAssessmentModal } from "./BuildAssessmentModal";
import { BuildCard } from "./BuildCard";

const BASE_STATS = [
  { key: "awareness", label: "Awareness", emoji: "🦉" },
  { key: "perspective", label: "Perspective", emoji: "🐢" },
  { key: "habit", label: "Habit", emoji: "🦈" },
  { key: "wellness", label: "Wellness", emoji: "🛰️" },
  { key: "environment", label: "Environment", emoji: "🚀" },
] as const;

export function BuildOverviewModule() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  
  const {
    questions,
    questionsLoading,
    currentBuild,
    buildLoading,
    submitAssessment,
    isSubmitting,
  } = useBuildAssessment();

  const hasBuild = currentBuild && currentBuild.overall > 0;
  const archetypeInfo = getArchetypeInfo(currentBuild?.build_archetype_key || null);

  // Convert 1-4 scale to percentage for display
  const getStatValue = (key: string) => {
    if (!currentBuild) return 0;
    const value = Number(currentBuild[key as keyof typeof currentBuild]) || 0;
    return value;
  };

  const getStatPercentage = (key: string) => {
    const value = getStatValue(key);
    return (value / 4) * 100;
  };

  if (buildLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="p-5 rounded-2xl bg-card border shadow-soft"
      >
        <div className="animate-pulse space-y-3">
          <div className="h-5 bg-muted rounded w-1/3" />
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-3 bg-muted rounded" />
            ))}
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="p-5 rounded-2xl bg-card border shadow-soft"
      >
        {/* Header - title only */}
        <div className="flex items-center gap-2 mb-3">
          <div className="p-1.5 rounded-lg bg-purple-500/10">
            <Dna className="w-4 h-4 text-purple-500" />
          </div>
          <h3 className="font-display font-semibold text-foreground">Your Build</h3>
        </div>

        {!hasBuild ? (
          // Empty state - no assessment yet
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-3">
              Take a quick scan to understand your current build.
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsModalOpen(true)}
              disabled={questionsLoading}
            >
              <RefreshCw className="w-3 h-3 mr-2" />
              Scan Build
            </Button>
          </div>
        ) : (
          <>
            {/* Archetype badge - single line, tappable */}
            <button
              onClick={() => setIsShareModalOpen(true)}
              className="mb-3 w-full text-left"
            >
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 hover:bg-primary/15 transition-colors">
                <span className="text-sm text-primary font-medium flex-1">
                  {archetypeInfo.label}
                </span>
                <Info className="w-3.5 h-3.5 text-primary/60" />
              </div>
            </button>

            {/* Stat bars */}
            <div className="space-y-2">
              {BASE_STATS.map((stat) => {
                const value = getStatValue(stat.key);
                const percentage = getStatPercentage(stat.key);
                return (
                  <div key={stat.key} className="flex items-center gap-2">
                    <span className="text-sm w-6">{stat.emoji}</span>
                    <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        className="h-full bg-primary/60 rounded-full"
                      />
                    </div>
                    <span className="text-xs text-muted-foreground w-6 text-right">
                      {value.toFixed(1)}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Overall score */}
            <div className="mt-4 pt-3 border-t flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Overall</span>
              <span className="font-display font-semibold text-foreground">
                {Number(currentBuild.overall).toFixed(1)}
                <span className="text-xs text-muted-foreground font-normal">/4</span>
              </span>
            </div>

            {/* Action buttons - moved to footer */}
            <div className="mt-3 pt-3 border-t grid grid-cols-2 gap-2">
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs"
                onClick={() => setIsShareModalOpen(true)}
              >
                <Share2 className="w-3 h-3 mr-1.5" />
                Share
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs"
                onClick={() => setIsModalOpen(true)}
                disabled={questionsLoading}
              >
                <RefreshCw className="w-3 h-3 mr-1.5" />
                Rescan
              </Button>
            </div>
          </>
        )}
      </motion.div>

      {/* Assessment Modal */}
      <BuildAssessmentModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        questions={questions}
        onSubmit={submitAssessment}
        isSubmitting={isSubmitting}
      />

      {/* Share Modal - also shows archetype description */}
      {hasBuild && currentBuild && (
        <Dialog open={isShareModalOpen} onOpenChange={setIsShareModalOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-center">Your Build</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* Archetype explanation */}
              <div className="p-4 rounded-xl bg-primary/10 text-center">
                <p className="text-sm font-medium text-primary mb-1">{archetypeInfo.label}</p>
                <p className="text-xs text-muted-foreground">{archetypeInfo.description}</p>
              </div>
              <BuildCard build={currentBuild} />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
