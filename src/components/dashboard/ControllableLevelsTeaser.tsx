import { useControllableLevels } from "@/hooks/useControllableLevels";
import { getControllableTheme } from "@/lib/controllableTheme";
import { Progress } from "@/components/ui/progress";
import { Swords } from "lucide-react";

interface Props {
  userId: string | null;
  onNavigateToGuide: () => void;
}

export function ControllableLevelsTeaser({ userId, onNavigateToGuide }: Props) {
  const { data: levels, isLoading } = useControllableLevels(userId);

  if (isLoading || !levels) return null;

  // Find the highest-level controllable
  const top = levels.reduce((best, l) => (l.level > best.level || (l.level === best.level && l.totalXp > best.totalXp) ? l : best), levels[0]);
  const theme = getControllableTheme(top.type);

  return (
    <button
      onClick={onNavigateToGuide}
      className="w-full text-left p-4 rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm hover:bg-accent/30 transition-colors group"
    >
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 text-lg">
          {theme.emoji}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Swords className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">Top Controllable</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">{theme.label}</span>
            <span className="text-xs font-mono text-primary">Lv.{top.level}</span>
          </div>
          <Progress value={top.progress * 100} className="h-1.5 mt-1.5" />
        </div>
        <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
          View all →
        </span>
      </div>
    </button>
  );
}
