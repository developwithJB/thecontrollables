import { useState } from "react";
import { motion } from "framer-motion";
import { Shield, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface IntegrityLog {
  id: string;
  promise_text: string;
  promised_at: string;
  kept: boolean | null;
}

interface IntegrityMeterModuleProps {
  integrityScore: number | null;
  pendingPromises: IntegrityLog[];
  onCreatePromise: (data: { promiseText: string }) => void;
  onResolvePromise: (data: { promiseId: string; kept: boolean }) => void;
  compact?: boolean;
  disabled?: boolean;
}

export function IntegrityMeterModule({
  integrityScore,
  pendingPromises,
  onCreatePromise,
  onResolvePromise,
  compact = false,
  disabled = false,
}: IntegrityMeterModuleProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [promiseText, setPromiseText] = useState("");

  const handleSubmit = () => {
    if (!promiseText.trim()) return;
    onCreatePromise({ promiseText: promiseText.trim() });
    setIsOpen(false);
    setPromiseText("");
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
            <p className="text-xs text-muted-foreground">No promises yet</p>
          )}
        </motion.button>

        {/* Detail Modal */}
        <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
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
                  <div className="py-2">
                    <p className="text-muted-foreground text-sm">No promises tracked yet</p>
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
                          onClick={() => onResolvePromise({ promiseId: promise.id, kept: true })}
                          className="p-1 rounded hover:bg-green-500/20 text-green-600 dark:text-green-400 disabled:opacity-50"
                          disabled={disabled}
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onResolvePromise({ promiseId: promise.id, kept: false })}
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
              <div className="pt-3 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  disabled={disabled}
                  onClick={() => {
                    setIsDetailOpen(false);
                    setIsOpen(true);
                  }}
                >
                  {disabled ? "Loading..." : "Make a Promise"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Promise Dialog */}
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
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
                onChange={(e) => setPromiseText(e.target.value)}
                className="text-base"
              />
              <Button onClick={handleSubmit} className="w-full" disabled={!promiseText.trim() || disabled}>
                {disabled ? "Loading..." : "Make Promise"}
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
      className="p-5 rounded-2xl bg-card border shadow-soft"
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="p-1.5 rounded-lg bg-primary/10">
          <Shield className="w-4 h-4 text-primary" />
        </div>
        <h3 className="font-display font-semibold text-foreground">Integrity</h3>
      </div>

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
                  onClick={() => onResolvePromise({ promiseId: promise.id, kept: true })}
                  className="p-1 rounded hover:bg-green-500/20 text-green-600 dark:text-green-400 disabled:opacity-50"
                  disabled={disabled}
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onResolvePromise({ promiseId: promise.id, kept: false })}
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
        <Button variant="outline" size="sm" className="w-full" onClick={() => setIsOpen(true)} disabled={disabled}>
          {disabled ? "Loading..." : "Make a Promise"}
        </Button>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
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
              onChange={(e) => setPromiseText(e.target.value)}
              className="text-base"
            />
            <Button onClick={handleSubmit} className="w-full" disabled={!promiseText.trim() || disabled}>
              {disabled ? "Loading..." : "Make Promise"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
