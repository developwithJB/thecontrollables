import { useState } from "react";
import { motion } from "framer-motion";
import { getControllableTheme } from "@/lib/controllableTheme";
import { ControllableLevelBadge } from "./ControllableLevelBadge";

const theme = getControllableTheme("environment");
import { Target, AlertTriangle, Pencil, Check, X, ChevronDown, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useActionTracking } from "@/hooks/useActionTracking";
import { HierarchyExplainer } from "@/components/dashboard/HierarchyExplainer";
import { useLifeOSUser } from "@/hooks/useLifeOSAuth";
import { useGameSignals } from "@/hooks/useGameSignals";
import { getControllableRosterProfile } from "@/lib/controllableRoster";
import type { SupportMode } from "@/lib/signalInterpreter";

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
  onCompleteQuest?: (questId: string) => void;
  isCreating: boolean;
  isUpdating?: boolean;
  isCompleting?: boolean;
  disabled?: boolean;
}

function formatSupportMode(mode: SupportMode): string {
  switch (mode) {
    case "recover":
      return "Recover";
    case "protect":
      return "Protect";
    case "stretch":
      return "Stretch";
    default:
      return "Normal";
  }
}

export function MainQuestModule({ 
  activeQuest, 
  onCreateQuest, 
  onUpdateQuest,
  isCreating,
  isUpdating = false,
  disabled = false,
}: MainQuestModuleProps) {
  const user = useLifeOSUser();
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  // Keep the existing long-lived quest model, but present it as a calm daily anchor.
  const duration = 365;
  
  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");

  const { trackButtonClick, trackModalAction } = useActionTracking();
  const { signals } = useGameSignals({ userId: user.id });
  const questControllable = signals
    ? signals.supportMode === "stretch"
      ? signals.likelyControllableOpportunity
      : signals.likelyControllableAtRisk
    : null;
  const questProfile = questControllable ? getControllableRosterProfile(questControllable) : null;
  const questExamples = [
    signals?.suggestedMainQuest,
    "Protect your focus",
    "Recover your energy",
    "Finish the important thing",
    "Keep your footing",
  ].filter((example): example is string => Boolean(example));

  const handleSubmit = () => {
    if (!title.trim()) return;
    trackButtonClick("quest_create_submit", { duration_days: duration });
    onCreateQuest({ title: title.trim(), durationDays: duration });
    setIsOpen(false);
    setTitle("");
  };

  const handleStartEdit = () => {
    if (activeQuest) {
      trackButtonClick("quest_edit_start");
      setEditTitle(activeQuest.title);
      setIsEditing(true);
    }
  };

  const handleSaveEdit = () => {
    if (!editTitle.trim() || !activeQuest || !onUpdateQuest) return;
    trackButtonClick("quest_edit_save");
    onUpdateQuest({ questId: activeQuest.id, title: editTitle.trim() });
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    trackButtonClick("quest_edit_cancel");
    setIsEditing(false);
    setEditTitle("");
  };

  const handleOpenDialog = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      trackModalAction("quest_create", "open");
    } else {
      trackModalAction("quest_create", "close");
    }
  };

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
            <h3 className="font-display font-semibold text-foreground">No Main Quest Yet</h3>
            <p className="text-xs text-muted-foreground mt-1">
              {signals
                ? signals.suggestedMainQuest
                : "Choose the one quest you want the day to quietly serve."}
            </p>
          </div>
        </div>

        <Dialog open={isOpen} onOpenChange={handleOpenDialog}>
          <DialogTrigger asChild>
            <Button className="w-full" disabled={disabled}>
              <Target className="w-4 h-4 mr-2" />
              {disabled ? "Loading..." : "Set Main Quest"}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="font-display">Set Main Quest</DialogTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Give the day one clear direction instead of five competing priorities.
              </p>
            </DialogHeader>

            {signals && (
              <div className="rounded-xl border border-primary/15 bg-primary/5 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="secondary" className="text-[11px]">
                    {formatSupportMode(signals.supportMode)} Mode
                  </Badge>
                  <span className="text-[11px] text-muted-foreground">Recommended quest</span>
                </div>
                <p className="text-sm text-foreground/90">{signals.suggestedMainQuest}</p>
                {questProfile ? (
                  <p className="text-xs text-muted-foreground mt-1">
                    {questProfile.roleLabel} energy is shaping the read right now.
                  </p>
                ) : null}
              </div>
            )}
            
            {/* Hierarchy Visual */}
            <div className="py-2 border-b border-border">
              <HierarchyExplainer variant="compact" highlighted="season" />
            </div>
            
            <div className="space-y-4 pt-2">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  What should dominate the day?
                </label>
                <Input
                  placeholder="Name the quest..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="text-base"
                />
                <div className="flex flex-wrap gap-2 mt-3">
                  {questExamples.map((example) => (
                    <button
                      key={example}
                      type="button"
                      onClick={() => setTitle(example)}
                      className="px-3 py-1.5 text-xs rounded-full bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </div>

              {/* Philosophy Section */}
              <Collapsible>
                <CollapsibleTrigger className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-full">
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>Why set a main quest?</span>
                  <ChevronDown className="w-3 h-3 ml-auto" />
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-3">
                  <div className="text-xs text-muted-foreground space-y-2 p-3 rounded-lg bg-muted/50">
                    <p>
                      Your main quest keeps the day from splintering.
                      It is the thing your other moves should quietly support.
                    </p>
                    <ul className="space-y-1.5 pl-3">
                      <li className="flex items-start gap-2">
                        <span className="text-primary">•</span>
                        <span><strong>One quest is enough</strong> — the goal is clarity, not intensity</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary">•</span>
                        <span><strong>Support moves stay secondary</strong> — they help the quest instead of competing with it</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary">•</span>
                        <span><strong>You can repair and reset</strong> — quests are meant to guide, not shame</span>
                      </li>
                    </ul>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              <Button 
                onClick={handleSubmit} 
                className="w-full" 
                disabled={!title.trim() || isCreating || disabled}
              >
                {isCreating ? "Setting..." : "Set Main Quest"}
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
      className={`p-6 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 ${theme.borderClass}`}
    >
      <div className="flex items-start justify-between mb-1">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="p-2 rounded-lg bg-primary/20 shrink-0">
            <Target className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Main Quest</p>
              <span className={`text-xs font-medium ${theme.textClass}`}>{theme.emoji} {theme.label}</span>
              <ControllableLevelBadge controllable="environment" />
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5 mb-2">
              {signals ? `${formatSupportMode(signals.supportMode)} mode` : "One clear direction for the day."}
            </p>
            
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
              <div className="space-y-1">
                <div className="flex items-start gap-2">
                  <h3 className="font-display font-semibold text-foreground text-base md:text-lg line-clamp-2 leading-snug">
                    {activeQuest.title}
                  </h3>
                  {onUpdateQuest && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 shrink-0 mt-0.5"
                      onClick={handleStartEdit}
                    >
                      <Pencil className="w-3 h-3 text-muted-foreground hover:text-foreground" />
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
        
      </div>

      {/* Bottom action row */}
      <div className="flex items-center justify-between text-sm mt-3">
        <p className="text-xs text-muted-foreground italic">
          {signals ? signals.suggestedMainQuest : theme.tip}
        </p>
        {onUpdateQuest && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground shrink-0"
            onClick={handleStartEdit}
          >
            <Pencil className="w-3 h-3 mr-1" />
            Update
          </Button>
        )}
      </div>
    </motion.div>
  );
}
