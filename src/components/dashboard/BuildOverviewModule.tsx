import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Dna, RefreshCw, Info, Share2, Target, History, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useBuildAssessment } from "@/hooks/useBuildAssessment";
import { useFocusMode } from "@/hooks/useFocusMode";
import { getArchetypeInfo, getArchetypeThemeColors, type BuildScore } from "@/lib/build";
import { BuildAssessmentModal } from "./BuildAssessmentModal";
import { BuildCard } from "./BuildCard";

const BASE_STATS = [
  { key: "awareness", label: "Awareness", emoji: "🦉" },
  { key: "perspective", label: "Perspective", emoji: "🐢" },
  { key: "habit", label: "Habit", emoji: "🦈" },
  { key: "wellness", label: "Wellness", emoji: "🛰️" },
  { key: "environment", label: "Environment", emoji: "🚀" },
] as const;

interface BuildOverviewModuleProps {
  compact?: boolean;
}

// Mini trend indicator component
function TrendIndicator({ current, previous }: { current: number; previous: number }) {
  const diff = current - previous;
  if (Math.abs(diff) < 0.1) {
    return <Minus className="w-3 h-3 text-muted-foreground" />;
  }
  if (diff > 0) {
    return <TrendingUp className="w-3 h-3 text-emerald-500" />;
  }
  return <TrendingDown className="w-3 h-3 text-red-500" />;
}

export function BuildOverviewModule({ compact = false }: BuildOverviewModuleProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isFocusPlanOpen, setIsFocusPlanOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  
  const {
    questions,
    questionsLoading,
    currentBuild,
    buildLoading,
    assessmentHistory,
    submitAssessment,
    isSubmitting,
  } = useBuildAssessment();

  const {
    focusState,
    focusPlan,
    currentDay,
    todaysPlan,
    activateFocusMode,
    deactivateFocusMode,
    isActive: isFocusModeActive,
  } = useFocusMode(currentBuild);

  const hasBuild = currentBuild && currentBuild.overall > 0;
  const archetypeInfo = getArchetypeInfo(currentBuild?.build_archetype_key || null);
  const themeColors = getArchetypeThemeColors(currentBuild?.build_archetype_key || null);

  // Get last 6 assessments for history timeline
  const historyItems = useMemo(() => {
    return assessmentHistory.slice(0, 6).reverse(); // Chronological order
  }, [assessmentHistory]);

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

  // Get lowest controllable for focus mode
  const lowestControllable = useMemo(() => {
    if (!currentBuild) return null;
    const scores = {
      awareness: currentBuild.awareness,
      perspective: currentBuild.perspective,
      habit: currentBuild.habit,
      wellness: currentBuild.wellness,
      environment: currentBuild.environment,
    };
    let lowest = "awareness";
    let lowestScore = scores.awareness;
    for (const [key, value] of Object.entries(scores)) {
      if (value < lowestScore) {
        lowest = key;
        lowestScore = value;
      }
    }
    return lowest;
  }, [currentBuild]);

  if (buildLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className={`rounded-xl bg-card/60 border border-border/50 ${compact ? "p-3" : "p-5 rounded-2xl"}`}
      >
        <div className="animate-pulse space-y-2">
          <div className="h-4 bg-muted rounded w-1/3" />
          <div className="h-6 bg-muted rounded w-1/2" />
        </div>
      </motion.div>
    );
  }

  // Compact state indicator version
  if (compact) {
    return (
      <>
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          onClick={() => setIsDetailOpen(true)}
          className="w-full text-left p-3 rounded-xl bg-card/60 border border-border/50 hover:bg-card/80 hover:border-border transition-all"
          data-testid="build-archetype"
        >
          {/* Header */}
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1 rounded-md bg-purple-500/10">
              <Dna className="w-3.5 h-3.5 text-purple-500" />
            </div>
            <h3 className="text-sm font-medium text-foreground">Your Build</h3>
            {isFocusModeActive && (
              <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                Focus: {focusState.controllable}
              </span>
            )}
          </div>

          {!hasBuild ? (
            <p className="text-xs text-muted-foreground">Not scanned</p>
          ) : (
            <>
              {/* Archetype label with theme chip */}
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm">{archetypeInfo.emoji}</span>
                <p className={`text-xs font-medium truncate ${themeColors.text}`}>
                  {archetypeInfo.label}
                </p>
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${themeColors.chip}`}>
                  {archetypeInfo.theme}
                </span>
              </div>
              {/* Mini stat bars */}
              <div className="space-y-1">
                {BASE_STATS.slice(0, 3).map((stat) => {
                  const percentage = getStatPercentage(stat.key);
                  return (
                    <div key={stat.key} className="flex items-center gap-1.5">
                      <span className="text-[10px] w-4">{stat.emoji}</span>
                      <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-purple-500/50 rounded-full"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              {/* Overall score */}
              <div className="mt-2 pt-2 border-t border-border/50 flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">Overall</span>
                <span className="text-sm font-semibold text-foreground">
                  {Number(currentBuild.overall).toFixed(1)}
                </span>
              </div>
            </>
          )}
        </motion.button>

        {/* Detail Modal */}
        <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <DialogContent className="max-w-sm max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Dna className="w-4 h-4 text-purple-500" />
                Your Build
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              {!hasBuild ? (
                <div className="text-center py-6">
                  <p className="text-sm text-muted-foreground mb-4">
                    Take a quick scan to understand your current build.
                  </p>
                  <Button
                    size="sm"
                    onClick={() => {
                      setIsDetailOpen(false);
                      setIsModalOpen(true);
                    }}
                    disabled={questionsLoading}
                  >
                    <RefreshCw className="w-3 h-3 mr-2" />
                    Scan Build
                  </Button>
                </div>
              ) : (
                <>
                  {/* Archetype badge with theming */}
                  <button
                    onClick={() => setIsShareModalOpen(true)}
                    className="w-full text-left"
                  >
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${themeColors.bg} border ${themeColors.border} hover:opacity-90 transition-opacity`}>
                      <span className="text-base">{archetypeInfo.emoji}</span>
                      <span className={`text-sm font-medium flex-1 ${themeColors.text}`}>
                        {archetypeInfo.label}
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${themeColors.chip}`}>
                        {archetypeInfo.theme}
                      </span>
                      <Info className={`w-3.5 h-3.5 ${themeColors.text} opacity-60`} />
                    </div>
                  </button>

                  {/* Focus Mode indicator */}
                  {isFocusModeActive && (
                    <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-primary">Focus Mode Active</span>
                        <span className="text-xs text-muted-foreground">Day {currentDay}/7</span>
                      </div>
                      <p className="text-sm font-medium capitalize">{focusState.controllable}</p>
                      {todaysPlan && (
                        <p className="text-xs text-muted-foreground mt-1">{todaysPlan.intention}</p>
                      )}
                    </div>
                  )}

                  {/* Recommendations */}
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Recommendations</p>
                    <ul className="space-y-1.5">
                      {archetypeInfo.recommendations.map((rec, i) => (
                        <li key={i} className="text-xs text-foreground flex items-start gap-2">
                          <span className="text-primary mt-0.5">→</span>
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Full stat bars */}
                  <div className="space-y-2">
                    {BASE_STATS.map((stat) => {
                      const value = getStatValue(stat.key);
                      const percentage = getStatPercentage(stat.key);
                      const isLowest = stat.key === lowestControllable;
                      return (
                        <div key={stat.key} className="flex items-center gap-2">
                          <span className="text-sm w-6">{stat.emoji}</span>
                          <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${percentage}%` }}
                              transition={{ duration: 0.5, delay: 0.1 }}
                              className={`h-full rounded-full ${isLowest ? "bg-amber-500/60" : "bg-primary/60"}`}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground w-6 text-right">
                            {value.toFixed(1)}
                          </span>
                          {isLowest && !isFocusModeActive && (
                            <span className="text-[9px] text-amber-600 dark:text-amber-400">low</span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Overall score */}
                  <div className="pt-3 border-t flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Overall</span>
                    <span className="font-display font-semibold text-foreground">
                      {Number(currentBuild.overall).toFixed(1)}
                      <span className="text-xs text-muted-foreground font-normal">/4</span>
                    </span>
                  </div>

                  {/* Action buttons */}
                  <div className="pt-3 border-t grid grid-cols-2 gap-2">
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
                      onClick={() => {
                        setIsDetailOpen(false);
                        setIsModalOpen(true);
                      }}
                      disabled={questionsLoading}
                    >
                      <RefreshCw className="w-3 h-3 mr-1.5" />
                      Rescan
                    </Button>
                  </div>

                  {/* Focus Mode & History buttons */}
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      size="sm"
                      variant={isFocusModeActive ? "secondary" : "outline"}
                      className="h-8 text-xs"
                      onClick={() => setIsFocusPlanOpen(true)}
                      data-testid="build-focus-mode"
                    >
                      <Target className="w-3 h-3 mr-1.5" />
                      {isFocusModeActive ? "Focus Plan" : "Focus Mode"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs"
                      onClick={() => setIsHistoryOpen(true)}
                      data-testid="build-history"
                    >
                      <History className="w-3 h-3 mr-1.5" />
                      History
                    </Button>
                  </div>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>

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
                <DialogTitle className="text-center">Your Build</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className={`p-4 rounded-xl ${themeColors.bg} border ${themeColors.border} text-center`}>
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <span className="text-lg">{archetypeInfo.emoji}</span>
                    <p className={`text-sm font-medium ${themeColors.text}`}>{archetypeInfo.label}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">{archetypeInfo.description}</p>
                </div>
                <BuildCard build={currentBuild} />
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Focus Plan Modal */}
        <Dialog open={isFocusPlanOpen} onOpenChange={setIsFocusPlanOpen}>
          <DialogContent className="max-w-sm max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Target className="w-4 h-4 text-primary" />
                Focus Mode
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              {!isFocusModeActive ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    Focus on your lowest controllable for 7 days with daily intentions, reps, and surrender lines.
                  </p>
                  {lowestControllable && (
                    <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                      <p className="text-xs text-amber-600 dark:text-amber-400 mb-1">Lowest Controllable</p>
                      <p className="text-sm font-medium capitalize">{lowestControllable}</p>
                    </div>
                  )}
                  <Button
                    className="w-full"
                    onClick={() => {
                      activateFocusMode();
                      setIsFocusPlanOpen(false);
                    }}
                  >
                    <Target className="w-4 h-4 mr-2" />
                    Start 7-Day Focus
                  </Button>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-primary/10">
                    <div>
                      <p className="text-xs text-muted-foreground">Focusing on</p>
                      <p className="text-sm font-medium capitalize">{focusState.controllable}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Day</p>
                      <p className="text-sm font-bold text-primary">{currentDay}/7</p>
                    </div>
                  </div>

                  {/* 7-day plan */}
                  {focusPlan && (
                    <div className="space-y-2">
                      {focusPlan.days.map((day, index) => {
                        const isToday = index + 1 === currentDay;
                        const isPast = index + 1 < currentDay;
                        return (
                          <div
                            key={day.day}
                            data-testid={`build-history-item-${index}`}
                            className={`p-3 rounded-lg border transition-all ${
                              isToday
                                ? "bg-primary/10 border-primary/30"
                                : isPast
                                ? "bg-muted/30 border-border/50 opacity-60"
                                : "bg-card border-border/50"
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className={`text-xs font-medium ${isToday ? "text-primary" : "text-muted-foreground"}`}>
                                Day {day.day} {isToday && "• Today"}
                              </span>
                            </div>
                            <p className="text-sm font-medium mb-1">{day.intention}</p>
                            <p className="text-xs text-muted-foreground mb-1">→ {day.rep}</p>
                            <p className="text-xs text-muted-foreground/70 italic">"{day.surrender}"</p>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      deactivateFocusMode();
                      setIsFocusPlanOpen(false);
                    }}
                  >
                    End Focus Mode
                  </Button>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* History Modal */}
        <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
          <DialogContent className="max-w-sm max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <History className="w-4 h-4 text-primary" />
                Build History
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 pt-2" data-testid="build-history">
              {historyItems.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No previous assessments yet.
                </p>
              ) : (
                historyItems.map((item: BuildScore, index: number) => {
                  const itemArchetype = getArchetypeInfo(item.build_archetype_key);
                  const itemTheme = getArchetypeThemeColors(item.build_archetype_key);
                  const prevItem = historyItems[index - 1];
                  
                  return (
                    <div
                      key={item.id}
                      data-testid={`build-history-item-${index}`}
                      className={`p-3 rounded-lg border ${itemTheme.bg} ${itemTheme.border}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(item.computed_at), "MMM d, yyyy")}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm">{itemArchetype.emoji}</span>
                          <span className={`text-xs font-medium ${itemTheme.text}`}>
                            {itemArchetype.label}
                          </span>
                        </div>
                      </div>
                      
                      {/* Overall score with trend */}
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-muted-foreground">Overall</span>
                        <div className="flex items-center gap-1.5">
                          {prevItem && (
                            <TrendIndicator current={item.overall} previous={prevItem.overall} />
                          )}
                          <span className="text-sm font-bold">{item.overall.toFixed(1)}</span>
                        </div>
                      </div>
                      
                      {/* Mini stat indicators */}
                      <div className="flex gap-2 text-xs">
                        {BASE_STATS.map((stat) => {
                          const value = Number(item[stat.key as keyof typeof item]) || 0;
                          const prevValue = prevItem ? Number(prevItem[stat.key as keyof typeof prevItem]) || 0 : value;
                          return (
                            <div key={stat.key} className="flex items-center gap-0.5" title={stat.label}>
                              <span className="text-[10px]">{stat.emoji}</span>
                              <span className="text-[10px] text-muted-foreground">{value.toFixed(1)}</span>
                              {prevItem && Math.abs(value - prevValue) >= 0.1 && (
                                <span className={`text-[9px] ${value > prevValue ? "text-emerald-500" : "text-red-500"}`}>
                                  {value > prevValue ? "↑" : "↓"}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Full version (for non-compact use)
  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="p-5 rounded-2xl bg-card border shadow-soft"
        data-testid="build-archetype"
      >
        {/* Header - title only */}
        <div className="flex items-center gap-2 mb-3">
          <div className="p-1.5 rounded-lg bg-purple-500/10">
            <Dna className="w-4 h-4 text-purple-500" />
          </div>
          <h3 className="font-display font-semibold text-foreground">Your Build</h3>
          {isFocusModeActive && (
            <span className="ml-auto text-[10px] px-2 py-0.5 rounded bg-primary/10 text-primary font-medium">
              Focus: {focusState.controllable}
            </span>
          )}
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
            {/* Archetype badge - with theming */}
            <button
              onClick={() => setIsShareModalOpen(true)}
              className="mb-3 w-full text-left"
            >
              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${themeColors.bg} border ${themeColors.border} hover:opacity-90 transition-opacity`}>
                <span className="text-base">{archetypeInfo.emoji}</span>
                <span className={`text-sm font-medium flex-1 ${themeColors.text}`}>
                  {archetypeInfo.label}
                </span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${themeColors.chip}`}>
                  {archetypeInfo.theme}
                </span>
                <Info className={`w-3.5 h-3.5 ${themeColors.text} opacity-60`} />
              </div>
            </button>

            {/* Stat bars */}
            <div className="space-y-2">
              {BASE_STATS.map((stat) => {
                const value = getStatValue(stat.key);
                const percentage = getStatPercentage(stat.key);
                const isLowest = stat.key === lowestControllable;
                return (
                  <div key={stat.key} className="flex items-center gap-2">
                    <span className="text-sm w-6">{stat.emoji}</span>
                    <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        className={`h-full rounded-full ${isLowest ? "bg-amber-500/60" : "bg-primary/60"}`}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground w-6 text-right">
                      {value.toFixed(1)}
                    </span>
                    {isLowest && !isFocusModeActive && (
                      <span className="text-[9px] text-amber-600 dark:text-amber-400">low</span>
                    )}
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

            {/* Focus Mode & History buttons */}
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Button
                size="sm"
                variant={isFocusModeActive ? "secondary" : "outline"}
                className="h-8 text-xs"
                onClick={() => setIsFocusPlanOpen(true)}
                data-testid="build-focus-mode"
              >
                <Target className="w-3 h-3 mr-1.5" />
                {isFocusModeActive ? "Focus Plan" : "Focus Mode"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs"
                onClick={() => setIsHistoryOpen(true)}
                data-testid="build-history"
              >
                <History className="w-3 h-3 mr-1.5" />
                History
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
              <div className={`p-4 rounded-xl ${themeColors.bg} border ${themeColors.border} text-center`}>
                <div className="flex items-center justify-center gap-2 mb-1">
                  <span className="text-lg">{archetypeInfo.emoji}</span>
                  <p className={`text-sm font-medium ${themeColors.text}`}>{archetypeInfo.label}</p>
                </div>
                <p className="text-xs text-muted-foreground">{archetypeInfo.description}</p>
              </div>
              <BuildCard build={currentBuild} />
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Focus Plan Modal */}
      <Dialog open={isFocusPlanOpen} onOpenChange={setIsFocusPlanOpen}>
        <DialogContent className="max-w-sm max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />
              Focus Mode
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {!isFocusModeActive ? (
              <>
                <p className="text-sm text-muted-foreground">
                  Focus on your lowest controllable for 7 days with daily intentions, reps, and surrender lines.
                </p>
                {lowestControllable && (
                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <p className="text-xs text-amber-600 dark:text-amber-400 mb-1">Lowest Controllable</p>
                    <p className="text-sm font-medium capitalize">{lowestControllable}</p>
                  </div>
                )}
                <Button
                  className="w-full"
                  onClick={() => {
                    activateFocusMode();
                    setIsFocusPlanOpen(false);
                  }}
                >
                  <Target className="w-4 h-4 mr-2" />
                  Start 7-Day Focus
                </Button>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between p-3 rounded-lg bg-primary/10">
                  <div>
                    <p className="text-xs text-muted-foreground">Focusing on</p>
                    <p className="text-sm font-medium capitalize">{focusState.controllable}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Day</p>
                    <p className="text-sm font-bold text-primary">{currentDay}/7</p>
                  </div>
                </div>

                {/* 7-day plan */}
                {focusPlan && (
                  <div className="space-y-2">
                    {focusPlan.days.map((day, index) => {
                      const isToday = index + 1 === currentDay;
                      const isPast = index + 1 < currentDay;
                      return (
                        <div
                          key={day.day}
                          className={`p-3 rounded-lg border transition-all ${
                            isToday
                              ? "bg-primary/10 border-primary/30"
                              : isPast
                              ? "bg-muted/30 border-border/50 opacity-60"
                              : "bg-card border-border/50"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className={`text-xs font-medium ${isToday ? "text-primary" : "text-muted-foreground"}`}>
                              Day {day.day} {isToday && "• Today"}
                            </span>
                          </div>
                          <p className="text-sm font-medium mb-1">{day.intention}</p>
                          <p className="text-xs text-muted-foreground mb-1">→ {day.rep}</p>
                          <p className="text-xs text-muted-foreground/70 italic">"{day.surrender}"</p>
                        </div>
                      );
                    })}
                  </div>
                )}

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    deactivateFocusMode();
                    setIsFocusPlanOpen(false);
                  }}
                >
                  End Focus Mode
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* History Modal */}
      <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
        <DialogContent className="max-w-sm max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-4 h-4 text-primary" />
              Build History
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2" data-testid="build-history">
            {historyItems.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No previous assessments yet.
              </p>
            ) : (
              historyItems.map((item: BuildScore, index: number) => {
                const itemArchetype = getArchetypeInfo(item.build_archetype_key);
                const itemTheme = getArchetypeThemeColors(item.build_archetype_key);
                const prevItem = historyItems[index - 1];
                
                return (
                  <div
                    key={item.id}
                    data-testid={`build-history-item-${index}`}
                    className={`p-3 rounded-lg border ${itemTheme.bg} ${itemTheme.border}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(item.computed_at), "MMM d, yyyy")}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm">{itemArchetype.emoji}</span>
                        <span className={`text-xs font-medium ${itemTheme.text}`}>
                          {itemArchetype.label}
                        </span>
                      </div>
                    </div>
                    
                    {/* Overall score with trend */}
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-muted-foreground">Overall</span>
                      <div className="flex items-center gap-1.5">
                        {prevItem && (
                          <TrendIndicator current={item.overall} previous={prevItem.overall} />
                        )}
                        <span className="text-sm font-bold">{item.overall.toFixed(1)}</span>
                      </div>
                    </div>
                    
                    {/* Mini stat indicators */}
                    <div className="flex gap-2 text-xs">
                      {BASE_STATS.map((stat) => {
                        const value = Number(item[stat.key as keyof typeof item]) || 0;
                        const prevValue = prevItem ? Number(prevItem[stat.key as keyof typeof prevItem]) || 0 : value;
                        return (
                          <div key={stat.key} className="flex items-center gap-0.5" title={stat.label}>
                            <span className="text-[10px]">{stat.emoji}</span>
                            <span className="text-[10px] text-muted-foreground">{value.toFixed(1)}</span>
                            {prevItem && Math.abs(value - prevValue) >= 0.1 && (
                              <span className={`text-[9px] ${value > prevValue ? "text-emerald-500" : "text-red-500"}`}>
                                {value > prevValue ? "↑" : "↓"}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
