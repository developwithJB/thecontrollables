import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Plus, Sparkles, Check, ArrowRight, ArrowLeft } from "lucide-react";
import { 
  BUCKETS,
  type BucketId,
  type Controllable,
  type Snapshot,
  type DailyAction,
} from "@/lib/snapshots";
import { toast } from "sonner";

interface CustomSnapshotCreatorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSnapshotCreated: (snapshot: Snapshot) => void;
}

const CONTROLLABLE_OPTIONS: { id: Controllable; emoji: string; label: string }[] = [
  { id: "awareness", emoji: "🦉", label: "Awareness" },
  { id: "perspective", emoji: "🐢", label: "Perspective" },
  { id: "habit", emoji: "🦈", label: "Habit" },
  { id: "wellness", emoji: "🛰️", label: "Wellness" },
  { id: "environment", emoji: "🚀", label: "Environment" },
];

const EMOJI_OPTIONS = ["✨", "🎯", "🌟", "💫", "🔥", "🌈", "⚡", "🎪", "🏔️", "🌊", "🦋", "🌙"];

export function CustomSnapshotCreator({
  open,
  onOpenChange,
  onSnapshotCreated,
}: CustomSnapshotCreatorProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedBucket, setSelectedBucket] = useState<BucketId | null>(null);
  const [selectedFocus, setSelectedFocus] = useState<Controllable | null>(null);
  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [selectedEmoji, setSelectedEmoji] = useState("✨");
  const [dailyActions, setDailyActions] = useState<DailyAction[]>(
    Array.from({ length: 7 }, (_, i) => ({
      day: i + 1,
      task: "",
      description: "",
    }))
  );

  const handleReset = () => {
    setStep(1);
    setSelectedBucket(null);
    setSelectedFocus(null);
    setName("");
    setTagline("");
    setSelectedEmoji("✨");
    setDailyActions(
      Array.from({ length: 7 }, (_, i) => ({
        day: i + 1,
        task: "",
        description: "",
      }))
    );
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(handleReset, 300);
  };

  const handleNext = () => {
    if (step === 1 && selectedBucket && selectedFocus) {
      setStep(2);
    } else if (step === 2 && name.trim() && tagline.trim()) {
      setStep(3);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep((step - 1) as 1 | 2);
    }
  };

  const updateDailyAction = (day: number, field: "task" | "description", value: string) => {
    setDailyActions((prev) =>
      prev.map((action) =>
        action.day === day ? { ...action, [field]: value } : action
      )
    );
  };

  const handleCreate = () => {
    if (!selectedBucket || !selectedFocus || !name.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    // Validate at least day 1 has a task
    if (!dailyActions[0].task.trim()) {
      toast.error("Please add at least the first day's task");
      return;
    }

    const customSnapshot: Snapshot = {
      id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: name.trim(),
      bucketId: selectedBucket,
      focus: selectedFocus,
      tagline: tagline.trim() || `A custom ${BUCKETS[selectedBucket].name} week`,
      emoji: selectedEmoji,
      isCustom: true,
      dailyActions: dailyActions.map((action, idx) => ({
        ...action,
        task: action.task.trim() || `Day ${idx + 1} action`,
        description: action.description.trim() || "Your custom task for today.",
      })),
    };

    onSnapshotCreated(customSnapshot);
    handleClose();
    toast.success("Custom Snapshot created!", {
      description: `"${name}" is ready to start.`,
    });
  };

  const canProceedStep1 = selectedBucket && selectedFocus;
  const canProceedStep2 = name.trim().length > 0 && tagline.trim().length > 0;
  const canCreate = dailyActions[0].task.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            Create Custom Snapshot
          </DialogTitle>
          <DialogDescription>
            {step === 1 && "Choose where this week belongs and what you'll focus on."}
            {step === 2 && "Give your Snapshot a name and personality."}
            {step === 3 && "Define your 7 daily actions."}
          </DialogDescription>
        </DialogHeader>

        {/* Progress Dots */}
        <div className="flex items-center justify-center gap-2 py-2">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`w-2 h-2 rounded-full transition-colors ${
                s === step ? "bg-primary" : s < step ? "bg-primary/50" : "bg-muted"
              }`}
            />
          ))}
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                {/* Bucket Selection */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">Which bucket does this belong to?</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {(Object.keys(BUCKETS) as BucketId[]).map((bucketId) => {
                      const bucket = BUCKETS[bucketId];
                      const isSelected = selectedBucket === bucketId;
                      return (
                        <button
                          key={bucketId}
                          onClick={() => setSelectedBucket(bucketId)}
                          className={`p-3 rounded-lg border text-left transition-all ${
                            isSelected
                              ? "border-primary bg-primary/10"
                              : "border-border hover:border-primary/30"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{bucket.emoji}</span>
                            <span className="text-sm font-medium truncate">{bucket.name}</span>
                          </div>
                          {isSelected && (
                            <Check className="w-4 h-4 text-primary absolute top-2 right-2" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Focus Selection */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">What's your focus for this week?</Label>
                  <div className="flex flex-wrap gap-2">
                    {CONTROLLABLE_OPTIONS.map((ctrl) => {
                      const isSelected = selectedFocus === ctrl.id;
                      return (
                        <button
                          key={ctrl.id}
                          onClick={() => setSelectedFocus(ctrl.id)}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
                            isSelected
                              ? "border-primary bg-primary/10"
                              : "border-border hover:border-primary/30"
                          }`}
                        >
                          <span className="text-lg">{ctrl.emoji}</span>
                          <span className="text-sm">{ctrl.label}</span>
                          {isSelected && <Check className="w-4 h-4 text-primary" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                {/* Emoji Selection */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">Pick an emoji</Label>
                  <div className="flex flex-wrap gap-2">
                    {EMOJI_OPTIONS.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => setSelectedEmoji(emoji)}
                        className={`w-10 h-10 rounded-lg border text-xl flex items-center justify-center transition-all ${
                          selectedEmoji === emoji
                            ? "border-primary bg-primary/10"
                            : "border-border hover:border-primary/30"
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Name */}
                <div>
                  <Label htmlFor="snapshot-name" className="text-sm font-medium mb-2 block">
                    Snapshot Name
                  </Label>
                  <Input
                    id="snapshot-name"
                    placeholder="e.g., My Focus Week"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={40}
                  />
                  <p className="text-xs text-muted-foreground mt-1">{name.length}/40</p>
                </div>

                {/* Tagline */}
                <div>
                  <Label htmlFor="snapshot-tagline" className="text-sm font-medium mb-2 block">
                    Tagline
                  </Label>
                  <Input
                    id="snapshot-tagline"
                    placeholder="e.g., A week of intentional action"
                    value={tagline}
                    onChange={(e) => setTagline(e.target.value)}
                    maxLength={60}
                  />
                  <p className="text-xs text-muted-foreground mt-1">{tagline.length}/60</p>
                </div>

                {/* Preview */}
                {name && (
                  <Card className="bg-muted/50">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center text-xl">
                          {selectedEmoji}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{name}</p>
                          <p className="text-xs text-muted-foreground italic">{tagline || "Your tagline..."}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-3"
              >
                <p className="text-sm text-muted-foreground">
                  Define what you'll do each day. At minimum, fill in Day 1.
                </p>
                
                {dailyActions.map((action) => (
                  <div key={action.day} className="space-y-1">
                    <Label className="text-xs font-medium text-muted-foreground">
                      Day {action.day}
                    </Label>
                    <Input
                      placeholder={`Day ${action.day} task...`}
                      value={action.task}
                      onChange={(e) => updateDailyAction(action.day, "task", e.target.value)}
                      className="h-9"
                    />
                    <Textarea
                      placeholder="Optional description..."
                      value={action.description}
                      onChange={(e) => updateDailyAction(action.day, "description", e.target.value)}
                      className="min-h-[40px] text-xs resize-none"
                      rows={1}
                    />
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-border mt-auto flex items-center gap-2">
          {step > 1 && (
            <Button variant="outline" onClick={handleBack} className="flex-1">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          )}
          
          {step < 3 ? (
            <Button
              onClick={handleNext}
              disabled={step === 1 ? !canProceedStep1 : !canProceedStep2}
              className="flex-1"
            >
              Next
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleCreate}
              disabled={!canCreate}
              className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Snapshot
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
