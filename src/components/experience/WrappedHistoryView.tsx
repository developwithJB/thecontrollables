import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, ChevronRight, Sparkles, Share2, Calendar, Zap, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, addDays } from "date-fns";
import { getSnapshotById, BUCKETS } from "@/lib/snapshots";
import { toast } from "sonner";

interface SnapshotRecord {
  id: string;
  snapshotId: string | null;
  startDate: string;
  completedAt: string | null;
  status: "active" | "completed" | "expired" | "paused";
  daysCompleted: number;
  xpEarned: number;
}

interface WrappedHistoryViewProps {
  sessions: SnapshotRecord[];
  userId?: string;
  isPaid?: boolean;
}

export function WrappedHistoryView({ sessions, userId, isPaid }: WrappedHistoryViewProps) {
  const navigate = useNavigate();
  
  // Only show completed 7/7 snapshots - these are the "Wrapped" worthy ones
  const completedSnapshots = sessions.filter(
    s => s.status === "completed" && s.daysCompleted === 7
  ).sort((a, b) => 
    new Date(b.completedAt || b.startDate).getTime() - new Date(a.completedAt || a.startDate).getTime()
  );

  if (completedSnapshots.length === 0) {
    return (
      <div className="p-6 rounded-xl bg-muted/30 border border-dashed border-muted-foreground/30 text-center">
        <Trophy className="w-8 h-8 mx-auto text-muted-foreground/50 mb-3" />
        <p className="text-sm text-muted-foreground mb-2">
          No completed snapshots yet
        </p>
        <p className="text-xs text-muted-foreground">
          Complete a 7-day snapshot to unlock your first Wrapped summary
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground mb-4">
        Your completed 7-day snapshots — proof of who you're becoming.
      </p>
      
      {completedSnapshots.map((record, index) => (
        <WrappedCard
          key={record.id}
          record={record}
          index={index}
          onClick={() => navigate(`/reset?sessionId=${record.id}&celebration=true`)}
        />
      ))}
    </div>
  );
}

function WrappedCard({
  record,
  index,
  onClick,
}: {
  record: SnapshotRecord;
  index: number;
  onClick: () => void;
}) {
  const snapshot = record.snapshotId ? getSnapshotById(record.snapshotId) : null;
  const bucket = snapshot ? BUCKETS[snapshot.bucketId] : null;
  const startDate = new Date(record.startDate);
  const endDate = addDays(startDate, 6);
  const dateRange = `${format(startDate, "MMM d")} – ${format(endDate, "d, yyyy")}`;

  // Generate historical visual for snapshots without journey data
  const getHistoricalEmoji = () => {
    if (snapshot) return snapshot.emoji;
    const weekOfYear = Math.ceil((startDate.getTime() - new Date(startDate.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000));
    const emojis = ["🏆", "🎯", "✨", "💪", "🌟", "🔥"];
    return emojis[weekOfYear % emojis.length];
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    const journeyText = snapshot ? `${snapshot.emoji} ${snapshot.name}` : "";
    const shareText = 
      `🏆 7-Day Snapshot Complete\n` +
      `${dateRange}\n\n` +
      (journeyText ? `${journeyText}\n\n` : "") +
      `✅ ${record.daysCompleted}/7 days\n` +
      `⚡ ${record.xpEarned} XP\n\n` +
      `Building proof, one week at a time.\n` +
      `thedashboard.agbcoaching.com\n\n` +
      `#TheDashboard #TheControllables`;

    if (navigator.share) {
      try {
        await navigator.share({ title: "My 7-Day Snapshot", text: shareText });
        toast.success("Shared!");
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          await navigator.clipboard.writeText(shareText);
          toast.success("Copied to clipboard!");
        }
      }
    } else {
      await navigator.clipboard.writeText(shareText);
      toast.success("Copied to clipboard!");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      onClick={onClick}
      className="p-4 rounded-xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 to-emerald-600/10 cursor-pointer hover:border-emerald-500/50 hover:bg-emerald-500/10 transition-all active:scale-[0.98]"
    >
      <div className="flex items-center gap-3">
        {/* Trophy icon */}
        <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
          <span className="text-2xl">{getHistoricalEmoji()}</span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Trophy className="w-4 h-4 text-emerald-500" />
            <span className="font-semibold text-foreground text-sm">
              {snapshot?.name || "Week Wrapped"}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">{dateRange}</p>
          {snapshot && (
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-xs text-emerald-600 dark:text-emerald-400 capitalize">
                {snapshot.focus} focus
              </span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleShare}
            className="p-2 rounded-lg hover:bg-emerald-500/20 transition-colors"
            title="Share"
          >
            <Share2 className="w-4 h-4 text-muted-foreground hover:text-emerald-500" />
          </button>
          <ChevronRight className="w-4 h-4 text-emerald-500" />
        </div>
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-emerald-500/20">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Calendar className="w-3 h-3" />
          <span>{record.daysCompleted}/7 days</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Zap className="w-3 h-3" />
          <span>{record.xpEarned} XP</span>
        </div>
        <span className="text-xs text-emerald-600 dark:text-emerald-400 ml-auto">
          View Wrapped →
        </span>
      </div>
    </motion.div>
  );
}
