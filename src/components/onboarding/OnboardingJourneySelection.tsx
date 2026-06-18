import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Check, ChevronDown, Sparkles, Target, Lightbulb, ArrowRight, TrendingDown, Crown, Plus, SlidersHorizontal } from "lucide-react";
import { CustomSnapshotCreator } from "@/components/dashboard/CustomSnapshotCreator";
import {
  SNAPSHOTS,
  BUCKETS,
  getRecommendedSnapshot,
  getSnapshotsByBucket,
  type Snapshot,
  type BucketId,
  type Controllable,
} from "@/lib/snapshots";
import { LIFE_GOALS, getSnapshotsForGoal, GOAL_CATEGORIES, type GoalCategory } from "@/lib/lifeGoals";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { BuildScore } from "@/lib/build";

interface OnboardingSnapshotSelectionProps {
  buildResult?: BuildScore | null;
  onSelect: (snapshot: Snapshot) => void;
}

const CONTROLLABLE_CONFIG: Record<Controllable, { emoji: string; label: string }> = {
  awareness: { emoji: "🦉", label: "Awareness" },
  perspective: { emoji: "🐢", label: "Perspective" },
  habit: { emoji: "🦈", label: "Habit" },
  wellness: { emoji: "🛰️", label: "Wellness" },
  environment: { emoji: "🚀", label: "Environment" },
};

// AGB Signature Challenge
const AGB_SNAPSHOT = SNAPSHOTS.find(s => s.id === "rebuild-confidence-agb");

export function OnboardingJourneySelection({
  buildResult,
  onSelect,
}: OnboardingSnapshotSelectionProps) {
  const [viewMode, setViewMode] = useState<"goal" | "state">("goal");
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);
  const [selectedSnapshot, setSelectedSnapshot] = useState<Snapshot | null>(null);
  const [expandedBuckets, setExpandedBuckets] = useState<Set<BucketId>>(new Set());
  const [showCustomCreator, setShowCustomCreator] = useState(false);
  const [customSnapshots, setCustomSnapshots] = useState<Snapshot[]>([]);
  const [showMoreOptions, setShowMoreOptions] = useState(false);

  // Get recommended snapshot based on build
  const recommendedSnapshot = buildResult ? getRecommendedSnapshot(buildResult) : null;
  const primarySnapshot = recommendedSnapshot ?? AGB_SNAPSHOT ?? SNAPSHOTS[0];

  // Get lowest controllable from build
  const lowestControllable = buildResult ? (() => {
    const scores = [
      { key: "awareness", value: Number(buildResult.awareness) },
      { key: "perspective", value: Number(buildResult.perspective) },
      { key: "habit", value: Number(buildResult.habit) },
      { key: "wellness", value: Number(buildResult.wellness) },
      { key: "environment", value: Number(buildResult.environment) },
    ];
    return scores.reduce((min, curr) => curr.value < min.value ? curr : min).key as Controllable;
  })() : null;

  // Filter snapshots by selected goal
  const getFilteredSnapshots = () => {
    if (selectedGoal) {
      const snapshotIds = getSnapshotsForGoal(selectedGoal);
      return SNAPSHOTS.filter(s => snapshotIds.includes(s.id));
    }
    return [];
  };

  const filteredSnapshots = getFilteredSnapshots();
  const goalCategories: GoalCategory[] = ["break-habit", "build-habit", "mindset"];

  useEffect(() => {
    if (!selectedSnapshot && primarySnapshot) {
      setSelectedSnapshot(primarySnapshot);
    }
  }, [primarySnapshot, selectedSnapshot]);

  const toggleBucket = (bucketId: BucketId) => {
    const newExpanded = new Set(expandedBuckets);
    if (newExpanded.has(bucketId)) {
      newExpanded.delete(bucketId);
    } else {
      newExpanded.add(bucketId);
    }
    setExpandedBuckets(newExpanded);
  };

  const handleContinue = () => {
    if (selectedSnapshot) {
      onSelect(selectedSnapshot);
    }
  };

  const handleCustomSnapshotCreated = (snapshot: Snapshot) => {
    setCustomSnapshots((prev) => [...prev, snapshot]);
    setSelectedSnapshot(snapshot);
  };

  const renderSnapshotCard = (snapshot: Snapshot, showRecommended = false, index = 0) => {
    const isSelected = selectedSnapshot?.id === snapshot.id;
    const focusConfig = CONTROLLABLE_CONFIG[snapshot.focus];
    const isRecommended = showRecommended && recommendedSnapshot && snapshot.id === recommendedSnapshot.id;

    return (
      <motion.button
        key={snapshot.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
        onClick={() => setSelectedSnapshot(snapshot)}
        whileTap={{ scale: 0.98 }}
        className={`w-full p-4 rounded-xl border text-left transition-all relative ${
          isSelected
            ? "border-primary bg-primary/5 shadow-[0_0_12px_rgba(102,189,239,0.15)]"
            : "border-border bg-card hover:border-primary/30"
        }`}
      >
        {isRecommended && (
          <div className="absolute -top-2 right-3 flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px]">
            <Sparkles className="w-3 h-3" />
            Recommended
          </div>
        )}

        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl shrink-0 bg-gradient-to-br from-primary/10 to-accent/10">
            {snapshot.emoji}
          </div>
          <div className="flex-1 min-w-0 pr-8">
            <h3 className="font-medium text-foreground">{snapshot.name}</h3>
            <p className="text-xs text-muted-foreground mt-0.5 italic line-clamp-2">
              {snapshot.tagline}
            </p>
            <div className="flex items-center gap-1 mt-1.5">
              <span className="text-xs">{focusConfig.emoji}</span>
              <span className="text-[10px] text-muted-foreground">{focusConfig.label}</span>
            </div>
          </div>
          <div
            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-1 transition-colors ${
              isSelected ? "border-primary bg-primary" : "border-muted-foreground/30"
            }`}
          >
            {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
          </div>
        </div>

        {/* Preview when selected */}
        {isSelected && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="mt-3 pt-3 border-t border-border/50"
          >
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Day 1:</span>{" "}
              {snapshot.dailyActions[0]?.task}
            </p>
          </motion.div>
        )}
      </motion.button>
    );
  };

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
          className="text-center mb-6"
        >
          <h1 className="font-display text-2xl font-semibold text-foreground">
            Start With This Snapshot
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            We picked the clearest first week. You can browse if another direction fits better.
          </p>
        </motion.div>

        {/* Primary Recommendation */}
        {primarySnapshot && (
          <div className="mb-4 space-y-3">
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                Recommended Start
              </p>
              {renderSnapshotCard(
                primarySnapshot,
                recommendedSnapshot?.id === primarySnapshot.id,
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowMoreOptions((current) => !current)}
              className="flex w-full items-center justify-between rounded-lg border border-border/60 bg-background/40 px-4 py-3 text-left text-sm font-medium text-foreground transition-colors hover:border-primary/35 hover:bg-muted/30"
              aria-expanded={showMoreOptions}
            >
              <span className="inline-flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-primary" />
                View more snapshots
              </span>
              <ChevronDown
                className={`h-4 w-4 text-muted-foreground transition-transform ${
                  showMoreOptions ? "rotate-180" : ""
                }`}
              />
            </button>
          </div>
        )}

        {/* View Mode Toggle */}
        {showMoreOptions ? (
          <Tabs
            value={viewMode}
            onValueChange={(v) => {
              setViewMode(v as "goal" | "state");
              setSelectedGoal(null);
            }}
            className="w-full flex-1 flex flex-col"
          >
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="goal" className="flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5" />
                By Goal
              </TabsTrigger>
              <TabsTrigger value="state" className="flex items-center gap-1.5">
                <Lightbulb className="w-3.5 h-3.5" />
                By State
              </TabsTrigger>
            </TabsList>

          {/* By Goal Tab */}
          <TabsContent value="goal" className="mt-0 flex-1 overflow-y-auto space-y-4">
            {/* AGB Signature Challenge */}
            {AGB_SNAPSHOT && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4"
              >
                <button
                  onClick={() => setSelectedSnapshot(AGB_SNAPSHOT)}
                  className={`w-full p-4 rounded-xl border-2 text-left transition-all relative overflow-hidden ${
                    selectedSnapshot?.id === AGB_SNAPSHOT.id
                      ? "border-amber-500 bg-gradient-to-br from-amber-500/10 to-orange-500/10 shadow-lg"
                      : "border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-orange-500/5 hover:border-amber-500/60"
                  }`}
                >
                  <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 text-xs">
                    <Crown className="w-3 h-3" />
                    AGB Signature
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0 bg-gradient-to-br from-amber-500/20 to-orange-500/20">
                      {AGB_SNAPSHOT.emoji}
                    </div>
                    <div className="flex-1 min-w-0 pr-8">
                      <h3 className="font-medium text-foreground">{AGB_SNAPSHOT.name}</h3>
                      <p className="text-sm text-muted-foreground mt-0.5 italic">
                        {AGB_SNAPSHOT.tagline}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        The foundational snapshot for building self-trust through kept promises.
                      </p>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-1 transition-colors ${
                        selectedSnapshot?.id === AGB_SNAPSHOT.id ? "border-amber-500 bg-amber-500" : "border-muted-foreground/30"
                      }`}
                    >
                      {selectedSnapshot?.id === AGB_SNAPSHOT.id && (
                        <Check className="w-3 h-3 text-primary-foreground" />
                      )}
                    </div>
                  </div>
                </button>
              </motion.div>
            )}

            {/* Goal Selection */}
            <div className="p-3 rounded-lg bg-muted/30 border border-border">
              <p className="text-xs font-medium text-foreground mb-3">Or pick by what you want to work on:</p>
              <div className="space-y-3">
                {goalCategories.map((category) => {
                  const categoryInfo = GOAL_CATEGORIES[category];
                  const categoryGoals = LIFE_GOALS.filter(g => g.category === category);
                  
                  return (
                    <div key={category} className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                        <span>{categoryInfo.emoji}</span>
                        {categoryInfo.label}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {categoryGoals.map((goal) => {
                          const isSelected = selectedGoal === goal.id;
                          return (
                            <motion.button
                              key={goal.id}
                              onClick={() => {
                                setSelectedGoal(isSelected ? null : goal.id);
                                if (!isSelected) setSelectedSnapshot(null);
                              }}
                              whileTap={{ scale: 0.95 }}
                              className={`px-3 py-1.5 rounded-full text-sm transition-all flex items-center gap-1.5 ${
                                isSelected
                                  ? "bg-primary text-primary-foreground shadow-md"
                                  : "bg-muted hover:bg-muted/80 text-foreground"
                              }`}
                            >
                              <span>{goal.emoji}</span>
                              <span className="truncate max-w-[120px]">{goal.label}</span>
                            </motion.button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Filtered Snapshots */}
            {selectedGoal && filteredSnapshots.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-3"
              >
                <p className="text-xs font-medium text-muted-foreground">
                  Recommended Snapshots ({filteredSnapshots.length})
                </p>
                {filteredSnapshots.map((snapshot, index) => renderSnapshotCard(snapshot, false, index))}
              </motion.div>
            )}

            {/* Build Your Own */}
            <motion.button
              onClick={() => setShowCustomCreator(true)}
              whileTap={{ scale: 0.98 }}
              className="w-full p-4 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 hover:bg-primary/10 hover:border-primary/50 transition-all text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20">
                  <Plus className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium text-foreground">Build Your Own</h3>
                  <p className="text-xs text-muted-foreground italic">
                    Create a custom 7-day snapshot
                  </p>
                </div>
              </div>
            </motion.button>
          </TabsContent>

          {/* By State Tab */}
          <TabsContent value="state" className="mt-0 flex-1 overflow-y-auto space-y-4">
            {/* Build Scores */}
            {buildResult && (
              <div className="p-3 rounded-lg bg-muted/50 border border-border">
                <p className="text-xs font-medium text-foreground mb-2">Your Build Assessment</p>
                <div className="grid grid-cols-5 gap-1">
                  {(["awareness", "perspective", "habit", "wellness", "environment"] as Controllable[]).map((key) => {
                    const value = Number(buildResult[key as keyof typeof buildResult]) || 0;
                    const isLowest = key === lowestControllable;
                    const config = CONTROLLABLE_CONFIG[key];
                    return (
                      <div 
                        key={key}
                        className={`text-center p-1.5 rounded-lg ${
                          isLowest 
                            ? "bg-amber-500/10 border border-amber-500/30" 
                            : "bg-background"
                        }`}
                      >
                        <span className="text-sm block">{config.emoji}</span>
                        <span className={`text-xs font-medium block ${
                          isLowest ? "text-amber-600 dark:text-amber-400" : "text-foreground"
                        }`}>
                          {value.toFixed(1)}
                        </span>
                      </div>
                    );
                  })}
                </div>
                {lowestControllable && (
                  <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-2 flex items-center gap-1">
                    <TrendingDown className="w-3 h-3" />
                    Focus area: {CONTROLLABLE_CONFIG[lowestControllable].label}
                  </p>
                )}
              </div>
            )}

            {/* Primary Recommendation */}
            {recommendedSnapshot && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Based on your Build</p>
                {renderSnapshotCard(recommendedSnapshot, true)}
              </div>
            )}

            {/* Browse by Bucket */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Browse by Category</p>
              {Object.entries(BUCKETS).map(([bucketId, bucket]) => {
                const bucketSnapshots = getSnapshotsByBucket(bucketId as BucketId);
                const isExpanded = expandedBuckets.has(bucketId as BucketId);

                return (
                  <Collapsible
                    key={bucketId}
                    open={isExpanded}
                    onOpenChange={() => toggleBucket(bucketId as BucketId)}
                  >
                    <CollapsibleTrigger asChild>
                      <button className="w-full flex items-center justify-between p-3 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{bucket.emoji}</span>
                          <span className="text-sm font-medium text-foreground">{bucket.name}</span>
                          <span className="text-xs text-muted-foreground">({bucketSnapshots.length})</span>
                        </div>
                        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-2 space-y-2 pl-2">
                      {bucketSnapshots.map((snapshot, index) => renderSnapshotCard(snapshot, false, index))}
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
            </div>
          </TabsContent>
          </Tabs>
        ) : null}

        {/* Continue button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="pt-6"
        >
          <Button
            onClick={handleContinue}
            disabled={!selectedSnapshot}
            className="w-full h-14 text-lg"
          >
            Start 7-Day Snapshot
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
          <p className="text-xs text-muted-foreground text-center mt-3">
            Includes daily actions, reflections, and focus
          </p>
        </motion.div>
      </div>

      {/* Custom Snapshot Creator Modal */}
      <CustomSnapshotCreator
        open={showCustomCreator}
        onOpenChange={setShowCustomCreator}
        onSnapshotCreated={handleCustomSnapshotCreated}
      />
    </motion.div>
  );
}
