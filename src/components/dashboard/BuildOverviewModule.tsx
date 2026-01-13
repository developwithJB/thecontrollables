import { useState, useEffect } from "react";
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
import { getArchetypeInfo } from "@/types/build";
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
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-purple-500/10">
              <Dna className="w-4 h-4 text-purple-500" />
            </div>
            <h3 className="font-display font-semibold text-foreground">Your Build</h3>
          </div>
          <div className="flex items-center gap-1">
            {hasBuild && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setIsShareModalOpen(true)}
                      className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                    >
                      <Share2 className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Share your build</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                    disabled={questionsLoading}
                  >
                    <RefreshCw className="w-4 h-4 text-muted-foreground" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{hasBuild ? "Rescan your build" : "Take the assessment"}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
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
            {/* Archetype badge */}
            <div className="mb-3 flex items-center gap-2">
              <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-medium">
                {archetypeInfo.label}
              </span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="w-3 h-3 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>{archetypeInfo.description}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

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

      {/* Share Modal */}
      {hasBuild && currentBuild && (
        <Dialog open={isShareModalOpen} onOpenChange={setIsShareModalOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-center">Share Your Build</DialogTitle>
            </DialogHeader>
            <BuildCard build={currentBuild} />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
