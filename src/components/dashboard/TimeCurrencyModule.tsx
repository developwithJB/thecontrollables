import { useState, useImperativeHandle, forwardRef, useCallback } from "react";
import { motion } from "framer-motion";
import { Clock, Sparkles } from "lucide-react";
import { getControllableTheme } from "@/lib/controllableTheme";

const theme = getControllableTheme("awareness");
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { useActionTracking } from "@/hooks/useActionTracking";
import { useAutoLoadingTimeout } from "@/hooks/useLoadingTimeout";
import { TimeoutWarning } from "@/components/ui/TimeoutWarning";

interface TimeLog {
  time_invested_minutes: number;
  time_wasted_minutes: number;
  notes: string | null;
}

interface TimeCurrencyModuleProps {
  todayTimeLog: TimeLog | null;
  onLogTime: (data: { invested: number; wasted: number; notes?: string }) => Promise<unknown>;
  isLogging: boolean;
  compact?: boolean;
  disabled?: boolean;
}

export interface TimeCurrencyModuleHandle {
  openLogDialog: () => void;
}

export const TimeCurrencyModule = forwardRef<TimeCurrencyModuleHandle, TimeCurrencyModuleProps>(
  function TimeCurrencyModule({ todayTimeLog, onLogTime, isLogging, compact = false, disabled = false }, ref) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Reflection sliders (0-100 scale for smoother UX)
  const [intentionalPercent, setIntentionalPercent] = useState(50);
  const [energyLevel, setEnergyLevel] = useState(50);
  const [notes, setNotes] = useState("");
  const [isNotesOpen, setIsNotesOpen] = useState(false);

  const { trackButtonClick, trackModalAction } = useActionTracking();

  // Track saving timeout
  const { isTimedOut: isSaveTimedOut } = useAutoLoadingTimeout(isSaving, {
    timeoutMs: 5000,
    context: "TimeReflectionSave",
  });

  // Immediate input handler for notes - no debouncing for responsiveness
  const handleNotesChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNotes(e.target.value);
  }, []);

  // Expose imperative handle to open dialog from parent
  useImperativeHandle(ref, () => ({
    openLogDialog: () => {
      handleOpenDialog();
    },
  }));

  const handleOpenDialog = () => {
    trackModalAction("time_reflection", "open");
    // Pre-fill based on existing values or defaults
    if (todayTimeLog) {
      const total = todayTimeLog.time_invested_minutes + todayTimeLog.time_wasted_minutes;
      if (total > 0) {
        setIntentionalPercent(Math.round((todayTimeLog.time_invested_minutes / total) * 100));
      }
      setNotes(todayTimeLog.notes || "");
      setIsNotesOpen(!!todayTimeLog.notes);
    } else {
      setIntentionalPercent(50);
      setEnergyLevel(50);
      setNotes("");
      setIsNotesOpen(false);
    }
    setIsOpen(true);
  };

  const handleSubmit = async () => {
    if (isSaving) return;
    
    setIsSaving(true);
    trackButtonClick("time_reflection_submit", { 
      intentionalPercent,
      energyLevel
    });
    
    // Convert percentages to minutes (using a 10-hour day = 600 mins as reference)
    const totalMins = 600;
    const invested = Math.round((intentionalPercent / 100) * totalMins);
    const wasted = totalMins - invested;
    
    try {
      await onLogTime({
        invested,
        wasted,
        notes: notes.trim() || undefined,
      });
      setIsOpen(false);
    } catch (error) {
      console.error("Time reflection error:", error);
      // Dialog stays open on error so user can retry
    } finally {
      setIsSaving(false);
    }
  };

  const handleDetailOpen = (open: boolean) => {
    setIsDetailOpen(open);
    if (open) {
      trackModalAction("time_detail", "open");
    }
  };

  const getReflectionLabel = (percent: number): string => {
    if (percent >= 80) return "Highly intentional";
    if (percent >= 60) return "Mostly focused";
    if (percent >= 40) return "Mixed day";
    if (percent >= 20) return "Scattered";
    return "Off track";
  };

  const getReflectionEmoji = (percent: number): string => {
    if (percent >= 80) return "🎯";
    if (percent >= 60) return "✨";
    if (percent >= 40) return "🌤️";
    if (percent >= 20) return "🌫️";
    return "🌧️";
  };

  const investedMins = todayTimeLog?.time_invested_minutes || 0;
  const wastedMins = todayTimeLog?.time_wasted_minutes || 0;
  const total = investedMins + wastedMins;
  const investedPercent = total > 0 ? (investedMins / total) * 100 : 50;

  // Compact state indicator version
  if (compact) {
    return (
      <>
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          onClick={() => setIsDetailOpen(true)}
          className="w-full text-left p-3 rounded-xl bg-card/60 border border-border/50 hover:bg-card/80 hover:border-border transition-all"
        >
          {/* Header */}
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1 rounded-md bg-blue-500/10">
              <Clock className="w-3.5 h-3.5 text-blue-500" />
            </div>
            <h3 className="text-sm font-medium text-foreground">Time Reflection</h3>
          </div>

          {todayTimeLog ? (
            <>
              {/* Reflection bar */}
              <div className="mb-2">
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-400 to-green-400"
                    style={{ width: `${investedPercent}%` }}
                  />
                </div>
              </div>

              {/* Compact label */}
              <div className="flex items-center gap-1.5 text-xs">
                <span>{getReflectionEmoji(investedPercent)}</span>
                <span className="text-muted-foreground">{getReflectionLabel(investedPercent)}</span>
              </div>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">Reflect on yesterday</p>
          )}
        </motion.button>

        {/* Detail Modal */}
        <Dialog open={isDetailOpen} onOpenChange={handleDetailOpen}>
          <DialogContent className="max-w-sm max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-500" />
                Time Reflection
              </DialogTitle>
              <DialogDescription>
                How intentionally did you spend your time yesterday?
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              {todayTimeLog && (
                <div className="text-center py-4">
                  <p className="text-4xl mb-2">{getReflectionEmoji(investedPercent)}</p>
                  <p className="text-lg font-medium text-foreground">{getReflectionLabel(investedPercent)}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {Math.round(investedPercent)}% intentional
                  </p>
                  {todayTimeLog.notes && (
                    <div className="mt-4 p-3 rounded-lg bg-muted/50 text-left">
                      <p className="text-xs text-muted-foreground mb-1">Yesterday's note:</p>
                      <p className="text-sm text-foreground">{todayTimeLog.notes}</p>
                    </div>
                  )}
                </div>
              )}

              {!todayTimeLog && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Take a moment to reflect on your day
                </p>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsDetailOpen(false);
                  handleOpenDialog();
                }}
                className="w-full"
                disabled={disabled}
              >
                {disabled ? "Loading..." : todayTimeLog ? "Update Reflection" : "Reflect on Yesterday"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Reflection Dialog */}
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="font-display flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-500" />
                Daily Reflection
              </DialogTitle>
              <DialogDescription>
                A moment of honest awareness about yesterday
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 pt-4">
              {/* Intentionality slider */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Scattered</span>
                  <span className="text-sm text-muted-foreground">Intentional</span>
                </div>
                <Slider
                  value={[intentionalPercent]}
                  onValueChange={(v) => setIntentionalPercent(v[0])}
                  max={100}
                  step={5}
                  className="w-full"
                />
                <div className="text-center">
                  <p className="text-3xl mb-1">{getReflectionEmoji(intentionalPercent)}</p>
                  <p className="font-medium text-foreground">{getReflectionLabel(intentionalPercent)}</p>
                </div>
              </div>

              <p className="text-xs text-center text-muted-foreground">
                No judgment—just awareness. How much of yesterday felt aligned with your intentions?
              </p>

              {/* Optional notes section */}
              <Collapsible open={isNotesOpen} onOpenChange={setIsNotesOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-full text-muted-foreground hover:text-foreground">
                    <ChevronDown className={`w-4 h-4 mr-1 transition-transform ${isNotesOpen ? "rotate-180" : ""}`} />
                    {isNotesOpen ? "Hide journal note" : "Add a journal note (optional)"}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-2">
                  <Textarea
                    placeholder="Any thoughts, wins, or lessons from yesterday..."
                    value={notes}
                    onChange={handleNotesChange}
                    className="min-h-[80px] text-sm resize-none"
                    maxLength={500}
                    data-testid="time-reflection-notes"
                  />
                  <p className="text-xs text-muted-foreground text-right mt-1">{notes.length}/500</p>
                </CollapsibleContent>
              </Collapsible>

              {isSaveTimedOut && (
                <TimeoutWarning
                  variant="inline"
                  message="Save is taking longer than expected..."
                />
              )}

              <Button 
                onClick={handleSubmit} 
                className="w-full" 
                disabled={isSaving || disabled}
                data-testid="time-reflection-submit"
              >
                {isSaving ? (isSaveTimedOut ? "Still saving..." : "Saving...") : disabled ? "Loading..." : todayTimeLog ? "Update" : "Save Reflection"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Full version
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="p-5 rounded-2xl bg-card border shadow-soft"
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="p-1.5 rounded-lg bg-blue-500/10">
          <Sparkles className="w-4 h-4 text-blue-500" />
        </div>
        <h3 className="font-display font-semibold text-foreground">Time Reflection</h3>
      </div>

      {todayTimeLog && (
        <div className="text-center py-4 mb-4">
          <p className="text-4xl mb-2">{getReflectionEmoji(investedPercent)}</p>
          <p className="text-lg font-medium text-foreground">{getReflectionLabel(investedPercent)}</p>
          <p className="text-sm text-muted-foreground mt-1">
            {Math.round(investedPercent)}% intentional
          </p>
        </div>
      )}

      {!todayTimeLog && (
        <p className="text-sm text-muted-foreground text-center mb-3">
          Take a moment to reflect
        </p>
      )}

      <Button variant="outline" size="sm" onClick={handleOpenDialog} className="w-full" disabled={disabled}>
        {disabled ? "Loading..." : todayTimeLog ? "Update Reflection" : "Reflect on Yesterday"}
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-500" />
              Daily Reflection
            </DialogTitle>
            <DialogDescription>
              A moment of honest awareness about yesterday
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 pt-4">
            {/* Intentionality slider */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Scattered</span>
                <span className="text-sm text-muted-foreground">Intentional</span>
              </div>
              <Slider
                value={[intentionalPercent]}
                onValueChange={(v) => setIntentionalPercent(v[0])}
                max={100}
                step={5}
                className="w-full"
              />
              <div className="text-center">
                <p className="text-3xl mb-1">{getReflectionEmoji(intentionalPercent)}</p>
                <p className="font-medium text-foreground">{getReflectionLabel(intentionalPercent)}</p>
              </div>
            </div>

            <p className="text-xs text-center text-muted-foreground">
              No judgment—just awareness. How much of yesterday felt aligned with your intentions?
            </p>

            {/* Optional notes section */}
            <Collapsible open={isNotesOpen} onOpenChange={setIsNotesOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full text-muted-foreground hover:text-foreground">
                  <ChevronDown className={`w-4 h-4 mr-1 transition-transform ${isNotesOpen ? "rotate-180" : ""}`} />
                  {isNotesOpen ? "Hide journal note" : "Add a journal note (optional)"}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2">
                <Textarea
                  placeholder="Any thoughts, wins, or lessons from yesterday..."
                  value={notes}
                  onChange={handleNotesChange}
                  className="min-h-[80px] text-sm resize-none"
                  maxLength={500}
                  data-testid="time-reflection-notes-full"
                />
                <p className="text-xs text-muted-foreground text-right mt-1">{notes.length}/500</p>
              </CollapsibleContent>
            </Collapsible>

            {isSaveTimedOut && (
              <TimeoutWarning
                variant="inline"
                message="Save is taking longer than expected..."
              />
            )}

            <Button 
              onClick={handleSubmit} 
              className="w-full" 
              disabled={isSaving || disabled}
              data-testid="time-reflection-submit-full"
            >
              {isSaving ? (isSaveTimedOut ? "Still saving..." : "Saving...") : disabled ? "Loading..." : todayTimeLog ? "Update" : "Save Reflection"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
});
