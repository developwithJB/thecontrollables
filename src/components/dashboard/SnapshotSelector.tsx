import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Check, 
  ChevronRight, 
  ChevronDown,
  Sparkles, 
  RotateCcw, 
  TrendingDown,
  Compass,
  ArrowLeft,
  Plus, 
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { 
  SNAPSHOTS,
  BUCKETS,
  getRecommendedSnapshot,
  getSnapshotsByBucket,
  getSnapshotById,
  generateCustomSnapshot,
  snapshotToJourney,
  type Snapshot,
  type BucketId,
  type Controllable,
} from "@/lib/snapshots";
import type { UserBuildCurrent, BuildScore } from "@/lib/build";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useActionTracking } from "@/hooks/useActionTracking";
import { useBuildAssessment } from "@/hooks/useBuildAssessment";
import { BuildAssessmentModal } from "./BuildAssessmentModal";
import { CustomSnapshotCreator } from "./CustomSnapshotCreator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface SnapshotSelectorProps {
  currentSnapshotId?: string | null;
  sessionId: string;
  currentDay: number;
  userId: string;
  onSnapshotChanged?: () => void;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const CONTROLLABLE_CONFIG: Record<Controllable, { emoji: string; label: string }> = {
  awareness: { emoji: "🦉", label: "Awareness" },
  perspective: { emoji: "🐢", label: "Perspective" },
  habit: { emoji: "🦈", label: "Habit" },
  wellness: { emoji: "🛰️", label: "Wellness" },
  environment: { emoji: "🚀", label: "Environment" },
};

export function SnapshotSelector({
  currentSnapshotId,
  sessionId,
  currentDay,
  userId,
  onSnapshotChanged,
  isOpen: controlledIsOpen,
  onOpenChange,
}: SnapshotSelectorProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [selectedSnapshot, setSelectedSnapshot] = useState<string | null>(null);
  const [isChanging, setIsChanging] = useState(false);
  const [showBuildModal, setShowBuildModal] = useState(false);
  const [showCustomCreator, setShowCustomCreator] = useState(false);
  const [customSnapshots, setCustomSnapshots] = useState<Snapshot[]>([]);
  const [viewMode, setViewMode] = useState<"recommendation" | "browse">("recommendation");
  const [expandedBuckets, setExpandedBuckets] = useState<Set<BucketId>>(new Set());

  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;
  const setIsOpen = (value: boolean) => {
    if (onOpenChange) {
      onOpenChange(value);
    } else {
      setInternalIsOpen(value);
    }
  };

  const queryClient = useQueryClient();
  const { trackFeatureUse } = useActionTracking();
  const { currentBuild, assessmentHistory, questions, submitAssessment, isSubmitting } = useBuildAssessment();

  // Get recommended snapshot based on build
  const recommendedSnapshot = useMemo(() => {
    return getRecommendedSnapshot(currentBuild, currentSnapshotId);
  }, [currentBuild, currentSnapshotId]);

  // Generate custom snapshot if build data exists
  const customSnapshot = useMemo(() => {
    return generateCustomSnapshot(currentBuild, assessmentHistory);
  }, [currentBuild, assessmentHistory]);

  // Find lowest controllable for highlighting
  const lowestControllable = useMemo(() => {
    if (!currentBuild) return null;
    const scores = [
      { key: "awareness" as Controllable, value: Number(currentBuild.awareness) || 0 },
      { key: "perspective" as Controllable, value: Number(currentBuild.perspective) || 0 },
      { key: "habit" as Controllable, value: Number(currentBuild.habit) || 0 },
      { key: "wellness" as Controllable, value: Number(currentBuild.wellness) || 0 },
      { key: "environment" as Controllable, value: Number(currentBuild.environment) || 0 },
    ];
    return scores.reduce((min, curr) => curr.value < min.value ? curr : min).key;
  }, [currentBuild]);

  // Helper to get snapshot from both standard and custom lists
  const getSnapshot = (id: string | null): Snapshot | null => {
    if (!id) return null;
    // Check custom snapshots first
    const customMatch = customSnapshots.find((s) => s.id === id);
    if (customMatch) return customMatch;
    // Check generated custom snapshot
    if (customSnapshot?.id === id) return customSnapshot;
    // Fall back to standard
    return getSnapshotById(id);
  };

  const currentSnapshot = getSnapshot(currentSnapshotId);

  const handleOpen = () => {
    setSelectedSnapshot(currentSnapshotId || null);
    setViewMode("recommendation");
    setExpandedBuckets(new Set());
    setIsOpen(true);
    trackFeatureUse("snapshot_selector", "open");
  };

  const handleCustomSnapshotCreated = (snapshot: Snapshot) => {
    setCustomSnapshots((prev) => [...prev, snapshot]);
    setSelectedSnapshot(snapshot.id);
    trackFeatureUse("snapshot_selector", "custom_created", { 
      bucket: snapshot.bucketId, 
      focus: snapshot.focus 
    });
  };

  const handleSelect = (snapshotId: string) => {
    setSelectedSnapshot(snapshotId);
  };

  const handleBuildComplete = async (answers: Record<string, number>) => {
    const result = await submitAssessment(answers);
    setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: ["build-assessment"] });
    }, 500);
    return result;
  };

  const toggleBucket = (bucketId: BucketId) => {
    setExpandedBuckets((prev) => {
      const next = new Set(prev);
      if (next.has(bucketId)) {
        next.delete(bucketId);
      } else {
        next.add(bucketId);
      }
      return next;
    });
  };

  const handleConfirm = async () => {
    if (!selectedSnapshot || selectedSnapshot === currentSnapshotId) {
      setIsOpen(false);
      return;
    }

    setIsChanging(true);

    const newSnapshot = getSnapshot(selectedSnapshot);
    const newControllable = newSnapshot?.focus || "habit";

    try {
      // Log the change
      await supabase
        .from("journey_changes" as any)
        .insert({
          user_id: userId,
          session_id: sessionId,
          previous_journey_id: currentSnapshotId,
          new_journey_id: selectedSnapshot,
          changed_on_day: currentDay,
        } as any);

      // Update reset_sessions
      const { error: sessionError } = await supabase
        .from("reset_sessions")
        .update({
          journey_id: selectedSnapshot,
          journey_changed_at: new Date().toISOString(),
        } as any)
        .eq("id", sessionId);

      if (sessionError) throw sessionError;

      // Update onboarding
      await supabase
        .from("user_onboarding" as any)
        .update({
          journey_controllable: newControllable,
          journey_selected_at: new Date().toISOString(),
        } as any)
        .eq("user_id", userId);

      trackFeatureUse("snapshot_selector", "change", {
        from: currentSnapshotId,
        to: selectedSnapshot,
        on_day: currentDay,
        was_custom: selectedSnapshot.startsWith("custom-"),
      });

      queryClient.invalidateQueries({ queryKey: ["user-onboarding"] });
      queryClient.invalidateQueries({ queryKey: ["reset-session"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["journey-changes"] });

      setIsOpen(false);

      const bucket = newSnapshot ? BUCKETS[newSnapshot.bucketId] : null;
      toast.success(`Switched to "${newSnapshot?.name}"`, {
        description: bucket ? `${bucket.emoji} ${bucket.name}` : "Your focus has been updated.",
      });

      onSnapshotChanged?.();
    } catch (error) {
      console.error("Failed to change snapshot:", error);
      toast.error("Failed to change snapshot", {
        description: "Please try again.",
      });
    } finally {
      setIsChanging(false);
    }
  };

  const isControlled = controlledIsOpen !== undefined;

  const renderSnapshotCard = (snapshot: Snapshot, isRecommended = false) => {
    const isSelected = selectedSnapshot === snapshot.id;
    const isCurrent = currentSnapshotId === snapshot.id;
    const focusConfig = CONTROLLABLE_CONFIG[snapshot.focus];

    return (
      <motion.button
        key={snapshot.id}
        onClick={() => handleSelect(snapshot.id)}
        whileTap={{ scale: 0.98 }}
        className={`w-full p-4 rounded-xl border text-left transition-all relative overflow-hidden ${
          isSelected
            ? snapshot.isCustom
              ? "border-amber-500 bg-amber-500/10"
              : "border-primary bg-primary/5"
            : snapshot.isCustom
            ? "border-amber-500/30 bg-amber-500/5 hover:border-amber-500/50"
            : "border-border bg-card hover:border-primary/30"
        }`}
      >
        {/* Selection indicator - positioned absolute top-right, below badges */}
        <div
          className={`absolute top-3 right-3 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
            isSelected
              ? snapshot.isCustom
                ? "border-amber-500 bg-amber-500"
                : "border-primary bg-primary"
              : "border-muted-foreground/30"
          }`}
        >
          {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
        </div>

        {/* Badges - positioned below the checkmark */}
        {(snapshot.isCustom || isRecommended || isCurrent) && (
          <div className="flex items-center gap-1.5 mb-3 flex-wrap">
            {snapshot.isCustom && (
              <Badge variant="outline" className="bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30 text-xs px-1.5">
                <Sparkles className="w-3 h-3 mr-1" />
                For You
              </Badge>
            )}
            {isRecommended && !snapshot.isCustom && (
              <Badge variant="outline" className="bg-primary/20 text-primary border-primary/30 text-xs px-1.5">
                <Sparkles className="w-3 h-3 mr-1" />
                Recommended
              </Badge>
            )}
            {isCurrent && (
              <Badge variant="secondary" className="text-xs px-1.5">Current</Badge>
            )}
          </div>
        )}

        <div className="flex items-start gap-3 pr-8">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl shrink-0 ${
            snapshot.isCustom 
              ? "bg-gradient-to-br from-amber-500/20 to-orange-500/20"
              : "bg-gradient-to-br from-primary/10 to-accent/10"
          }`}>
            {snapshot.emoji}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-foreground">{snapshot.name}</h3>
            <p className="text-xs text-muted-foreground mt-0.5 italic">{snapshot.tagline}</p>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="text-sm">{focusConfig.emoji}</span>
              <span className="text-xs text-muted-foreground">{focusConfig.label} Focus</span>
            </div>
          </div>
        </div>

        {/* Daily actions preview */}
        <AnimatePresence>
          {isSelected && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 pt-3 border-t border-border/50"
            >
              <p className="text-xs font-medium text-foreground mb-2">7 Days of:</p>
              <div className="space-y-1">
                {snapshot.dailyActions.slice(0, 3).map((action) => (
                  <p key={action.day} className="text-xs text-muted-foreground truncate">
                    Day {action.day}: {action.task}
                  </p>
                ))}
                <p className="text-xs text-muted-foreground">...and 4 more daily actions</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
    );
  };

  return (
    <>
      {/* Trigger Button (when not controlled) */}
      {!isControlled && (
        <motion.button
          onClick={handleOpen}
          whileTap={{ scale: 0.98 }}
          className="w-full p-4 rounded-xl bg-gradient-to-br from-primary/5 to-accent/5 border border-primary/20 hover:border-primary/40 transition-all text-left group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
              <Compass className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground mb-0.5">Current Snapshot</p>
              <p className="font-medium text-foreground truncate">
                {currentSnapshot ? (
                  <>
                    {currentSnapshot.emoji} {currentSnapshot.name}
                  </>
                ) : (
                  "No snapshot selected"
                )}
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
        </motion.button>
      )}

      {/* Selection Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="font-display">
              {viewMode === "recommendation" ? "What Kind of Week Is This?" : "Browse All Snapshots"}
            </DialogTitle>
            <DialogDescription>
              {viewMode === "recommendation" 
                ? "A Snapshot is your focus for the next 7 days. One theme. No perfection."
                : "Explore all 36 Snapshots across 6 life themes."
              }
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            {viewMode === "recommendation" ? (
              <>
                {/* Build Scores Summary */}
                {currentBuild ? (
                  <Card className="bg-muted/50 border-border">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-medium text-foreground">Your Build</p>
                          {currentBuild.updated_at && (
                            <span className="text-[10px] text-muted-foreground">
                              • {formatDistanceToNow(new Date(currentBuild.updated_at), { addSuffix: true })}
                            </span>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs"
                          onClick={() => setShowBuildModal(true)}
                        >
                          <RotateCcw className="w-3 h-3 mr-1" />
                          Re-scan
                        </Button>
                      </div>
                      <div className="grid grid-cols-5 gap-1">
                        {(["awareness", "perspective", "habit", "wellness", "environment"] as Controllable[]).map((key) => {
                          const config = CONTROLLABLE_CONFIG[key];
                          const value = Number(currentBuild[key as keyof typeof currentBuild]) || 0;
                          const isLowest = key === lowestControllable;
                          return (
                            <div 
                              key={key} 
                              className={`text-center p-1.5 rounded-lg ${
                                isLowest ? "bg-amber-500/10 border border-amber-500/30" : "bg-background"
                              }`}
                            >
                              <span className="text-sm block">{config.emoji}</span>
                              <span className={`text-xs font-medium block ${
                                isLowest ? "text-amber-600 dark:text-amber-400" : "text-foreground"
                              }`}>
                                {value.toFixed(1)}
                              </span>
                              {isLowest && <TrendingDown className="w-2.5 h-2.5 mx-auto text-amber-500 mt-0.5" />}
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="bg-amber-500/10 border-amber-500/20">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">
                          Scan your Build for personalized recommendations
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => setShowBuildModal(true)}
                        >
                          <RotateCcw className="w-3 h-3 mr-1" />
                          Scan
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Recommended Snapshot */}
                <div className="space-y-3">
                  {customSnapshot && renderSnapshotCard(customSnapshot, false)}
                  {renderSnapshotCard(recommendedSnapshot, !customSnapshot)}
                </div>

                {/* Browse All Button */}
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setViewMode("browse")}
                >
                  Browse All 36 Snapshots
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </>
            ) : (
              <>
                {/* Back Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="mb-2"
                  onClick={() => setViewMode("recommendation")}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Recommendation
                </Button>

                {/* Create Custom Button */}
                <Button
                  variant="outline"
                  className="w-full mb-3 border-dashed border-amber-500/50 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
                  onClick={() => setShowCustomCreator(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Custom Snapshot
                </Button>

                {/* Custom Snapshots Section (if any) */}
                {customSnapshots.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                      Your Custom Snapshots
                    </p>
                    <div className="space-y-2">
                      {customSnapshots.map((snapshot) => renderSnapshotCard(snapshot))}
                    </div>
                  </div>
                )}

                {/* Buckets with Snapshots */}
                <div className="space-y-2">
                  {(Object.keys(BUCKETS) as BucketId[]).map((bucketId) => {
                    const bucket = BUCKETS[bucketId];
                    const bucketSnapshots = getSnapshotsByBucket(bucketId);
                    const isExpanded = expandedBuckets.has(bucketId);

                    return (
                      <Collapsible key={bucketId} open={isExpanded} onOpenChange={() => toggleBucket(bucketId)}>
                        <CollapsibleTrigger className="w-full">
                          <Card className="hover:border-primary/30 transition-colors cursor-pointer">
                            <CardContent className="p-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <span className="text-xl">{bucket.emoji}</span>
                                  <div className="text-left">
                                    <p className="font-medium text-sm text-foreground">{bucket.name}</p>
                                    <p className="text-xs text-muted-foreground italic">{bucket.question}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge variant="secondary" className="text-xs">
                                    {bucketSnapshots.length}
                                  </Badge>
                                  {isExpanded ? (
                                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                  ) : (
                                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="pl-4 pt-2 space-y-2">
                            {bucketSnapshots.map((snapshot) => renderSnapshotCard(snapshot))}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Confirm Button */}
          <div className="pt-4 border-t border-border mt-auto">
            <Button
              onClick={handleConfirm}
              disabled={!selectedSnapshot || selectedSnapshot === currentSnapshotId || isChanging}
              className="w-full"
            >
              {isChanging ? "Changing..." : selectedSnapshot === currentSnapshotId ? "Keep Current" : "Start This Snapshot"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Build Assessment Modal */}
      <BuildAssessmentModal
        open={showBuildModal}
        onOpenChange={setShowBuildModal}
        questions={questions || []}
        onSubmit={handleBuildComplete}
        isSubmitting={isSubmitting}
      />

      {/* Custom Snapshot Creator */}
      <CustomSnapshotCreator
        open={showCustomCreator}
        onOpenChange={setShowCustomCreator}
        onSnapshotCreated={handleCustomSnapshotCreated}
      />
    </>
  );
}
