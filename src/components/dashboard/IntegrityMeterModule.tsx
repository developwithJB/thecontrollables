import { useState, useImperativeHandle, forwardRef, useCallback } from "react";
import { motion } from "framer-motion";
import { Shield, Check, X } from "lucide-react";
import { getControllableTheme } from "@/lib/controllableTheme";
import { ControllableLevelBadge } from "./ControllableLevelBadge";

const theme = getControllableTheme("perspective");
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useActionTracking } from "@/hooks/useActionTracking";
import { useAutoLoadingTimeout } from "@/hooks/useLoadingTimeout";
import { TimeoutWarning } from "@/components/ui/TimeoutWarning";

interface IntegrityLog {
  id: string;
  promise_text: string;
  promised_at: string;
  kept: boolean | null;
}

interface IntegrityMeterModuleProps {
  integrityScore: number | null;
  pendingPromises: IntegrityLog[];
  onCreatePromise: (data: { promiseText: string }) => Promise<unknown>;
  onResolvePromise: (data: { promiseId: string; kept: boolean }) => void;
  hasAnyPromises?: boolean;
  todayPromiseMade?: boolean;
  compact?: boolean;
  disabled?: boolean;
}

export interface IntegrityMeterModuleHandle {
  openDetailDialog: () => void;
  openPromiseDialog: () => void;
}

export const IntegrityMeterModule = forwardRef<IntegrityMeterModuleHandle, IntegrityMeterModuleProps>(
  function IntegrityMeterModule({
    integrityScore,
    pendingPromises,
    onCreatePromise,
    onResolvePromise,
    hasAnyPromises = false,
    todayPromiseMade = false,
    compact = false,
    disabled = false,
  }, ref) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [promiseText, setPromiseText] = useState("");
    const [isSubmittingPromise, setIsSubmittingPromise] = useState(false);
    const [optimisticPromiseMadeToday, setOptimisticPromiseMadeToday] = useState(false);

    const promiseMadeToday = todayPromiseMade || optimisticPromiseMadeToday;

  const { trackButtonClick, trackModalAction } = useActionTracking();

  // Track promise submission timeout
  const { isTimedOut: isSubmitTimedOut } = useAutoLoadingTimeout(isSubmittingPromise, {
    timeoutMs: 5000,
    context: "PromiseSubmit",
  });

  // Immediate input handler for promise text - no debouncing for responsiveness
  const handlePromiseTextChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setPromiseText(e.target.value);
  }, []);

  // Expose imperative handle to open dialogs from parent
  useImperativeHandle(ref, () => ({
    openDetailDialog: () => {
      setIsDetailOpen(true);
      trackModalAction("integrity_detail", "open");
    },
    openPromiseDialog: () => {
      setIsOpen(true);
      trackModalAction("promise_create", "open");
    },
  }));

  const handleSubmit = async () => {
    if (!promiseText.trim() || disabled || isSubmittingPromise) return;
    trackButtonClick("promise_create_submit");

    setIsSubmittingPromise(true);
    try {
      await onCreatePromise({ promiseText: promiseText.trim() });
      // Optimistically reflect success immediately (refetch will confirm)
      setOptimisticPromiseMadeToday(true);
      setIsOpen(false);
      setPromiseText("");
    } catch {
      // Keep modal open on failure; toast is handled upstream if configured
    } finally {
      setIsSubmittingPromise(false);
    }
  };

  const handleResolve = (promiseId: string, kept: boolean) => {
    trackButtonClick(kept ? "promise_kept" : "promise_broken", { promise_id: promiseId });
    onResolvePromise({ promiseId, kept });
  };

  const handleDetailOpen = (open: boolean) => {
    setIsDetailOpen(open);
    if (open) {
      trackModalAction("integrity_detail", "open");
    }
  };

  const handlePromiseModalOpen = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      trackModalAction("promise_create", "open");
    }
  };

  // Determine integrity status
  const getIntegrityStatus = () => {
    if (integrityScore === null) return { label: "No data", color: "text-muted-foreground", bg: "bg-muted" };
    if (integrityScore >= 80) return { label: "High integrity", color: "text-green-600 dark:text-green-400", bg: "bg-green-500" };
    if (integrityScore >= 50) return { label: "Aligned", color: "text-accent", bg: "bg-accent" };
    if (integrityScore >= 30) return { label: "Under-committed", color: "text-yellow-600 dark:text-yellow-400", bg: "bg-yellow-500" };
    return { label: "Over-committed", color: "text-destructive", bg: "bg-destructive" };
  };

  const status = getIntegrityStatus();

  // Compact state indicator version
  if (compact) {
    return (
      <>
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          onClick={() => setIsDetailOpen(true)}
          className="w-full text-left p-3 rounded-xl bg-card/60 border border-border/50 hover:bg-card/80 hover:border-border transition-all"
        >
          {/* Header */}
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1 rounded-md bg-primary/10">
              <Shield className="w-3.5 h-3.5 text-primary" />
            </div>
            <h3 className="text-sm font-medium text-foreground">Integrity</h3>
          </div>

          {integrityScore !== null ? (
            <>
              {/* Score Display */}
              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-2xl font-display font-bold text-foreground">{integrityScore}</span>
                <span className="text-xs text-muted-foreground">%</span>
              </div>

              {/* Mini progress bar */}
              <div className="mb-1">
                <div className="h-1 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full ${status.bg}`}
                    style={{ width: `${integrityScore}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className={`text-[10px] ${status.color}`}>{status.label}</span>
                {pendingPromises.length > 0 && (
                  <span className="text-[10px] text-muted-foreground">{pendingPromises.length} open</span>
                )}
              </div>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">
              {pendingPromises.length > 0
                ? `${pendingPromises.length} open ${pendingPromises.length === 1 ? "promise" : "promises"}`
                : promiseMadeToday
                  ? "Saved today — review tomorrow"
                  : hasAnyPromises
                    ? "No open promises"
                    : "No promises yet"}
            </p>
          )}
        </motion.button>

        {/* Detail Modal */}
        <Dialog open={isDetailOpen} onOpenChange={handleDetailOpen}>
          <DialogContent className="max-w-sm max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" />
                Integrity
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              {/* Score Display */}
              <div className="text-center">
                {integrityScore !== null ? (
                  <>
                    <div className="inline-flex items-baseline gap-1">
                      <span className="text-4xl font-display font-bold text-foreground">{integrityScore}</span>
                      <span className="text-lg text-muted-foreground">%</span>
                    </div>
                    <p className={`text-sm mt-1 ${status.color}`}>{status.label}</p>
                  </>
                ) : (
                  <div className="py-2 space-y-1">
                    <p className="text-muted-foreground text-sm">
                      {hasAnyPromises ? "Promises tracked" : "No promises tracked yet"}
                    </p>
                    {promiseMadeToday && (
                      <p className="text-xs text-muted-foreground">Saved today — it will appear here tomorrow for review.</p>
                    )}
                  </div>
                )}
              </div>

              {/* Progress bar */}
              {integrityScore !== null && (
                <div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${integrityScore}%` }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                      className={`h-full rounded-full ${status.bg}`}
                    />
                  </div>
                </div>
              )}

              {/* Pending promises */}
              {pendingPromises.length > 0 && (
                <div className="pt-3 border-t space-y-2">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">
                    Open promises ({pendingPromises.length})
                  </p>
                  {pendingPromises.map((promise) => (
                    <div key={promise.id} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-muted/50">
                      <p className="text-sm text-foreground truncate flex-1">{promise.promise_text}</p>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleResolve(promise.id, true)}
                          className="p-1 rounded hover:bg-green-500/20 text-green-600 dark:text-green-400 disabled:opacity-50"
                          disabled={disabled}
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleResolve(promise.id, false)}
                          className="p-1 rounded hover:bg-destructive/20 text-destructive disabled:opacity-50"
                          disabled={disabled}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {pendingPromises.length === 0 && promiseMadeToday && (
                <div className="pt-3 border-t">
                  <p className="text-xs text-muted-foreground">
                    Today’s promise is saved. It will show up here tomorrow for review.
                  </p>
                </div>
              )}

              {/* Make a Promise button */}
              <div className="pt-3 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  disabled={disabled}
                  onClick={() => {
                    setIsDetailOpen(false);
                    handlePromiseModalOpen(true);
                  }}
                >
                  {disabled ? "Loading..." : "Make a Promise"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Promise Dialog */}
        <Dialog open={isOpen} onOpenChange={handlePromiseModalOpen}>
          <DialogTrigger asChild>
            <span className="hidden" />
          </DialogTrigger>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="font-display">Make a Promise</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <p className="text-sm text-muted-foreground">
                Confidence comes from kept promises. Only promise what you'll do.
              </p>
              <Input
                placeholder="I will..."
                value={promiseText}
                onChange={handlePromiseTextChange}
                className="text-base"
                data-testid="promise-input"
                autoFocus
              />
              {isSubmitTimedOut && (
                <TimeoutWarning
                  variant="inline"
                  message="Save is taking longer than expected..."
                />
              )}
              <Button
                onClick={handleSubmit}
                className="w-full"
                disabled={!promiseText.trim() || disabled || isSubmittingPromise}
                data-testid="promise-submit"
              >
                {isSubmittingPromise ? (isSubmitTimedOut ? "Still saving..." : "Saving...") : disabled ? "Loading..." : "Make Promise"}
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
      transition={{ delay: 0.15 }}
      className={`p-5 rounded-2xl bg-card border shadow-soft ${theme.borderClass}`}
    >
      <div className="flex items-center gap-2 mb-1">
        <div className="p-1.5 rounded-lg bg-perspective/10">
          <Shield className="w-4 h-4 text-perspective" />
        </div>
        <h3 className="font-display font-semibold text-foreground">Integrity</h3>
        <span className={`ml-auto text-xs font-medium ${theme.textClass}`}>{theme.emoji} {theme.label}</span>
        <ControllableLevelBadge controllable="perspective" />
      </div>
      <div className="mb-4" />

      {/* Score Display */}
      <div className="text-center mb-4">
        {integrityScore !== null ? (
          <>
            <div className="inline-flex items-baseline gap-1">
              <span className="text-4xl font-display font-bold text-foreground">{integrityScore}</span>
              <span className="text-lg text-muted-foreground">%</span>
            </div>
            <p className={`text-sm mt-1 ${status.color}`}>{status.label}</p>
          </>
        ) : (
          <div className="py-2">
            <p className="text-muted-foreground text-sm">No promises tracked yet</p>
          </div>
        )}
      </div>

      {/* Progress bar */}
      {integrityScore !== null && (
        <div className="mb-4">
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${integrityScore}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className={`h-full rounded-full ${status.bg}`}
            />
          </div>
        </div>
      )}

      {/* Pending promises */}
      {pendingPromises.length > 0 && (
        <div className="pt-3 border-t space-y-2">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            Open promises ({pendingPromises.length})
          </p>
          {pendingPromises.slice(0, 3).map((promise) => (
            <div key={promise.id} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-muted/50">
              <p className="text-sm text-foreground truncate flex-1">{promise.promise_text}</p>
              <div className="flex gap-1">
                <button
                  onClick={() => handleResolve(promise.id, true)}
                  className="p-1 rounded hover:bg-green-500/20 text-green-600 dark:text-green-400 disabled:opacity-50"
                  disabled={disabled}
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleResolve(promise.id, false)}
                  className="p-1 rounded hover:bg-destructive/20 text-destructive disabled:opacity-50"
                  disabled={disabled}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Make a Promise button */}
      <div className="mt-3 pt-3 border-t">
        <Button variant="outline" size="sm" className="w-full" onClick={() => handlePromiseModalOpen(true)} disabled={disabled}>
          {disabled ? "Loading..." : "Make a Promise"}
        </Button>
      </div>

      {/* Controllable voice tip */}
      <p className="text-xs text-muted-foreground text-center italic mt-3">
        {theme.tip}
      </p>

      <Dialog open={isOpen} onOpenChange={handlePromiseModalOpen}>
        <DialogTrigger asChild>
          <span className="hidden" />
        </DialogTrigger>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">Make a Promise</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <p className="text-sm text-muted-foreground">
              Confidence comes from kept promises. Only promise what you'll do.
            </p>
            <Input
              placeholder="I will..."
              value={promiseText}
              onChange={handlePromiseTextChange}
              className="text-base"
              data-testid="promise-input-full"
              autoFocus
            />
            {isSubmitTimedOut && (
              <TimeoutWarning
                variant="inline"
                message="Save is taking longer than expected..."
              />
            )}
            <Button
              onClick={handleSubmit}
              className="w-full"
              disabled={!promiseText.trim() || disabled || isSubmittingPromise}
              data-testid="promise-submit-full"
            >
              {isSubmittingPromise ? (isSubmitTimedOut ? "Still saving..." : "Saving...") : disabled ? "Loading..." : "Make Promise"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
});
