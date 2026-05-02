import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Check,
  ChevronDown,
  Sparkles,
  RotateCcw,
  Target,
  Lightbulb,
  TrendingDown,
  Plus,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
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
import { useBuildAssessment } from "@/hooks/useBuildAssessment";
import { BuildAssessmentModal } from "./BuildAssessmentModal";
import { CustomSnapshotCreator } from "./CustomSnapshotCreator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
interface StartSnapshotDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectSnapshot: (snapshotId: string, asSeason?: boolean) => void;
  isStarting: boolean;
  isPaid: boolean;
}

const CONTROLLABLE_CONFIG: Record<Controllable, { emoji: string; label: string }> = {
  awareness: { emoji: "🦉", label: "Awareness" },
  perspective: { emoji: "🐢", label: "Perspective" },
  habit: { emoji: "🦈", label: "Habit" },
  wellness: { emoji: "🛰️", label: "Wellness" },
  environment: { emoji: "🚀", label: "Environment" },
};

export function StartSnapshotDialog({
  isOpen,
  onOpenChange,
  onSelectSnapshot,
  isStarting,
  isPaid,
}: StartSnapshotDialogProps) {
  const [selectedSnapshot, setSelectedSnapshot] = useState<string | null>(null);
  const [showBuildModal, setShowBuildModal] = useState(false);
  const [showCustomCreator, setShowCustomCreator] = useState(false);
  const [viewMode, setViewMode] = useState<"goal" | "state">("goal");
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);
  const [expandedBuckets, setExpandedBuckets] = useState<Set<BucketId>>(new Set());
  const [customSnapshots, setCustomSnapshots] = useState<Snapshot[]>([]);
  const [startAsSeason, setStartAsSeason] = useState(false);

  const { currentBuild, questions, submitAssessment, isSubmitting } = useBuildAssessment();
  
  const lowestControllable = currentBuild ? (() => {
    const scores = [
      { key: "awareness", value: currentBuild.awareness },
      { key: "perspective", value: currentBuild.perspective },
      { key: "habit", value: currentBuild.habit },
      { key: "wellness", value: currentBuild.wellness },
      { key: "environment", value: currentBuild.environment },
    ];
    return scores.reduce((min, curr) => curr.value < min.value ? curr : min).key as Controllable;
  })() : null;

  const recommendedSnapshot = currentBuild ? getRecommendedSnapshot(currentBuild) : SNAPSHOTS[0];

  // Filter snapshots by selected goal
  const getFilteredSnapshots = () => {
    if (viewMode === "goal" && selectedGoal) {
      const snapshotIds = getSnapshotsForGoal(selectedGoal);
      return SNAPSHOTS.filter(s => snapshotIds.includes(s.id));
    }
    return SNAPSHOTS;
  };

  const filteredSnapshots = getFilteredSnapshots();
  const goalCategories: GoalCategory[] = ["break-habit", "build-habit", "mindset"];

  const toggleBucket = (bucketId: BucketId) => {
    const newExpanded = new Set(expandedBuckets);
    if (newExpanded.has(bucketId)) {
      newExpanded.delete(bucketId);
    } else {
      newExpanded.add(bucketId);
    }
    setExpandedBuckets(newExpanded);
  };

  const handleConfirm = () => {
    if (selectedSnapshot) {
      onSelectSnapshot(selectedSnapshot, startAsSeason);
    }
  };

  const handleBuildComplete = async (answers: Record<string, number>) => {
    return await submitAssessment(answers);
  };

  const handleCustomSnapshotCreated = (snapshot: Snapshot) => {
    setCustomSnapshots((prev) => [...prev, snapshot]);
    setSelectedSnapshot(snapshot.id);
  };

  // All available snapshots including custom ones
  const allSnapshots = [...SNAPSHOTS, ...customSnapshots];

  const renderSnapshotCard = (snapshot: Snapshot, showRecommended = false) => {
    const isSelected = selectedSnapshot === snapshot.id;
    const focusConfig = CONTROLLABLE_CONFIG[snapshot.focus];
    const isRecommended = showRecommended && snapshot.id === recommendedSnapshot?.id;

    return (
      <motion.button
        key={snapshot.id}
        onClick={() => setSelectedSnapshot(snapshot.id)}
        whileTap={{ scale: 0.98 }}
        className={`w-full p-4 rounded-xl border text-left transition-all relative ${
          isSelected
            ? "border-primary bg-primary/5 shadow-[0_0_12px_rgba(102,189,239,0.15)]"
            : "border-border bg-card hover:border-primary/30"
        }`}
      >
        {isRecommended && (
          <Badge className="absolute -top-2 right-3 bg-primary text-primary-foreground text-[10px] px-2 py-0.5">
            <Sparkles className="w-3 h-3 mr-1" />
            Recommended
          </Badge>
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
      </motion.button>
    );
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">Enter Your Next Region</DialogTitle>
            <DialogDescription>
              Pick a 7-day chapter quest that fits the region of life you want to move through next.
            </DialogDescription>
          </DialogHeader>

          {/* View Mode Toggle */}
          <Tabs value={viewMode} onValueChange={(v) => {
            setViewMode(v as "goal" | "state");
            setSelectedGoal(null);
          }} className="w-full">
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
            <TabsContent value="goal" className="mt-0 space-y-4">
              {/* Goal Selection */}
              <div className="p-3 rounded-lg bg-muted/30 border border-border">
                <p className="text-xs font-medium text-foreground mb-3">What do you want to work on?</p>
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
                                onClick={() => setSelectedGoal(isSelected ? null : goal.id)}
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
              {selectedGoal && (
                <div className="space-y-3">
                  <p className="text-xs font-medium text-muted-foreground">
                    Recommended Regions ({filteredSnapshots.length})
                  </p>
                  {filteredSnapshots.map((snapshot) => renderSnapshotCard(snapshot))}
                </div>
              )}

              {/* Design Your Own Chapter */}
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
                    <h3 className="font-medium text-foreground">Design Your Own Chapter</h3>
                    <p className="text-xs text-muted-foreground italic">
                      Create a custom 7-day chapter quest
                    </p>
                  </div>
                </div>
              </motion.button>
            </TabsContent>

            {/* By State Tab */}
            <TabsContent value="state" className="mt-0 space-y-4">
              {/* Build Scores */}
              {currentBuild && (
                <div className="p-3 rounded-lg bg-muted/50 border border-border">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-medium text-foreground">Your Current Build</p>
                      {currentBuild.updated_at && (
                        <span className="text-[10px] text-muted-foreground">
                          • {formatDistanceToNow(new Date(currentBuild.updated_at), { addSuffix: true })}
                        </span>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => setShowBuildModal(true)}
                    >
                      <RotateCcw className="w-3 h-3 mr-1" />
                      Re-scan
                    </Button>
                  </div>
                  <div className="grid grid-cols-5 gap-1">
                    {(["awareness", "perspective", "habit", "wellness", "environment"] as Controllable[]).map((key) => {
                      const value = Number(currentBuild[key as keyof typeof currentBuild]) || 0;
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
                            {value}
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
                  <p className="text-xs font-medium text-muted-foreground">Based on your current build</p>
                  {renderSnapshotCard(recommendedSnapshot, true)}
                </div>
              )}

              {/* Browse by Bucket */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Browse Regions by Category</p>
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
                        {bucketSnapshots.map((snapshot) => renderSnapshotCard(snapshot))}
                      </CollapsibleContent>
                    </Collapsible>
                  );
                })}
              </div>
            </TabsContent>
          </Tabs>

          {/* Season toggle - Premium only */}
          {isPaid && (
            <label className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors">
              <input
                type="checkbox"
                checked={startAsSeason}
                onChange={(e) => setStartAsSeason(e.target.checked)}
                className="w-4 h-4 rounded border-border text-primary accent-primary"
              />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Start as a 4-Week Season</p>
                <p className="text-xs text-muted-foreground">
                  Chain 4 chapter quests together. See your momentum build over a month.
                </p>
              </div>
            </label>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!selectedSnapshot || isStarting}
              className="flex-1"
            >
              {isStarting ? "Entering..." : startAsSeason ? "Start Season" : "Enter Region"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <BuildAssessmentModal
        open={showBuildModal}
        onOpenChange={setShowBuildModal}
        questions={questions}
        onSubmit={handleBuildComplete}
        isSubmitting={isSubmitting}
      />

      <CustomSnapshotCreator
        open={showCustomCreator}
        onOpenChange={setShowCustomCreator}
        onSnapshotCreated={handleCustomSnapshotCreated}
      />
    </>
  );
}
