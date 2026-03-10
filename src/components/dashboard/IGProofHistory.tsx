import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Camera, Filter } from "lucide-react";
import { useIGProof, type IGProofEntry } from "@/hooks/useIGProof";
import { RING_DEFINITIONS, type RingKey } from "@/hooks/useDailyRings";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const RING_DOT_COLORS: Record<string, string> = {
  notice: "bg-[hsl(var(--awareness))]",
  choose: "bg-[hsl(var(--perspective))]",
  prove: "bg-[hsl(var(--habit))]",
  charge: "bg-[hsl(var(--wellness))]",
  align: "bg-[hsl(var(--environment))]",
};

interface ProofHistoryProps {
  userId?: string;
}

export const ProofHistory = ({ userId }: ProofHistoryProps) => {
  const { entries, loadingEntries, loadEntries } = useIGProof(userId);
  const [ringFilter, setRingFilter] = useState<RingKey | undefined>();

  useEffect(() => {
    loadEntries(ringFilter);
  }, [loadEntries, ringFilter]);

  if (!userId) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Camera className="w-4 h-4 text-accent" />
          <h3 className="text-sm font-semibold text-foreground">Proof History</h3>
        </div>
        <Filter className="w-3.5 h-3.5 text-muted-foreground" />
      </div>

      {/* Ring filter chips */}
      <div className="flex gap-1.5 flex-wrap">
        <button
          onClick={() => setRingFilter(undefined)}
          className={cn(
            "px-2 py-0.5 rounded-full text-[10px] font-medium transition-all",
            !ringFilter ? "bg-accent/10 text-accent" : "bg-muted/50 text-muted-foreground hover:bg-muted"
          )}
        >
          All
        </button>
        {RING_DEFINITIONS.map((d) => (
          <button
            key={d.key}
            onClick={() => setRingFilter(ringFilter === d.key ? undefined : d.key)}
            className={cn(
              "px-2 py-0.5 rounded-full text-[10px] font-medium transition-all",
              ringFilter === d.key ? "bg-accent/10 text-accent" : "bg-muted/50 text-muted-foreground hover:bg-muted"
            )}
          >
            {d.emoji} {d.name}
          </button>
        ))}
      </div>

      {/* Entry list */}
      {loadingEntries ? (
        <div className="flex justify-center py-6">
          <div className="w-6 h-6 rounded-full border-2 border-accent border-t-transparent animate-spin" />
        </div>
      ) : entries.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-6">
          No proof entries yet. Add your first proof entry above.
        </p>
      ) : (
        <div className="space-y-2">
          {entries.map((entry, i) => (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-start gap-3 p-3 rounded-lg border bg-card/50"
            >
              {/* Ring dot */}
              <div className={cn("w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0", RING_DOT_COLORS[entry.ring_key] || "bg-muted")} />

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-xs font-medium text-foreground capitalize">{entry.ring_key}</span>
                  {entry.attached_to_ring && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-accent/10 text-accent font-medium">Filled Ring</span>
                  )}
                </div>
                {entry.ai_interpretation && (
                  <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">{entry.ai_interpretation}</p>
                )}
                {entry.tags && entry.tags.length > 0 && (
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {entry.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">{tag}</span>
                    ))}
                  </div>
                )}
                <p className="text-[10px] text-muted-foreground/60 mt-1">
                  {format(new Date(entry.created_at), "MMM d, h:mm a")}
                </p>
              </div>

              {/* Thumbnail */}
              {entry.image_url && (
                <img src={entry.image_url} alt="" className="w-10 h-10 rounded-md object-cover flex-shrink-0" />
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};
