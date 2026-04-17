import { useDailyMoves, DAILY_MOVE_DEFINITIONS } from "@/hooks/useDailyRings";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

interface CompactRingsRowProps {
  userId: string;
}

const RING_COLORS: Record<string, string> = {
  awareness: "bg-amber-500",
  perspective: "bg-teal-500",
  habit: "bg-blue-500",
  wellness: "bg-emerald-500",
  environment: "bg-violet-500",
};

export function CompactRingsRow({ userId }: CompactRingsRowProps) {
  const { rings, completedCount } = useDailyMoves(userId);
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate("/growth")}
      className="w-full flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:bg-accent/5 transition-colors text-left"
    >
      <div className="flex items-center gap-1.5">
        {DAILY_MOVE_DEFINITIONS.map((move) => {
          const completed = rings[`${move.key}_completed` as keyof typeof rings] as boolean;
          return (
            <div
              key={move.key}
              className={cn(
                "w-3.5 h-3.5 rounded-full border-2 transition-all",
                completed
                  ? `${RING_COLORS[move.controllable]} border-transparent`
                  : "bg-transparent border-muted-foreground/25"
              )}
              title={`${move.name} — ${completed ? "Done" : "Open"}`}
            />
          );
        })}
      </div>

      <span className="text-sm text-muted-foreground flex-1">
        {completedCount === 5
          ? "All moves complete ✓"
          : `${completedCount}/5 moves today`}
      </span>

      <span className="text-xs text-muted-foreground/60">→</span>
    </button>
  );
}
