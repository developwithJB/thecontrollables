import { useState } from "react";
import { motion } from "framer-motion";
import { Target, AlertTriangle, ChevronRight, Pencil, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface MainQuest {
  id: string;
  title: string;
  duration_days: number;
  started_at: string;
  ends_at: string | null;
  status: string;
}

interface MainQuestModuleProps {
  activeQuest: MainQuest | null;
  onCreateQuest: (data: { title: string; durationDays: number }) => void;
  onUpdateQuest?: (data: { questId: string; title: string }) => void;
  isCreating: boolean;
  isUpdating?: boolean;
}

export function MainQuestModule({ 
  activeQuest, 
  onCreateQuest, 
  onUpdateQuest,
  isCreating,
  isUpdating = false 
}: MainQuestModuleProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState<7 | 30 | 90>(7);
  
  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");

  const handleSubmit = () => {
    if (!title.trim()) return;
    onCreateQuest({ title: title.trim(), durationDays: duration });
    setIsOpen(false);
    setTitle("");
  };

  const handleStartEdit = () => {
    if (activeQuest) {
      setEditTitle(activeQuest.title);
      setIsEditing(true);
    }
  };

  const handleSaveEdit = () => {
    if (!editTitle.trim() || !activeQuest || !onUpdateQuest) return;
    onUpdateQuest({ questId: activeQuest.id, title: editTitle.trim() });
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditTitle("");
  };

  // Calculate days remaining
  const daysRemaining = activeQuest?.ends_at 
    ? Math.max(0, Math.ceil((new Date(activeQuest.ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  const progressPercent = activeQuest && daysRemaining !== null
    ? Math.min(100, ((activeQuest.duration_days - daysRemaining) / activeQuest.duration_days) * 100)
    : 0;

  if (!activeQuest) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 rounded-2xl bg-card border border-dashed border-muted-foreground/30"
      >
        <div className="flex items-start gap-3 mb-4">
          <div className="p-2 rounded-lg bg-muted">
            <AlertTriangle className="w-5 h-5 text-muted-foreground" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-foreground">No Active Quest</h3>
            <p className="text-sm text-muted-foreground">Default path detected.</p>
          </div>
        </div>
        
        <p className="text-sm text-muted-foreground mb-4">
          Without a quest, life plays you instead of you playing it.
        </p>

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="w-full">
              <Target className="w-4 h-4 mr-2" />
              Choose Your Quest
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="font-display">Define Your Main Quest</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  What's the one thing that matters most?
                </label>
                <Input
                  placeholder="e.g., Launch my business"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="text-base"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Quest duration
                </label>
                <div className="flex gap-2">
                  {[7, 30, 90].map((days) => (
                    <button
                      key={days}
                      onClick={() => setDuration(days as 7 | 30 | 90)}
                      className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                        duration === days
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      {days} days
                    </button>
                  ))}
                </div>
              </div>

              <Button 
                onClick={handleSubmit} 
                className="w-full" 
                disabled={!title.trim() || isCreating}
              >
                {isCreating ? "Activating..." : "Activate Quest"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="p-2 rounded-lg bg-primary/20 shrink-0">
            <Target className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Main Quest</p>
            
            {isEditing ? (
              <div className="flex items-center gap-2">
                <Input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="h-8 text-base font-display font-semibold"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveEdit();
                    if (e.key === "Escape") handleCancelEdit();
                  }}
                />
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 shrink-0"
                  onClick={handleSaveEdit}
                  disabled={!editTitle.trim() || isUpdating}
                >
                  <Check className="w-4 h-4 text-primary" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 shrink-0"
                  onClick={handleCancelEdit}
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h3 className="font-display font-semibold text-foreground text-lg truncate">
                  {activeQuest.title}
                </h3>
                {onUpdateQuest && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 shrink-0"
                    onClick={handleStartEdit}
                  >
                    <Pencil className="w-3 h-3 text-muted-foreground hover:text-foreground" />
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
        {!isEditing && <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />}
      </div>

      {/* Progress bar */}
      <div className="mb-3">
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="h-full bg-primary rounded-full"
          />
        </div>
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          {daysRemaining} days remaining
        </span>
        <span className="text-primary font-medium">
          {Math.round(progressPercent)}% complete
        </span>
      </div>
    </motion.div>
  );
}
