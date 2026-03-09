import { Flame, Crown } from "lucide-react";

interface LeaderboardEntry {
  user_id: string;
  display_name: string | null;
  streak: number;
}

interface CircleLeaderboardProps {
  entries: LeaderboardEntry[];
  currentUserId: string;
}

export function CircleLeaderboard({ entries, currentUserId }: CircleLeaderboardProps) {
  if (!entries.length || entries.every((e) => e.streak === 0)) return null;

  const sorted = [...entries].sort((a, b) => b.streak - a.streak);

  return (
    <div className="mt-4 pt-4 border-t border-border">
      <div className="flex items-center gap-1.5 mb-2.5">
        <span className="text-sm">🏆</span>
        <h4 className="text-xs font-medium text-foreground">Streak Leaderboard</h4>
      </div>

      <div className="space-y-1.5">
        {sorted.map((entry, i) => {
          const isCurrentUser = entry.user_id === currentUserId;
          const isFirst = i === 0 && entry.streak > 0;

          return (
            <div
              key={entry.user_id}
              className={`flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-colors ${
                isCurrentUser
                  ? "bg-primary/10 text-foreground font-medium"
                  : "text-muted-foreground"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="w-4 text-center">
                  {isFirst ? (
                    <Crown className="w-3.5 h-3.5 text-amber-500 inline" />
                  ) : (
                    <span>{i + 1}.</span>
                  )}
                </span>
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold ${
                    isCurrentUser
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {(entry.display_name || "?")[0].toUpperCase()}
                </div>
                <span className="truncate max-w-[100px]">
                  {isCurrentUser ? "You" : entry.display_name?.split(" ")[0] || "?"}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Flame className="w-3 h-3 text-orange-500" />
                <span className="font-semibold text-foreground">{entry.streak}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
