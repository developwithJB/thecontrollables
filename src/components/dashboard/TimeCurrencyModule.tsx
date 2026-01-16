import { useState } from "react";
import { motion } from "framer-motion";
import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface TimeLog {
  time_invested_minutes: number;
  time_wasted_minutes: number;
  notes: string | null;
}

interface TimeCurrencyModuleProps {
  todayTimeLog: TimeLog | null;
  onLogTime: (data: { invested: number; wasted: number; notes?: string }) => void;
  isLogging: boolean;
  compact?: boolean;
}

export function TimeCurrencyModule({ todayTimeLog, onLogTime, isLogging, compact = false }: TimeCurrencyModuleProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [invested, setInvested] = useState("");
  const [wasted, setWasted] = useState("");

  const handleOpenDialog = () => {
    // Pre-fill with existing values when opening
    setInvested(todayTimeLog?.time_invested_minutes?.toString() || "");
    setWasted(todayTimeLog?.time_wasted_minutes?.toString() || "");
    setIsOpen(true);
  };

  const handleSubmit = () => {
    onLogTime({
      invested: parseInt(invested) || 0,
      wasted: parseInt(wasted) || 0,
    });
    setIsOpen(false);
  };

  const formatMinutes = (minutes: number): string => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
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
            <h3 className="text-sm font-medium text-foreground">Time Currency</h3>
          </div>

          {todayTimeLog ? (
            <>
              {/* Mini time bar */}
              <div className="mb-2">
                <div className="h-1.5 rounded-full bg-muted overflow-hidden flex">
                  <div
                    className="h-full bg-green-500"
                    style={{ width: `${investedPercent}%` }}
                  />
                  <div
                    className="h-full bg-red-400"
                    style={{ width: `${100 - investedPercent}%` }}
                  />
                </div>
              </div>

              {/* Compact stats */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-green-600 dark:text-green-400 font-medium">{formatMinutes(investedMins)}</span>
                <span className="text-muted-foreground">/</span>
                <span className="text-red-500 font-medium">{formatMinutes(wastedMins)}</span>
              </div>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">Not logged today</p>
          )}
        </motion.button>

        {/* Detail Modal */}
        <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <DialogContent className="max-w-sm max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-500" />
                Time Currency
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              {todayTimeLog && (
                <>
                  {/* Time bar */}
                  <div>
                    <div className="h-3 rounded-full bg-muted overflow-hidden flex">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${investedPercent}%` }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="h-full bg-green-500"
                      />
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${100 - investedPercent}%` }}
                        transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
                        className="h-full bg-red-400"
                      />
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-display font-bold text-green-600 dark:text-green-400">
                        {formatMinutes(investedMins)}
                      </p>
                      <p className="text-xs text-muted-foreground">Invested</p>
                    </div>
                    <div>
                      <p className="text-2xl font-display font-bold text-red-500">
                        {formatMinutes(wastedMins)}
                      </p>
                      <p className="text-xs text-muted-foreground">Lost</p>
                    </div>
                  </div>
                </>
              )}

              {!todayTimeLog && (
                <p className="text-sm text-muted-foreground text-center py-4">No time logged today</p>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsDetailOpen(false);
                  handleOpenDialog();
                }}
                className="w-full"
              >
                {todayTimeLog ? "Update Time" : "Log Today's Time"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Log Time Dialog */}
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <span className="hidden" />
          </DialogTrigger>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="font-display">
                {todayTimeLog ? "Update Your Time" : "Log Your Time"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <p className="text-sm text-muted-foreground">
                Awareness, not judgment. How did you spend today?
              </p>
              
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Time invested (minutes)
                </label>
                <Input
                  type="number"
                  placeholder="e.g., 120"
                  value={invested}
                  onChange={(e) => setInvested(e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Work, learning, meaningful activity
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Time wasted (minutes)
                </label>
                <Input
                  type="number"
                  placeholder="e.g., 45"
                  value={wasted}
                  onChange={(e) => setWasted(e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Scrolling, distractions, regrets
                </p>
              </div>

              <Button onClick={handleSubmit} className="w-full" disabled={isLogging}>
                {isLogging ? "Saving..." : todayTimeLog ? "Update Time" : "Log Time"}
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
          <Clock className="w-4 h-4 text-blue-500" />
        </div>
        <h3 className="font-display font-semibold text-foreground">Time Currency</h3>
      </div>

      {todayTimeLog && (
        <>
          {/* Time bar */}
          <div className="mb-4">
            <div className="h-3 rounded-full bg-muted overflow-hidden flex">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${investedPercent}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="h-full bg-green-500"
              />
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${100 - investedPercent}%` }}
                transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
                className="h-full bg-red-400"
              />
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 text-center mb-4">
            <div>
              <p className="text-2xl font-display font-bold text-green-600 dark:text-green-400">
                {formatMinutes(investedMins)}
              </p>
              <p className="text-xs text-muted-foreground">Invested</p>
            </div>
            <div>
              <p className="text-2xl font-display font-bold text-red-500">
                {formatMinutes(wastedMins)}
              </p>
              <p className="text-xs text-muted-foreground">Lost</p>
            </div>
          </div>
        </>
      )}

      {!todayTimeLog && (
        <p className="text-sm text-muted-foreground text-center mb-3">No time logged today</p>
      )}

      <Button variant="outline" size="sm" onClick={handleOpenDialog} className="w-full">
        {todayTimeLog ? "Update Time" : "Log Today's Time"}
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <span className="hidden" />
        </DialogTrigger>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">
              {todayTimeLog ? "Update Your Time" : "Log Your Time"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <p className="text-sm text-muted-foreground">
              Awareness, not judgment. How did you spend today?
            </p>
            
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Time invested (minutes)
              </label>
              <Input
                type="number"
                placeholder="e.g., 120"
                value={invested}
                onChange={(e) => setInvested(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Work, learning, meaningful activity
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Time wasted (minutes)
              </label>
              <Input
                type="number"
                placeholder="e.g., 45"
                value={wasted}
                onChange={(e) => setWasted(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Scrolling, distractions, regrets
              </p>
            </div>

            <Button onClick={handleSubmit} className="w-full" disabled={isLogging}>
              {isLogging ? "Saving..." : todayTimeLog ? "Update Time" : "Log Time"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
